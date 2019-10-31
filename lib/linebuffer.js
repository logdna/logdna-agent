// External Modules
const debug = require('debug')('logdna:lib:linebuffer');
const fs = require('fs');
const Queue = require('file-queue').Queue;
const zlib = require('zlib');

// Internal Modules
const utils = require('./utils');

// Variables
var buf = [];
var bufferStats = {
    lines: 0
    , buflimit: 0
    , longlines: 0
    , flushlimit: 0
    , flushsize: 0
    , flushcount: 0
    , ts: Date.now()
    , excludelines: 0
};
var config = require('./config');
var dccount = 0;
var httperr;
var queue;

// check response to see need for buffering into queue
const checkResponse = (error, response, body) => {
    if (error) {
        debug('req error ' + error.code + ': ' + error);
        if (!httperr) { httperr = Date.now(); }
        if (bufferStats.flushcount % 10 === 0) { utils.log('request error: ' + error); }
        return config.HTTP_RETRY && config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(error.code);
    }

    if (response) {
        if (response.statusCode !== 200) {
            debug('req failed: ' + body);
            if (bufferStats.flushcount % 10 === 0) { utils.log('request failed: ' + body); }
            return response.statusCode >= 500;
        } else {
            if (httperr) {
                debug('req succeeded, re-enabling');
                httperr = null;
            }
        }
    }

    return false;
};

const flush = () => {
    config.flushtimeout = setTimeout(flush, config.FLUSH_INTERVAL);
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
            if (checkResponse(err, res, body)) {
                // queue and retry request
                if (queue) {
                    queue.push(JSON.stringify(sendbuf.ls), (error) => {
                        if (error) { utils.log('FQ error: ' + error); }
                        debug('fq queued payload of ' + sendbuf.ls.length + ' lines');

                        // clear for http
                        sendbuf = null;
                        data = null;
                    });
                } else {
                    if (!fs.existsSync(config.FILEQUEUE_PATH)) fs.mkdirSync(config.FILEQUEUE_PATH);
                    queue = new Queue(config.FILEQUEUE_PATH, (err) => {
                        if (err) { return utils.log(`Error in Creating FQ @ ${config.FILEQUEUE_PATH}: ${err}`); }

                        queue.length((err, length) => {
                            if (length > 0) { utils.log(`Retry buffer has ${length} previously failed payloads.`); }
                        });

                        const processQueue = () => {
                            queue.length((err, length) => {
                                if (length === 0) { return setTimeout(processQueue, config.HTTP_TIMEOUT);}

                                queue.pop((err, payload) => {
                                    if (err) {
                                        utils.log(`FQ Pop Error: ${err}`);
                                        return setImmediate(processQueue);
                                    }

                                    if (!payload) { return setImmediate(processQueue); }

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

                return; // prevent fallthru
            }

            // clear for http
            sendbuf = null;
            data = null;
        };

        if (config.req) {
            if (config.COMPRESS) {
                zlib.gzip(data, {
                    level: config.GZIP_COMPRESS_LEVEL
                }, (err, out) => {
                    config.req({
                        body: out
                        , headers: config.DEFAULT_REQ_HEADERS_GZIP
                        , qs: {
                            timestamp: Date.now()
                        }
                    }, posthandler);
                    out = null;
                });

            } else {
                config.req({
                    body: data
                    , qs: {
                        timestamp: Date.now()
                    }
                }, posthandler);
            }
        }

    }

    debug('sending ' + sendbuf.ls.length + ' lines, ' + data.length + ' bytes via ' + config.TRANSPORT);

    if (bufferStats) {
        bufferStats.flushsize += sendbuf.ls.length;
        bufferStats.flushcount++;
    }

    if (dccount > 0 && !httperr) {
        utils.log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

const addMessage = (message) => {

    if (buf.length > config.BUF_LIMIT) {
        debug('buffer limit exceeded ' + buf.length);
        bufferStats.buflimit++;
        return;
    }

    if (message.l.length > config.MAX_LINE_LENGTH) {
        debug('super long line ' + message.l.length);
        bufferStats.longlines++;
        message.l = message.l.substring(0, config.MAX_LINE_LENGTH) + ' (cut off, too long...)';
    }

    if (config.exclude_regex && config.exclude_regex.test(message.l)) {
        debug('excluded regex line ' + message.l);
        bufferStats.excludelines++;
        return;
    }

    buf.push(message);
    if (bufferStats) { bufferStats.lines++; }

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        bufferStats.flushlimit++;
        if (config.flushtimeout) { clearTimeout(config.flushtimeout); }
        setImmediate(flush);
    }
};

const setConfig = (conf) => { config = conf; };

// Module Exports
module.exports.addMessage = addMessage;
module.exports.flush = flush;
module.exports.setConfig = setConfig;
