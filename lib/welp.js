var exec = require('child_process').exec;
var _ = require('lodash');
var debug = require('debug')('winevent');

function CustomWELR(options) {
    this.options = options;
    this.subscribers = {
        data: []
        , end: []
        , error: []
    };
}

CustomWELR.prototype.on = function(eventName, cb) {

    if (typeof cb !== 'function') {
        throw new Error('Must provide a function callback');
    }
    switch (eventName) {
        case 'data':
            this.subscribers.data.push(cb);
            break;
        case 'end':
            this.subscribers.end.push(cb);
            break;
        case 'end':
            this.subscribers.error.push(cb);
            break;
    }
};

CustomWELR.prototype._cleanLogString = function(logString) {
    var str = logString;
    str = str.replace(' ', '');
    str = str.replace('\n', '');
    str = str.replace('\r', '');
    str = str.replace('\t', '');
    str = str.replace('\r\n', '');
    str = str.replace('\\n', '');
    str = str.replace('\\r', '');
    str = str.replace('\\t', '');
    str = str.replace('\\r\\n', '');
    return str;
};

CustomWELR.prototype._checkLogString = function(logString) {
    try {
        const parsedJSON = JSON.parse(this._cleanLogString(logString));
        if (!_.isArray(parsedJSON)) return [JSON.stringify(parsedJSON)];
        return _.map(parsedJSON, (parsed) => {
            return JSON.stringify(parsed);
        });
    } catch (e) {
        return 0;
    }
};

CustomWELR.prototype.streamEvents = function() {
    _.forEach(this.options.events, (event) => {
        var logs = '';
        var PS = 'powershell "./scripts/windows/winTail.ps1" ' + event + '"';
        this.powershell = exec(PS);
        this.powershell.stdout.on('data', data => {
            logs += data;
            const checkedLogs = this._checkLogString(logs);
            if (checkedLogs) {
                this.subscribers.data.forEach(subscriber => {
                    subscriber.call(this, checkedLogs);
                });
                logs = '';
            }
        });
        this.powershell.stderr.on('error', error => {
            this.subscribers.error.forEach(subscriber => {
                subscriber.call(this, error);
            });
        });
    });
};

module.exports = CustomWELR;
