var WinEventLogProcessor = require('./welp');
var debug = require('debug')('logdna:lib:file-utilities');
var _ = require('lodash');
var log = require('./log');
var linebuffer = require('./linebuffer');
var utils = require('./utils');

module.exports.streamEventLog = function(options) {

    options = options || {};

    if (!options.startTime) {
        options.startTime = new Date(Date.now());
    }
    if (!options.frequency) {
        options.frequency = 10000;
    }

    var winEvent = new WinEventLogProcessor(options);

    winEvent.on('data', logObjects => {
        // logObjects is an Array
        debug('Number of log objects found: ' + logObjects.length);
        logObjects.forEach(logObject => {
            if (!_.isEmpty(logObject)) {
                const compressed = utils.compressWinLogObject(logObject);
                const line = JSON.stringify(compressed.obj);
                linebuffer.addMessage({
                    e: 'l'
                    , t: Date.now()
                    , l: line
                    , f: compressed.app
                });
            }
        });
    });

    winEvent.on('error', err => {
        log('Event log error: ' + err);
    });

    winEvent.start();
};
