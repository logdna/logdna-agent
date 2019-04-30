// Custom Splitter:
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

// Prepare Message Reporting the Options Affected:
const preparePostMessage = (diff, length) => {
    if (length === 0) return 'Nothing has';
    if (length === 1) return `${diff[0]} has`;
    if (length === 2) return `${diff[0]} and ${diff[1]} have`;
    const last = diff.pop();
    return `${diff.join(', ')}, and ${last} have`;
};

// Custom JSON Stringifier:
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

// Custom Scaled Merger:
const merge = (objects) => {
    return objects.reduce((merged, obj) => {
        if (!Array.isArray(obj)) obj = [obj];
        const arr = merged.pop().concat(obj);
        merged.push(arr.filter((element, index) => arr.indexOf(element) === index));
        return merged.filter((element, index) => merged.indexOf(element) === index);
    }, [[]])[0];
};

// Custom Processing - Combining all processes:
const processOption = (options, config, hasWhitespace) => {
    const newValues = merge(options.map(option => split(option, ',', hasWhitespace)));
    const oldValues = (config ? (typeof config === 'string' ? split(config, ',', false) : config) : []);
    const diff = newValues.filter(value => oldValues.indexOf(value) < 0).filter(value => value);

    return {
        values: merge([oldValues, newValues]).filter(element => element)
        , diff: preparePostMessage(diff, diff.length)
    };
};

// Pick the Keys to List Values of:
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

// Custom UnSetting Configuration:
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
        , msg: `${preparePostMessage(diff, diff.length)} been deleted!`
    };
};

exports.unsetConfig = unsetConfig;
exports.processOption = processOption;
exports.stringify = stringify;
exports.split = split;
exports.pick2list = pick2list;
