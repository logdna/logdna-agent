'use strict'

// Testing env vars is painful here. Override the default and check config-driven
// option later
process.env.LOGGER_SEND_USER_AGENT = ''

const {test} = require('tap')
const loggerClient = require('../../lib/logger-client.js')
const config = require('../../lib/config.js')

const CONFIG_DEFAULT = {
  ...config
, key: 'abc123'
, UserAgent: 'fake-transport@1.2.3'
, hostname: 'myhostname'
}

test('Check logger defaults', async (t) => {
  const logger = loggerClient.createLoggerClient(CONFIG_DEFAULT)
  const requestDefaults = logger[Symbol.for('requestDefaults')]

  t.match(requestDefaults.headers, {
    'Content-Type': 'application/json; charset=UTF-8'
  , 'Content-Encoding': 'gzip'
  }, 'Default headers are correct')

  const agentRegex = /@logdna\/logger\/\d+\.\d+\.\d+ \(fake-transport@1\.2\.3\)/
  const header = logger[Symbol.for('userAgentHeader')]

  t.equal(agentRegex.test(header), true, 'UserAgent header is correct')

  t.equal(logger.sendUserAgent, true, 'sendUserAgent is taken from the env')
})

test('Check logger passthrough options for flushing', async (t) => {
  const logger = loggerClient.createLoggerClient({
    ...CONFIG_DEFAULT
  , FLUSH_LIMIT: 12345
  , FLUSH_INTERVAL: 34567
  })
  const requestDefaults = logger[Symbol.for('requestDefaults')]

  t.match(requestDefaults.headers, {
    'Content-Type': 'application/json; charset=UTF-8'
  , 'Content-Encoding': 'gzip'
  }, 'Default headers are correct')

  t.equal(logger.flushLimit, 12345, 'flushLimit is passed through')
  t.equal(logger.flushIntervalMs, 34567, 'flushIntervalMs is passed through')
})

test('Check logger passthrough options for sending the user agent', async (t) => {
  const logger = loggerClient.createLoggerClient({
    ...CONFIG_DEFAULT
  , sendUserAgent: false
  })

  t.equal(logger.sendUserAgent, false, 'sendUserAgent is passed through')
})

