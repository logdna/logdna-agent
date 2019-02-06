// Custom Splitter:
const split = (str, delimiter) => {
    return (str.split(delimiter || ',').map(element => element.trim())).filter(element => element);
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
const processOption = (options, config) => {
    const newValues = merge(options.map(option => exports.split(option)));
    const oldValues = (config ? (typeof config === 'string' ? exports.split(config) : config) : []);
    const diff = newValues.filter(value => oldValues.indexOf(value) < 0).filter(value => value);
    return {
        values: merge([oldValues, newValues]).filter(element => element)
        , diff: diff.length === 0 ? 'Nothing new has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has')
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
    const message = diff.length === 0 ? 'Nothing has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has');
    return {
        cfg: config
        , msg: message + ' been deleted!'
    };
};

exports.unsetConfig = unsetConfig;
exports.processOption = processOption;
exports.stringify = stringify;
exports.split = split;
exports.pick2list = pick2list;
