'use strict'

// External Modules
const debug = require('debug')('logdna:lib:linebuffer')
const fs = require('fs')
const Queue = require('file-queue').Queue
const zlib = require('zlib')

// Internal Modules
const utils = require('./utils')

// Variables
var buffer = []
var bufferStats = {
  lines: 0
, buflimit: 0
, flushlimit: 0
, flushsize: 0
, flushcount: 0
, ts: Date.now()
, excludelines: 0
}
var config = require('./config')
var dccount = 0
var httpErrorTime
var queue

// check response to see need for buffering into queue
const needsRetry = (error, response, body) => {
  if (error) {
    debug(`req error: ${error}`)
    if (!httpErrorTime) { httpErrorTime = Date.now() }
    if (bufferStats.flushcount % 10 === 0) { utils.log(`request error: ${error}`) }
    return config.HTTP_RETRY && config.DEFAULT_HTTP_ERRORS && config.DEFAULT_HTTP_ERRORS.includes(error.code)
  }

  if (!response) { return false }
  if (response.statusCode >= 400) {
    debug(`[${response.statusCode}] req failed: ${body}`)
    if (bufferStats.flushcount % 10 === 0) { utils.log(`[${response.statusCode}] request failed: ${body}`) }
    return response.statusCode >= 500
  }

  debug(`[${response.statusCode}] req succeeded: ${body}`)
  if (httpErrorTime) {
    debug('req succeeded, re-enabling')
    httpErrorTime = null
  }

  return false
}

const flush = () => {
  config.flushTimer = setTimeout(flush, config.FLUSH_INTERVAL)
  if (buffer.length === 0) { return }
  if (httpErrorTime) {
    if (Date.now() - httpErrorTime < config.HTTP_TIMEOUT / 2) {
      dccount = buffer.length
      return
    }

    httpErrorTime = Date.now() // reset
    debug('req re-attempting')
  }

  var jsonPayload = {
    e: 'ls'
  , ls: buffer
  }

  buffer = []
  var data = JSON.stringify(jsonPayload)
  const posthandler = (err, res, body) => {
    // Report each invalid log line
    if (res && res.statusCode === 207) {
      const statusCodes = JSON.parse(body).status
      if (statusCodes instanceof Array) {
        statusCodes.forEach((statusCode, index) => {
          if (statusCode !== 200) { utils.log(`[${statusCode}] ${JSON.stringify(jsonPayload.ls[index])}`, 'warn') }
        })
      }
    }

    if (needsRetry(err, res, body)) {
      // queue and retry request
      if (queue) {
        queue.push(JSON.stringify(jsonPayload.ls), (error) => {
          if (error) { utils.log(`file-queue error: ${error}`) }
          debug(`file-queue queued payload of ${jsonPayload.ls.length} lines`)

          // clear for http
          jsonPayload = null
          data = null
        })
      } else {
        if (!fs.existsSync(config.FILEQUEUE_PATH)) fs.mkdirSync(config.FILEQUEUE_PATH)
        queue = new Queue(config.FILEQUEUE_PATH, (err) => {
          if (err) { return utils.log(`error in creating file-queue @ ${config.FILEQUEUE_PATH}: ${err}`) }
          queue.length((_, length) => {
            if (length > 0) { utils.log(`retry buffer has ${length} previously failed payloads.`) }
          })

          const processQueue = () => {
            queue.length((_, length) => {
              if (length === 0) { return setTimeout(processQueue, config.HTTP_TIMEOUT) }

              queue.pop((err, payload) => {
                if (err) {
                  utils.log(`file-queue pop error: ${err}`)
                  return setImmediate(processQueue)
                }

                if (!payload) { return setImmediate(processQueue) }
                payload = JSON.parse(payload)
                if (Array.isArray(payload)) {
                  buffer = payload.concat(buffer)
                  debug(`file-queue flushed ${payload.length} lines`)
                }

                return setTimeout(processQueue, config.FLUSH_INTERVAL * 4)
              })
            })
          }

          // start processing q in 5s
          setTimeout(processQueue, 5000)
        })
      }

      return // prevent fallthrough
    }

    // clear for http
    jsonPayload = null
    data = null
  }

  if (config.req) {
    if (config.COMPRESS) {
      zlib.gzip(data, {
        level: config.GZIP_COMPRESS_LEVEL
      }, (_, out) => {
        config.req({
          body: out
        , headers: config.DEFAULT_REQ_HEADERS_GZIP
        , qs: {
            timestamp: Date.now()
          }
        }, posthandler)
        out = null
      })

    } else {
      config.req({
        body: data
      , qs: {
          timestamp: Date.now()
        }
      }, posthandler)
    }
  }

  debug(`sending ${jsonPayload.ls.length} lines, ${data.length} bytes`)
  if (bufferStats) {
    bufferStats.flushsize += jsonPayload.ls.length
    bufferStats.flushcount++
  }

  if (dccount > 0 && !httpErrorTime) {
    utils.log(`sent ${dccount} lines queued from earlier disconnection`)
    dccount = 0
  }
}

const addMessage = (message) => {
  // ignore empty message
  if (message.l === '') {
    return
  }

  if (buffer.length > config.BUF_LIMIT) {
    debug(`buffer limit exceeded ${buffer.length}`)
    bufferStats.buflimit++
    return
  }

  if (config.exclude_regex && config.exclude_regex.test(message.l)) {
    debug(`excluded regex line ${message.l}`)
    bufferStats.excludelines++
    return
  }

  buffer.push(message)
  if (bufferStats) { bufferStats.lines++ }

  // flush immediately if limit reached
  if (buffer.length === config.FLUSH_LIMIT) {
    debug('flush limit reached, flushing...')
    bufferStats.flushlimit++
    if (config.flushTimer) { clearTimeout(config.flushTimer) }
    setImmediate(flush)
  }
}

const setConfig = (conf) => { config = conf }

// Module Exports
module.exports.addMessage = addMessage
module.exports.flush = flush
module.exports.setConfig = setConfig
