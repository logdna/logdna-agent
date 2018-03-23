const _ = require('lodash');

// Custom JSON Checker:
exports.isJSON = function(obj) {
    return obj.constructor === {}.constructor;
};

// Custom splitter:
exports.split = function(str, delimiter=',') {
    return _.compact(_.map(str.split(delimiter), _.trim));
};

// Custom JSON Stringifier:
exports.stringify = function(obj, options=null) {

    options = options || {};
    const delimiter = options.delimiter || '';
    const indent = options.indent || '\t';
    const aligned = options.aligned || false;

    var maxKeyLength = _.reduce(obj, (maxLen, value, key) => {
        return key.length > maxLen ? key.length : maxLen;
    }, 0);
    if (!aligned) maxKeyLength += delimiter.length;

    return _.reduce(obj, (lines, value, key) => {
        value = value || '';
        if (_.isArray(value)) {
            value = '['+value.toString()+']';
        } else value = value.toString() || '';
        if (aligned) {
            key = key + _.repeat(' ', maxKeyLength-key.length) + delimiter;
        } else key = key + delimiter + _.repeat(' ', maxKeyLength-key.length);
        lines.push(key + indent + value);
        return lines;
    }, []).join('\n');
};

// Custom Scaled Merger:
exports.merge = function(objects, is_json=false) {
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
