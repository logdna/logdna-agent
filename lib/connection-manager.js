// External Modules
const async = require('async');
const debug = require('debug')('logdna:lib:connection-manager');
const HttpsProxyAgent = require('https-proxy-agent');
const os = require('os');
const spawn = require('child_process').spawn;
const url = require('url');

// Internal Modules
const fileUtils = require('./file-utilities');
const winUtils = require('./windows-utilities');
const linebuffer = require('./linebuffer');
const getProxyFromURI = require('./getProxyFromURI');
const log = require('./log');

// Variables
var firstrun;

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
};

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
};

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

// Send POST Request to HealthCheck Endpoint
const checkHealth = (req, config) => {
    if (req) {
        return async.retry({
            times: 3
            , interval: (retryCount) => {
                return 50 * Math.pow(2, retryCount);
            }
            , errorFilter: (err) => {
                return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code);
            }
        }, (reqCallback) => {
            return req.post(config.LOGDNA_LOGURL + config.LOGDNA_HEALTHCHECK, {
                body: JSON.stringify(prepareStats(config))
                , headers: config.DEFAULT_REQ_HEADERS
                , qs: {
                    timestamp: Date.now()
                }
            }, (err, res, body) => {
                return reqCallback(err, Object.assign(JSON.parse(body || '{}'), err ? {} : {
                    statusCode: res.statusCode
                }));
            });
        }, (error, body) => {
            if (error) {
                log(`Error from HealthCheck Endpoint: ${error}`);
            } else if (body && body.statusCode === 200) {
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
            } else {
                log(`Response from HealthCheck Endpoint: ${JSON.stringify(body)}`);
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

            return setTimeout(() => {
                return checkHealth(req, config);
            }, config.HEALTHCHECK_INTERVAL); // Every 30 Minutes
        });
    }
};

module.exports.connectLogServer = (config, programName, callback) => {
    firstrun = true;
    const proxy = getProxyFromURI(url.parse(config.LOGDNA_LOGURL));
    var options = {
        query: {
            timestamp: Date.now()
            , compress: config.COMPRESS ? 1 : 0
            , tailmode: config.TAIL_MODE !== 'trs' ? config.TAIL_MODE : undefined
            , transport: config.TRANSPORT !== 'http' ? config.TRANSPORT : undefined
        }
    };
    if (proxy) options.agent = new HttpsProxyAgent(url.parse(proxy));
    debug(config.LOGDNA_LOGURL);
    return linebuffer.createConnection(options, (error, req) => {
        return callback(error, checkHealth(req, config));
    });
};
