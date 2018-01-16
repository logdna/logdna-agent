const net = require('net');
const log = require('./log');

const HTTP_HEADERS = 'HTTP/1.1\r\nHost: localhost\r\n\r\n';
const LABEL_BLACKLIST = ['controller-revision-hash', 'image', 'integration-test', 'name', 'pod-template-generation', 'pod-template-hash'];
const SANDBOX_NAME_KEY = 'io.kubernetes.sandbox.id';
const SOCKET_PATH = '/var/run/docker.sock';

var client;
var containerIdToNetworkId = {};
var networkIdToLabels = {};
var startup = true;

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
                nidLabels.image = imageArray[imageArray.length-1];
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
            }
        }
    });
    if (Object.keys(labels).length > 0) {
        networkIdToLabels[id] = importantLabels;
    }
};

var processAllContainers = function(containers) {
    // Grab initial set of containers on startup
    containers.forEach(function(container) {
        if (container.id && container.data && container.data.Labels) {
            if (container.data.Image) {
                container.data.Labels.image = container.data.Image;
            }
            storeLabels(container.id, container.data.Labels);
        }
    });
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
            log('Unexpected response code connecting to ' + SOCKET_PATH + ': ' + responseCode);
        }
        index = data.indexOf('\r\n\r\n');
        if (index !== -1) {
            data = data.slice(index + 4);
        }
    }
    if (data.length > 5) {
        var length = parseInt(data.slice(0, data.indexOf('\r\n')).toString(), 16);
        data = data.slice(data.indexOf('\r\n') + 2);
        var json = JSON.parse(data.slice(0, length).toString());
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
    client = net.connect(SOCKET_PATH, function() {
        log('Connected to ' + SOCKET_PATH);
        client.write('GET /containers/json ' + HTTP_HEADERS);
    });
    client.on('error', function(err) {
        log('Error connecting to ' + SOCKET_PATH + ': ' + err);
    });
    client.on('data', processDataStream);
    client.on('end', function() {
        log('Disconnected from ' + SOCKET_PATH);
    });
};

exports.getLabelsFromFile = function(filename) {
    var containerId = filename.substring(filename.lastIndexOf('-')+1, filename.length-4);
    return networkIdToLabels[containerIdToNetworkId[containerId]];
};
