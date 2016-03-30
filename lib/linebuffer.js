var _ = require('lodash');
var debug = require('debug')('logdna:lib:linebuffer');
var log = require('./log');
var config = require('./config');

var buf = [];
var buftimeout = null;

module.exports.addMessage = function (message) {
    if (buftimeout && buf.length < 10000) {
        debug('buffering data!');
        buf.push(message);
    }
};

module.exports.flush = function (socket) {
    // send any buffered data
    if (buf.length) {
        _.each(buf, function (data) {
            socket.send(data);
        });

        log('Sent ' + buf.length + ' lines queued from earlier disconnection');
        buf = [];
    }
};

module.exports.clearAfterTimeout = function () {
    // clear buffer if disconnected for more than 120s
    buftimeout = setTimeout(function () {
        buf = [];
        buftimeout = null;
    }, config.BUF_TIMEOUT);
};

module.exports.cancelTimeout = function () {
    clearTimeout(buftimeout);
};
