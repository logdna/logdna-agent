'use strict'

const fs = require('fs')
const path = require('path')
const {test} = require('tap')
const fileUtilities = require('../../lib/file-utilities.js')

test('getFiles()', async (t) => {
  const logEntry = 'arbitraryData\n'

  // default glob pattern for simple dir input (ie: /var/log)
  // include all **/*.log and extensionless files

  t.test('retrieves all *.log and extensionless files', (tt) => {
    const tempDir = tt.testdir({
      'somelog1.log': logEntry
    , 'somelog2': logEntry
    , 'somelog3-file': logEntry
    , 'cronlog-20200814': logEntry // Date stamped files are currently INcluded
    , 'wtmp': logEntry // Shouldn't be excluded because it's not in /var/log
    })

    fileUtilities.getFiles({}, tempDir, (err, files) => {
      tt.error(err, 'No error')
      tt.type(files, Array, 'files is an array')
      tt.equal(files.length, 5, 'File count is correct')
      tt.same(files.sort(), [
        path.join(tempDir, 'somelog1.log')
      , path.join(tempDir, 'somelog2')
      , path.join(tempDir, 'somelog3-file')
      , path.join(tempDir, 'cronlog-20200814')
      , path.join(tempDir, 'wtmp')
      ].sort(), 'filenames are correct')
      tt.end()
    })
  })

  t.test('retrieves no *.log, nor extensionless files', (tt) => {
    const tempDir = tt.testdir({
      'somelog1.log.1': logEntry
    , 'somelog2.txt': logEntry
    , 'testexclude': logEntry // in globalExclude
    })

    fileUtilities.getFiles({}, tempDir, (err, files) => {
      tt.error(err, 'No error')
      tt.type(files, Array, 'files is an array')
      tt.equal(files.length, 0, 'File count is correct')
      tt.end()
    })
  })

  t.test('retrieves 1 file based on glob pattern *.txt', (tt) => {
    const tempDir = tt.testdir({
      'somelog1.txt': logEntry
    , 'subdir': {
        'somelog2.txt': logEntry
      }
    })

    fileUtilities.getFiles({}, path.join(tempDir, '*.txt'), (err, files) => {
      tt.error(err, 'No error')
      tt.type(files, Array, 'files is an array')
      tt.equal(files.length, 1, 'File count is correct')
      tt.same(files[0], path.join(tempDir, 'somelog1.txt'), 'Filename is correct')
      tt.end()
    })
  })

  t.test('retrieves 2 files based on glob pattern **/*.txt', (tt) => {
    const tempDir = tt.testdir({
      'somelog1.txt': logEntry
    , 'symlinktarget': logEntry
    , 'somelink.txt': tt.fixture('symlink', 'somelinktarget')
    , 'subdir': {
        'somelog2.txt': logEntry
      , 'somelog3.log': logEntry // Should not match due extension mismatch
      , 'somelog4': logEntry // Should not match because extensionless is not defined
      }
    })

    fileUtilities.getFiles({}, path.join(tempDir, '**', '*.txt'), (err, files) => {
      tt.error(err, 'No error')
      tt.type(files, Array, 'files is an array')
      tt.equal(files.length, 3, 'File count is correct')
      tt.same(files.sort(), [
        path.join(tempDir, 'somelog1.txt')
      , path.join(tempDir, 'somelink.txt')
      , path.join(tempDir, 'subdir', 'somelog2.txt')
      ].sort(), 'Filenames are correct')
      tt.end()
    })
  })

  t.test('if a file is given, it returns a single file list', (tt) => {
    const tempDir = tt.testdir({
      'singlefile.whatever': logEntry
    })

    const file = path.join(tempDir, 'singlefile.whatever')
    fileUtilities.getFiles({}, file, (err, files) => {
      tt.error(err, 'No error')
      tt.type(files, Array, 'files is an array')
      tt.equal(files.length, 1, 'File count is correct')
      tt.same(files, [file], 'Single filename is correct')
      tt.end()
    })
  })

  t.test('Error: Directory doesn\'t exist', (tt) => {
    fileUtilities.getFiles({}, 'DOESNOTEXIST', (err, files) => {
      tt.type(err, Error, 'Expected error received')
      tt.match(err, {
        name: 'Error'
      , message: /no such file or directory/
      , code: 'ENOENT'
      , path: 'DOESNOTEXIST'
      })
      tt.end()
    })
  })

  t.test('Error: special files (sockets, block devs) return an error', (tt) => {
    fileUtilities.getFiles({}, '/dev/null', (err, files) => {
      tt.type(err, Error, 'Expected error received')
      tt.match(err, {
        name: 'Error'
      , message: 'not a file or directory'
      })
      tt.end()
    })
  })

  t.test('Error: `glob` returns an error', (tt) => {
    const readdir = fs.readdir
    tt.on('end', async () => {
      fs.readdir = readdir
    })
    fs.readdir = function(path, cb) {
      process.nextTick(function() {
        cb(new Error('mock fs.readdir error'))
      })
    }
    fileUtilities.getFiles({}, '/tmp/*.something', (err, files) => {
      tt.type(err, Error, 'Expected error received')
      tt.match(err, {
        name: 'Error'
      , message: 'mock fs.readdir error'
      })
      tt.end()
    })
  })
})
