var debug = require('debug')('logdna:lib:linebuffer');
var log = require('./log');
var config = require('./config');
var zlib = require('zlib');
var request = require('request');
var Agent = require('agentkeepalive');
var Queue = require('file-queue').Queue;

var reqheaders = { 'Content-Type': 'application/json; charset=UTF-8' };
var reqheadersgzip = { 'Content-Type': 'application/json; charset=UTF-8', 'Content-Encoding': 'gzip' };
var req;
var buf = [];
var socket;
var flushtimeout;
var dccount = 0;
var httperr;
var exclude_regex;
var queue;

module.exports.addMessage = function(message) {
    if (buf.length > config.BUF_LIMIT) {
        debug('buffer limit exceeded ' + buf.length);
        config.bufferStats.buflimit++;
        return;
    }

    if (message.l.length > 32000) {
        debug('super long line ' + message.l.length);
        config.bufferStats.longlines++;
        message.l = message.l.substring(0, 32000) + ' (cut off, too long...)';
    }

    if (exclude_regex && exclude_regex.test(message.l)) {
        debug('excluded regex line ' + message.l);
        config.bufferStats.excludelines++;
        return;
    }

    buf.push(message);
    if (config.bufferStats) { config.bufferStats.lines++; }

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        config.bufferStats.flushlimit++;
        clearTimeout(flushtimeout);
        setImmediate(exports.flush);
    }
};

module.exports.flush = function() {
    flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    if (buf.length === 0) return;
    if (!socket) return;
    if (!socket.connected && config.TRANSPORT === 'websocket') {
        dccount = buf.length;
        return;
    }
    if (httperr && config.TRANSPORT === 'http') {
        if (Date.now() - httperr < config.HTTP_TIMEOUT / 2) {
            dccount = buf.length;
            return;
        } else {
            httperr = Date.now(); // reset
            debug('req re-attempting');
        }
    }

    var sendbuf = { e: 'ls', ls: buf };
    buf = [];

    var data = JSON.stringify(sendbuf);

    if (config.TRANSPORT === 'http') {
        var posthandler = function(err, res, body) {
            if (err) {
                debug('req error ' + err.code + ': ' + err);
                if (config.HTTP_RETRY && ['ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'].indexOf(err.code) >= 0) {
                    if (!httperr) { httperr = Date.now(); }

                    // queue and retry request
                    if (queue) {
                        queue.push(JSON.stringify(sendbuf.ls), function(error) {
                            if (error) { log('FQ error: ' + error); }
                            debug('fq queued payload of ' + sendbuf.ls.length + ' lines');

                            // clear for http
                            sendbuf = null;
                            data = null;
                        });
                    }

                    return; // prevent fallthru

                } else if (config.bufferStats.flushcount % 10 === 0) {
                    if (!httperr) { httperr = Date.now(); }
                    log('Request error: ' + err);
                }

            } else if (res.statusCode !== 200) {
                debug('req failed: ' + body);
                if (config.bufferStats.flushcount % 10 === 0) {
                    log('Request failed: ' + body);
                }

            } else {
                if (httperr) {
                    debug('req succeeded, re-enabling');
                    httperr = null;
                }
            }

            // clear for http
            sendbuf = null;
            data = null;
        };

        if (config.COMPRESS) {
            zlib.gzip(data, { level: config.GZIP_COMPRESS_LEVEL }, function(err, out) {
                req.post(socket.address + '/logs/agent', { body: out, headers: reqheadersgzip, qs: { timestamp: Date.now() }}, posthandler);
                out = null;
            });

        } else {
            req.post(socket.address + '/logs/agent', { body: data, headers: reqheaders, qs: { timestamp: Date.now() }}, posthandler);
        }

    } else if (config.TRANSPORT === 'websocket') {
        socket.send(data);
    }

    debug('sending ' + sendbuf.ls.length + ' lines, ' + data.length + ' bytes via ' + config.TRANSPORT);

    if (config.bufferStats) {
        config.bufferStats.flushsize += sendbuf.ls.length;
        config.bufferStats.flushcount++;
    }

    if (config.TRANSPORT === 'websocket') {
        // clear for websocket
        sendbuf = null;
        data = null;
    }

    if (dccount > 0 && !httperr) {
        log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

module.exports.setSocket = function(sock) {
    socket = sock;

    if (!req) {
        req = request.defaults({
            agent: (config.LOGDNA_LOGSSL ? new Agent.HttpsAgent({ maxSockets: config.MAX_SOCKETS, keepAliveTimeout: config.HTTP_KEEPALIVE }) : new Agent({ maxSockets: config.MAX_SOCKETS, keepAliveTimeout: config.HTTP_KEEPALIVE }))
            , auth: { user: 'x', pass: config.key }
            , qs: { hostname: config.hostname, mac: config.mac, ip: config.ip, tags: config.tags }
            , timeout: config.HTTP_TIMEOUT
        });
    }

    // run once
    if (!flushtimeout) {
        exports.resetStats();
        exclude_regex = config.exclude_regex && new RegExp(config.exclude_regex);

        if (config.HTTP_RETRY) {
            queue = new Queue(config.FILEQUEUE_PATH, function(err) {
                if (err) { throw err; }
                queue.length(function(err, length) {
                    if (length > 0) {
                        log('Retry buffer has ' + length + ' previously failed payloads.');
                    }
                });

                var processQueue = function() {
                    queue.length(function(err, length) {
                        if (length === 0 || httperr || !socket.connected) return setTimeout(processQueue, config.HTTP_TIMEOUT);

                        queue.pop(function(err, payload) {
                            if (err) {
                                log('FQ poperr: ' + err);
                                return setImmediate(processQueue);
                            }
                            if (!payload) return setImmediate(processQueue);

                            payload = JSON.parse(payload);

                            if (Array.isArray(payload)) {
                                buf = payload.concat(buf);
                                debug('fq flushed ' + payload.length + ' lines');
                            }

                            setTimeout(processQueue, config.FLUSH_INTERVAL * 4);
                        });
                    });
                };

                // start processing q in 5s
                setTimeout(processQueue, 5000);
            });
        }

        flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    }
};

module.exports.resetStats = function() {
    config.bufferStats = { lines: 0, buflimit: 0, longlines: 0, flushlimit: 0, flushsize: 0, flushcount: 0, ts: Date.now(), excludelines: 0 };
};

module.exports.setConfig = function(cfg) {
    config = cfg;
};
