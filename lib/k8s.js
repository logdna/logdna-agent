// External Modules
const debug = require('debug')('logdna:k8s');
const net = require('net');

// Internal Modules
const log = require('./utils').log;
const config = require('./config');

// Constants
const HTTP_HEADERS = 'HTTP/1.1\r\nHost: localhost\r\n\r\n';
const LABEL_BLACKLIST = ['controller-revision-hash', 'image', 'integration-test', 'name', 'pod-template-generation', 'pod-template-hash'];
const SANDBOX_NAME_KEY = 'io.kubernetes.sandbox.id';

// Variables
var client;
var containerIdToNetworkId = {};
var networkIdToLabels = {};
var numLabels = 0;
var startup = true;
var lastChunk, bytesLeft;

var storeLabels = function(id, labels) {
    // Pick up actual container id from pod sandbox and map to networkid
    if (labels[SANDBOX_NAME_KEY]) {
        var networkId = labels[SANDBOX_NAME_KEY];
        containerIdToNetworkId[id] = networkId;
        if (labels.image) {
            var nidLabels = {};
            if (networkIdToLabels[networkId]) {
                nidLabels = networkIdToLabels[networkId];
            }
            // Always keep original labels - containers are immutable!
            if (!nidLabels.image) {
                var imageArray = labels.image.split(':');
                nidLabels.image = imageArray[imageArray.length - 1];
            }
            networkIdToLabels[networkId] = nidLabels;
        }
        return;
    }
    // Map network id to labels object
    var importantLabels = {};
    if (networkIdToLabels[id]) {
        importantLabels = networkIdToLabels[id];
    }
    Object.keys(labels).forEach(function(key) {
        if (key.indexOf('.') === -1 && LABEL_BLACKLIST.indexOf(key) === -1) {
            // Always keep original labels - containers are immutable!
            if (!importantLabels[key]) {
                importantLabels[key] = labels[key];
                numLabels++;
            }
        }
    });
    if (Object.keys(importantLabels).length > 0) {
        networkIdToLabels[id] = importantLabels;
    }
};

var processAllContainers = function(containers) {
    // Grab initial set of containers on startup
    containers.forEach(function(container) {
        if (container.Id && container.Labels) {
            if (container.Image) {
                container.Labels.image = container.Image;
            }
            storeLabels(container.Id, container.Labels);
        }
    });
    log('Found ' + Object.keys(networkIdToLabels).length + ' pods, ' + numLabels + ' labels in ' + config.SOCKET_PATH);
};

var processContainerEvent = function(event) {
    if (event.status === 'destroy') {
        // Delete labels of containers that have been destroyed
        delete containerIdToNetworkId[event.id];
        delete networkIdToLabels[event.id];
    } else if (event.status === 'create') {
        storeLabels(event.id, event.Actor.Attributes);
    }
};

var processDataStream = function(data) {
    var index = 0;
    if (data.indexOf('HTTP/1.1 ') === 0) {
        var responseCode = data.slice(0, data.indexOf('\r\n')).toString().split(' ')[1];
        if (parseInt(responseCode) >= 400) {
            log('Unexpected response code connecting to ' + config.SOCKET_PATH + ': ' + responseCode);
        }
        index = data.indexOf('\r\n\r\n');
        if (index !== -1) {
            data = data.slice(index + 4);
        }
    }
    if (data.length > 5) {
        var length, json;
        if (bytesLeft) {
            length = bytesLeft;

        } else if (data.indexOf('\r\n') < 10) {
            length = parseInt(data.slice(0, data.indexOf('\r\n')).toString(), 16);
            data = data.slice(data.indexOf('\r\n') + 2);
        }

        debug('Frame length ' + length + ', chunk length ' + data.length);

        // more than 1 chunk, ignore appended \r\n
        if (length + 2 > data.length) {
            bytesLeft = length - data.length;
            length = data.length;
        }

        debug('#### START CHUNK ####');
        debug(data.slice(0, 20).toString() + '...' + data.slice(length - 20, length).toString().replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
        debug('#### END CHUNK ####');

        var payload = (lastChunk || '') + data.slice(0, length).toString().trim();

        if (data.length > length) {
            if (lastChunk) {
                // last chunk, clear
                lastChunk = null;
                bytesLeft = null;
                debug('clearing lastChunk');
            }

        } else {
            // incomplete payload
            lastChunk = payload;
            return;
        }

        // parse for json, or drop frame
        if (payload.substring(payload.length - 1) === '}' || payload.substring(payload.length - 1) === ']') {
            // complete buffer
            debug('parsing json payload: ' + payload.substring(0, 20) + '...' + payload.substring(payload.length - 20));
            json = JSON.parse(payload);
        }

        if (startup === true) {
            startup = false;
            processAllContainers(json);
            client.write('GET /events?type=container ' + HTTP_HEADERS);
        } else {
            processContainerEvent(json);
        }
    }
};

exports.init = function() {
    client = net.connect(config.SOCKET_PATH, function() {
        log('Connected to ' + config.SOCKET_PATH);
        client.write('GET /containers/json ' + HTTP_HEADERS);
    });
    client.on('error', function(err) {
        log('Error connecting to ' + config.SOCKET_PATH + ': ' + err);
    });
    client.on('data', processDataStream);
    client.on('end', function() {
        log('Disconnected from ' + config.SOCKET_PATH);
    });
};

exports.getLabelsFromFile = function(filename) {
    var containerId = filename.substring(filename.lastIndexOf('-') + 1, filename.length - 4);
    return networkIdToLabels[containerIdToNetworkId[containerId]];
};
