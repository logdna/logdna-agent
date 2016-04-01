/* globals describe, it, before, after */
require('../helpers/before');
var WebSocketServer = require('ws').Server;
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:connection-manager');
var mockery = require('mockery');
var rimraf = Promise.promisify(require('rimraf'));
var skeemas = require('skeemas');
var statsSchema = require('../helpers/message-schemas/stats');
var logSchema = require('../helpers/message-schemas/log');
var tempDir = '.temp';

describe('lib:connection-manager', function () {

    var spawnResolve;
    var cpMock = {
        spawn: function (fileName, args) {
            assert.ok(fileName);
            assert(Array.isArray(args));
            debug(fileName);
            spawnResolve();
            return {
                unref: function () {}
            };
        },
        exec: function (fileName, args) {
            debug('spawn called!');
            assert.ok(fileName);
            assert(typeof args, 'string');
            debug(fileName);
            spawnResolve();
        }
    };

    before (function () {
        // setup spawn mock
        mockery.enable({
            warnOnUnregistered: false,
            useCleanCache: true
        });
        mockery.registerMock('child_process', cpMock);
        debug('cleaning up test folder...' + tempDir);
        return rimraf(tempDir)
        .then(() => {
            fs.mkdirSync(tempDir);
        });
    });

    after (function () {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe('#connectLogServer', function () {
        var port = 8080;
        // tests use live local web sockets so give plenty of timeout
        this.timeout(20000);
        it('sends 5 stat messages at 1 sec fequency', function () {
            port += 1;
            const testServer = new WebSocketServer({ port: port });
            var messageCount = 0;
            var config = {
                autoupdate: 0,
                key: 'SOME_FAKE_KEY',
                logdir: [tempDir],
                LOGDNA_LOGSSL: false,
                LOGDNA_LOGHOST: 'localhost',
                LOGDNA_LOGPORT: port.toString(),
                LOGDNA_RECONNECT: false,
                STATS_INTERVAL: 1000
            };
            return new Promise(resolve => {
                testServer.on('connection', socket => {
                    debug('connection manager connected to socket');
                    socket.on('message', message => {
                        debug('received logdna message:');
                        debug(message);
                        // validate message body
                        var validation = skeemas.validate(message, statsSchema);

                        assert(validation.valid, JSON.stringify(validation.errors));
                        // this is the expeceted message format of logdna web sockets
                        messageCount += 1;

                        if (messageCount >= 5) {
                            debug('closing connection');
                            socket.close();
                            testServer.close();
                            config.STATS_INTERVAL = -1;
                            return resolve();
                        }
                    });
                });

                var connectionManager = require('../../lib/connection-manager');
                connectionManager.connectLogServer(config, 'unitTestProgram');
            });
        });

        it('sends logdna log messages', function () {
            port += 1;
            const testServer = new WebSocketServer({ port: port });
            var messageCount = 0;
            var config = {
                autoupdate: 0,
                auth_token: 'abcxyz',
                key: 'SOME_FAKE_KEY',
                logdir: [tempDir],
                LOGDNA_LOGSSL: false,
                LOGDNA_LOGHOST: 'localhost',
                LOGDNA_LOGPORT: port,
                LOGDNA_RECONNECT: false,
                STATS_INTERVAL: -1
            };
            return new Promise(resolve => {
                testServer.on('connection', socket => {
                    debug('connected to socket');
                    socket.on('message', data => {
                        var message = JSON.parse(data);
                        // filter only for log messages
                        if (message.e === 'l') {
                            debug('received logdna message:');
                            debug(message);
                            // validate message body
                            var validation = skeemas.validate(message, logSchema);

                            assert(validation.valid, JSON.stringify(validation.errors));
                            // this is the expeceted message format of logdna web sockets
                            messageCount += 1;

                            if (messageCount >= 5) {
                                debug('closing connection');
                                socket.close();
                                testServer.close();
                                config.STATS_INTERVAL = -1;
                                return resolve();
                            }
                        }
                    });
                    setTimeout(function () {
                        // now simulate a program logging to a file
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData2');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData3');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData4');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData5');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData6');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData2');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData3');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData4');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData5');
                        fs.appendFileSync(path.join(tempDir, 'streamtest1.log'), '\narbitraryData6');
                    }, 1000);
                });

                var connectionManager = require('../../lib/connection-manager');
                // create test log file
                fs.writeFileSync(path.join(tempDir, 'streamtest1.log'), 'arbitraryData1');
                connectionManager.connectLogServer(config, 'unitTestProgram');
            });
        });
        // doesn't validate if the script itself works!
        // only validates that the agent will call it
        it('tries to update itself', function () {
            port += 1;
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
                    autoupdate: 1,
                    key: 'SOME_FAKE_KEY',
                    logdir: [tempDir],
                    LOGDNA_LOGSSL: false,
                    LOGDNA_LOGHOST: 'localhost',
                    LOGDNA_LOGPORT: port.toString(),
                    LOGDNA_RECONNECT: false,
                    STATS_INTERVAL: 1000
                };
                var connectionManager = require('../../lib/connection-manager');
                connectionManager.connectLogServer(config, 'unitTestProgram');
            });
        });
    });

    after(function () {
        debug('cleaning up test folder...' + tempDir);
        return rimraf(tempDir);
    });
});
