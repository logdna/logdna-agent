/* globals describe, it, before, after */
require('../helpers/before');
// var WebSocketServer = require('ws').Server;
var fs = require('fs');
// var path = require('path');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:connection-manager');
var mockery = require('mockery');
var rimraf = require('rimraf');
// var skeemas = require('skeemas');
// var statsSchema = require('../helpers/message-schemas/stats');
// var logSchema = require('../helpers/message-schemas/log');
var tempDir = '.temp';


var getProxyFromURI = require('../../lib/getProxyFromURI');
const connectionManager = require('../../lib/connection-manager');
getProxyFromURI = jest.fn(() => {return 9});

describe('lib:connection-manager', function() {
  it('test', function() {
    const config = {
      test: 'test'
    }
    connectionManager.connectLogServer(config, 'unitTestProgram');

  });
});
