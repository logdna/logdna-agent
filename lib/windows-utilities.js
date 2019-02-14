const WinEventLogProcessor = require('./welp');
const debug = require('debug')('logdna:lib:file-utilities');
const log = require('./log');
const linebuffer = require('./linebuffer');

module.exports.streamEventLog = function(options) {

    const winEvent = new WinEventLogProcessor(options);
    log('Streaming logs from ' + options.events.join(', ') + ' events');
    winEvent.on('data', function(logObjects) {
        debug('Number of log objects found: ' + logObjects.length);
        logObjects.forEach(function(logObject) {
            linebuffer.addMessage({
                e: 'l'
                , t: Date.now()
                , l: logObject
                , f: 'winagent'
            });
        });
    });

    winEvent.on('error', function(err) {
        log('Event log error: ' + err);
    });

    winEvent.streamEvents();
};
