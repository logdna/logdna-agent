'use strict'

const fs = require('fs')
const os = require('os')
const async = require('async')
const debug = require('debug')('logdna:lib:file-utilities')
const glob = require('glob')
const split2 = require('split2')
const TailFile = require('@logdna/tail-file')

const spawn = require('child_process').spawn

const log = require('./utils').log

const client = require('./logger-client.js')

const GLOB_CHARS_REGEX = /[*?[\]()]/
// TODO(darinspivey) This config is set in many places.  We need a centralized location to get/set it (maybe use a Map)
let conf = null

const globalExclude = [
  // '**/*+(-|_)20[0-9][0-9]*', // date stamped files: cronlog-20150928
  '**/testexclude'
, '/var/log/wtmp'
, '/var/log/btmp'
, '/var/log/utmp'
, '/var/log/wtmpx'
, '/var/log/btmpx'
, '/var/log/utmpx'
, '/var/log/asl/**'
, '/var/log/sa/**'
, '/var/log/sar*'
, '/tmp/cur'
, '/tmp/new'
, '/tmp/tmp'
]

// Variables
// TODO(darinspivey) - Logging should be done upstream upon receiving an error cb
let firstrun = true
let files = []
const tails = []
const tailStreams = []

module.exports = {
  getFiles
, gracefulShutdown
, streamAllLogs
, streamFiles
}

function getFiles(config, dir, callback) {
  // glob patterns always use / (even on windows)
  var globdir = dir.replace('\\', '/')

  // default glob pattern for simple dir input (ie: /var/log)
  // include all **/*.log and extensionless files
  var globpattern = `{${globdir}/**/*.log,${globdir}/**/!(*.*)}`

  fs.stat(dir, (error, stats) => {
    if (error) {
      // see if dir matches any glob control chars
      if (!GLOB_CHARS_REGEX.test(dir)) {
        if (firstrun) {
          log(`error accessing ${dir}: ${error}`, 'error')
        }
        return callback && callback(error)
      }

      // set as globpattern
      globpattern = globdir

    } else if (!stats.isDirectory()) {
      if (stats.isFile()) {
        // single file? just return as an single item array (this also avoids globalExclude intentionally)
        return callback && callback(null, [dir])
      }

      // something else? block devices, socket files, etc
      if (firstrun) {
        log(`error opening ${dir}: not a file or directory`, 'error')
      }

      return callback && callback(new Error('not a file or directory'))
    }

    debug(globpattern)
    glob(globpattern, {
      nocase: os.platform() !== 'win32' && globpattern.indexOf('*') === -1
    , nodir: true
    , ignore: globalExclude.concat(config.exclude || [])
    }, (error, logfiles) => {
      if (error) {
        if (firstrun) {
          log(`error opening ${dir}: ${error}`, 'error')
        }
        return callback && callback(error)
      }

      return callback && callback(null, logfiles)
    })
  })
}

function streamFiles(config, logfiles, callback) {
  logfiles.forEach((file) => {
    const startPos = 0
    const tail = new TailFile(file, {
      encoding: 'utf8'
    , startPos
    })
    debug(`tailing: ${file}`)
    tail.on('error', (error) => {
      log(`tail error: ${file}: ${error}`, 'error')
    })

    tail.on('end', (error) => {
      if (error) {
        log(
          `file does not exist, stopped tailing: ${file} after ${tail.timeout}ms`
        , 'warn'
        )
        files = files.filter((element) => { return element !== file })
      }
    })

    tail.on('rename', () => {
      log(`log rotated: ${file} by rename`)
    })

    tail.on('truncate', () => {
      log(`log rotated: ${file} by truncation`)
    })

    try {
      tail
        .start()
        .then(callback)
        .catch((err) => {
          log.error(err, 'Tail could not start. Does the file exist?')
        })

      tail.pipe(split2())
        .on('data', (line) => {
          if (config.exclude_regex && config.exclude_regex.test(line)) return
          client.log.agentLog({
            line
          , f: file
          })
        })
      tailStreams.push(tail)
    } catch (err) {

      log.error(err, 'Tail could not start.  Does the file exist?')
    }
    return callback && callback()
  })
}

