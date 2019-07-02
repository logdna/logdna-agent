/* globals describe, it, beforeEach, after */

// Constants
const assert = require('assert');
const async = require('async');
const configPath = './test/assets/testconfig.config';
const debug = require('debug')('logdna:test:lib:file-utilities');
const fileUtilities = require('../../lib/file-utilities');
const fs = require('fs');
const path = require('path');
const properties = require('properties');
const rimraf = require('rimraf');
const tempDir = '.temp';

describe('lib:file-utilities', () => {

    beforeEach((done) => {
        debug(`cleaning up test folder...${tempDir}`);
        return rimraf(tempDir, () => {
            fs.mkdirSync(tempDir);
            fs.mkdirSync(path.join(tempDir, 'subdir'));
            return done();
        });
    });

    after(() => {
        return rimraf(tempDir, () => {
            return debug('Cleaned');
        });
    });

    describe('#getFiles()', () => {
        it('retrieves all *.log and extensionless files', () => {
            const testFiles = [
                path.join(tempDir, 'somelog1.log')
                , path.join(tempDir, 'somelog2')
                , path.join(tempDir, 'somelog3-file')
                , path.join(tempDir, 'somelog4-202f') // 3 digit number shouldn't match date stamp
                , path.join(tempDir, 'wtmp') // /var/log/wtmp shouldn't match cuz diff folder
            ];

            testFiles.forEach((testFile) => {
                fs.writeFileSync(testFile, 'arbitraryData\n');
            });

            fileUtilities.getFiles({}, tempDir, (err, array) => {
                debug(array);
                assert.equal(array.length, testFiles.length, 'Expected to find all log files');
            });
        });

        it('retrieves no *.log, nor extensionless files', () => {
            const testFiles = [
                path.join(tempDir, 'somelog1.log.1')
                , path.join(tempDir, 'somelog2.txt')
                , path.join(tempDir, 'testexclude') // in globalExclude
            ];

            testFiles.forEach((testFile) => {
                fs.writeFileSync(testFile, 'arbitraryData\n');
            });

            fileUtilities.getFiles({}, tempDir, (err, array) => {
                debug(array);
                assert.equal(array.length, 0, 'Expected to find no log files');
            });
        });

        it('retrieves 1 file based on glob pattern *.txt', () => {
            const testFiles = [
                path.join(tempDir, 'somelog1.txt')
                , path.join(tempDir, 'subdir', 'somelog2.txt')
            ];

            testFiles.forEach((testFile) => {
                fs.writeFileSync(testFile, 'arbitraryData\n');
            });

            fileUtilities.getFiles({}, path.join(tempDir, '*.txt'), (err, array) => {
                debug(array);
                assert.equal(array.length, 1, 'Expected to find only 1 log file, not recursive');
            });
        });

        it('retrieves 2 files based on glob pattern **/*.txt', () => {
            const testFiles = [
                path.join(tempDir, 'somelog1.txt')
                , path.join(tempDir, 'subdir', 'somelog2.txt')
                , path.join(tempDir, 'subdir', 'somelog3.log') // should fail since this dir doesn't define *.log
                , path.join(tempDir, 'subdir', 'somelog4') // should fail since this dir doesn't define extensionless
            ];

            testFiles.forEach((testFile) => {
                fs.writeFileSync(testFile, 'arbitraryData\n');
            });

            fileUtilities.getFiles({}, path.join(tempDir, '**', '*.txt'), (err, array) => {
                debug(array);
                assert.equal(array.length, 2, 'Expected to find 2 log files, recursive');
            });
        });
    });

    describe('#appender()', () => {
        it('provides an appender that appends to end of array', () => {
            const func = fileUtilities.appender();

            func('x');
            func('y');
            const xs = func('z');

            debug(xs);
            assert(xs[0], 'x');
            assert(xs[1], 'y');
            assert(xs[2], 'z');
        });
    });

    describe('#saveConfig()', () => {
        it('saves a configuration to a file', () => {
            return async.waterfall([(cb) => {
                return properties.parse(configPath, {
                    path: true
                }, cb);
            }, (config, cb) => {
                return cb(fileUtilities.saveConfig(config, path.join(tempDir, 'test.config')));
            }, (success, cb) => {
                return properties.parse(configPath, {
                    path: true
                }, cb);
            }], (error, config) => {
                assert.ok(config.logdir);
                assert.ok(config.key);
                assert.equal(config.autoupdate, 0);
            });
        });
    });
});
