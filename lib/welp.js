var exec = require('child_process').exec;
var _ = require('lodash');
var debug = require('debug')('winevent');
var utils = require('./utils');

function CustomWELR(options) {
    var defaultOptions = {
        startTime: new Date(Date.now())
        , frequency: 10000
    };
    this.options = _.merge({}, defaultOptions, options);
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

CustomWELR.prototype.start = function() {
    var providerNames, logNames, providerNamesCmd, logNamesCmd;
    var PS = 'powershell "Get-WinEvent -FilterHashTable @{';
    setTimeout(() => {

        if (this.options.providerNames) {
            providerNames = this.options.providerNames.map((providerName) => {
                return '\'' + providerName + '\'';
            }).join(', ');
            providerNamesCmd = 'ProviderName=@(' + providerNames + ')';
            PS += providerNamesCmd + '; ';
        }

        if (this.options.logNames) {
            logNames = this.options.logNames.map((logName) => {
                return '\'' + logName + '\'';
            }).join(', ');
            logNamesCmd = 'LogName=@(' + logNames + ')';
            PS += logNamesCmd + '; ';
        }

        PS += 'StartTime=\'' + this._powershellDate(this.options.startTime) + '\'; ';
        PS += 'EndTime=\'' + this._powershellDate(new Date(Date.now())) + '\'}';
        PS += ' | ConvertTo-Json"';

        debug(PS);

        this.powershell = exec(PS);
        var alldata = '';

        this.powershell.stdout.on('data', data => {
            alldata += data;
        });

        this.powershell.stderr.on('error', error => {
            this.subscribers.error.forEach(subscriber => {
                subscriber.call(this, error);
            });
        });

        this.powershell.on('close', code => {

            if (!_.isEmpty(alldata)) {
                const logs = this._processWinEventData(alldata);
                this.subscribers.data.forEach(subscriber => {
                    subscriber.call(this, logs);
                });
            }

            if (this._stop) {
                return;
            }

            this.options.startTime = new Date(Date.now());
            this.start();
        });
    }, this.options.frequency);
};

CustomWELR.prototype.stop = function() {
    this._stop = true;
    this.powershell.kill();
    this.subscribers.end.forEach(subscriber => {
        subscriber.call(this);
    });
};

module.exports = CustomWELR;
