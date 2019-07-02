// External Modules
const debug = require('debug')('logdna:lib:windows-utilities');

// Internal Modules
const log = require('./log');
const linebuffer = require('./linebuffer');
const WinEventLogProcessor = require('./welp');

// Stream the Logs
const streamEventLog = (conn, options) => {

    const winEvent = new WinEventLogProcessor(options);
    log('Streaming logs from ' + options.events.join(', ') + ' events');
    winEvent.on('data', (logObjects) => {
        debug('Number of log objects found: ' + logObjects.length);
        logObjects.forEach((logObject) => {
            linebuffer.addMessage(conn, {
                e: 'l'
                , t: Date.now()
                , l: logObject
                , f: 'winagent'
            });
        });
    });

    winEvent.on('error', (err) => {
        log('Event log error: ' + err);
    });

    winEvent.streamEvents();
};

// Module Exports
module.exports.streamEventLog = streamEventLog;
