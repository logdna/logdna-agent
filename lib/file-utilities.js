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
var TailReadStream = require('./tailreadstream/tailreadstream');
var Splitter = require('./tailreadstream/line-splitter');
var k8s = require('./k8s');

var GLOB_CHARS_REGEX = /[*?[\]()]/;
var globalExclude = [
    // '**/*+(-|_)20[0-9][0-9]*', // date stamped files: cronlog-20150928
    '**/testexclude'
    , '/var/log/wtmp'
    , '/var/log/btmp'
    , '/var/log/utmp'
    , '/var/log/wtmpx'
    , '/var/log/btmpx'
    , '/var/log/utmpx'
    , '/var/log/asl/**'
    , '/var/log/sa/**'
    , '/var/log/sar*'
    , '/tmp/cur'
    , '/tmp/new'
    , '/tmp/tmp'
];

var firstrun = true;
module.exports.files = [];
var tails = [];

module.exports.getFiles = function(config, dir, callback) {
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
                if (firstrun) {
                    log('Error accessing ' + dir + ': ' + err);
                }
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
            if (firstrun) {
                log('Error opening ' + dir + ': Not a file or directory');
            }
            return callback && callback(new Error('Not a file or directory'));
        }

        debug(globpattern);
        glob(globpattern, {
            nocase: (os.platform() !== 'win32')
            , nodir: true
            , ignore: globalExclude.concat(config.exclude || [])
        }, function(err, logfiles) {
            if (err) {
                if (firstrun) {
                    log('Error opening ' + dir + ': ' + err);
                }
                return callback && callback(err);
            }

            return callback && callback(null, logfiles);
        });
    });
};

module.exports.streamFiles = function(config, logfiles, callback) {
    _.each(logfiles, function(file) {
        var tail, i, labels;

        if (config.platform && config.platform.indexOf('k8s') === 0) {
            labels = k8s.getLabelsFromFile(file);
        }

        if (os.platform() !== 'win32' && config.TAIL_MODE === 'unix') {
            debug('tailing: ' + file);
            tail = spawn('tail', ['-n0', '-F', file]);
            tail.stdout.on('data', function(data) {
                data = data.toString().trim().split('\n');
                for (i = 0; i < data.length; i++) {
                    data[i] = { t: Date.now(), l: data[i], f: file, label: labels };
                    linebuffer.addMessage(data[i]);
                }
            });

            tail.stderr.on('data', function(err) {
                log('Tail error: ' + file + ': ' + err.toString().trim());
            });

            tails.push(tail);

        } else if (config.TAIL_MODE === 'lib') {
            try {
                tail = new Tail(file, '\n', { interval: 100, blockSize: 10 * 1024 * 1024 });
            } catch (err) {
                log('Error tailing ' + file + ': ' + err);
                return callback && callback(err);
            }

            debug('tailing: ' + file);
            tail.on('line', function(line) {
                linebuffer.addMessage({ t: Date.now(), l: line, f: file, label: labels });
            });
            tail.on('error', function(err) {
                log('Tail error: ' + file + ': ' + err);
            });
            tail.watch();

        } else {
            debug('tailing: ' + file);
            tail = TailReadStream.tail(file);
            tail.pipe(new Splitter())
                .on('data', line => {
                    linebuffer.addMessage({ t: Date.now(), l: line, f: file, label: labels });
                });

            tail.on('error', err => {
                log('Tail error: ' + file + ': ' + err);
            });

            tail.on('end', (err) => {
                if (err) {
                    log('File does not exist, stopped tailing: ' + file + ' after ' + tail.timeout + 'ms');
                    _.pull(exports.files, file);
                }
            });

            tail.on('rename', () => {
                log('Log rotated: ' + file + ' by rename');
            });

            tail.on('truncate', () => {
                log('Log rotated: ' + file + ' by truncation');
            });
        }
    });

    return callback && callback();
};

module.exports.streamAllLogs = function(config, callback) {
    var newfiles = [];
    debug('scanning all folders: ' + config.logdir);
    async.each(config.logdir, function(dir, done) {
        exports.getFiles(config, dir, function(err, logfiles) {
            if (!err && logfiles.length > 0) {
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

        // add to master files array
        exports.files = exports.files.concat(newfiles);
        debug('files after processing');
        debug(exports.files);

        exports.streamFiles(config, newfiles, function() {
            return callback && callback();
        });
    });

    if (config.usejournald && firstrun) {
        log('Streaming from journalctl: ' + config.usejournald);
        var journalctl, lastchunk, i;

        if (config.usejournald === 'files') {
            journalctl = spawn('journalctl', ['-n0', '-D', '/var/log/journal', '-o', 'json', '-f']);
        } else {
            journalctl = spawn('journalctl', ['-n0', '-o', 'json', '-f']);
        }

        var processChunk = function(data) {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return { t: Date.now(), l: data, f: 'systemd' };
            }
            if (data.__REALTIME_TIMESTAMP && parseInt(data.__REALTIME_TIMESTAMP) > 10000000000000) {
                // convert to ms
                data.__REALTIME_TIMESTAMP = parseInt(data.__REALTIME_TIMESTAMP / 1000);
            }
            return { t: data.__REALTIME_TIMESTAMP, l: data.MESSAGE, f: data.CONTAINER_NAME || data.SYSLOG_IDENTIFIER || 'UNKNOWN_SYSTEMD_APP', pid: data._PID && parseInt(data._PID), prival: data.PRIORITY && parseInt(data.PRIORITY), containerid: data.CONTAINER_ID_FULL };
        };

        journalctl.stdout.on('data', function(data) {
            data = data.toString().trim().split('\n');
            for (i = 0; i < data.length; i++) {
                if (data[i].substring(0, 1) === '{' && data[i].substring(data[i].length - 1) === '}') {
                    // full chunk
                    linebuffer.addMessage(processChunk(data[i]));
                    if (lastchunk) { lastchunk = null; } // clear

                } else if (data[i].substring(0, 1) === '{') {
                    // starting chunk
                    lastchunk = (lastchunk ? lastchunk : '') + data[i];

                } else if (lastchunk && data[i].substring(data[i].length - 1) === '}') {
                    // ending chunk
                    lastchunk += data[i];
                    linebuffer.addMessage(processChunk(lastchunk));
                    lastchunk = null; // clear

                } else if (lastchunk && lastchunk.length < 32768) {
                    // append chunk
                    lastchunk += data[i];

                } else {
                    linebuffer.addMessage({ t: Date.now(), l: data[i], f: 'systemd' });
                }
            }
        });

        journalctl.stderr.on('data', function(err) {
            log('Error reading from journalctl: ' + err.toString().trim());
        });
    }

    if (config.RESCAN_INTERVAL) {
        setTimeout(function() {
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
    }).catch(err => {
        console.error('Error while saving to: ' + configPath + ': ' + err);
    });
};

module.exports.gracefulShutdown = function(signal) {
    debug('got ' + signal + ' signal, shutting down...');
    setTimeout(function() { process.exit(); }, 5000);
    _.each(tails, function(tail) {
        tail.kill('SIGTERM');
        debug('tail pid ' + tail.pid + ' killed');
    });
    process.exit();
};

process.once('SIGTERM', function() { exports.gracefulShutdown('SIGTERM'); }); // kill
process.once('SIGINT', function() { exports.gracefulShutdown('SIGINT'); }); // ctrl+c
