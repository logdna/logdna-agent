var properties = require('properties');
var fs = require('fs');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var _ = require('lodash');
var Tail = require('always-tail');
var linebuffer = require('./linebuffer');
var glob = require('glob');
var async = require('async');
var os = require('os');
var spawn = require('child_process').spawn;

var GLOB_CHARS_REGEX = /[\*\?\[\]\(\)]/;
var globalExclude = [
    // '**/*+(-|_)20[0-9][0-9]*', // date stamped files: cronlog-20150928
    '**/testexclude',
    '/var/log/wtmp',
    '/var/log/btmp',
    '/var/log/utmp',
    '/var/log/wtmpx',
    '/var/log/btmpx',
    '/var/log/utmpx',
    '/var/log/asl/**',
    '/var/log/sa/**',
    '/var/log/sar*'
];

var firstrun = true;
module.exports.files = [];

module.exports.getFiles = function(dir, callback) {
    // glob patterns always use / (even on windows)
    var globdir = dir.replace('\\', '/');

    // default glob pattern for simple dir input (ie: /var/log)
    var globpattern = '{' +
        globdir + '/**/*.log,' + // *.log files
        globdir + '/**/!(*.*)' + // extensionless files
    '}';

    fs.stat(dir, function(err, stats) {
        if (err) {
            // see if dir matches any glob control chars
            if (!GLOB_CHARS_REGEX.test(dir)) {
                log('Error accessing ' + dir + ': ' + err);
                return callback && callback(err);
            }

            // set as globpattern
            globpattern = globdir;

        } else if (!stats.isDirectory()) {
            if (stats.isFile()) {
                // single file? just return as an single item array (this also avoids globalExclude intentionally)
                return callback && callback(null, [dir]);
            }

            // something else? block devices, socket files, etc
            log('Error opening ' + dir + ': Not a file or directory');
            return callback && callback(new Error('Not a file or directory'));
        }

        debug(globpattern);
        glob(globpattern, {
            nocase: true,
            nodir: true,
            ignore: globalExclude
        }, function(err, logfiles) {
            if (err) {
                log('Error opening ' + dir + ': ' + err);
                return callback && callback(err);
            }

            return callback && callback(null, logfiles);
        });
    });
};

module.exports.streamFiles = function(config, logfiles, callback) {
    _.each(logfiles, function(file) {
        var tail, now;
        if (os.platform() !== 'win32' && config.TAIL_MODE === 'unix') {
            debug('tailing: ' + file);
            tail = spawn('tail', ['-n0', '-F', file]);
            tail.stdout.on('data', function(data) {
                data = data.toString().trim().split('\n');
                now = Date.now();
                for (var i = 0; i < data.length; i++) {
                    data[i] = { e: 'l', t: now, l: data[i], f: file };
                    linebuffer.addMessage(data[i]);
                }
            });

            tail.stderr.on('data', function(err) {
                log('Tail error: ' + file + ': ' + err.toString().trim());
            });

        } else {
            try {
                tail = new Tail(file, '\n', { interval: 100, blockSize: 10*1024*1024 });
            } catch (err) {
                log('Error tailing ' + file + ': ' + err);
                return callback && callback(err);
            }

            debug('tailing: ' + file);
            tail.on('line', function(line) {
                linebuffer.addMessage({ e: 'l', t: Date.now(), l: line, f: file });
            });
            tail.on('error', function(err) {
                log('Tail error: ' + file + ': ' + err);
            });
            tail.watch();
        }
    });

    return callback && callback();
};

module.exports.streamAllLogs = function(config, callback) {
    var newfiles = [];
    var baddirs = [];
    async.each(config.logdir, function(dir, done) {
        exports.getFiles(dir, function(err, logfiles) {
            if (err) {
                baddirs.push(dir);

            } else if (logfiles.length > 0) {
                debug('all ' + dir + ' files');
                debug(logfiles);

                // figure out new files that we're not already tailing
                var diff = _.difference(logfiles, exports.files);

                // unique filenames between logdir(s)
                newfiles = _.uniq(newfiles.concat(diff));
                debug('newfiles after processing ' + dir);
                debug(newfiles);

                if (diff.length > 0) {
                    log('Streaming ' + dir + ': ' + diff.length + (!firstrun ? ' new file(s), ' + logfiles.length + ' total' : '') + ' file(s)');
                }
            }
            done();
        });
    }, function() {
        firstrun = false;

        // remove baddirs from further scanning
        debug('baddirs');
        debug(baddirs);
        config.logdir = _.difference(config.logdir, baddirs);
        debug('logdir remaining');
        debug(config.logdir);

        // add to master files array
        exports.files = exports.files.concat(newfiles);
        debug('files after processing');
        debug(exports.files);

        exports.streamFiles(config, newfiles, function() {
            return callback && callback();
        });
    });

    if (config.RESCAN_INTERVAL) {
        setTimeout(function() {
            debug('rescanning all folders');
            exports.streamAllLogs(config);
        }, config.RESCAN_INTERVAL); // rescan for files every once in awhile
    }
};

module.exports.appender = function(xs) {
    xs = xs || [];
    return function(x) {
        xs.push(x);
        return xs;
    };
};

module.exports.saveConfig = function(config, configPath) {
    return properties.stringifyAsync(config, {
        path: configPath
    })
    .catch(err => {
        console.error('Error while saving to: ' + configPath + ': ' + err);
    });
};
