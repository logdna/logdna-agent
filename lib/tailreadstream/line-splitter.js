'use strict';
// from https://github.com/msimerson/safe-log-reader/blob/master/lib/line-splitter.js

// https://nodejs.org/api/stream.html#stream_object_mode

const StringDecoder = require('string_decoder').StringDecoder;
const Transform = require('stream').Transform;
const util = require('util');

function LineSplitter(options) {
    if (!options) { options = {}; }
    if (!options.transform) { options.transform = { objectMode: true }; }

    Transform.call(this, options.transform);
    this._encoding = options.encoding || 'utf8';
    this._seperator = options.seperator || '\n';
    this._buffer = '';
    this._decoder = new StringDecoder(this._encoding);
    this.bytes = options.bytes || 0;
}

util.inherits(LineSplitter, Transform);
LineSplitter.prototype._transform = function(chunk, encoding, done) {
    this.bytes += chunk.length;
    if (encoding !== this._encoding) {
        // this is likely 'buffer' when the source file is an archive
        this._buffer += this._decoder.write(chunk);
    } else {
        // already decoded by fs.createReadStream
        this._buffer += chunk;
    }

    const lines = this._buffer.split(this._seperator);
    this._buffer = lines.pop();
    for (const line of lines) { this.push(line); }
    done();
};

LineSplitter.prototype._flush = function(done) {
    // trailing text (after last seperator)
    const rem = this._buffer.trim();
    if (rem) { this.push(rem); }
    done();
};

module.exports = function(options) {
    return new LineSplitter(options);
};
