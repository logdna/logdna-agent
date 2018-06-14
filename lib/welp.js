var exec = require('child_process').exec;
var _ = require('lodash');
var debug = require('debug')('winevent');
var utils = require('./utils');
var config = require('./config');

function CustomWELR(options) {
    this.options = options;
    this.options.frequency = config.WINEVENT_FREQ;
    this.options.startTime = new Date(Date.now() - this.options.frequency);
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

CustomWELR.prototype._processWinEventData = function(logData) {
    try {
        const parsedJSON = JSON.parse(logData);
        return _.isArray(parsedJSON) ? _.map(parsedJSON, (log) => {
            return JSON.stringify(log);
        }) : [JSON.stringify(parsedJSON)];
    } catch (e) {
        if (logData[0] === '[') {
            return _.map(_.trim(_.trim(logData, '\n]'), '[\n').split('},\n    {'), (log) => {
                return '{' + _.trim(_.trim(log, '}'), '{') + '}';
            });
        } else if (logData[0] === '{') {
            return ['{' + _.trim(_.trim(logData, '}'), '{') + '}'];
        } else {
            return [];
        }
    };
};

CustomWELR.prototype._powershellDate = function(date) {
    return date.toString().split(' ').slice(0, 5).join(' ');
};

CustomWELR.prototype._ps = function(options, logData) {
    var PS = 'powershell "Get-WinEvent -FilterHashTable @{';
    PS += 'LogName=@(' + options.events.map((event) => {
        return '\'' + event + '\'';
    }).join(', ') + ');'
    PS += 'StartTime=\'' + this._powershellDate(options.startTime) + '\'; ';
    PS += 'EndTime=\'' + this._powershellDate(new Date(Date.now())) + '\'}';
    PS += ' | ConvertTo-Json"';
//    var PS = 'powershell ../scripts/windows/winTail.ps1 ' + options.event;
    this.powershell = exec(PS);
    this.powershell.stdout.on('data', data => {
        logData += data;
    });
    this.powershell.stderr.on('error', error => {
        this.subscribers.error.forEach(subscriber => {
            subscriber.call(this, error);
        });
    });
    this.powershell.on('close', code => {
        if (!_.isEmpty(logData)) {
            const logs = this._processWinEventData(logData);
            this.subscribers.data.forEach(subscriber => {
                subscriber.call(this, logs);
            });
        }
        this.powershell.kill('SIGKILL');
        return;
    });
};

CustomWELR.prototype.start = function() {
    this.interval = setInterval(() => {
        this._ps(this.options, '');
        this.options.startTime = new Date(Date.now());
    }, this.options.frequency);
};

CustomWELR.prototype.stop = function() {
    if (this.interval) clearInterval(this.interval);
    if (this.powershell) this.powershell.kill();
    this.subscribers.end.forEach(subscriber => {
        subscriber.call(this);
    });
};

module.exports = CustomWELR;
