/* globals process */
'use strict';
var debug = require('debug')('logdna:lib:connection-manager');
var log = require('./log');
var spawn = require('child_process').spawn;
var os = require('os');
var fileUtils = require('./file-utilities');
var winUtils  = require('./windows-utilities');
var apiClient = require('./api-client');
var linebuffer = require('./linebuffer');
var url = require('url');
/* jshint ignore:start */
var WebSocket = require('./logdna-websocket');
/* jshint ignore:end */
var HttpsProxyAgent = require('https-proxy-agent');

function updateSelf() {
    if (os.platform() !== 'win32') {
        // update self
        return spawn('/bin/bash', ['-c',
            'if [[ ! -z $(which apt-get) ]]; then apt-get update; apt-get install -y --force-yes logdna-agent; elif [[ ! -z $(which yum) ]]; then yum clean expire-cache; yum -y install logdna-agent; elif [[ ! -z $(which zypper) ]]; then zypper refresh; zypper install -y logdna-agent; fi; sleep 1; /etc/init.d/logdna-agent start'
        ], {
            detached: true
        });
    } else {
        // update self
        return spawn('cmd.exe', ['/c', 'choco', 'upgrade', 'logdna-agent', '-y', '--allowunofficial'],
            {
                detached: true
            });
    }
}

function restartSelf() {
    if (os.platform() === 'linux') {
        // restart self
        return spawn('/bin/bash', ['-c',
            '/etc/init.d/logdna-agent restart'
        ], {
            detached: true
        });
    } else if (os.platform() === 'win32') {
        // restart self
        return spawn('cmd.exe', ['/c',
            'nssm',
            'restart',
            'logdna-agent'],
            {
                detached: true
            }
        );
    }
}

module.exports.connectLogServer = function(config, programName) {
    var address = (config.LOGDNA_LOGSSL ? 'https://' : 'http://') + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT;
    var options = {
        query: {
            auth_token: config.auth_token,
            timestamp: Date.now(),
            compress: config.COMPRESS ? 1 : 0,
            tailmode: config.TAIL_MODE !== 'trs' ? config.TAIL_MODE : undefined,
            transport: config.TRANSPORT !== 'http' ? config.TRANSPORT : undefined
        },
        reconnection: config.LOGDNA_RECONNECT,
        perMessageDeflate: !!config.COMPRESS
    };

    var proxy = process.env.http_proxy;
    if (proxy) {
        log('Using proxy server: ' + proxy);

        var parsed = url.parse(address);
        var opts = url.parse(proxy);
        opts.secureEndpoint = parsed.protocol ? parsed.protocol === 'wss:' : false;

        options.agent = new HttpsProxyAgent(opts);
    }

    var firstrun = true;
    debug(address);
    var socket = new WebSocket(address, options);
    linebuffer.setSocket(socket);
    debug(socket.options);
    return new Promise(resolve => {
        debug('connecting to websocket');
        socket.on('open', function() {
            log('Connected to ' + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT + ' (' + socket._socket.remoteAddress + ')' + (config.LOGDNA_LOGSSL ? ' (SSL)' : ''));

            if (os.platform() === 'win32' && config.windowseventlogprovider) {
                log('Streaming Windows event log data');
                winUtils.streamEventLog(config.windowseventlogprovider, socket);
            }

            if (firstrun) {
                firstrun = false;

                // start streaming logs from logdir(s) on startup
                fileUtils.streamAllLogs(config);

                setTimeout(exports.sendStats, config.STATS_INTERVAL, config, socket);
                setTimeout(exports.socketKeepAlive, config.SOCKET_KEEPALIVE, config, socket);

            } else {
                // reconnected, resume streaming
                debug(fileUtils.files);
                log('Streaming resumed: ' + fileUtils.files.length + ' file(s)');
            }

            return resolve(socket);
        });
        socket.on('error', function(err) {
            err = err.toString();
            log('Server error: ' + err);
            if (err.indexOf('401') > -1) {
                // invalid token, reauth
                log('Got 401 response, reauthenticating...');
                if (config.authtimeout) {
                    clearTimeout(config.authtimeout);
                }
                config.authtimeout = setTimeout(function() {
                    apiClient.getAuthToken(config, programName, socket);
                }, 250);
            } else if (err.indexOf('403') > -1) {
                // intentional unauth
                log('Got 403 response, sleeping for ' + config.AUTHFAIL_DELAY + 'ms...');
                socket.reconnectionDelay = config.AUTHFAIL_DELAY;
                socket.reconnectionDelayMax = config.AUTHFAIL_DELAY;
            }
        });
        socket.on('close', function(code, message) {
            log('Disconnected from server: ' + code + ': ' + message);
        });
        socket.on('reconnecting', function(num) {
            log('Attempting to connect #' + num + ' to ' + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT + (config.LOGDNA_LOGSSL ? ' (SSL)' : '') + ' using ' + config.auth_token + '...');
            socket.reconnectionDelay = 1000; // reset
            socket.reconnectionDelayMax = 5000; // reset
            socket.options.query.timestamp = Date.now(); // update drift
        });
        socket.on('message', function(data) {
            if (data.substring(0, 1) === '{') {
                data = JSON.parse(data);
                debug('configuration:');
                debug(config);

                if (data.e === 'u') {
                    if (config.autoupdate !== 0) {
                        log('Agent update request received, auto-updating...');
                        debug('updating self');
                        return updateSelf();
                    }
                    return;
                }

                if (data.e === 'r') {
                    log('Agent restart request received, restarting...');
                    debug('restarting self');
                    return restartSelf();
                }

                if (data.e === 'p') {
                    debug('ping pong');
                    return;
                }

                log('Unknown event received: ' + JSON.stringify(data));
            } else {
                log('Unknown event received: ' + data);
            }
        });
    });
};

module.exports.sendStats = function(config, socket) {
    if (config.STATS_INTERVAL <= 0) {
        return;
    }

    var stats = {
        e: 's',
        m: process.memoryUsage(),
        b: config.bufferStats
    };

    if (stats.b && stats.b.ts) {
        stats.b.ms = Date.now() - stats.b.ts;
    }

    debug('sending stats:');
    debug(stats);
    if (socket.connected) {
        socket.send(JSON.stringify(stats));
        linebuffer.resetStats();
    }

    setTimeout(exports.sendStats, config.STATS_INTERVAL, config, socket);
};

module.exports.socketKeepAlive = function(config, socket) {
    if (config.SOCKET_KEEPALIVE <= 0) {
        return;
    }

    if (socket.connected) {
        socket.send(JSON.stringify({ e: 'p', ts: Date.now() }));
    }

    setTimeout(exports.socketKeepAlive, config.SOCKET_KEEPALIVE, config, socket);
};
