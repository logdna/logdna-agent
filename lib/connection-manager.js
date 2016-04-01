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
/* jshint ignore:start */
var WebSocket = require('./logdna-websocket');
/* jshint ignore:end */
var _ = require('lodash');

function updateSelf() {
    if (os.platform() !== 'win32') {
        // update self
        return spawn('/bin/bash', ['-c',
            'if [[ ! -z $(which apt-get) ]]; then apt-get update; apt-get install -y --force-yes logdna-agent; elif [[ ! -z $(which yum) ]]; then yum clean expire-cache; yum -y install logdna-agent; elif [[ ! -z $(which zypper) ]]; then zypper refresh; zypper install -y logdna-agent; fi; sleep 1; /etc/init.d/logdna-agent start'
        ]);
    } else {
        // update self
        return spawn('cmd.exe', ['/c',
            'nssm',
            'stop',
            'logdna-agent',
            '&',
            'choco',
            'install',
            'logdna-agent',
            '-f',
            '-y',
            '--params',
            '/NoServiceInstall',
            '&',
            'nssm',
            'restart',
            'logdna-agent'],
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
        ]);
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

module.exports.connectLogServer = function (config, programName) {
    var url = (config.LOGDNA_LOGSSL ? 'https://' : 'http://') + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT;
    var options = {
        query: { auth_token: config.auth_token, timestamp: Date.now() },
        reconnection: config.LOGDNA_RECONNECT
    };
    var numfiles = 0;
    debug(url);
    var socket = new WebSocket(url, options);
    linebuffer.setSocket(socket);
    debug(socket.options);
    return new Promise(resolve => {
        debug('connecting to websocket');
        socket.on('open', function () {
            log('Connected to ' + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT + ' (' + socket._socket.remoteAddress + ')' + (config.LOGDNA_LOGSSL ? ' (SSL)' : ''));

            if (os.platform() === 'win32' && config.windowseventlogprovider) {
                log('Streaming Windows event log data');
                winUtils.streamEventLog(config.windowseventlogprovider, socket);
            }

            if (!numfiles) {
                // start streaming logs from logdir(s) on startup
                _.each(config.logdir, function (dir) {
                    numfiles += fileUtils.streamDir(dir, socket);
                });

                setTimeout(exports.sendStats, config.STATS_INTERVAL, config, socket);

            } else {
                // reconnected, resume streaming
                log('Streaming resumed: ' + numfiles + ' files');
            }

            return resolve(socket);
        });
        socket.on('error', function (err) {
            err = err.toString();
            log('Server error: ' + err);
            if (err.indexOf('401') > -1) {
                // invalid token, reauth
                log('Got 401 response, reauthenticating...');
                if (config.authtimeout) {
                    clearTimeout(config.authtimeout);
                }
                config.authtimeout = setTimeout(function () {
                    apiClient.getAuthToken(config, programName, socket);
                }, 250);
            } else if (err.indexOf('403') > -1) {
                // intentional unauth
                log('Got 403 response, sleeping for ' + config.AUTHFAIL_DELAY + 'ms...');
                socket.reconnectionDelay = config.AUTHFAIL_DELAY;
                socket.reconnectionDelayMax = config.AUTHFAIL_DELAY;
            }
        });
        socket.on('close', function (code, message) {
            log('Disconnected from server: ' + code + ': ' + message);
        });
        socket.on('reconnecting', function (num) {
            log('Attempting to connect #' + num + ' to ' + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT + (config.LOGDNA_LOGSSL ? ' (SSL)' : '') + ' using ' + config.auth_token + '...');
            socket.reconnectionDelay = 1000; // reset
            socket.reconnectionDelayMax = 5000; // reset
            socket.options.query.timestamp = Date.now(); // update drift
        });
        socket.on('message', function (data) {
            if (data.substring(0, 1) === '{') {
                data = JSON.parse(data);
                debug('configuration:');
                debug(config);

                if (data.e === 'u' && config.autoupdate !== 0) {
                    debug('updating self');
                    return updateSelf();
                }

                if (data.e === 'r') {
                    debug('restarting self');
                    return restartSelf();
                }

                log('Unknown event received: ' + JSON.stringify(data));
            } else {
                log('Unknown event received: ' + data);
            }
        });
    });
};

module.exports.sendStats = function (config, socket) {
    var stats = {
        e: 's',
        m: process.memoryUsage()
    };

    if (config.STATS_INTERVAL <= 0) {
        return;
    }

    debug('sending stats:');
    debug(stats);
    return new Promise(resolve => {
        if (socket.connected) {
            socket.send(JSON.stringify(stats));
            resolve();
        }

        setTimeout(() => {
            resolve(exports.sendStats(config, socket));
        }, config.STATS_INTERVAL);
    });
};
