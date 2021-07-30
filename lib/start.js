'use strict'

const client = require('./logger-client.js')
const fileUtils = require('./file-utilities.js')

module.exports = function start(config) {
  client.createLoggerClient(config)
  fileUtils.streamAllLogs(config)
}
