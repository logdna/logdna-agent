const _ = require('lodash');

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
        if (_.isArray(value)) {
            value = '['+value.toString()+']';
        } else value = value.toString();
        if (aligned) {
            key = key + _.repeat(' ', maxKeyLength-key.length) + delimiter;
        } else key = key + delimiter + _.repeat(' ', maxKeyLength-key.length);
        lines.push(key + indent + value);
        return lines;
    }, []).join('\n');
};
