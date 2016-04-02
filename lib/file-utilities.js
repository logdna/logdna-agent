var fs = require('fs');
var path = require('path');
var properties = require('properties');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var _ = require('lodash');
var Tail = require('always-tail');
var linebuffer = require('./linebuffer');

var globalExclude = [
    'testexclude',
    '/var/log/wtmp',
    '/var/log/btmp',
    '/var/log/utmp',
    '/var/log/wtmpx',
    '/var/log/btmpx',
    '/var/log/utmpx',
    '/var/log/asl',
    '/var/log/sa/',
    '/var/log/sar'
];


module.exports.getFiles = function (dir, files_, depth) {
    files_ = files_ || [];
    depth = depth || 0;
    debug("scanning: " + dir, depth + " dirs deep");
    var files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        log('Error opening ' + dir + ': ' + e);
        return [];
    }

    var name, isdir, exclude, i, j;
    for (i = 0; i < files.length; i++) {
        name = dir + path.sep + files[i];
        isdir = false;
        try {
            isdir = fs.statSync(name).isDirectory();
        } catch (e) {}

        if (isdir) {
            exports.getFiles(name, files_, depth + 1);
        } else {
            exclude = true;

            // extension-less files but not patterns like cron-20150928
            if (files[i].indexOf('.') === -1 && files[i].indexOf('-20') === -1) {
                exclude = false;

            // ends in .log
            } else if (_.endsWith(files[i].toLowerCase(), '.log')) {
                exclude = false;

            }

            if (!exclude) {
                files_.push(name);
            }
        }
    }

    // check for global excludes after all subfolders are done processing
    if (depth === 0) {
        i = files_.length;
        while (i--) {
            for (j = 0; j < globalExclude.length; j++) {
                if (files_[i].indexOf(globalExclude[j]) !== -1) {
                    debug("excluding: " + files_[i]);
                    files_.splice(i, 1);
                    break;
                }
            }
        }
    }
    return files_;
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

module.exports.streamDir = function (dir) {
    var logfiles = exports.getFiles(dir);

    if (logfiles.length > 0) {
        log('Streaming ' + dir + ': ' + logfiles.length + ' files');
        debug(logfiles);
    }

    _.each(logfiles, function (file) {
        var tail;
        try {
            tail = new Tail(file, '\n', { interval: 250 });
        } catch (err) {
            log('Error tailing ' + file + ': ' + err);
            return;
        }

        debug('tailing: ' + file);
        tail.on('line', function (line) {
            linebuffer.addMessage({ e: 'l', t: Date.now(), l: line, f: file });
        });
        tail.on('error', function (err) {
            log('Tail error: ' + file + ': ' + err);
        });
        tail.watch();
    });

    return logfiles.length;
};
