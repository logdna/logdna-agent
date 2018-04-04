const _ = require('lodash');

// Custom JSON Checker:
exports.isJSON = function(obj) {
    return obj.constructor === {}.constructor;
};

// Custom splitter:
exports.split = function(str, delimiter = ',') {
    return _.compact(_.map(str.split(delimiter), _.trim));
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
        merged.push(merged.pop().concat(obj));
        return merged;
    }, [[]])[0];
};

// Custom Processing - Combining all processes:
exports.processOption = function(programValues, configValues) {
    const newValues = exports.merge(_.map(programValues, (value) => {
        return exports.split(value);
    }));
    const oldValues = (configValues ? configValues : []);
    return _.uniq(exports.merge([oldValues, newValues]));
};

exports.appender = function(xs) {
    xs = xs || [];
    return function(x) {
        xs.push(x);
        return xs;
    };
};
