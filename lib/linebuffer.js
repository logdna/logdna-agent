// External Modules
const debug = require('debug')('logdna:lib:linebuffer');
const zlib = require('zlib');

// Internal Modules
const log = require('./log');

// Variables
var buf = [];
var dccount = 0;
var httperr;
var config = require('./config');

const flush = (conn) => {
    conn.flushtimeout = setTimeout(() => {
        flush(conn);
    }, config.FLUSH_INTERVAL);
    if (buf.length === 0) return;
    if (httperr && config.TRANSPORT === 'http') {
        if (Date.now() - httperr < config.HTTP_TIMEOUT / 2) {
            dccount = buf.length;
            return;
        } else {
            httperr = Date.now(); // reset
            debug('req re-attempting');
        }
    }

    var sendbuf = {
        e: 'ls'
        , ls: buf
    };

    buf = [];

    var data = JSON.stringify(sendbuf);

    if (config.TRANSPORT === 'http') {
        const posthandler = (err, res, body) => {
            if (err) {
                debug('req error ' + err.code + ': ' + err);
                if (config.HTTP_RETRY && config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(err.code)) {
                    if (!httperr) {
                        httperr = Date.now();
                    }

                    // queue and retry request
                    if (conn.queue) {
                        conn.queue.push(JSON.stringify(sendbuf.ls), (error) => {
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

        if (conn.req) {
            if (config.COMPRESS) {
                zlib.gzip(data, {
                    level: config.GZIP_COMPRESS_LEVEL
                }, (err, out) => {
                    conn.req.post(config.LOGDNA_LOGURL + config.LOGDNA_LOGENDPOINT, {
                        body: out
                        , headers: config.DEFAULT_REQ_HEADERS_GZIP
                        , qs: {
                            timestamp: Date.now()
                        }
                    }, posthandler);
                    out = null;
                });

            } else {
                conn.req.post(config.LOGDNA_LOGURL + config.LOGDNA_LOGENDPOINT, {
                    body: data
                    , headers: config.DEFAULT_REQ_HEADERS
                    , qs: {
                        timestamp: Date.now()
                    }
                }, posthandler);
            }
        }

    }

    debug('sending ' + sendbuf.ls.length + ' lines, ' + data.length + ' bytes via ' + config.TRANSPORT);

    if (config.bufferStats) {
        config.bufferStats.flushsize += sendbuf.ls.length;
        config.bufferStats.flushcount++;
    }

    if (dccount > 0 && !httperr) {
        log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

const addMessage = (conn, message) => {

    if (buf.length > config.BUF_LIMIT) {
        debug('buffer limit exceeded ' + buf.length);
        config.bufferStats.buflimit++;
        return;
    }

    if (message.l.length > config.MAX_LINE_LENGTH) {
        debug('super long line ' + message.l.length);
        config.bufferStats.longlines++;
        message.l = message.l.substring(0, config.MAX_LINE_LENGTH) + ' (cut off, too long...)';
    }

    if (conn.exclude_regex && conn.exclude_regex.test(message.l)) {
        debug('excluded regex line ' + message.l);
        config.bufferStats.excludelines++;
        return;
    }

    buf.push(message);
    if (config.bufferStats) {
        config.bufferStats.lines++;
    }

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        config.bufferStats.flushlimit++;
        if (conn.flushtimeout) {
            clearTimeout(conn.flushtimeout);
        }
        setImmediate(() => {
            flush(conn);
        });
    }
};

// Module Exports
module.exports.addMessage = addMessage;
module.exports.flush = flush;
