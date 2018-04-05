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

CustomWELR.prototype._processLogEvent = function(event) {

    var createdAt = new Date(parseInt(event.TimeCreated.replace(/\//g, '').replace('Date(', '').replace(')', '')));
    var message = event.Message || '';

    var machine = {
        name: event.MachineName || ''
    };
    if (!event.ProcessId && !event.threadId) {
        machine = machine.name;
    } else if (event.ProcessId) {
        machine.process = event.ProcessId;
    } else {
        machine.thread = event.threadId;
    }

    var provider = {
        name: event.ProviderName || ''
    };
    if (event.ProcessId) {
        provider.id = ProcessId;
    } else {
        provider = provider.name;
    }

    return {
        meta: {
            provider: provider
            , event: {
                id: event.Id
                , name: event.LogName
            }
            , level: {
                id: event.Level
                , name: event.LevelDisplayName
            }
            , machine: machine
        }
        , event: {
            id: event.Id
            , name: event.LogName
        }
        , level: event.LevelDisplayName
        , time: createdAt
        , message: message
    };
};

CustomWELR.prototype._parseLogData = function(events) {

    if (!_.isArray(events)) {
        return _.isEmpty(events) ? [] : [this._processLogEvent(events)];
    }

    return _.map(events, (event) => {
        if (!_.isEmpty(event)) {
            return this._processLogEvent(event);
        }
        return {};
    });

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
        var eventRawData;
        var alldata = '';

        this.powershell.stdout.on('data', data => {
            alldata += data;
        });

        this.powershell.stderr.on('data', error => {
            this.subscribers.error.forEach(subscriber => {
                subscriber.call(this, error);
            });
        });

        this.powershell.on('close', code => {

            if (!_.isEmpty(alldata)) {
                alldata = utils.processWinEventData(alldata);
                try {
                    eventRawData = JSON.parse(alldata);
                } catch (e) {
                    console.log('ERROR: Failed Log Data Parsing');
                }
                var logData = this._parseLogData(eventRawData);
                this.subscribers.data.forEach(subscriber => {
                    subscriber.call(this, logData);
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
