// External Modules
const debug = require('debug')('logdna:lib:os-version');
const fs = require('fs');
const os = require('os');

// Internal Modules
const getOS = require('./getos');
const log = require('./log');

// Constants
const DEFAULT_OS_PATH = '/etc/os-release';

// Helper in Getting Dist from GetOS
const getDist = (callback) => {
    return getOS((err, res) => {
        if (err) {
            log(`Couldn't get OS information: ${err}`);
            return callback(err);
        }

        if (res.os === 'win32' || res.os === 'darwin') {
            return callback(null, {
                os: res.os
            });
        }

        return callback(null, {
            os: res.dist
            , name: res.dist + ' ' + res.release
            , release: res.release
            , code: res.codename
        });
    });
};

module.exports = (path, callback) => {
    if (typeof path === 'function' && os.platform() !== 'win32') {
        callback = path;
        path = DEFAULT_OS_PATH;
    }

    if (path && typeof path === 'string') {
        return fs.readFile(path, (err, file) => {
            if (err) return getDist(callback);
            const osdist = file.toString().split('\n').reduce((json, element) => {
                if (element && element.trim()) {
                    const lineparts = element.split('=').map((part) => {
                        return part.trim().replace(/^"/, '').replace(/"$/, '');
                    });
                    json[lineparts[0].toUpperCase()] = lineparts[1];
                }
                return json;
            }, {});

            return callback(null, {
                os: osdist.NAME
                , name: osdist.PRETTY_NAME
                , release: osdist.VERSION_ID
                , code: osdist.VERSION
            });
        });
    }

    return getDist(callback);
};