function streamAllLogs(config, callback) {
  conf = config
  var newfiles = []
  debug(`scanning all folders: ${config.logdir}`)
  async.each(config.logdir, (dir, done) => {
    getFiles(config, dir, (err, logfiles) => {
      if (!err && logfiles.length > 0) {
        conf = config
        debug(`all ${dir} files`)
        debug(logfiles)

        // figure out new files that we're not already tailing
        var diff = logfiles.filter((element) => { return files.indexOf(element) < 0 })

        // unique filenames between logdir(s)
        newfiles = newfiles.concat(diff)
        newfiles = newfiles.filter((element, index) => {
          return newfiles.indexOf(element) === index
        })
        debug(`newfiles after processing ${dir}`)
        debug(newfiles)

        if (diff.length > 0) {
          log(`streaming ${dir}: ${diff.length}${(
            !firstrun ? ` new file(s), ${logfiles.length} total` : '')} 
          file(s)`)
        }
      }
      done()
    })
  }, () => {
    firstrun = false

    // add to master files array
    files = files.concat(newfiles)
    debug('files after processing')
    debug(files)

    streamFiles(config, newfiles, () => {
      return callback && callback()
    })
  })

  if (config.usejournald && firstrun) {
    log(`streaming from journalctl: ${config.usejournald}`)
    var journalctl, lastchunk, i

    if (config.usejournald === 'files') {
      journalctl = spawn(
        'journalctl',
        ['-n0', '-D', '/var/log/journal', '-o', 'json', '-f']
      )
    } else {
      journalctl = spawn('journalctl', ['-n0', '-o', 'json', '-f'])
    }

    journalctl.stdout.on('data', (data) => {
      data = data.toString().trim().split('\n')
      for (i = 0; i < data.length; i++) {
        if (
          data[i].substring(0, 1) === '{'
            && data[i].substring(data[i].length - 1) === '}'
        ) {
          // full chunk
          client.log.agentLog(processChunk(data[i]))
          if (lastchunk) { lastchunk = null } // clear

        } else if (data[i].substring(0, 1) === '{') {
          // starting chunk
          lastchunk = (lastchunk ? lastchunk : '') + data[i]

        } else if (lastchunk && data[i].substring(data[i].length - 1) === '}') {
          // ending chunk
          lastchunk += data[i]
          client.log.agentLog(processChunk(lastchunk))
          lastchunk = null // clear

        } else if (lastchunk && lastchunk.length < 32768) {
          // append chunk
          lastchunk += data[i]

        } else {
          client.log.agentLog({
            line: data[i]
          , f: 'systemd'
          })
        }
      }
    })

    journalctl.stderr.on('data', (error) => {
      log(`error reading from journalctl: ${error.toString().trim()}`, 'error')
    })
  }

  config.rescanTimer = setTimeout(() => {
    streamAllLogs(config)
  }, config.RESCAN_INTERVAL) // rescan for files every once in awhile
}

function processChunk(input) {
  let data
  try {
    data = JSON.parse(input)
  } catch (e) {
    return {t: Date.now(), l: input, f: 'systemd'}
  }
  if (data.__REALTIME_TIMESTAMP && parseInt(data.__REALTIME_TIMESTAMP) > 10000000000000) {
    // convert to ms
    data.__REALTIME_TIMESTAMP = parseInt(data.__REALTIME_TIMESTAMP / 1000)
  }
  return {
    t: data.__REALTIME_TIMESTAMP
  , line: data.MESSAGE
  , f: data.CONTAINER_NAME
      || data._SYSTEMD_UNIT
      || data.SYSLOG_IDENTIFIER
      || 'UNKNOWN_SYSTEMD_APP'
  , pid: data._PID && parseInt(data._PID)
  , prival: data.PRIORITY && parseInt(data.PRIORITY)
  , containerid: data.CONTAINER_ID_FULL
  }
}
async function gracefulShutdown(signal) {
  log(`got ${signal} signal, shutting down...`)
  clearTimeout(conf.rescanTimer)

  for (const tail of tails) {
    await tail.quit('SIGTERM')
    debug(`tail pid ${tail.pid} killed`)
  }
  tails.length = 0
  for (const stream of tailStreams) {
    await stream.quit()
    debug(`tail pid ${stream.pid} killed`)
  }
}

// Graceful Shutdown Scenarios
process.once('SIGTERM', () => { gracefulShutdown('SIGTERM') }) // kill
process.once('SIGINT', () => { gracefulShutdown('SIGINT') }) // ctrl+c
