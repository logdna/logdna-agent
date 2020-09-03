'use strict'

const {createLogger} = require('@logdna/logger')
const {log} = require('./utils.js')
let logger

module.exports = {
  createLoggerClient
, get log() {
    return logger
  }
}

function createLoggerClient(config) {
  log(`LogDNA URL: ${config.LOGDNA_URL}`, 'info')

  logger = createLogger(config.key, {
    payloadStructure: 'agent'
  , url: config.LOGDNA_URL
  , hostname: config.hostname.replace(/[^a-zA-Z0-9]/g, '') // Satisfy hostname regex in the client
  , mac: config.mac
  , ip: config.ip
  , tags: config.tags
  , proxy: config.PROXY
  , flushLimit: config.FLUSH_LIMIT
  , flushIntervalMs: config.FLUSH_INTERVAL
  , compress: config.COMPRESS
  , UserAgent: config.UserAgent
  })

  logger.on('error', (err) => {
    log(err, 'error')
  })

  return logger
}
