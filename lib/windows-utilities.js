var WinEventLogProcessor = require('./welp');
var debug = require('debug')('logdna:lib:file-utilities');
var _ = require('lodash');
var log = require('./log');
var linebuffer = require('./linebuffer');
var utils = require('./utils');

module.exports.streamEventLog = function(options) {

    var winEvent = new WinEventLogProcessor(options);
    log('Streaming logs from ' + options.events.join(', ') + ' events');
    winEvent.on('data', logObjects => {
        debug('Number of log objects found: ' + logObjects.length);
        logObjects.forEach(logObject => {
            linebuffer.addMessage({
                e: 'l'
                , t: Date.now()
                , l: logObject
                , f: 'winagent'
            });
        });
    });

    winEvent.on('error', err => {
        log('Event log error: ' + err);
    });

    winEvent.streamEvents();
};
