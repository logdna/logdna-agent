const _ = require('lodash');
const config = require('./config');

// Beautify Stringified JSON:
const beautify = function(jstr) {
    var regex = /(\\r|\\n|\\t| |\n|\t|\r)/gm;
    return jstr.replace(regex, '');
};

// Finding last index of RegEx:
const regexLastIndexOf = function(str, regex) {
    var matched = str.match(regex);
    var index = str.search(regex);
    if (index < 0) {
        return {
            index: -1
        };
    }
    var nextStr = str.slice(index + 1, str.length);
    var next = regexLastIndexOf(nextStr, regex);
    if (next.index < 0) {
        return {
            match: matched[0]
            , index: index
            , length: matched[0].length
        };
    }
    return {
        match: next.match
        , index: next.index + index + 1
        , length: next.match.length
    };
};

// Minimizing the Windows Event Log Object:
const compressWinLogObject = function(logObject) {

    const fields = [
        'level'
        , 'event'
        , 'time'
        , 'meta'
    ];

    var appName = logObject.meta.provider.name || logObject.meta.provider || logObject.event.name;

    logObject.message = logObject.message.replace(/(\\r\\n){2,}/gm, '\\r\\n');
    logObject.message = logObject.message.replace(/(\\t)/gm, ' ');

    if (logObject.message.length >= config.MAX_LINE_LENGTH) {
        return {
            obj: {
                message: logObject.message.slice(0, config.MAX_LINE_LENGTH)
            }
            , app: appName
        };
    }

    var compressed = {
        message: logObject.message
    };

    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        compressed[field] = logObject[field];
        if (JSON.stringify(compressed).length > config.MAX_LINE_LENGTH) {
            compressed = _.omit(compressed, field);
            return {
                obj: compressed
                , app: appName
            };
        }
    }

    return {
        obj: compressed
        , app: appName
    };
};

// Process Windows Event Log Data:
const processWinEventData = function(data) {
    var ending = ']';
    data = _.map(data.split('"'), (value, strIndex) => {
        return (parseInt(strIndex) % 2) ? value : beautify(value);
    }).join('"');
    if (data[0] !== '[') ending = '';
    var lastMatch = regexLastIndexOf(data, /("Message":"(.*))/gm);
    if (lastMatch.index >= 0) {
        lastMatch.match = lastMatch.match.split('"').slice(0, 4).join('"') + '"}';
        lastMatch.length = lastMatch.match.length;
        return data.slice(0, lastMatch.index + lastMatch.length) + ending;
    }
    lastMatch = regexLastIndexOf(data, /("Message":)/gm);
    if (lastMatch.index < 0) return '';
    lastMatch.match = lastMatch.match + 'null}';
    lastMatch.length = lastMatch.match.length;
    return data.slice(0, lastMatch.index + lastMatch.length) + ending;
};

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

    const newValues = exports.merge(_.map(options, (option) => {
        return _.map(exports.split(option), (value) => {
            var split = value.split('/');
            var boolSplit = _.map(split, (splitted) => {
                return _.includes(['all', '*', ''], splitted.toLowerCase());
            });
            console.log(split);
            console.log(boolSplit);
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
        values: _.uniq(exports.merge([oldValues, newValues]))
        , diff: _.isEmpty(diff) ? 'Nothing new has' : (diff.length > 1 ? diff.join(', ') + ' have' : diff[0] + ' has')
        , valid: true
    };
};

// Custom Processing - Combining all processes:
const processOption = function(options, config) {
    const newValues = exports.merge(_.map(options, (option) => {
        return exports.split(option);
    }));
    const oldValues = (config ? (_.isString(config) ? exports.split(config) : config) : []);
    const diff = _.uniq(_.difference(newValues, oldValues));
    return {
        values: _.uniq(exports.merge([oldValues, newValues]))
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
    options = exports.merge(_.map(options, (option) => {
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
exports.merge = merge;
exports.stringify = stringify;
exports.processWinEventData = processWinEventData;
exports.split = split;
exports.compressWinLogObject = compressWinLogObject;
exports.pick2list = pick2list;
