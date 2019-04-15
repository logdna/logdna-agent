// Custom Splitter:
const split = (str, delimiter, whitespace) => {

    if (whitespace === undefined && typeof delimiter === 'boolean') {
        whitespace = delimiter;
        delimiter = undefined;
    }

    return str.split(delimiter || ',').map(element => {
        if (whitespace) {
            element = element.replace(/^"+/, '').replace(/"+$/, '');
            element = element.replace(/^'+/, '').replace(/'+$/, '');
            element = element.replace(/\+/, ' ');
        }
        return element.trim()
    }).filter(element => element);
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

        key = key + ' '.repeat(maxKeyLength - key.length) + ' =';

        lines.push(key + ' ' + value);

        return lines;

    }, []).join('\n');
};

// Custom Scaled Merger:
const merge = (objects, is_json) => {
    is_json = is_json || false;
    if (is_json) {
        return objects.reduce((merged, obj) => {
            merged.push(Object.assign(merged.pop(), obj));
            return merged;
        }, [{}])[0];
    }
    return objects.reduce((merged, obj) => {
        if (!Array.isArray(obj)) obj = [obj];
        const arr = merged.pop().concat(obj);
        merged.push(arr.filter((element, index) => arr.indexOf(element) === index));
        return merged.filter((element, index) => merged.indexOf(element) === index);
    }, [[]])[0];
};

// Custom Processing - Combining all processes:
const processOption = (options, config, whitespace) => {
    const newValues = merge(options.map(option => exports.split(option, whitespace)));
    const oldValues = (config ? (typeof config === 'string' ? exports.split(config) : config) : []);
    const diff = newValues.filter(value => oldValues.indexOf(value) < 0).filter(value => value);
    
    var message = `Nothing has`;
    if (diff.length === 1) { message = `${diff[0]} has`; }
    else if (diff.length === 2) { message = `${diff[0]} and ${diff[1]} have`; }
    else if (diff.length > 2) {
        const last = diff.pop();
        message = `${diff.join(', ')}, and ${last} have`;
    }

    return {
        values: merge([oldValues, newValues]).filter(element => element)
        , diff: message
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
    options = merge(options.map(option => exports.split(option).filter(element => element !== 'key')));
    const lowOptions = options.map(value => value.toLowerCase());
    if (lowOptions.indexOf('all') > -1) {
        return {
            cfg: {
                key: config.key
            }
            , msg: 'All configurations except LogDNA Ingestion Key have been deleted!'
        };
    }

    const oldValues = (config ? Object.keys(config) : []);
    config = Object.keys(config).reduce((obj, key) => {
        if (options.indexOf(key) === -1) obj[key] = config[key];
        return obj;
    }, {});
    const newValues = (config ? Object.keys(config) : []);
    const diff = oldValues.filter(value => newValues.indexOf(value) < 0).filter(value => value);
    
    var message = 'been deleted!';
    if (diff.length === 0) { message = `Nothing has ${message}`; }
    else if (diff.length === 1) { message = `${diff[0]} has ${message}`; }
    else if (diff.length === 2) { message = `${diff[0]} and ${diff[1]} have ${message}`; }
    else {
        const last = diff.pop();
        message = `${diff.join(', ')}, and ${last} have ${message}`;
    }
    
    return {
        cfg: config
        , msg: message
    };
};

exports.unsetConfig = unsetConfig;
exports.processOption = processOption;
exports.stringify = stringify;
exports.split = split;
exports.pick2list = pick2list;
