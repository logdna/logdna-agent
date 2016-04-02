/* globals describe, it, beforeEach */
require('../helpers/before');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:file-utilities');
var fs = require('fs');
var path = require('path');
var rimraf = Promise.promisify(require('rimraf'));
var tempDir = '.temp';
describe('lib:file-utilities', function () {

    beforeEach(function () {
        debug('cleaning up test folder...' + tempDir);
        return rimraf(tempDir)
        .then(() => {
            fs.mkdirSync(tempDir);
        });
    });

    describe('#getFiles()', function () {
        it('retrieves all *log files', function () {
            var fileUtilities = require('../../lib/file-utilities');
            var testFiles = [
                path.join(tempDir, 'somelog1.log'),
                path.join(tempDir, 'somelog2.log'),
                path.join(tempDir, 'somelog3.log')
            ];

            fs.writeFileSync(testFiles[0], 'arbitraryData1');
            fs.writeFileSync(testFiles[1], 'arbitraryData2');
            fs.writeFileSync(testFiles[2], 'arbitraryData3');

            var array = [];
            fileUtilities.getFiles(tempDir, array);

            debug(array);
            assert.equal(array.length, testFiles.length);

            array.forEach(path => {
                var index = testFiles.indexOf(path);

                if (index > -1) {
                    testFiles.splice(index, 1);
                }
            });

            debug(testFiles);
            assert.equal(testFiles.length, 0, 'Expected to find all log test log files');
        });

        it('retrieves no *log files', function () {
            var fileUtilities = require('../../lib/file-utilities');

            var array = [];
            fileUtilities.getFiles(tempDir, array);

            debug(array);
            assert.equal(array.length, 0, 'Expected to find no log files');
        });
    });

    describe('#appender()', function () {
        it('provides an appender that appends to end of array', function () {
            var fileUtilities = require('../../lib/file-utilities');

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

    describe('#saveConfig()', function () {
        it('saves a configuration to a file', function () {
            var fileUtilities = require('../../lib/file-utilities');

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

    describe('#streamDir()', function () {
        it('streams file changes to a socket', function () {
            const MockWebSocket = require('mock-socket').WebSocket;
            const MockServer = require('mock-socket').Server;
            var server = new MockServer('ws://localhost:3000');
            var socket = new MockWebSocket('ws://localhost:3000');
            socket.connected = true;
            var lineBuffer = require('../../lib/linebuffer');
            lineBuffer.setSocket(socket);
            var fileUtilities = require('../../lib/file-utilities');

            return new Promise((resolve) => {
                var expectedCount = 2;
                var count = 0;
                server.on('message', data => {
                    debug('received message! ' + count);
                    debug(data);
                    var message = JSON.parse(data);
                    assert(message.ls[0].l, 'arbitraryData2');
                    assert(message.ls[1].l, 'arbitraryData3');

                    assert.equal(message.ls.length, expectedCount);
                    resolve(true);
                });

                fs.writeFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData1\n');
                fileUtilities.streamDir(tempDir);

                // simulate a program writing to a log file
                fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData2\n');
                fs.appendFileSync(path.join(tempDir, 'streamtest2.log'), 'arbitraryData3\n');
                debug(socket);
            });
        });
    });
});
