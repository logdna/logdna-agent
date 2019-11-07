// External Modules
const os = require('os');
const properties = require('properties');
const spawn = require('child_process').spawn;

// Custom Scaled Merger
const merge = (objects) => {
    return objects.reduce((merged, obj) => {
        if (!Array.isArray(obj)) obj = [obj];
        const arr = merged.pop().concat(obj);
        merged.push(arr.filter((element, index) => arr.indexOf(element) === index));
        return merged.filter((element, index) => merged.indexOf(element) === index);
    }, [[]])[0];
};

// Prepare Message Reporting the Options Affected
const preparePostMessage = (diff) => {
    const length = diff.length;
    if (length === 0) return 'Nothing has';
    if (length === 1) return `${diff[0]} has`;
    if (length === 2) return `${diff[0]} and ${diff[1]} have`;
    const last = diff.pop();
    return `${diff.join(', ')}, and ${last} have`;
};

// Custom Splitter
const split = (str, delimiter, hasWhitespace) => {
    return str.split(delimiter || ',').map(element => {
        if (hasWhitespace) {
            element = element.replace(/^"+/, '').replace(/"+$/, '');
            element = element.replace(/^'+/, '').replace(/'+$/, '');
            element = element.replace(/\+/, ' ');
        }
        return element.trim();
    }).filter(element => element);
};

// Custom Appender
const appender = (xs) => {
    xs = xs || [];
    return (x) => {
        xs.push(x);
        return xs;
    };
};

// Build URL
const buildUrl = (host, port, ssl, endpoint) => {
    if (typeof ssl === 'string') {
        endpoint = ssl;
        ssl = false;
    }
    let url = `${ssl ? 'https' : 'http'}://${host}:${port}`;
    if (endpoint) url = url + endpoint;
    return url;
};

// Custom Logger
const log = (message, level) => {
    let datetime = new Date();
    datetime = `${datetime.toISOString().replace('T', ' ').split('.')[0]} ${datetime.toString().split(' ')[5].split('GMT')[1]}`;
    console.log(`${datetime} [${(level || 'info')}] ${message}`);
};

// Pick the Keys to List Values of
const pick2list = (options, config) => {
    const lowOptions = options.map(value => value.toLowerCase());
    if (lowOptions.indexOf('all') > -1) {
        return {
            cfg: config
            , valid: true
        };
    }

    config = Object.keys(config).reduce((obj, key) => {
        if (options.indexOf(key) > -1) obj[key] = config[key];
        return obj;
    }, {});

    if (Object.keys(config).length === 0) {
        return {
            valid: false
            , msg: 'Invalid or Bad Parameter'
        };
    }
    return {
        cfg: config
        , valid: true
    };
};

// Custom Processing - Combining all processes
const processOption = (options, config, hasWhitespace) => {
    const newValues = merge(options.map(option => split(option, ',', hasWhitespace)));
    const oldValues = (config ? (typeof config === 'string' ? split(config, ',', false) : config) : []);
    const diff = newValues.filter(value => oldValues.indexOf(value) < 0).filter(value => value);

    return {
        values: merge([oldValues, newValues]).filter(element => element)
        , diff: preparePostMessage(diff)
    };
};

// Restart LogDNA Agent
const restartSelf = () => {
    if (os.platform() === 'linux') {
        return spawn('/bin/bash', ['-c'
            , '/etc/init.d/logdna-agent restart'
        ], {
            detached: true
        });
    } else if (os.platform() === 'win32') {
        return spawn('cmd.exe', ['/c'
            , 'nssm'
            , 'restart'
            , 'logdna-agent'
        ], {
            detached: true
        });
    }
};

// Saving into Config Files
const saveConfig = (config, configPath, callback) => {
    return properties.stringify(config, {
        path: configPath
    }, callback);
};

// Custom JSON Stringifier
const stringify = (obj) => {

    const maxKeyLength = Object.keys(obj).reduce((maxLen, key) => {
        return key.length > maxLen ? key.length : maxLen;
    }, 0);

    return Object.keys(obj).reduce((lines, key) => {

        var value = obj[key] !== null && obj[key].toString().split(',') || '';

        if (Array.isArray(value)) {
            if (value.length > 1) {
                value = '[ ' + value.join(', ') + ' ]';
            }
        } else {
            value = value.toString();
        }

        lines.push(key + ' '.repeat(maxKeyLength - key.length) + ' = ' + value);

        return lines;

    }, []).join('\n');
};

// Custom UnSetting Configuration
const unsetConfig = (options, config) => {
    options = merge(options.map(option => split(option, ',', false).filter(element => element !== 'key')));
    const lowOptions = options.map(value => value.toLowerCase());
    if (lowOptions.indexOf('all') > -1) {
        return {
            cfg: {
                key: config.key
            }, msg: 'All configurations except LogDNA Ingestion Key have been deleted!'
        };
    }

    const oldValues = (config ? Object.keys(config) : []);
    config = Object.keys(config).reduce((obj, key) => {
        if (options.indexOf(key) === -1) obj[key] = config[key];
        return obj;
    }, {});
    const newValues = (config ? Object.keys(config) : []);
    const diff = oldValues.filter(value => newValues.indexOf(value) < 0).filter(value => value);

    return {
        cfg: config
        , msg: `${preparePostMessage(diff)} been deleted!`
    };
};

// Update LogDNA Agent if Enabled
const updateSelf = () => {
    if (os.platform() === 'linux') {
        return spawn('/bin/bash', ['-c'
            , 'if [[ ! -z $(which apt-get) ]]; then apt-get update; apt-get install -y --force-yes logdna-agent; elif [[ ! -z $(which yum) ]]; then yum clean expire-cache; yum -y install logdna-agent; elif [[ ! -z $(which zypper) ]]; then zypper refresh; zypper install -y logdna-agent; fi; sleep 1; /etc/init.d/logdna-agent start'
        ], {
            detached: true
        });
    } else if (os.platform() === 'win32') {
        return spawn('cmd.exe', ['/c'
            , 'choco'
            , 'upgrade'
            , 'logdna-agent'
            , '-y'
            , '--allowunofficial'
        ], {
            detached: true
        });
    }
};

exports.appender = appender;
exports.buildUrl = buildUrl;
exports.log = log;
exports.pick2list = pick2list;
exports.processOption = processOption;
exports.restartSelf = restartSelf;
exports.saveConfig = saveConfig;
exports.stringify = stringify;
exports.unsetConfig = unsetConfig;
exports.updateSelf = updateSelf;
