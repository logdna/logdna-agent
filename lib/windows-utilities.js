// External Modules
const debug = require('debug')('logdna:lib:windows-utilities');

// Internal Modules
const log = require('./utils').log;
const linebuffer = require('./linebuffer');
const WinEventLogProcessor = require('./welp');

// Stream the Logs
const streamEventLog = (config) => {
    linebuffer.setConfig(config);
    if (config.winevent) {
        const winEvent = new WinEventLogProcessor({
            events: config.winevent
        });
        log('streaming logs from ' + config.winevent.join(', ') + ' events');
        winEvent.on('data', (logObjects) => {
            debug('# of log objects found: ' + logObjects.length);
            logObjects.forEach((logObject) => {
                linebuffer.addMessage({
                    e: 'l'
                    , t: Date.now()
                    , l: logObject
                    , f: 'winagent'
                });
            });
        });

        winEvent.on('error', (error) => log(`windows event logging error: ${error}`, 'error'));
        winEvent.streamEvents();
    }
};

// Module Exports
module.exports.streamEventLog = streamEventLog;
