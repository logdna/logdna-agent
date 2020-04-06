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
const utils = require('./utils');
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
            , errorFilter: (error) => {
                return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(error) || error === 'INTERVAL_SERVER_ERROR';
            }
        }, (reqCallback) => {
            return config.req({
                url: utils.buildUrl(config.LOGDNA_LOGHOST, config.LOGDNA_LOGPORT, config.LOGDNA_LOGSSL, config.LOGDNA_HEALTHCHECK)
                , body: JSON.stringify({
                    e: 's'
                    , m: process.memoryUsage()
                })
                , qs: {
                    timestamp: Date.now()
                }
            }, (error, response, body) => {
                if (error) return reqCallback(error.code);
                if (response && response.statusCode >= 500) return reqCallback('INTERVAL_SERVER_ERROR');
                return reqCallback(null, Object.assign({}, JSON.parse(body || '{}'), {
                    statusCode: response.statusCode
                }));
            });
        }, (error, body) => {
            if (error) {
                utils.log(`error from healthcheck endpoint: ${error}`, 'error');
            } else if (body && body.statusCode === 200) {
                if (body.autoupdate === true) {
                    if (config.autoupdate !== 0) {
                        utils.log('update request received - auto-updating...');
                        return utils.updateSelf();
                    }
                } else if (body.restart === true) {
                    utils.log('restart request received - restarting...');
                    return utils.restartSelf();
                }
                if (body.endpoint) {
                    config.LOGDNA_LOGHOST = body.endpoint;
                    config.req = config.req.defaults({
                        url: utils.buildUrl(config.LOGDNA_LOGHOST, config.LOGDNA_LOGPORT, config.LOGDNA_LOGSSL, config.LOGDNA_LOGENDPOINT)
                    });
                    linebuffer.setConfig(config);
                }
            } else {
                utils.log(`response from healthcheck endpoint: ${JSON.stringify(body)}`);
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
                utils.log('streaming resumed after healthcheck call');
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
    let logurl = utils.buildUrl(config.LOGDNA_LOGHOST, config.LOGDNA_LOGPORT, config.LOGDNA_LOGSSL);
    debug(`LogDNA URL: ${logurl}`);
    config.proxy = getProxyFromURI(url.parse(logurl));
    config.req = request.defaults({
        agent: new Agent.HttpsAgent(config.proxy ? url.parse(config.proxy) : {
            maxSockets: config.MAX_SOCKETS
            , freeSocketTimeout: config.HTTP_KEEPALIVE
        })
        , auth: {
            user: 'x'
            , pass: config.key
        }
        , headers: config.DEFAULT_REQ_HEADERS
        , method: 'POST'
        , qs: {
            compress: config.COMPRESS ? 1 : 0
            , hostname: config.hostname
            , ip: config.ip
            , mac: config.mac
            , tags: config.tags
            , tailmode: config.TAIL_MODE !== 'trs' ? config.TAIL_MODE : undefined
            , timestamp: Date.now()
            , transport: 'http'
        }
        , timeout: config.HTTP_TIMEOUT
        , url: utils.buildUrl(config.LOGDNA_LOGHOST, config.LOGDNA_LOGPORT, config.LOGDNA_LOGSSL, config.LOGDNA_LOGENDPOINT)
    });
    config.exclude_regex = config.exclude_regex && new RegExp(config.exclude_regex);
    linebuffer.setConfig(config);
    config.flushtimeout = setTimeout(linebuffer.flush, config.FLUSH_INTERVAL);
    return checkHealth(config);
};

module.exports.connectLogServer = connectLogServer;
