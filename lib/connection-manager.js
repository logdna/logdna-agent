// External Modules
const async = require('async');
const debug = require('debug')('logdna:lib:connection-manager');
const os = require('os');
const url = require('url');
const HttpsProxyAgent = require('https-proxy-agent');

// Internal Modules
const fileUtils = require('./file-utilities');
const winUtils = require('./windows-utilities');
const linebuffer = require('./linebuffer');
const WebSocket = require('./logdna-websocket');
const getProxyFromURI = require('./getProxyFromURI');

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
    var proxy = getProxyFromURI(url.parse(logurl));
    if (proxy) options.agent = new HttpsProxyAgent(url.parse(proxy));
    debug(logurl);
    const socket = new WebSocket(logurl, options);
    const req = linebuffer.setConnection(logurl, options);
    return new Promise((resolve) => {
        async.retry({
            times: 5
            , interval: 100
            , errorFilter: (err) => {
                return [
                    'ETIMEDOUT'
                    , 'ECONNRESET'
                    , 'EHOSTUNREACH'
                    , 'ETIMEDOUT'
                    , 'ESOCKETTIMEDOUT'
                    , 'ECONNREFUSED'
                    , 'ENOTFOUND'
                ].indexOf(err.code) >= 0;
            }
        }, (reqCallback) => {
            return req.post(`${logurl}${config.LOGDNA_LOGENDPOINT}`, {
                body: JSON.stringify({
                    e: 'ls'
                    , ls: [{
                        e: 'l'
                        , l: `Connected to ${config.LOGDNA_LOGHOST}:${config.LOGDNA_LOGPORT} ${(config.LOGDNA_LOGSSL ? ' (SSL)' : '')}${(proxy ? ' via ' + proxy : '')}`
                        , t: Date.now()
                        , f: config && config.UA && config.UA.split('/')[0] || 'logdna-agent-test'
                    }]
                })
                , headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                }
            }, (error, response, body) => {
                if (error) return reqCallback(error);
                return reqCallback(null, body);
            });
        }, (error, result) => {
            if (result) {
                fileUtils.streamAllLogs(config);

                if (os.platform() === 'win32' && config.winevent) {
                    if (typeof config.winevent === 'string') {
                        config.winevent = config.winevent.split(',');
                    }

                    winUtils.streamEventLog({
                        events: config.winevent
                    });

                }
            }
            return resolve(socket);
        });
    });
};
