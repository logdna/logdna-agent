'use strict'

const path = require('path')
const fs = require('fs')
const {test} = require('tap')
const nock = require('nock')
const constants = require('../../lib/config.js')
const start = require('../../lib/start.js')
const fileUtilities = require('../../lib/file-utilities.js')

nock.disableNetConnect()

test('start() calls healthcheck and tails a log', (t) => {
  t.plan(2)
  t.on('end', () => {
    nock.cleanAll()
    fileUtilities.gracefulShutdown()
  })

  const logname = 'connection-manager.log'
  const tempDir = t.testdir({
    [logname]: ''
  })
  const logPath = path.join(tempDir, logname)

  const config = {
    ...constants
  , hostname: 'MyHostMachine'
  , UserAgent: 'logdna-agent/1.6.5 (darwin)'
  , mac: '3c:22:fb:27:72:f5'
  , ip: '192.168.1.9'
  , COMPRESS: false
  , logdir: [tempDir]
  , key: '<MY KEY HERE>'
  }

  nock(config.LOGDNA_URL)
    .post(/.*/, (body) => {
      const expected = {
        e: 'ls'
      , ls: [
          {
            line: 'Here is my line1'
          , f: logPath
          }
        , {
            line: 'Here is my line 2'
          , f: logPath
          }
        ]
      }
      t.match(body, expected, 'Ingester POST body is correct')
      return true
    })
    .query((qs) => {
      t.match(qs, {
        hostname: config.hostname
      , ip: config.ip
      , mac: config.mac
      , tags: ''
      }, 'Ingester POST QUERY_STRING is correct')
      return true
    })
    .reply(200, 'Ingested')

  start(config)

  setTimeout(async () => {
    await fs.promises.appendFile(logPath, 'Here is my line1\nHere is my line 2\n', 'utf8')
  }, 500)
})
