// External Modules
var request = require('request');

// Internal Modules
var debug = require('debug')('logdna:lib:api-client');
var log = require('./log');
var pkg = require('../package.json');

module.exports.getAuthToken = (config, agentName) => {
    log('Authenticating API Key with ' + config.LOGDNA_APIHOST + (config.LOGDNA_APISSL ? ' (SSL)' : '') + '...');
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
        request.post(url, {
            body: postdata
            , json: true, headers: {
                'user-agent': config.UA
            }
        }, (err, res, body) => {
            if (err) {
                log('Auth error: ' + err);
                debug(err);
                if (config.authtimeout) {
                    clearTimeout(config.authtimeout);
                }

                config.authtimeout = setTimeout(() => {
                    resolve(exports.getAuthToken(config, agentName));
                }, config.AUTHERROR_DELAY);
                return;
            }

            debug(body);
            if (res.statusCode !== 200) {
                // got error, try again after appropriate delay
                log('Auth error: ' + res.statusCode + ': ' + JSON.stringify(body));
                if (config.authtimeout) {
                    clearTimeout(config.authtimeout);
                }

                config.authtimeout = setTimeout(() => {
                    resolve(exports.getAuthToken(config, agentName));
                }, config.AUTHFAIL_DELAY);
                return;
            }

            // api redirect?
            if (body.apiserver && body.apiserver !== config.LOGDNA_APIHOST) {
                // new api server, update and try again
                config.LOGDNA_APIHOST = body.apiserver;
                config.LOGDNA_APISSL = body.apissl;

                return resolve(exports.getAuthToken(config, agentName));
            }

            log('Auth success, got token: ' + body.token);

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

            log('Using modes: ' + (!!config.COMPRESS ? 'compressed, ' : '') + 'tailmode: ' + config.TAIL_MODE + ', transport: ' + config.TRANSPORT);

            resolve();
        });
    });
};
