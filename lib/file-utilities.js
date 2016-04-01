var fs = require('fs');
var path = require('path');
var properties = require('properties');
var debug = require('debug')('logdna:lib:file-utilities');
var log = require('./log');
var _ = require('lodash');
var Tail = require('always-tail');
var linebuffer = require('./linebuffer');

var globalExclude = [
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

module.exports.getFiles = function (dir, files_) {
    files_ = files_ || [];
    var files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        log('Error opening ' + dir + ': ' + e);
        return [];
    }

    var name;
    for (var i = 0; i < files.length; i++) {
        name = dir + path.sep + files[i];
        try {
            if (fs.statSync(name).isDirectory()) {
                exports.getFiles(name, files_);
            } else if (
                    (
                        // ends in .log
                        files[i].toLowerCase().indexOf('.log') === files[i].length - 4 ||
                        // extension-less files but not patterns like cron-20150928
                        (files[i].indexOf('.') === -1 && files[i].indexOf('-20') === -1)
                    )
                ) {

                // check for global excludes
                var exclude = false;
                for (var j = 0; j < globalExclude.length; j++) {
                    if (name.indexOf(globalExclude[j]) !== -1) {
                        exclude = true;
                        continue;
                    }
                }

                if (!exclude) {
                    files_.push(name);
                }
            }
        } catch (e) {}
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

module.exports.streamDir = function (dir, socket) {
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
            linebuffer.addMessage(JSON.stringify({ e: 'l', t: Date.now(), l: line, f: file }));
        });
        tail.on('error', function (err) {
            log('Tail error: ' + file + ': ' + err);
        });
        tail.watch();
    });

    return logfiles.length;
};
