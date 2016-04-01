var debug = require('debug')('logdna:lib:linebuffer');
var log = require('./log');
var config = require('./config');

var buf = [];
var socket;
var flushtimeout;
var dccount = 0;

module.exports.addMessage = function (message) {
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
    if (config.bufferStats) config.bufferStats.lines++;

    // flush immediately if limit reached
    if (buf.length === config.FLUSH_LIMIT) {
        debug('flush limit reached, flushing...');
        config.bufferStats.flushlimit++;
        clearTimeout(flushtimeout);
        exports.flush();
    }
};

module.exports.flush = function () {
    flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    if (buf.length === 0) return;
    if (!socket) return;
    if (!socket.connected) {
        dccount = buf.length;
        return;
    }

    var sendbuf = { e: 'ls', ls: buf };
    buf = [];

    var data = JSON.stringify(sendbuf);
    socket.send(data);
    debug('sending ' + sendbuf.ls.length + ' lines, ' + data.length + " bytes");

    config.bufferStats.flushsize += sendbuf.length;
    config.bufferStats.flushcount++;
    sendbuf = null;
    data = null;

    if (dccount > 0) {
        log('Sent ' + dccount + ' lines queued from earlier disconnection');
        dccount = 0;
    }
};

module.exports.setSocket = function (sock) {
    socket = sock;

    // kick off initial flush
    if (!flushtimeout) {
        exports.resetStats();
        flushtimeout = setTimeout(exports.flush, config.FLUSH_INTERVAL);
    }
};

module.exports.resetStats = function () {
    config.bufferStats = { lines: 0, buflimit: 0, longlines: 0, flushlimit: 0, flushsize: 0, flushcount: 0, ts: Date.now() };
};
