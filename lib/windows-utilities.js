var WinEventLogProcessor = require('./welp');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var linebuffer = require('./linebuffer');

module.exports.streamEventLog = function(options = undefined) {

    if (!options) {
        options = {
            startTime: new Date(Date.now())
            , frequency: 2000
        };
    }

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
                , l: logObject.message || null
                , f: {
                    providerName: logObject.providerName || null
                    , logName: logObject.logName || null
                    , levelName: logObject.levelDisplayName || null
                    , level: logObject.level || null
                    , machine: logObject.machineName || null
                    , time: logObject.timeCreated || null
                }
            });
        });
    });

    winEvent.on('error', err => {
        log('Event log error: ' + err);
    });

    winEvent.start();
};
