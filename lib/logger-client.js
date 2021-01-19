'use strict'

const {createLogger} = require('@logdna/logger')
const {log} = require('./utils.js')
const buildLoggerURL = require('./build-logger-url.js')

let logger

module.exports = {
  createLoggerClient
, get log() {
    return logger
  }
}

function createLoggerClient(config) {
  logger = createLogger(config.key, {
    payloadStructure: 'agent'
  , url: buildLoggerURL(config)
  , hostname: config.hostname.replace(/[^a-zA-Z0-9.-]/g, '') // Satisfy hostname regex in the client
  , mac: config.mac
  , ip: config.ip
  , tags: config.tags
  , proxy: config.PROXY
  , flushLimit: config.FLUSH_LIMIT
  , flushIntervalMs: config.FLUSH_INTERVAL
  , compress: config.COMPRESS
  , UserAgent: config.UserAgent
  , sendUserAgent: config.sendUserAgent
  })

  logger.on('error', (err) => {
    log(err, 'error')
  })

  return logger
}
