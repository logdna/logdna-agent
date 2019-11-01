// External Modules
const fs = require('fs');
const os = require('os');

// Internal Modules
const getOS = require('./get-os');
const log = require('./utils').log;

// Helper in Getting Dist from GetOS
const getDist = (callback) => {
    let dist = {};

    return getOS((error, result) => {
        if (error) {
            log(`Couldn't get OS information: ${error}`);
        } else if (result) {
            dist.os = result.os;
            if (dist.os !== 'win32' && dist.os !== 'darwin') {
                dist.name = `${result.dist} ${result.release}`;
                dist.release = result.release;
                dist.code = result.codename;
            }
        }

        return callback(null, dist);
    });
};

module.exports = (path, callback) => {
    if (os.platform() === 'win32') {
        return getDist(callback);
    }

    return fs.readFile(path, (err, file) => {
        if (err) {
            return getDist(callback);
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
