// External Modules
const Agent = require('agentkeepalive');
const async = require('async');
const debug = require('debug')('logdna:lib:connection-manager');
const os = require('os');
const request = require('request');
const url = require('url');

// Internal Modules
const fileUtils = require('./file-utilities');
const getProxyFromURI = require('./getProxyFromURI');
const linebuffer = require('./linebuffer');
const log = require('./log');
const utils = require('./log');
const winUtils = require('./windows-utilities');

// Variables
var firstrun;

// Send POST Request to HealthCheck Endpoint
const checkHealth = (config) => {
    if (config.req) {
        return async.retry({
            times: 3
            , interval: (retryCount) => {
                return 50 * Math.pow(2, retryCount);
            }
            , errorFilter: (err) => {
                return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code);
            }
        }, (reqCallback) => {
            console.log(config.LOGDNA_LOGURL + config.LOGDNA_HEALTHCHECK)
            return config.req({
                url: config.LOGDNA_LOGURL + config.LOGDNA_HEALTHCHECK
                , method: 'POST'
                , body: JSON.stringify({
                    e: 's'
                    , m: process.memoryUsage()
                })
                , headers: config.DEFAULT_REQ_HEADERS
                , qs: {
                    timestamp: Date.now()
                }
            }, (err, res, body) => {
                console.log(body)
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
                        return utils.updateSelf();
                    }
                    if (config.restart === true) {
                        log('LogDNA Agent Restart Request Received - Restarting...');
                        return utils.restartSelf();
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
                    winUtils.streamEventLog(config);
                }
                firstrun = false;
            } else {
                log('Streaming Resumed after HealthCheck Call');
            }

            return setTimeout(() => {
                return checkHealth(config);
            }, config.HEALTHCHECK_INTERVAL); // Every 30 Minutes
        });
    }
};

// Initiate Connection
const connectLogServer = (config) => {
    firstrun = true;
    debug(config.LOGDNA_LOGURL);
    config.proxy = getProxyFromURI(url.parse(config.LOGDNA_LOGURL));
    config.req = request.defaults({
        agent: new Agent.HttpsAgent(config.proxy ? url.parse(config.proxy) : {
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
    });
    config.exclude_regex = config.exclude_regex && new RegExp(config.exclude_regex);
    linebuffer.setConfig(config);
    config.flushtimeout = setTimeout(linebuffer.flush, config.FLUSH_INTERVAL);
    return checkHealth(config);
};

module.exports.connectLogServer = connectLogServer;
