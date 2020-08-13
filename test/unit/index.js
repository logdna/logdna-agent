'use strict'

const path = require('path')
const os = require('os')
const fs = require('fs')
const {test} = require('tap')
const {loadConfig, commander} = require('../../index.js')

const uid = 0

test('Commander help output', (t) => {
  commander.outputHelp((help) => {
    t.match(help, /^Usage: logdna-agent \[options\]/, 'Help menu printed')
    setImmediate(t.end)
    return help // commander requires a string return here
  })
})

test('loadConfig() settings based on user input', async (t) => {
  const testDir = t.testdir()
  const configFile = path.join(testDir, 'configFile.conf')

  t.test('Errors if no key is found', (tt) => {
    loadConfig({
      config: configFile
    }, uid)

    setTimeout(() => {
      fs.stat(configFile, (err) => {
        tt.match(err, {
          code: 'ENOENT'
        }, 'The config file was not written as expected')
        tt.end()
      })
    }, 100)
  })

  t.test('Creates a config file, and puts minimum values in it', (tt) => {
    const input = {
      config: configFile
    , key: 'abc123'
    , hostname: 'myMachine'
    }

    loadConfig(input, uid)

    // The callback is not exposed.  We have to wait for the file to be written to.
    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8')).split('\n').sort()
      const expected = [
        'logdir = /var/log' // /var/log is included automatically
      , 'key = abc123'
      , 'hostname = myMachine'
      ].sort()
      tt.deepEqual(contents, expected, 'Config file was written correctly')
      tt.end()
    }, 100)
  })

  t.test('Existing config file is parsed and log files array is added to it', (tt) => {
    const logs = [`${testDir}/**/.txt`, `${testDir}/thing*/*.log`]
    const input = {
      config: configFile
    , logdir: logs
    }

    loadConfig(input, uid)

    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8')).split('\n').sort()
      const expected = [
        `logdir = /var/log,${logs.join(',')}`
      , 'key = abc123'
      , 'hostname = myMachine'
      ].sort()
      tt.deepEqual(contents, expected, 'log directories added to the config file')
      tt.end()
    }, 100)
  })

  t.test('Test other supported CLI options', (tt) => {
    const files = ['/Users/me/myApp.log', '/tmp/somelog.txt']
    const tags = ['tag1', 'tag2', 'tag3']
    const input = {
      config: configFile
    , exclude: ['/var/log/exclude.1', '/var/log/exclude.2']
    , set: ['set1=val1', 'set2=val2']
    , list: true
    , logfile: files
    , excludeRegex: '/*.exclude/'
    , tags
    }

    loadConfig(input, uid)

    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8')).split('\n')
      tt.ok(
        contents.includes(`exclude = ${input.exclude.join(',')}`)
      , '\'exclude\' was successfully saved'
      )
      tt.ok(
        contents.includes('set1 = val1')
      , '\'set\' saved the first key/val pair'
      )
      tt.ok(
        contents.includes('set2 = val2')
      , '\'set\' saved the second key/val pair'
      )
      tt.match(
        contents
      , new RegExp(`logdir = .*?${files.join(',')}`)
      , 'files were saved onto \'logdir\''
      )
      tt.ok(
        contents.includes('exclude_regex = *.exclude')
      , 'exclude_regex was saved'
      )
      tt.ok(
        contents.includes(`tags = ${tags.join(',')}`)
      , 'tags were saved'
      )
      tt.end()
    }, 100)
  })

  t.test('Test \'unset\' by removing a setting', (tt) => {
    loadConfig({
      config: configFile
    , unset: ['set1']
    }, uid)

    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8')).split('\n')
      tt.notOk(
        contents.includes('set1 = val1')
      , 'The first key/val pair was removed'
      )
      tt.ok(
        contents.includes('set2 = val2')
      , 'The second key/val pair still exists'
      )
      tt.end()
    }, 100)
  })

  t.test('Test \'unset\' by removing all settings except key', (tt) => {
    loadConfig({
      config: configFile
    , unset: ['all']
    }, uid)

    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8'))
      tt.equal(contents, 'key = abc123', 'All settings removed except for key')
      tt.end()
    }, 100)
  })
})

test('loadConfig() hostname decisions', async (t) => {
  t.test('If not provided, os.hostname() is used', (tt) => {
    const testDir = tt.testdir()
    const configFile = path.join(testDir, 'configFile.conf')
    const input = {
      config: configFile
    , key: 'abc123'
    }

    loadConfig(input, uid)

    // The callback is not exposed.  We have to wait for the file to be written to.
    setTimeout(() => {
      const contents = (fs.readFileSync(configFile, 'utf8')).split('\n').sort()
      const expected = [
        'logdir = /var/log' // /var/log is included automatically
      , 'key = abc123'
      , `hostname = ${os.hostname()}`
      ].sort()
      tt.deepEqual(contents, expected, 'Host name set to os.hostname()')
      tt.end()
    }, 100)
  })
})

test('Process options through commander', (t) => {
  const testDir = t.testdir()
  const configFile = path.join(testDir, 'configFile.conf')

  const input = [
    'node'
  , 'myscript'
  , '--config'
  , configFile
  , '-k'
  , 'mykey'
  , '-d'
  , '/some/dir'
  , '-f'
  , '/somewhere/file.txt'
  , '-e'
  , '/some/dir/exclude.txt'
  , '-r'
  , '*.bak'
  , '-n'
  , 'thisHost'
  , '-t'
  , 'tag1,tag2'
  , '-s'
  , 'propkey=val'
  ]

  commander.parse(input)
  loadConfig(commander, uid)

  setTimeout(() => {
    const contents = (fs.readFileSync(configFile, 'utf8')).split('\n').sort()
    const expected = [
      'logdir = /var/log,/some/dir,/somewhere/file.txt'
    , 'key = mykey'
    , 'hostname = thisHost'
    , 'exclude_regex = *.bak'
    , 'tags = tag1,tag2'
    , 'exclude = /some/dir/exclude.txt'
    , 'propkey = val'
    ].sort()

    t.deepEqual(contents, expected, 'Commander set options')
    t.end()
  }, 100)
})
