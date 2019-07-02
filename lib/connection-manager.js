// External Modules
const Agent = require('agentkeepalive');
const async = require('async');
const debug = require('debug')('logdna:lib:connection-manager');
const fs = require('fs');
const os = require('os');
const Queue = require('file-queue').Queue;
const request = require('request');
const spawn = require('child_process').spawn;
const url = require('url');

// Internal Modules
const fileUtils = require('./file-utilities');
const getProxyFromURI = require('./getProxyFromURI');
const linebuffer = require('./linebuffer');
const log = require('./log');
const winUtils = require('./windows-utilities');

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
const checkHealth = (conn, config) => {
    if (conn.req) {
        return async.retry({
            times: 3
            , interval: (retryCount) => {
                return 50 * Math.pow(2, retryCount);
            }
            , errorFilter: (err) => {
                return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code);
            }
        }, (reqCallback) => {
            return conn.req.post(config.LOGDNA_LOGURL + config.LOGDNA_HEALTHCHECK, {
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
                fileUtils.streamAllLogs(conn, config);
                if (os.platform() === 'win32' && config.winevent) {
                    if (typeof config.winevent === 'string') {
                        config.winevent = config.winevent.split(',');
                    }
                    winUtils.streamEventLog(conn, {
                        events: config.winevent
                    });
                }
                firstrun = false;
            } else {
                log('Streaming Resumed after HealthCheck');
            }

            return setTimeout(() => {
                return checkHealth(conn, config);
            }, config.HEALTHCHECK_INTERVAL); // Every 30 Minutes
        });
    }
};

const resetStats = (config) => {
    config.bufferStats = {
        lines: 0
        , buflimit: 0
        , longlines: 0
        , flushlimit: 0
        , flushsize: 0
        , flushcount: 0
        , ts: Date.now()
        , excludelines: 0
    };
};

const createConnection = (config) => {

    const proxy = getProxyFromURI(url.parse(config.LOGDNA_LOGURL));

    let conn = {
        req: request.defaults({
            agent: new Agent.HttpsAgent(proxy ? url.parse(proxy) : {
                maxSockets: config.MAX_SOCKETS
                , keepAliveTimeout: config.HTTP_KEEPALIVE
            })
            , auth: {
                user: 'x'
                , pass: config.key
            }
            , qs: {
                compress: config.COMPRESS ? 1 : 0
                , hostname: config.hostname
                , ip: config.ip
                , mac: config.mac
                , tags: config.tags
                , tailmode: config.TAIL_MODE !== 'trs' ? config.TAIL_MODE : undefined
                , timestamp: Date.now()
                , transport: config.TRANSPORT !== 'http' ? config.TRANSPORT : undefined
            }
            , timeout: config.HTTP_TIMEOUT
        })
        , exclude_regex: config.exclude_regex && new RegExp(config.exclude_regex)
    };

    if (config.HTTP_RETRY) {
        if (!fs.existsSync(config.FILEQUEUE_PATH)) fs.mkdirSync(config.FILEQUEUE_PATH);
        const queue = new Queue(config.FILEQUEUE_PATH, (err) => {
            if (err) {
                return log(`Error in Creating FQ @ ${config.FILEQUEUE_PATH}: ${err}`);
            }

            queue.length((err, length) => {
                if (length > 0) {
                    log(`Retry buffer has ${length} previously failed payloads.`);
                }
            });

            const processQueue = () => {
                queue.length((err, length) => {
                    if (length === 0) {
                        return setTimeout(processQueue, config.HTTP_TIMEOUT);
                    }

                    queue.pop((err, payload) => {
                        if (err) {
                            log(`FQ Pop Error: ${err}`);
                            return setImmediate(processQueue);
                        }

                        if (!payload) {
                            return setImmediate(processQueue);
                        }

                        payload = JSON.parse(payload);

                        if (Array.isArray(payload)) {
                            payload.forEach((message) => {
                                linebuffer.addMessage(conn, message);
                            });
                            debug('fq flushed ' + payload.length + ' lines');
                        }

                        setTimeout(processQueue, config.FLUSH_INTERVAL * 4);
                    });
                });
            };

            // start processing q in 5s
            setTimeout(processQueue, 5000);
        });

        conn.queue = queue;

        conn.flushtimeout = setTimeout(() => {
            linebuffer.flush(conn);
        }, config.FLUSH_INTERVAL);
    }

    return conn;
};

// Initiate Connection
const connectLogServer = (config, programName, callback) => {
    firstrun = true;
    debug(config.LOGDNA_LOGURL);
    resetStats(config);
    return callback(null, checkHealth(createConnection(config), config));
};

module.exports.connectLogServer = connectLogServer;
