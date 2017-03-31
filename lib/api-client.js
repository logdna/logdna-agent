var debug = require('debug')('logdna:lib:api-client');
var log = require('./log');
var got = require('got');
var pkg = require('../package.json');

module.exports.getAuthToken = function(config, agentName, socket) {
    log('Authenticating API Key with ' + config.LOGDNA_APIHOST + (config.LOGDNA_APISSL ? ' (SSL)' : '') + '...');
    var url = (config.LOGDNA_APISSL ? 'https://' : 'http://') + config.LOGDNA_APIHOST + '/authenticate/' + config.key;
    var postdata = {
        hostname: config.hostname,
        mac: config.mac,
        ip: config.ip,
        tags: config.tags,
        platform: config.platform,
        agentname: agentName,
        agentversion: pkg.version,
        osdist: config.osdist,
        awsid: config.awsid,
        awsregion: config.awsregion,
        awsaz: config.awsaz,
        awsami: config.awsami,
        awstype: config.awstype
    };
    debug(url);
    debug(postdata);
    return got.post(url, { body: postdata, json: true, headers: { 'user-agent': config.UA } })
    .then(res => {
        var body = res.body;
        debug(body);
        if (res.statusCode !== 200) {
            // got error, try again after appropriate delay
            log('Auth error: ' + res.statusCode + ': ' + JSON.stringify(body));
            if (config.authtimeout) {
                clearTimeout(config.authtimeout);
            }

            return new Promise(resolve => {
                config.authtimeout = setTimeout(function() {
                    resolve(exports.getAuthToken(config, agentName, socket));
                }, config.AUTHFAIL_DELAY);
            });
        }

        // api redirect?
        if (body.apiserver && body.apiserver !== config.LOGDNA_APIHOST) {
            // new api server, update and try again
            config.LOGDNA_APIHOST = body.apiserver;
            config.LOGDNA_APISSL = body.apissl;

            return new Promise(resolve => {
                resolve(exports.getAuthToken(config, agentName, socket));
            });
        }

        log('Auth success, got token: ' + body.token);

        // if LDLOGHOST specified in env, ignore api server's return values
        if (process.env.LDLOGHOST || process.env.LDLOGPORT) {
            config.LOGDNA_LOGHOST = config.LOGDNA_LOGHOST || 'logs.logdna.com';
            config.LOGDNA_LOGPORT = config.LOGDNA_LOGPORT || 443;
            config.LOGDNA_LOGSSL = config.LOGDNA_LOGSSL;

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

        if (socket) {
            debug('socket already exists');

            // already setup, replace address/query in existing websocket connection
            socket.address = (config.LOGDNA_LOGSSL ? 'https://' : 'http://') + config.LOGDNA_LOGHOST + ':' + config.LOGDNA_LOGPORT;
            socket.options.query.auth_token = body.token;
        }

        return;
    })
    .catch(err => {
        log('Auth error: ' + err);
        debug(err);
        if (config.authtimeout) {
            clearTimeout(config.authtimeout);
        }

        return new Promise(resolve => {
            config.authtimeout = setTimeout(function() {
                resolve(exports.getAuthToken(config, agentName, socket));
            }, config.AUTHERROR_DELAY);
        });
    });
};
