// External Modules
var async = require('async');
var debug = require('debug')('logdna:lib:connection-manager');
var os = require('os');
var url = require('url');
var spawn = require('child_process').spawn;
var HttpsProxyAgent = require('https-proxy-agent');

// Internal Modules
var fileUtils = require('./file-utilities');
var winUtils = require('./windows-utilities');
var linebuffer = require('./linebuffer');
var getProxyFromURI = require('./getProxyFromURI');
var log = require('./log');

// Update LogDNA Agent if Enabled
const updateSelf = () => {
    if (os.platform() !== 'win32') {
        return spawn('/bin/bash', ['-c'
            , 'if [[ ! -z $(which apt-get) ]]; then apt-get update; apt-get install -y --force-yes logdna-agent; elif [[ ! -z $(which yum) ]]; then yum clean expire-cache; yum -y install logdna-agent; elif [[ ! -z $(which zypper) ]]; then zypper refresh; zypper install -y logdna-agent; fi; sleep 1; /etc/init.d/logdna-agent start'
        ], {
            detached: true
        });
    } else {
        return spawn('cmd.exe', ['/c'
            , 'choco'
            , 'upgrade'
            , 'logdna-agent'
            , '-y'
            , '--allowunofficial'
        ], {
            detached: true
        });
    }
}

// Restart LogDNA Agent
const restartSelf = () => {
    if (os.platform() === 'linux') {
        return spawn('/bin/bash', ['-c'
            , '/etc/init.d/logdna-agent restart'
        ], {
            detached: true
        });
    } else if (os.platform() === 'win32') {
        return spawn('cmd.exe', ['/c'
            , 'nssm'
            , 'restart'
            , 'logdna-agent'
        ], {
            detached: true
        });
    }
}

// Prepare Stats Object
const prepareStats = (config) => {
    let stats = {
        e: 's'
        , m: process.memoryUsage()
        , b: config.bufferStats
    };

    if (stats.b && stats.b.ts) {
        stats.b.ms = Date.now() - stats.b.ts;
    }

    return stats;
};

module.exports.connectLogServer = (config, programName) => {
    var logurl = (config.LOGDNA_LOGSSL ? 'https://' : 'http://') + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT;
    var options = {
        query: {
            auth_token: config.auth_token
            , timestamp: Date.now()
            , compress: config.COMPRESS ? 1 : 0
            , tailmode: config.TAIL_MODE !== 'trs' ? config.TAIL_MODE : undefined
            , transport: config.TRANSPORT !== 'http' ? config.TRANSPORT : undefined
        }
        , reconnection: config.LOGDNA_RECONNECT
        , perMessageDeflate: !!config.COMPRESS
    };
    var firstrun = true;
    var proxy = getProxyFromURI(url.parse(logurl));
    if (proxy) options.agent = new HttpsProxyAgent(url.parse(proxy));
    debug(logurl);
    var req = linebuffer.setConnection(logurl, options);
    return new Promise((resolve) => {
        setInterval(() => {
            async.retry({
                times: 5
                , interval: 100
                , errorFilter: (err) => {
                    return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code);
                }
            }, (reqCallback) => {
                return req.post(`${logurl}/healthcheck`, {
                    body: JSON.stringify(prepareStats(config))
                    , headers: config.DEFAULT_REQ_HEADERS
                }, reqCallback);
            }, (error, response, body) => {
                if (response.statusCode === 200 && body) {
                    body = JSON.parse(body);
                    if (body.autoupdate === true) {
                        if (config.autoupdate !== 0) {
                            log('LogDNA Agent Update Request Received - Auto Updating...');
                            return updateSelf();
                        }

                        if (config.restart === true) {
                            log('LogDNA Agent Restart Request Received - Restarting...');
                            return restartSelf();
                        }
                    }
                }

                if (firstrun) {
                    fileUtils.streamAllLogs(config);

                    if (os.platform() === 'win32' && config.winevent) {
                        if (typeof config.winevent === 'string') {
                            config.winevent = config.winevent.split(',');
                        }

                        winUtils.streamEventLog({
                            events: config.winevent
                        });

                    }

                    firstrun = false;
                } else {
                    log(`Streaming Resumed: ${fileUtils.files.length} file(s)`);
                }

                return;
            });
        }, 10 * 60 * 1000); // Every 10 Minutes
        return resolve();
    });
};