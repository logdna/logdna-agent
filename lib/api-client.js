// External Modules
const async = require('async');
const request = require('request');

// Internal Modules
const debug = require('debug')('logdna:lib:api-client');
const log = require('./log');
const pkg = require('../package.json');

module.exports.getAuthToken = (config, agentName) => {

    log(`Authenticating API Key with ${config.LOGDNA_APIHOST + (config.LOGDNA_APISSL ? ' (SSL)' : '')}...`);

    var url = (config.LOGDNA_APISSL ? 'https://' : 'http://') + config.LOGDNA_APIHOST + '/authenticate/' + config.key;
    var postdata = {
        hostname: config.hostname
        , mac: config.mac
        , ip: config.ip
        , tags: config.tags
        , platform: config.platform
        , agentname: agentName
        , agentversion: pkg.version
        , osdist: config.osdist
        , awsid: config.awsid
        , awsregion: config.awsregion
        , awsaz: config.awsaz
        , awsami: config.awsami
        , awstype: config.awstype
    };

    debug(url);
    debug(postdata);

    return new Promise((resolve) => {
        return async.retry({
            times: 5
            , interval: (retryCount) => {
                return 100 * Math.pow(2, retryCount);
            }
            , errorFilter: (err) => {
                return config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code);
            }
        }, (reqCallback) => {
            return request.post(url, {
                body: postdata
                , json: true
                , headers: {
                    'user-agent': config.UA
                }
            }, (err, res, body) => {
                return reqCallback(err, Object.assign(body, {
                    statusCode: res.statusCode
                }));
            });
        }, (err, body) => {
            if (err) {
                log(`Authentication Error: ${err}`);
                return resolve();
            }

            debug(body);

            if (body.statusCode !== 200) {
                log(`Authentication Error: ${body.statusCode}: ${JSON.stringify(body)}`);
                return resolve();
            }

            if (body.apiserver && body.apiserver !== config.LOGDNA_APIHOST) {
                config.LOGDNA_APIHOST = body.apiserver;
                config.LOGDNA_APISSL = body.apissl;
                return resolve(exports.getAuthToken(config, agentName));
            }

            log(`Authentication Success - Token: ${body.token}`);

            // if LDLOGHOST specified in env, ignore api server's return values
            if (process.env.LDLOGHOST || process.env.LDLOGPORT) {
                config.LOGDNA_LOGHOST = config.LOGDNA_LOGHOST || 'logs.logdna.com';
                config.LOGDNA_LOGPORT = config.LOGDNA_LOGPORT || 443;
            } else {
                config.LOGDNA_LOGHOST = body.server;
                config.LOGDNA_LOGPORT = body.port;
                config.LOGDNA_LOGSSL = body.ssl;
            }

            config.auth_token = body.token;

            if (!process.env.TRANSPORT && body.transport) {
                config.TRANSPORT = body.transport;
            }

            if (!process.env.TAIL_MODE && body.tailmode) {
                config.TAIL_MODE = body.tailmode;
            }

            if (!process.env.COMPRESS && body.compress !== undefined) {
                config.COMPRESS = body.compress;
            }

            log(`Compression Mode: ${(!!config.COMPRESS ? 'compressed, ' : '')}Tail Mode: ${config.TAIL_MODE}, Transport: ${config.TRANSPORT}`);

            return resolve();
        });
    });
};
