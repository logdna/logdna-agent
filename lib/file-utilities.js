var properties = require('properties');
var fs = require('fs');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var _ = require('lodash');
var Tail = require('always-tail');
var linebuffer = require('./linebuffer');
var glob = require('glob');
var async = require('async');

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

module.exports.getFiles = function(dir, callback) {
    fs.stat(dir, function(err, stats) {
        if (err) {
            log('Error accessing ' + dir + ': ' + err);
            return callback && callback(err);

        }

        if (!stats.isDirectory()) {
            if (stats.isFile()) {
                // single file? just return as an single item array
                return callback && callback(null, [dir]);
            }

            // something else? block devices, socket files, etc
            log('Error opening ' + dir + ': Not a file or directory');
            return callback && callback(new Error('Not a file or directory'));
        }

        dir = dir.replace('\\', '/'); // glob patterns always use / (even on windows)
        glob('{' +
                dir + '/**/*.log,' +
                dir + '/**/!(*.*)' +
            '}', {
                nocase: true,
                nodir: true,
                ignore: globalExclude
            }, callback);
    });
};

module.exports.streamDir = function(dir, callback) {
    exports.getFiles(dir, function(err, logfiles) {
        if (err) {
            return callback && callback(err);
        }

        if (logfiles.length > 0) {
            log('Streaming ' + dir + ': ' + logfiles.length + ' files');
            debug(logfiles);
        }

        _.each(logfiles, function(file) {
            var tail;
            try {
                tail = new Tail(file, '\n', { interval: 250 });
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
        });

        return callback && callback(null, logfiles.length);
    });
};

module.exports.streamAllLogs = function(config, callback) {
    var numfiles = 0;
    if (config.logfiles) {
        config.logdir = config.logdir.concat(config.logfiles);
    }

    async.each(config.logdir, function(dir, done) {
        exports.streamDir(dir, function(err, filecount) {
            if (!err) {
                numfiles += filecount;
            }
            done();
        });
    }, function() {
        return callback && callback(numfiles);
    });
};

module.exports.appender = function (xs) {
    xs = xs || [];
    return function (x) {
        xs.push(x);
        return xs;
    };
};

module.exports.saveConfig = function (config, configPath) {
    return properties.stringifyAsync(config, {
        path: configPath
    })
    .catch(err => {
        console.error('Error while saving to: ' + configPath + ': ' + err);
    });
};
