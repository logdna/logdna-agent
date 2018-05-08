const _ = require('lodash');
const config = require('./config');

// Custom Splitter:
const split = function(str, delimiter) {
    delimiter = delimiter || ',';
    return _.compact(_.map(str.split(delimiter), _.trim));
};

// Custom JSON Stringifier:
const stringify = function(obj) {

    var maxKeyLength = _.reduce(obj, (maxLen, value, key) => {
        return key.length > maxLen ? key.length : maxLen;
    }, 0);

    return _.reduce(obj, (lines, value, key) => {

        value = value !== null && value.toString().split(',') || '';

        if (_.isArray(value)) {
            if (value.length > 1) {
                value = '[ ' + value.join(', ') + ' ]';
            }
        } else {
            value = value.toString();
        }

        key = key + _.repeat(' ', maxKeyLength - key.length) + ' =';

        lines.push(key + ' ' + value);

        return lines;

    }, []).join('\n');
};

// Custom Scaled Merger:
const merge = function(objects, is_json) {
    is_json = is_json || false;
    if (is_json) {
        return _.reduce(objects, (merged, obj) => {
            merged.push(_.merge(merged.pop(), obj));
            return merged;
        }, [{}])[0];
    }
    return _.reduce(objects, (merged, obj) => {
        if (!_.isArray(obj)) obj = [obj];
        merged.push(_.uniq(merged.pop().concat(obj)));
        return _.uniq(merged);
    }, [[]])[0];
};

// Custom Processing Windows Event Log Options:
const processWinEventOption = function(options, config) {

    const newValues = merge(_.map(options, (option) => {
        return _.map(exports.split(option), (value) => {
            var split = value.split('/');
            var boolSplit = _.map(split, (splitted) => {
                return _.includes(['all', '*', ''], splitted.toLowerCase());
            });
            if (split.length > 1) {
                if (boolSplit[0] && !boolSplit[1]) return '*/' + split[1];
                if (!boolSplit[0] && boolSplit[1]) return split[0] + '/*';
                if (!(boolSplit[0] || boolSplit[1])) return split[0] + '/' + split[1];
            } else {
                if (!boolSplit[0]) return '*/' + split[0];
            }
        });
    }));

    if (_.isEmpty(newValues)) {
        return {
            valid: false
        };
    }
    const oldValues = (config ? (_.isString(config) ? exports.split(config) : config) : []);
    const diff = _.uniq(_.difference(newValues, oldValues));
    return {
        values: _.uniq(merge([oldValues, newValues]))
        , diff: _.isEmpty(diff) ? 'Nothing new has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has')
        , valid: true
    };
};

// Custom Processing - Combining all processes:
const processOption = function(options, config) {
    const newValues = merge(_.map(options, (option) => {
        return exports.split(option);
    }));
    const oldValues = (config ? (_.isString(config) ? exports.split(config) : config) : []);
    const diff = _.uniq(_.difference(newValues, oldValues));
    return {
        values: _.uniq(merge([oldValues, newValues]))
        , diff: _.isEmpty(diff) ? 'Nothing new has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has')
    };
};

// Pick the Keys to List Values of:
const pick2list = function(options, config) {
    const lowOptions = _.map(options, (value) => {
        return value.toLowerCase();
    });
    if (_.includes(lowOptions, 'all')) {
        return {
            cfg: config
            , valid: true
        };
    }
    delete lowOptions;
    config = _.pick(config, options);
    if (_.isEmpty(config)) {
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
const unsetConfig = function(options, config) {
    options = merge(_.map(options, (option) => {
        return _.without(exports.split(option), 'key');
    }));
    const lowOptions = _.map(options, (value) => {
        return value.toLowerCase();
    });
    if (_.includes(lowOptions, 'all')) {
        return {
            cfg: {
                key: config.key
            }
            , msg: 'All configurations except LogDNA Ingestion Key have been deleted!'
        };
    }
    delete lowOptions;
    const oldValues = (config ? Object.keys(config) : []);
    config = _.omit(config, options);
    const newValues = (config ? Object.keys(config) : []);
    const diff = _.uniq(_.difference(oldValues, newValues));
    const message = _.isEmpty(diff) ? 'Nothing has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has');
    return {
        cfg: config
        , msg: message + ' been deleted!'
    };
};

exports.unsetConfig = unsetConfig;
exports.processOption = processOption;
exports.processWinEventOption = processWinEventOption;
exports.stringify = stringify;
exports.split = split;
exports.pick2list = pick2list;
