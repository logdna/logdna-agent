var events = require('events');
var util = require('util');
var url = require('url');
var WebSocket = require('ws');

function LDWebSocket(address, protocols, options) {
    options = options || {};
    if (typeof protocols === 'object') {
        options = protocols;
        this.protocols = null;
    } else {
        this.protocols = protocols;
    }

    this.address = address;
    this.reconnection = (typeof options.reconnection === 'boolean' ? options.reconnection : true);
    this.reconnectionDelay = options.reconnectionDelay || 1000;
    this.reconnectionDelayMax = options.reconnectionDelayMax || 5000;
    this.connectTimeout = options.connectTimeout || 20000;
    this.connectAttempt = 0;
    this.connected = false;
    this.reconnectionFactor = 1.5;
    this.alreadyReconnecting = false;
    this.options = options;
    this.connectTimeoutHandler = null;
    this.reconnectTimeoutHandler = null;
    this.open();
}

util.inherits(LDWebSocket, events.EventEmitter);

LDWebSocket.prototype.open = function() {
    var uri = this.address;
    if (this.options.query) {
        var u = url.parse(uri);
        u.query = this.options.query;
        u.search = null;
        uri = url.format(u);
    }

    this.ws = new WebSocket(uri, this.protocols, this.options);
    this.ws.once('open', this.onopen.bind(this));
    this.ws.once('close', this.onclose.bind(this));
    this.ws.once('error', this.onerror.bind(this));
    this.ws.on('message', this.onmessage.bind(this));
    this.ws.on('ping', this.onping.bind(this));
    this.ws.on('pong', this.onpong.bind(this));

    this.connectTimeoutHandler = setTimeout(function() { this.reconnect(); }.bind(this), this.connectTimeout);
};

LDWebSocket.prototype.onopen = function() {
    this.connectAttempt = 0;
    this.connected = true;
    clearTimeout(this.connectTimeoutHandler);
    clearTimeout(this.reconnectTimeoutHandler);
    this.emit('open');
};

LDWebSocket.prototype.onclose = function(code, message) {
    this.connected = false;
    this.emit('close', code, message);
    this.reconnect();
};

LDWebSocket.prototype.onerror = function(err) {
    this.emit('error', err);
    this.reconnect();
};

LDWebSocket.prototype.onmessage = function(data, flags) {
    this.emit('message', data, flags);
};

LDWebSocket.prototype.onping = function(data, flags) {
    this.emit('ping', data, flags);
};

LDWebSocket.prototype.onpong = function(data, flags) {
    this.emit('pong', data, flags);
};

LDWebSocket.prototype.reconnect = function() {
    if (this.alreadyReconnecting) return;
    this.alreadyReconnecting = true;

    clearTimeout(this.connectTimeoutHandler);
    clearTimeout(this.reconnectTimeoutHandler);
    if (!this.reconnection) {
        return;
    }

    if (this.ws) {
        this.ws.terminate();
        this.connected = false;
    }

    var timeout = this.reconnectionDelay * Math.pow(this.reconnectionFactor, this.connectAttempt);
    if (timeout > this.reconnectionDelayMax) {
        timeout = this.reconnectionDelayMax;
    }

    this.connectAttempt++;

    this.reconnectTimeoutHandler = setTimeout(function() {
        this.alreadyReconnecting = false;
        this.emit('reconnecting', this.connectAttempt);
        this.open();
    }.bind(this), timeout);
};

[
    'send'
    , 'stream'
    , 'close'
    , 'pause'
    , 'resume'
    , 'ping'
    , 'pong'
    , 'terminate'
    , 'addEventListener'
].forEach(function(method) {
    if (method === 'close') {
        this.reconnection = false;
    }

    LDWebSocket.prototype[method] = function() {
        this.ws[method].apply(this.ws, arguments);
    };
});

[
    'bytesReceived'
    , 'readyState'
    , 'protocolVersion'
    , 'supports'
    , 'upgradeReq'
    , 'url'
    , '_socket'
].forEach(function(getter) {
    LDWebSocket.prototype.__defineGetter__(getter, function() {
        return this.ws[getter];
    });
});

module.exports = LDWebSocket;
