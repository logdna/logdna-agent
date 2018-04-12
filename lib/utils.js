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
    var next = exports.regexLastIndexOf(nextStr, regex);
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

// Custom UnSetting Configuration:
const unsetConfig = function(options, config) {
    options = _.map(options, (option) => {
        return option.toLowerCase();
    });
    if (_.includes(options, 'all')) {
        return {
            cfg: {
                key: config.key
            }
            , msg: 'All configurations except LogDNA Ingestion Key have been deleted!'
        };
    }
    var JSONOptions = {};
    _.forEach(options, (option) => {
        var splitOption = exports.split(option, ':');
        if (splitOption.length > 1) {
            JSONOptions[splitOption[0]] = exports.split(splitOption[1], ',');
        } else {
            JSONOptions[splitOption[0]] = [];
        }
    });
    var omitResult = exports.omitByIndices(config, JSONOptions);
    if (_.isEmpty(omitResult.messages)) {
        return {
            cfg: config
            , msg: 'Nothing has been deleted!'
        };
    }
    return {
        cfg: omitResult.config
        , msg: 'Configurations: ' + omitResult.messages.join(', ') + ' have been deleted!'
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

    var appName = logObject.event.name;

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
        return (parseInt(strIndex) % 2) ? value : exports.beautify(value);
    }).join('"');
    if (data[0] !== '[') ending = '';
    var lastMatch = exports.regexLastIndexOf(data, /("Message":"(.*))/gm);
    if (lastMatch.index >= 0) {
        lastMatch.match = lastMatch.match.split('"').slice(0, 4).join('"') + '"}';
        lastMatch.length = lastMatch.match.length;
        return data.slice(0, lastMatch.index + lastMatch.length) + ending;
    }
    lastMatch = exports.regexLastIndexOf(data, /("Message":)/gm);
    if (lastMatch.index < 0) return '';
    lastMatch.match = lastMatch.match + 'null}';
    lastMatch.length = lastMatch.match.length;
    return data.slice(0, lastMatch.index + lastMatch.length) + ending;
};

// Custom JSON Checker:
const isJSON = function(obj) {
    return obj.constructor === {}.constructor;
};

// Custom Splitter:
const split = function(str, delimiter) {
    delimiter = delimiter || ',';
    return _.compact(_.map(str.split(delimiter), _.trim));
};

// Custom Complex Splitter:
const complexSplit = function(str, delimiter) {
    delimiter = delimiter || 'AND';
    var splitted;
    var list = [];
    var json = {};
    if (_.includes(str, delimiter)) {
        splitted = exports.split(str, delimiter);
    } else if (_.includes(str, delimiter.toLowerCase())) {
        splitted = exports.split(str, delimiter.toLowerCase());
    } else if (_.includes(str, delimiter.toUpperCase())) {
        splitted = exports.split(str, delimiter.toUpperCase());
    } else if (_.includes(str, ':')) {
        splitted = exports.split(str, ':');
        var result = {};
        result[splitted[0]] = _.uniq(exports.split(splitted[1]));
        return result;
    } else {
        return _.uniq(exports.split(str));
    }
    _.forEach(splitted, (split) => {
        var secondary = exports.complexSplit(split, delimiter);
        if (exports.isJSON(secondary)) {
            _.forOwn(secondary, (value, key) => {
                if (json[key]) {
                    json[key] = _.uniq(json[key].concat(value));
                } else {
                    json[key] = _.uniq(value);
                }
            });
        } else {
            list = _.uniq(list.concat(secondary));
        }
    });
    _.forEach(list, (entry) => {
        json[entry] = [];
    });
    return json;
};

// Custom JSON Stringifier:
const stringify = function(obj, options) {

    options = options || {};
    const delimiter = options.delimiter || '';
    const indent = options.indent || '\t';
    const aligned = options.aligned || false;
    const broken = options.broken || false;
    const numbered = options.numbered || false;

    var maxKeyLength = _.reduce(obj, (maxLen, value, key) => {
        return key.length > maxLen ? key.length : maxLen;
    }, 0);

    var maxValueLength = _.reduce(obj, (maxLen, value, key) => {
        if (_.isArray(value)) {
            var max = 0;
            _.forEach(value, (entry) => {
                max = (entry.toString().length > max) ? entry.toString().length : max;
            });
            return max > maxLen ? max : maxLen;
        }
        return value.toString().length > maxLen ? value.toString().length : maxLen;
    }, 0);

    if (!aligned) maxKeyLength += delimiter.length;
    if (numbered && broken) maxValueLength += 1;

    return _.reduce(obj, (lines, value, key) => {

        value = value !== null && value.split(',') || '';

        if (numbered) {
            var offset;
            if (_.isArray(value)) {
                for (var i = value.length - 1; i >= 0; i--) {
                    offset = 1;
                    if (broken) offset = maxValueLength - value[i].toString().length;
                    value[i] = value[i] + _.repeat(' ', offset) + '(' + i.toString() + ')';
                    if (i > 0 && broken) {
                        value[i] = _.repeat(' ', maxKeyLength + delimiter.length) + indent + value[i];
                    }
                }
            } else {
                offset = 1;
                if (broken) offset = maxValueLength - value.toString().length;
                value = value.toString() + _.repeat(' ', offset) + '(0)';
            }
        }

        if (_.isArray(value)) {
            if (broken) {
                value = _.map(value, (entry) => {
                    return entry.toString();
                }).join('\n');
            } else {
                if (value.length > 1) {
                    value = '[' + value.join(', ') + ']';
                }
            }
        } else {
            value = value.toString();
        }

        if (aligned) {
            key = key + _.repeat(' ', maxKeyLength - key.length) + delimiter;
        } else {
            key = key + delimiter + _.repeat(' ', maxKeyLength - key.length);
        }

        lines.push(key + indent + value);

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
    const newValues = exports.merge(_.map(options, (value) => {
        var splitValues = [];
        var split = exports.split(value, '/');
        var providers = [];
        var events = [];
        if (split.length > 1) {
            if (_.includes(split[0], 'all') || split[0] === '' || _.includes(split[0], '*')) {
                providers.push('*');
            } else {
                _.forEach(exports.split(split[0]), (provider) => {
                    providers.push(provider);
                });
            }
            if (_.includes(split[1], 'all') || split[1] === '' || _.includes(split[1], '*')) {
                events.push('*');
            } else {
                _.forEach(exports.split(split[1]), (event) => {
                    events.push(event);
                });
            }
        } else {
            if (_.includes(split[0], 'all') || split[0] === '' || _.includes(split[0], '*')) {
                events.push('*');
            } else {
                _.forEach(exports.split(split[0]), (event) => {
                    events.push(event);
                });
            }
        }
        if (_.isEmpty(providers)) {
            providers = ['*'];
        }
        if (_.isEmpty(events)) {
            events = ['*'];
        }
        _.forEach(providers, (provider) => {
            _.forEach(events, (event) => {
                console.log(provider + '/' + event);
                if (provider !== '*' || event !== '*') {
                    splitValues.push(provider + '/' + event);
                }
            });
        });
        return splitValues;
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
        , diff: _.isEmpty(diff) ? ['Nothing new'] : diff
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
        , diff: _.isEmpty(diff) ? ['Nothing new'] : diff
    };
};

// Custom Omitter:
const omitByIndices = function(obj, indObj) {
    var messageParts = [];
    _.forOwn(indObj, (value, key) => {
        if (obj[key]) {
            if (_.isString(obj[key])) obj[key] = exports.split(obj[key]);
            if (_.isEmpty(value)) {
                obj = _.omit(obj, key);
                messageParts.push('all ' + key);
            } else {
                var sortedInd = _.uniq(_.map(value, (entry) => {
                    return parseInt(entry);
                }).sort((a, b) => {
                    return b - a;
                }));
                const oldObjValue = obj[key];
                const oldObjVelueLen = oldObjValue.length;
                var countRemoved = 0;
                _.forEach(sortedInd, (index) => {
                    if (index < oldObjVelueLen) {
                        _.remove(obj[key], (entry) => {
                            return entry === oldObjValue[index];
                        });
                        countRemoved += 1;
                    }
                });
                if (_.isEmpty(obj[key])) {
                    obj = _.omit(obj, key);
                    messageParts.push('all ' + key);
                } else if (countRemoved > 0) {
                    messageParts.push('some ' + key);
                } else {
                    messageParts.push('no ' + key);
                }
            }
        }
    });
    return {
        config: obj
        , messages: messageParts
    };
};

// Pick the Keys to List Values of:
const pick2list = function(options, config) {
    options = _.map(options, (option) => {
        return option.toLowerCase();
    });
    if (_.includes(options, 'all')) {
        return {
            cfg: config
            , valid: true
        };
    }
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

exports.unsetConfig = unsetConfig;
exports.omitByIndices = omitByIndices;
exports.processOption = processOption;
exports.processWinEventOption = processWinEventOption;
exports.merge = merge;
exports.stringify = stringify;
exports.processWinEventData = processWinEventData;
exports.isJSON = isJSON;
exports.complexSplit = complexSplit;
exports.split = split;
exports.regexLastIndexOf = regexLastIndexOf;
exports.beautify = beautify;
exports.compressWinLogObject = compressWinLogObject;
exports.pick2list = pick2list;
