'use strict';
/*
 * The base code for this is taken from the 'node-growing-file' module (https://github.com/felixge/node-growing-file) by felixge
 * Due to the inactivity of the repo and our desire to switch to ES6 syntax, the code has been ported over with a few minor tweaks to the calling params
 */

const fs = require('fs');
const debug = require('debug')('logdna:tailreadstream');
const Readable = require('stream').Readable;
const config = require('../config');

const DOES_NOT_EXIST_ERROR = 'ENOENT';


class TailReadStream extends Readable {
    constructor(filepath, options) {
        options = options || {};

        super();

        this.readable = true;

        this._filepath = filepath;
        this._stream = null;
        this._offset = 0;

        this._interval = config.TRS_READ_INTERVAL || options.interval;
        this._timeout = config.TRS_READ_TIMEOUT || options.timeout;
        this._watchinterval = config.TRS_WATCH_INTERVAL || options.watchinterval;
        this._tailheadsize = config.TRS_TAILHEAD_SIZE || options.tailheadsize;
        this._tailheadage = config.TRS_TAILHEAD_AGE || options.tailheadage;
        this._idle = 0;

        this._reading = false;
        this._paused = false;
        this._ended = false;
        this._watching = false;
    }

    static tail(filepath, fromstart, options) {
        if (typeof fromstart === 'object') { // shift args
            options = fromstart;
            fromstart = false;
        }
        var file = new this(filepath, options);
        if (fromstart) {
            if (typeof fromstart === 'boolean') {
                // read from start
                debug(filepath + ': reading from beginning of file');
                file._readFromOffsetUntilEof();
            } else {
                // read from offset
                debug(filepath + ': reading from offset ' + fromstart);
                file._readFromOffsetUntilEof(+fromstart);
            }
        } else {
            // tail from end
            file._getFileSizeAndReadUntilEof();
        }
        return file;
    }

    get offset() { return this._offset; }
    get timeout() { return this._timeout; }
    set timeout(timeout) { this._timeout = timeout; }

    destroy() {
        this.readable = false;
        this._stream = null;
    }

    pause() {
        this._paused = true;
        this._stream.pause();
    }

    resume() {
        if (!this._stream) return;
        this._paused = false;
        this._stream.resume();
        this._readFromOffsetUntilEof();
    }

    _readFromOffsetUntilEof(offset) {
        if (!isNaN(offset)) {
            this._offset = offset;
        }

        if (this._paused || this._reading) {
            return;
        }

        this._reading = true;

        this._stream = fs.createReadStream(this._filepath, {
            start: this._offset
        });

        this._stream.on('error', this._handleError.bind(this));
        this._stream.on('data', this._handleData.bind(this));
        this._stream.on('end', this._handleEnd.bind(this));
    }

    _getFileSizeAndReadUntilEof() {
        var that = this;

        fs.stat(this._filepath, (err, stats) => {
            if (err) {
                that.readable = false;

                if (that._hasTimedOut()) {
                    debug(that._filepath + ': file does not exist, timed out after ' + that._timeout + 'ms');
                    that.destroy();
                    that.emit('end', err);
                    return;
                }

                if (err.code === DOES_NOT_EXIST_ERROR) {
                    debug(that._filepath + ': file does not exist, waiting for it to appear...');
                    setTimeout(that._getFileSizeAndReadUntilEof.bind(that), that._interval);
                    that._idle += that._interval;
                    return;
                }

                that.emit('error', err);
                return;
            }

            if (stats.size < that._tailheadsize && Date.now() - stats.birthtime.getTime() < that._tailheadage) {
                debug(that._filepath + ': file is smaller than ' + that._tailheadsize + ' bytes and is ' + (Date.now() - stats.birthtime.getTime()) + 'ms old, reading from beginning');
                that._readFromOffsetUntilEof(0); // tail from beginning of file if small enough (e.g. newly created files)
            } else {
                that._readFromOffsetUntilEof(stats.size);
            }
        });
    }

    _retryInInterval() {
        setTimeout(this._readFromOffsetUntilEof.bind(this), this._interval);
    }

    _handleError(error) {
        this._reading = false;

        if (this._hasTimedOut()) {
            debug(this._filepath + ': file no longer exists, timed out after ' + this._timeout + 'ms');
            this.destroy();
            this.emit('end', error);
            return;
        }

        if (error.code === DOES_NOT_EXIST_ERROR) {
            debug(this._filepath + ': file renamed, waiting for it to reappear...');
            if (this.readable) {
                this.readable = false;
                this.emit('rename');
                this._offset = 0; // reset on rename
            }
            this._idle += this._interval;
            this._retryInInterval();
            return;
        }

        this.readable = false;

        this.emit('error', error);
    }

    _handleData(data) {
        this.readable = true;

        this._offset += data.length;
        this._idle = 0;

        debug(this._filepath + ': reading ' + data.length + ' bytes');
        this.emit('data', data);
    }

    _handleEnd() {
        this._reading = false;

        if (!this._watching) {
            this._watching = true;
            this._watchFile();
        }

        if (!this._hasTimedOut()) {
            this._retryInInterval();
            return;
        }

        this.destroy();
        this.emit('end');
    }

    _hasTimedOut() {
        return this._idle >= this._timeout;
    }

    _watchFile() {
        var that = this;

        if (!this.readable) {
            this._watching = false;
            return;
        }

        fs.stat(this._filepath, (err, stats) => {
            if (err) {
                return setTimeout(that._watchFile.bind(that), that._watchinterval);
            }

            if (stats.size < that._offset) {
                that.emit('truncate', stats.size);
                if (stats.size < that._tailheadsize) {
                    debug(that._filepath + ': file truncated but smaller than ' + that._tailheadsize + ' bytes, reading from beginning');
                    that._offset = 0;
                } else {
                    debug(that._filepath + ': file truncated but larger than ' + that._tailheadsize + ' bytes, reading from ' + stats.size);
                    that._offset = stats.size;
                }
            }

            setTimeout(that._watchFile.bind(that), that._watchinterval);
        });
    }
}

module.exports = TailReadStream;
