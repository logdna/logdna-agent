'use strict'

const {log} = require('./utils.js')

module.exports = function buildLoggerURL(config) {
  const {
    LOGDNA_LOGSSL: ssl
  , LOGDNA_LOGHOST: host
  , LOGDNA_LOGPORT: port
  , LOGDNA_LOGENDPOINT: endpoint
  } = config

  const protocol = ssl
    ? 'https'
    : 'http'

  const url = `${protocol}://${host}:${port}${endpoint}`

  log(`LogDNA URL: ${url}`, 'info')

  return url
}
