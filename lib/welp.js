var exec = require('child_process').exec;
var _ = require('lodash');
var debug = require('debug')('winevent');

function CustomWELR(options) {
    var defaultOptions = {
        startTime: new Date(Date.now())
        , frequency: 10000 // miliseconds
    };
    this.options = _.merge({}, defaultOptions, options);
    this.options.startTime = this.options.startTime - this.options.frequency;
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

CustomWELR.prototype._processLogEvent = function(event) {

    var createdAt = new Date(parseInt(event.TimeCreated.replace(/\//g, '').replace('Date(', '').replace(')', '')));

    return {
        id: event.Id
        , providerName: event.ProviderName
        , providerId: event.ProviderId
        , logName: event.LogName
        , processId: event.ProcessId
        , threadId: event.threadId
        , machineName: event.MachineName
        , timeCreated: createdAt
        , levelDisplayName: event.LevelDisplayName
        , level: event.Level
        , message: event.Message
    };
};

CustomWELR.prototype._parseLogData = function(data) {

    data = '[' + data.join(',') + ']';
    var events = JSON.parse(JSON.parse(JSON.stringify(data)));

    if (!_.isArray(events)) return [this._processLogEvent(events)];

    return _.map(events, (event) => {
        return this._processLogEvent(event);
    });

};

CustomWELR.prototype._powershellDate = function(date) {
    return date.toString().split(' ').slice(0, 5).join(' ');
};

CustomWELR.prototype.start = function() {
    var providerNames, logNames, providerNamesCmd, logNamesCmd;
    var PS = 'powershell "Get-WinEvent -FilterHashTable @{';
    setTimeout(() => {

/*
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
*/
        PS += 'StartTime=\'' + this._powershellDate(this.option.startTime) + '\'; ';
        PS += 'EndTime=\'' + this._powershellDate(new Date(Date.now())) + '\'}';
        PS += ' | ConvertTo-Json"';

        debug(PS);

        this.powershell = exec(PS);
        var eventRawData = [];

        this.powershell.stdout.on('data', data => {
            eventRawData.push(data);
        });

        this.powershell.stderr.on('data', error => {
            this.subscribers.error.forEach(subscriber => {
                subscriber.call(this, error);
            });
        });

        this.powershell.on('close', code => {

            if (!_.isEmpty(eventRawData)) {
                var logData = this._parseLogData(eventRawData);
                this.subscribers.data.forEach(subscriber => {
                    subscriber.call(this, logData);
                });
            }

            if (this._stop) {
                return;
            }
            // iterate loop, starting from now to the next frequency time
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
