var debug = require('debug')('logdna:lib:linebuffer');
var log = require('./log');
var config = require('./config');
var zlib = require('zlib');
var request = require('request');
var Agent = require('agentkeepalive');

var reqheaders = { 'Content-Type': 'application/json; charset=UTF-8' };
var reqheadersgzip = { 'Content-Type': 'application/json; charset=UTF-8', 'Content-Encoding': 'gzip' };
var req;
var buf = [];
var socket;
var flushtimeout;
var dccount = 0;
var httperr;

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

    buf.push(message);
    if (config.bufferStats) { config.bufferStats.lines++; }

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        config.bufferStats.flushlimit++;
        clearTimeout(flushtimeout);
        exports.flush();
    }
};

var posthandler = function(err, res, body) {
    if (err) {
        debug('req error: ' + err);
        if (config.bufferStats.flushcount % 10 === 0) {
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
        if (Date.now() - httperr < config.HTTP_TIMEOUT * 2) {
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
        if (config.COMPRESS) {
            zlib.gzip(data, function(err, out) {
                req.post(socket.address + '/logs/agent', { body: out, headers: reqheadersgzip, qs: { timestamp: Date.now() }}, posthandler);
                out = null;
            });

        } else {
            req.post(socket.address + '/logs/agent', { body: data, headers: reqheaders, qs: { timestamp: Date.now() }}, posthandler);
        }

    } else if (config.TRANSPORT === 'websocket') {
        socket.send(data);
    }

    debug('sending ' + sendbuf.ls.length + ' lines, ' + data.length + ' bytes');

    config.bufferStats.flushsize += sendbuf.ls.length;
    config.bufferStats.flushcount++;
    sendbuf = null;
    data = null;

    if (dccount > 0 && !httperr) {
        log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

module.exports.setSocket = function(sock) {
    socket = sock;

    if (!req) {
        req = request.defaults({
            agent: (config.LOGDNA_LOGSSL ? new Agent.HttpsAgent({ maxSockets: config.MAX_SOCKETS, keepAliveTimeout: config.HTTP_KEEPALIVE }) : new Agent({ maxSockets: config.MAX_SOCKETS, keepAliveTimeout: config.HTTP_KEEPALIVE })),
            auth: { user: 'x', pass: config.key },
            qs: { hostname: config.hostname, mac: config.mac, ip: config.ip },
            timeout: config.HTTP_TIMEOUT
        });
    }

    // kick off initial flush
    if (!flushtimeout) {
        exports.resetStats();
        flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    }
};

module.exports.resetStats = function() {
    config.bufferStats = { lines: 0, buflimit: 0, longlines: 0, flushlimit: 0, flushsize: 0, flushcount: 0, ts: Date.now() };
};
