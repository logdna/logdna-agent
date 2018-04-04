const _ = require('lodash');

// Custom JSON Checker:
exports.isJSON = function(obj) {
    return obj.constructor === {}.constructor;
};

// Custom Splitter:
exports.split = function(str, delimiter = ',') {
    return _.compact(_.map(str.split(delimiter), _.trim));
};

// Custom Complex Splitter:
exports.complexSplit = function(str, delimiter = 'AND') {
    var splitted, list = [], json = {};
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
exports.stringify = function(obj, options = null) {

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
exports.merge = function(objects, is_json = false) {
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

// Custom Processing - Combining all processes:
exports.processOption = function(programValues, configValues) {
    const newValues = exports.merge(_.map(programValues, (value) => {
        return exports.split(value);
    }));
    const oldValues = (configValues ? (_.isString(configValues) ? exports.split(configValues) : configValues) : []);
    const diff = _.uniq(_.difference(newValues, oldValues));
    return {
        values: _.uniq(exports.merge([oldValues, newValues]))
        , diff: _.isEmpty(diff) ? ['Nothing new'] : diff
    };
};

// Custom Appender:
exports.appender = function(xs) {
    xs = xs || [];
    return function(x) {
        xs.push(x);
        return xs;
    };
};

// Custom Omitter:
exports.omitByIndices = function(obj, indObj) {
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
        parsedConfig: obj
        , messages: messageParts
    };
};
