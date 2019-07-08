// External Modules
const debug = require('debug')('logdna:lib:windows-utilities');

// Internal Modules
const log = require('./log');
const linebuffer = require('./linebuffer');
const WinEventLogProcessor = require('./welp');

// Stream the Logs
const streamEventLog = (config) => {
    linebuffer.setConfig(config);
    if (config.winevent) {
        const winEvent = new WinEventLogProcessor({
            events: config.winevent
        });
        log('Streaming logs from ' + config.winevent.join(', ') + ' events');
        winEvent.on('data', (logObjects) => {
            debug('Number of log objects found: ' + logObjects.length);
            logObjects.forEach((logObject) => {
                linebuffer.addMessage({
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
    }
};

// Module Exports
module.exports.streamEventLog = streamEventLog;
