/* globals describe, it */
require('../helpers/before');
var assert = require('assert');
var requireUncached = require('require-uncached');
var debug = require('debug')('logdna:test:lib:windows-utilities');
var provider = 'testapp';
var os = require('os');

describe('lib:windows-utilities', function() {
    if (os.platform() !== 'win32') {
        return;
    }

    var EventLogger = require('node-windows').EventLogger;
    var log = new EventLogger(provider);

    describe('#streamEventLog()', function() {
        it('streams event logs to a socket', function() {
            this.timeout(100000);
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:40002');
            var socket = new MockWebSocket('ws://localhost:40002');
            socket.connected = true;
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            var windowsUtilities = requireUncached('../../lib/windows-utilities');

            return new Promise((resolve) => {
                server.on('message', data => {
                    debug('received message!');
                    debug(data);
                    console.log(data);
                    var message = JSON.parse(data);
                    var line = message.ls[0].l;
                    assert.equal(JSON.parse(line).Message, 'arbitraryData');
                    resolve(true);
                });

                setInterval(() => {
                    log.info('arbitraryData');
                }, 1000);

                windowsUtilities.streamEventLog({
                    event: 'APPLICATION'
                }, socket);
                debug(socket);
            });
        });
    });
});

