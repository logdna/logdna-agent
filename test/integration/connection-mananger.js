'use strict'

const path = require('path')
const fs = require('fs')
const {promisify} = require('util')
const {test} = require('tap')
const nock = require('nock')
const constants = require('../../lib/config.js')
const connectionManager = require('../../lib/connection-manager.js')
const fileUtilities = require('../../lib/file-utilities.js')
const utils = require('../../lib/utils.js')

const sleep = promisify(setTimeout)

nock.disableNetConnect()

test('connectLogServer calls healthcheck and tails a log', async (t) => {
  const logname = 'connection-manager.log'
  const tempDir = t.testdir({
    [logname]: ''
  })
  const logPath = path.join(tempDir, logname)

  const config = {
    ...constants
  , 'hostname': 'MyHostMachine'
  , 'package': 'logdna-agent/1.6.5'
  , 'distro': 'darwin'
  , 'userAgent': 'logdna-agent/1.6.5 (darwin)'
  , 'mac': '3c:22:fb:27:72:f5'
  , 'ip': '192.168.1.9'
  , 'COMPRESS': false
  , 'logdir': [tempDir]
  }

  nock(utils.buildUrl(config.LOGDNA_LOGHOST, config.LOGDNA_LOGPORT, config.LOGDNA_LOGSSL))
    .post(config.LOGDNA_HEALTHCHECK, (body) => {
      return true
    })
    .query((qs) => { return true })
    .reply(200, {
      autoupdate: false
    , restart: false
    , status: 'ok'
    , cluster: 'ld60'
    , statusCode: 200
    })
    .post(config.LOGDNA_LOGENDPOINT, (body) => {
      const expected = {
        e: 'ls'
      , ls: [
          {
            t: Number
          , l: 'Here is my line1'
          , f: logPath
          }
        , {
            t: Number
          , l: 'Here is my line 2'
          , f: logPath
          }
        ]
      }
      t.match(body, expected, 'Ingester POST body is correct')
      return true
    })
    .query((qs) => {
      t.match(qs, {
        compress: '0'
      , hostname: config.hostname
      , ip: config.ip
      , mac: config.mac
      , timestamp: /^\d+$/
      , transport: 'http'
      }, 'Ingester POST QUERY_STRING is correct')
      return true
    })
    .reply(200, 'Ingested')

  connectionManager.connectLogServer(config)

  await sleep(500)
  await fs.promises.appendFile(logPath, 'Here is my line1\nHere is my line 2\n', 'utf8')
  await sleep(1000)

  fileUtilities.gracefulShutdown()
})
