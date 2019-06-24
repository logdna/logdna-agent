/* globals describe, it, before, after */
require('../helpers/before');
// var WebSocketServer = require('ws').Server;
var fs = require('fs');
// var path = require('path');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:connection-manager');
var mockery = require('mockery');
var rimraf = require('rimraf');
// var skeemas = require('skeemas');
// var statsSchema = require('../helpers/message-schemas/stats');
// var logSchema = require('../helpers/message-schemas/log');
var tempDir = '.temp';

describe('lib:connection-manager', function() {
    var spawnResolve;
    var cpMock = {
        spawn: function(fileName, args) {
            assert.ok(fileName);
            assert(Array.isArray(args));
            debug(fileName);
            spawnResolve();
            return {
                unref: function() {}
            };
        }, exec: function(fileName, args) {
            debug('spawn called!');
            assert.ok(fileName);
            assert(typeof args, 'string');
            debug(fileName);
            spawnResolve();
        }
    };

    before((done) => {
        // setup spawn mock
        mockery.enable({
            warnOnUnregistered: false
            , useCleanCache: true
        });
        mockery.registerMock('child_process', cpMock);

        debug('cleaning up test folder...' + tempDir);
        return rimraf(tempDir, () => {
            fs.mkdirSync(tempDir);
            return done();
        });
    });

    after(function() {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('#connectLogServer', function() {
        // var port = 8080;
        // tests use live local web sockets so give plenty of timeout
        this.timeout(10000);
        it('send 5 stats messages at 50ms interval', function() {
            /** To Be Updated
            port++;
            const testServer = new WebSocketServer({ port: port });
            var messageCount = 0;
            var config = {
                autoupdate: 0
                , key: 'SOME_FAKE_KEY'
                , logdir: [tempDir]
                , UA: 'logdna-agent-test'
                , LOGDNA_LOGSSL: false
                , LOGDNA_LOGHOST: 'localhost'
                , LOGDNA_LOGPORT: port.toString()
                , LOGDNA_RECONNECT: false
                , TRANSPORT: 'websocket'
                , SOCKET_KEEPALIVE: -1
                , STATS_INTERVAL: 50
            };
            return new Promise(resolve => {
                testServer.on('connection', socket => {
                    debug('connection manager connected to socket');
                    socket.on('message', message => {
                        debug('received message:');
                        debug(message);
                        // validate message body
                        var validation = skeemas.validate(message, statsSchema);

                        assert(validation.valid, JSON.stringify(validation.errors));
                        // this is the expected message format of each frame
                        messageCount++;

                        if (messageCount === 5) {
                            debug('closing connection');
                            socket.close();
                            testServer.close();
                            config.STATS_INTERVAL = -1;
                            return resolve();
                        }
                    });
                });

                var linebuffer = require('../../lib/linebuffer');
                linebuffer.setConfig(config);

                var connectionManager = require('../../lib/connection-manager');
                connectionManager.connectLogServer(config, 'unitTestProgram');
            });
            **/
        });

        it('send log messages', function() {
            /** To Be Updated
            port++;
            const testServer = new WebSocketServer({ port: port });
            var config = {
                autoupdate: 0
                , auth_token: 'abcxyz'
                , key: 'SOME_FAKE_KEY'
                , logdir: [tempDir]
                , LOGDNA_LOGSSL: false
                , LOGDNA_LOGHOST: 'localhost'
                , LOGDNA_LOGPORT: port.toString()
                , LOGDNA_RECONNECT: false
                , TRANSPORT: 'websocket'
                , SOCKET_KEEPALIVE: -1
                , STATS_INTERVAL: -1
            };
            return new Promise(resolve => {
                testServer.on('connection', socket => {
                    debug('connected to socket');
                    socket.on('message', data => {
                        var message = JSON.parse(data);
                        // filter only for log messages
                        if (message.e === 'ls') {
                            debug('received message:');
                            debug(message.ls);
                            // validate message body
                            var validation = skeemas.validate(message.ls, logSchema);

                            assert(validation.valid, JSON.stringify(validation.errors));
                            // this is the expected message format of each frame

                            if (message.ls.length === 10) {
                                debug('closing connection');
                                socket.close();
                                testServer.close();
                                return resolve();
                            }
                        }
                    });
                });

                var linebuffer = require('../../lib/linebuffer');
                linebuffer.setConfig(config);

                var connectionManager = require('../../lib/connection-manager');
                // create test log file
                fs.writeFileSync(path.join(tempDir, 'streamtest1.log'), '');
                connectionManager.connectLogServer(config, 'unitTestProgram')
                    .then(() => {
                        setTimeout(function() {
                        // now simulate a program logging to a file
                            debug('simulating logging streamtest1.log');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData1\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData2\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData3\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData4\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData5\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData6\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData7\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData8\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData9\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData10\n');
                        }, 200);
                    });
            });
            **/
        });

        it('resume sending log messages after reconnect', function() {
            /** To Be Updated
            port++;
            const testServer = new WebSocketServer({ port: port });
            var messageCount = 0;
            var clientsocket;
            var config = {
                autoupdate: 0
                , auth_token: 'abcxyz'
                , key: 'SOME_FAKE_KEY'
                , logdir: [tempDir]
                , LOGDNA_LOGSSL: false
                , LOGDNA_LOGHOST: 'localhost'
                , LOGDNA_LOGPORT: port.toString()
                , LOGDNA_RECONNECT: true
                , TRANSPORT: 'websocket'
                , SOCKET_KEEPALIVE: -1
                , STATS_INTERVAL: -1
            };
            return new Promise(resolve => {
                testServer.on('connection', socket => {
                    debug('connected to socket');
                    socket.on('message', data => {
                        var message = JSON.parse(data);
                        // filter only for log messages
                        if (message.e === 'ls') {
                            debug('received message:');
                            debug(message.ls);
                            // validate message body
                            var validation = skeemas.validate(message.ls, logSchema);

                            assert(validation.valid, JSON.stringify(validation.errors));
                            // this is the expected message format of each frame
                            messageCount += message.ls.length;

                            if (messageCount === 5) {
                                // simulate disconnect from server
                                socket.close();

                            } else if (messageCount === 10) {
                                debug('closing connection');
                                clientsocket.reconnection = false;
                                socket.close();
                                testServer.close();
                                return resolve();
                            }
                        }
                    });
                });

                var linebuffer = require('../../lib/linebuffer');
                linebuffer.setConfig(config);

                var connectionManager = require('../../lib/connection-manager');
                // create test log file
                fs.writeFileSync(path.join(tempDir, 'streamtest2.log'), '');
                connectionManager.connectLogServer(config, 'unitTestProgram')
                    .then(sock => {
                        clientsocket = sock;

                        setTimeout(function() {
                        // now simulate a program logging to a file
                            debug('simulating logging streamtest2.log');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData1\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData2\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData3\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData4\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData5\n');
                        }, 200);

                        setTimeout(function() {
                            debug('simulating disconnected logging streamtest2.log');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData6\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData7\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData8\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData9\n');
                            fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData10\n');
                        }, 1400);
                    });
            });
            **/
        });

        // doesn't validate if the script itself works!
        // only validates that the agent will call it
        it('tries to update itself', function() {
            /** To Be Updated
            port++;
            const testServer = new WebSocketServer({ port: port });

            return new Promise(resolve => {
                spawnResolve = resolve;
                testServer.on('connection', socket => {
                    debug('connected to socket');
                    socket.send(JSON.stringify({
                        e: 'u'
                    })); // send test update message, expect asserts for spawn
                });

                var config = {
                    autoupdate: 1
                    , key: 'SOME_FAKE_KEY'
                    , logdir: [tempDir]
                    , LOGDNA_LOGSSL: false
                    , LOGDNA_LOGHOST: 'localhost'
                    , LOGDNA_LOGPORT: port.toString()
                    , LOGDNA_RECONNECT: false
                    , TRANSPORT: 'websocket'
                    , SOCKET_KEEPALIVE: -1
                    , STATS_INTERVAL: -1
                };
                var connectionManager = require('../../lib/connection-manager');
                connectionManager.connectLogServer(config, 'unitTestProgram');
            });
            **/
        });
    });
});
