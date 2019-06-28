// External Modules
const debug = require('debug')('logdna:lib:os-version');
const fs = require('fs');

// Internal Modules
const getos = require('./getos');

module.exports = (callback) => {
    return fs.readFile('/etc/os-release', (err, file) => {
        debug(file);
        if (err) {
            return getos((err, res) => {
                if (err) {
                    return callback(err);
                }

                if (res.os === 'win32') {
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
        }

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
};
