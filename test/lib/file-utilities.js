/* globals describe, it, beforeEach, after */
require('../helpers/before');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:file-utilities');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var tempDir = '.temp';

describe('lib:file-utilities', function() {

    beforeEach((done) => {
        debug('cleaning up test folder...' + tempDir);
        return rimraf(tempDir, () => {
            fs.mkdirSync(tempDir);
            fs.mkdirSync(path.join(tempDir, 'subdir'));
            return done();
        });
    });

    after(function() {
        return rimraf(tempDir, () => {
            return debug('Cleaned');
        });
    });

    describe('#getFiles()', function() {
        it('retrieves all *.log and extensionless files', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var testFiles = [
                path.join(tempDir, 'somelog1.log')
                , path.join(tempDir, 'somelog2')
                , path.join(tempDir, 'somelog3-file')
                // path.join(tempDir, 'somelog4-202f'),       // 3 digit number shouldn't match date stamp
                , path.join(tempDir, 'wtmp') // /var/log/wtmp shouldn't match cuz diff folder
            ];

            for (var i = 0; i < testFiles.length; i++) {
                fs.writeFileSync(testFiles[i], 'arbitraryData\n');
            }

            fileUtilities.getFiles({}, tempDir, function(err, array) {
                debug(array);
                assert.equal(array.length, testFiles.length, 'Expected to find all log files');
            });
        });

        it('retrieves no *.log, nor extensionless files', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var testFiles = [
                path.join(tempDir, 'somelog1.log.1')
                , path.join(tempDir, 'somelog2.txt')
                // path.join(tempDir, 'somelog3-20150928'),   // exception (we dont tail extensionless with date stamps)
                // path.join(tempDir, 'somelog4_20250928'),   // exception (we dont tail extensionless with date stamps)
                , path.join(tempDir, 'testexclude') // in globalExclude
            ];

            for (var i = 0; i < testFiles.length; i++) {
                fs.writeFileSync(testFiles[i], 'arbitraryData\n');
            }

            fileUtilities.getFiles({}, tempDir, function(err, array) {
                debug(array);
                assert.equal(array.length, 0, 'Expected to find no log files');
            });
        });

        it('retrieves 1 file based on glob pattern *.txt', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var testFiles = [
                path.join(tempDir, 'somelog1.txt')
                , path.join(tempDir, 'subdir', 'somelog2.txt')
            ];

            for (var i = 0; i < testFiles.length; i++) {
                fs.writeFileSync(testFiles[i], 'arbitraryData\n');
            }

            fileUtilities.getFiles({}, path.join(tempDir, '*.txt'), function(err, array) {
                debug(array);
                assert.equal(array.length, 1, 'Expected to find only 1 log file, not recursive');
            });
        });

        it('retrieves 2 files based on glob pattern **/*.txt', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var testFiles = [
                path.join(tempDir, 'somelog1.txt')
                , path.join(tempDir, 'subdir', 'somelog2.txt')
                , path.join(tempDir, 'subdir', 'somelog3.log') // should fail since this dir doesn't define *.log
                , path.join(tempDir, 'subdir', 'somelog4') // should fail since this dir doesn't define extensionless
            ];

            for (var i = 0; i < testFiles.length; i++) {
                fs.writeFileSync(testFiles[i], 'arbitraryData\n');
            }

            fileUtilities.getFiles({}, path.join(tempDir, '**', '*.txt'), function(err, array) {
                debug(array);
                assert.equal(array.length, 2, 'Expected to find 2 log files, recursive');
            });
        });
    });

    describe('#streamAllLogs()', function() {
        this.timeout(10000);
        it('streams file changes to a socket using TAIL_MODE trs', function() {
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:3000');
            var socket = new MockWebSocket('ws://localhost:3000');
            socket.connected = true;
            var config = {
                logdir: [tempDir]
                , TRANSPORT: 'websocket'
                , TAIL_MODE: 'trs'
            };
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            lineBuffer.setConfig(config);
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];

            var expectedCount = 2;
            var count = 0;
            server.on('message', data => {
                debug('received message!');
                debug(data);
                var message = JSON.parse(data);
                assert(message.ls[0].l, 'arbitraryData1');
                assert(message.ls[1].l, 'arbitraryData2');

                count += message.ls.length;

                if (count === expectedCount) return true;
            });

            fs.writeFileSync(path.join(tempDir, 'streamtest3.log'), '');
            fileUtilities.streamAllLogs(config, function() {
                // simulate a program writing to a log file
                fs.appendFileSync(path.join(tempDir, 'streamtest3.log'), 'arbitraryData1\n');
                fs.appendFileSync(path.join(tempDir, 'streamtest3.log'), 'arbitraryData2\n');
            });
        });

        it('streams file changes to a socket using TAIL_MODE lib', function() {
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:3001');
            var socket = new MockWebSocket('ws://localhost:3001');
            socket.connected = true;
            var config = {
                logdir: [tempDir]
                , TRANSPORT: 'websocket'
                , TAIL_MODE: 'lib'
            };
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            lineBuffer.setConfig(config);
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];

            var expectedCount = 2;
            var count = 0;
            server.on('message', data => {
                debug('received message!');
                debug(data);
                var message = JSON.parse(data);
                assert(message.ls[0].l, 'arbitraryData1');
                assert(message.ls[1].l, 'arbitraryData2');

                count += message.ls.length;

                if (count === expectedCount) return true;
            });

            fs.writeFileSync(path.join(tempDir, 'streamtest4.log'), '');
            fileUtilities.streamAllLogs(config, function() {
                // simulate a program writing to a log file
                fs.appendFileSync(path.join(tempDir, 'streamtest4.log'), 'arbitraryData1\n');
                fs.appendFileSync(path.join(tempDir, 'streamtest4.log'), 'arbitraryData2\n');
            });
        });

        it('streams file changes to a socket using TAIL_MODE unix', function() {
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:3002');
            var socket = new MockWebSocket('ws://localhost:3002');
            socket.connected = true;
            var config = {
                logdir: [tempDir]
                , TRANSPORT: 'websocket'
                , TAIL_MODE: 'unix'
            };
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            lineBuffer.setConfig(config);
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];

            var expectedCount = 2;
            var count = 0;
            server.on('message', data => {
                debug('received message!');
                debug(data);
                var message = JSON.parse(data);
                assert(message.ls[0].l, 'arbitraryData1');
                assert(message.ls[1].l, 'arbitraryData2');

                count += message.ls.length;

                if (count === expectedCount) return true;
            });

            fs.writeFileSync(path.join(tempDir, 'streamtest5.log'), '');
            fileUtilities.streamAllLogs(config, function() {
                // simulate a program writing to a log file
                setTimeout(function() {
                    fs.appendFileSync(path.join(tempDir, 'streamtest5.log'), 'arbitraryData1\n');
                    fs.appendFileSync(path.join(tempDir, 'streamtest5.log'), 'arbitraryData2\n');
                }, 500);
            });
        });

        it('streams new file rescan using TAIL_MODE trs', function() {
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:3010');
            var socket = new MockWebSocket('ws://localhost:3010');
            socket.connected = true;
            var config = {
                logdir: [tempDir]
                , TRANSPORT: 'websocket'
                , TAIL_MODE: 'trs'
                , RESCAN_INTERVAL: 1000
            };
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            lineBuffer.setConfig(config);
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];

            var expectedCount = 3;
            var count = 0;
            server.on('message', data => {
                debug('received message!');
                debug(data);
                var message = JSON.parse(data);
                if (count === 0) {
                    assert(message.ls[0].l, 'arbitraryData1');
                    assert(message.ls[1].l, 'arbitraryData2');
                } else if (count === 2) {
                    assert(message.ls[0].l, 'arbitraryData3');
                }
                count += message.ls.length;

                if (count === expectedCount) {
                    config.RESCAN_INTERVAL = -1;
                    return true;
                }
            });

            fs.writeFileSync(path.join(tempDir, 'streamtest6.log'), '');
            fileUtilities.streamAllLogs(config, function() {
                // simulate a program writing to a log file
                fs.appendFileSync(path.join(tempDir, 'streamtest6.log'), 'arbitraryData1\n');
                fs.appendFileSync(path.join(tempDir, 'streamtest6.log'), 'arbitraryData2\n');

                // simulate new file after RESCAN_INTERVAL
                fs.writeFileSync(path.join(tempDir, 'streamtest7.log'), 'arbitraryData3\n');
            });
        });
    });

    describe('#appender()', function() {
        it('provides an appender that appends to end of array', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var func = fileUtilities.appender();

            func('x');
            func('y');
            var xs = func('z');

            debug(xs);
            assert(xs[0], 'x');
            assert(xs[1], 'y');
            assert(xs[2], 'z');
        });
    });

    describe('#saveConfig()', function() {
        it('saves a configuration to a file', function() {
            var fileUtilities = require('../../lib/file-utilities');
            fileUtilities.files = [];
            var properties = Promise.promisifyAll(require('properties'));
            var configPath = './test/assets/testconfig.config';
            return properties.parseAsync(configPath, { path: true })
                .then(config => {
                    debug('saving configuration:');
                    debug(config);
                    return fileUtilities.saveConfig(config, path.join(tempDir, 'test.config'));
                })
                .then(() => {
                    return properties.parseAsync(configPath, { path: true });
                })
                .then(config => {
                    debug('retrieved saved configuration:');
                    debug(config);
                    assert.ok(config.logdir);
                    assert.ok(config.key);
                    assert.equal(config.autoupdate, 0);
                });
        });
    });
});
