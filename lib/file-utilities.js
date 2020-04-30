// External Modules
const async = require('async');
const debug = require('debug')('logdna:lib:file-utilities');
const fs = require('fs');
const glob = require('glob');
const os = require('os');
const spawn = require('child_process').spawn;

// Internal Modules
const log = require('./utils').log;
const linebuffer = require('./linebuffer');
const TailReadStream = require('./tailreadstream/tailreadstream');
const Splitter = require('./tailreadstream/line-splitter');
const k8s = require('./k8s');

// RegExp
const GLOB_CHARS_REGEX = /[*?[\]()]/;

// Constants
const globalExclude = [
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

// Variables
var firstrun = true;
var files = [];
var tails = [];

const getFiles = (config, dir, callback) => {
    // glob patterns always use / (even on windows)
    var globdir = dir.replace('\\', '/');

    // default glob pattern for simple dir input (ie: /var/log)
    // include all **/*.log and extensionless files
    var globpattern = `{${globdir}/**/*.log,${globdir}/**/!(*.*)}`;

    fs.stat(dir, (error, stats) => {
        if (error) {
            // see if dir matches any glob control chars
            if (!GLOB_CHARS_REGEX.test(dir)) {
                if (firstrun) {
                    log(`error accessing ${dir}: ${error}`, 'error');
                }
                return callback && callback(error);
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
                log(`error opening ${dir}: not a file or directory`, 'error');
            }

            return callback && callback(new Error('not a file or directory'));
        }

        debug(globpattern);
        glob(globpattern, {
            nocase: os.platform() !== 'win32' && globpattern.indexOf('*') === -1
            , nodir: true
            , ignore: globalExclude.concat(config.exclude || [])
        }, (error, logfiles) => {
            if (error) {
                if (firstrun) {
                    log(`error opening ${dir}: ${error}`, 'error');
                }
                return callback && callback(error);
            }

            return callback && callback(null, logfiles);
        });
    });
};

const streamFiles = (config, logfiles, callback) => {
    logfiles.forEach((file) => {
        var tail, i, labels;

        if (config.platform && config.platform.indexOf('k8s') === 0) {
            labels = k8s.getLabelsFromFile(file);
        }

        if (os.platform() !== 'win32' && config.TAIL_MODE === 'unix') {
            debug('tailing: ' + file);
            tail = spawn('tail', ['-n0', '-F', file]);
            tail.stdout.on('data', (data) => {
                data = data.toString().trim().split('\n');
                for (i = 0; i < data.length; i++) {
                    data[i] = { t: Date.now(), l: data[i], f: file, label: labels };
                    linebuffer.addMessage(data[i]);
                }
            });

            tail.stderr.on('data', (error) => {
                log(`tail error: ${file}: ${error.toString().trim()}`, 'error');
            });

            tails.push(tail);

        } else {
            debug(`tailing: ${file}`);
            tail = TailReadStream.tail(file, config);
            tail.pipe(new Splitter())
                .on('data', (line) => {
                    linebuffer.addMessage({
                        t: Date.now()
                        , l: line
                        , f: file
                        , label: labels
                    });
                });

            tail.on('error', (error) => {
                log(`tail error: ${file}: ${error}`, 'error');
            });

            tail.on('end', (error) => {
                if (error) {
                    log(`file does not exist, stopped tailing: ${file} after ${tail.timeout}ms`, 'warn');
                    files = files.filter(element => element !== file);
                }
            });

            tail.on('rename', () => {
                log(`log rotated: ${file} by rename`);
            });

            tail.on('truncate', () => {
                log(`log rotated: ${file} by truncation`);
            });
        }
    });

    return callback && callback();
};

const streamAllLogs = (config, callback) => {
    linebuffer.setConfig(config);
    var newfiles = [];
    debug(`scanning all folders: ${config.logdir}`);
    async.each(config.logdir, (dir, done) => {
        getFiles(config, dir, (err, logfiles) => {
            if (!err && logfiles.length > 0) {
                debug(`all ${dir} files`);
                debug(logfiles);

                // figure out new files that we're not already tailing
                var diff = logfiles.filter(element => files.indexOf(element) < 0);

                // unique filenames between logdir(s)
                newfiles = newfiles.concat(diff);
                newfiles = newfiles.filter((element, index) => newfiles.indexOf(element) === index);
                debug(`newfiles after processing ${dir}`);
                debug(newfiles);

                if (diff.length > 0) {
                    log(`streaming ${dir}: ${diff.length}${(!firstrun ? ` new file(s), ${logfiles.length} total` : '')} file(s)`);
                }
            }
            done();
        });
    }, () => {
        firstrun = false;

        // add to master files array
        files = files.concat(newfiles);
        debug('files after processing');
        debug(files);

        streamFiles(config, newfiles, () => {
            return callback && callback();
        });
    });

    if (config.usejournald && firstrun) {
        log(`streaming from journalctl: ${config.usejournald}`);
        var journalctl, lastchunk, i;

        if (config.usejournald === 'files') {
            journalctl = spawn('journalctl', ['-n0', '-D', '/var/log/journal', '-o', 'json', '-f']);
        } else {
            journalctl = spawn('journalctl', ['-n0', '-o', 'json', '-f']);
        }

        const processChunk = (data) => {
            try {
                data = JSON.parse(data);
            } catch (e) {
                return { t: Date.now(), l: data, f: 'systemd' };
            }
            if (data.__REALTIME_TIMESTAMP && parseInt(data.__REALTIME_TIMESTAMP) > 10000000000000) {
                // convert to ms
                data.__REALTIME_TIMESTAMP = parseInt(data.__REALTIME_TIMESTAMP / 1000);
            }
            return { t: data.__REALTIME_TIMESTAMP, l: data.MESSAGE, f: data.CONTAINER_NAME || data._SYSTEMD_UNIT || data.SYSLOG_IDENTIFIER || 'UNKNOWN_SYSTEMD_APP', pid: data._PID && parseInt(data._PID), prival: data.PRIORITY && parseInt(data.PRIORITY), containerid: data.CONTAINER_ID_FULL };
        };

        journalctl.stdout.on('data', (data) => {
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
                    linebuffer.addMessage({
                        t: Date.now()
                        , l: data[i]
                        , f: 'systemd'
                    });
                }
            }
        });

        journalctl.stderr.on('data', (error) => {
            log(`error reading from journalctl: ${error.toString().trim()}`, 'error');
        });
    }

    if (config.RESCAN_INTERVAL) {
        setTimeout(() => {
            streamAllLogs(config);
        }, config.RESCAN_INTERVAL); // rescan for files every once in awhile
    }
};

// Gracefully Shutting Down
const gracefulShutdown = (signal) => {
    log(`got ${signal} signal, shutting down...`);
    setTimeout(() => {
        process.exit();
    }, 5000);
    tails.forEach((tail) => {
        tail.kill('SIGTERM');
        debug(`tail pid ${tail.pid} killed`);
    });
    process.exit();
};

// Graceful Shutdown Scenarios
process.once('SIGTERM', () => { gracefulShutdown('SIGTERM'); }); // kill
process.once('SIGINT', () => { gracefulShutdown('SIGINT'); }); // ctrl+c

// Module Exports
module.exports.files = files;
module.exports.gracefulShutdown = gracefulShutdown;
module.exports.getFiles = getFiles;
module.exports.streamFiles = streamFiles;
module.exports.streamAllLogs = streamAllLogs;
