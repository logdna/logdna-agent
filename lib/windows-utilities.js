var WinEventLogProcessor = require('./welp');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var linebuffer = require('./linebuffer');

module.exports.streamEventLog = function(options) {

    options = options || {};

    if (options.startTime) options.startTime = new Date(Date.now());
    if (options.frequency) options.frequency = 2000;

    var winEvent = new WinEventLogProcessor(options);

    winEvent.on('data', logObjects => {
        // logObjects is an Array
        debug('Number of log objects found: ' + logObjects.length);
        logObjects.forEach(logObject => {
            linebuffer.addMessage({
                e: 'l'
                , t: Date.now()
                , l: logObject.message
                , f: {
                    providerName: logObject.providerName
                    , logName: logObject.logName
                    , levelName: logObject.levelDisplayName
                    , level: logObject.level
                    , machine: logObject.machineName
                    , time: logObject.timeCreated
                }
            });
        });
    });

    winEvent.on('error', err => {
        log('Event log error: ' + err);
    });

    winEvent.start();
};
