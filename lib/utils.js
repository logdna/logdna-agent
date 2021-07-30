'use strict'

// External Modules
const properties = require('properties')

module.exports = {
  appender
, log
, pick2list
, processOption
, saveConfig
, stringify
, unsetConfig
}

// Custom Scaled Merger
function merge(objects) {
  return objects.reduce((merged, obj) => {
    if (!Array.isArray(obj)) obj = [obj]
    const arr = merged.pop().concat(obj)
    merged.push(arr.filter((element, index) => arr.indexOf(element) === index))
    return merged.filter((element, index) => merged.indexOf(element) === index)
  }, [[]])[0]
}

// Prepare Message Reporting the Options Affected
function preparePostMessage(diff) {
  const length = diff.length
  if (length === 0) return 'Nothing has'
  if (length === 1) return `${diff[0]} has`
  if (length === 2) return `${diff[0]} and ${diff[1]} have`
  const last = diff.pop()
  return `${diff.join(', ')}, and ${last} have`
}

// Custom Splitter
function split(str, delimiter, hasWhitespace) {
  return str.split(delimiter || ',').map((element) => {
    if (hasWhitespace) {
      element = element.replace(/^"+/, '').replace(/"+$/, '')
      element = element.replace(/^'+/, '').replace(/'+$/, '')
      element = element.replace(/\+/, ' ')
    }
    return element.trim()
  }).filter(element => element)
}

// Custom Appender
function appender(xs) {
  xs = xs || []
  return (x) => {
    xs.push(x)
    return xs
  }
}

// Custom Logger
function log(message, level) {
  const dateObject = new Date()
  const padStart = (number, expectedLength) => {
    const strNumber = String(Math.abs(number)).padStart(expectedLength, '0')
    return (number < 0) ? `-${strNumber}` : strNumber
  }
  const date = `${dateObject.getFullYear()}-${padStart(dateObject.getMonth() + 1, 2)}-${padStart(dateObject.getDate(), 2)}`
  const time = `${padStart(dateObject.getHours(), 2)}:${padStart(dateObject.getMinutes(), 2)}:${padStart(dateObject.getSeconds(), 2)}`
  const tzOffset = dateObject.getTimezoneOffset() * -100 / 60
  const timezone = `${(tzOffset > 0 ? '+' : '')}${padStart(tzOffset, 4)}`
  // Properly handle Error objects.  The client may have additional meta information to log
  if (typeof message === 'object' && message.constructor && message.constructor.name === 'Error') {
    console.error(`${date} ${time} ${timezone} [error]`, message)
    return
  }
  console.log(`${date} ${time} ${timezone} [${(level || 'info')}] ${message}`)
}

// Pick the Keys to List Values of
function pick2list(options, config) {
  const lowOptions = options.map(value => value.toLowerCase())
  if (lowOptions.indexOf('all') > -1) {
    return {
      cfg: config
    , valid: true
    }
  }

  config = Object.keys(config).reduce((obj, key) => {
    if (options.indexOf(key) > -1) obj[key] = config[key]
    return obj
  }, {})

  if (Object.keys(config).length === 0) {
    return {
      valid: false
    , msg: 'Invalid or Bad Parameter'
    }
  }
  return {
    cfg: config
  , valid: true
  }
}

// Custom Processing - Combining all processes
function processOption(options, config, hasWhitespace) {
  const newValues = merge(options.map(option => split(option, ',', hasWhitespace)))
  const oldValues = (config ? (typeof config === 'string' ? split(config, ',', false) : config) : [])
  const diff = newValues.filter(value => oldValues.indexOf(value) < 0).filter(value => value)

  return {
    values: merge([oldValues, newValues]).filter(element => element)
  , diff: preparePostMessage(diff)
  }
}

// Saving into Config Files
function saveConfig(config, configPath, callback) {
  return properties.stringify(config, {
    path: configPath
  }, callback)
}

// Custom JSON Stringifier
// TODO(darinspivey) Why do we need this?  We shouldn't roll our own stringifier.
function stringify(obj) {
  const maxKeyLength = Object.keys(obj).reduce((maxLen, key) => {
    return key.length > maxLen ? key.length : maxLen
  }, 0)

  return Object.keys(obj).reduce((lines, key) => {
    let value = obj[key] !== null && obj[key].toString().split(',') || ''

    if (Array.isArray(value)) {
      if (value.length > 1) {
        value = `[ ${value.join(', ')} ]`
      }
    } else {
      value = value.toString()
    }

    lines.push(`${key}${' '.repeat(maxKeyLength - key.length)} = ${value}`)

    return lines

  }, []).join('\n')
}

// Custom UnSetting Configuration
function unsetConfig(options, config) {
  options = merge(options.map(option => split(option, ',', false).filter(element => element !== 'key')))
  const lowOptions = options.map(value => value.toLowerCase())
  if (lowOptions.indexOf('all') > -1) {
    return {
      cfg: {
        key: config.key
      }, msg: 'All configurations except LogDNA Ingestion Key have been deleted!'
    }
  }

  const oldValues = (config ? Object.keys(config) : [])
  config = Object.keys(config).reduce((obj, key) => {
    if (options.indexOf(key) === -1) obj[key] = config[key]
    return obj
  }, {})
  const newValues = (config ? Object.keys(config) : [])
  const diff = oldValues.filter(value => newValues.indexOf(value) < 0).filter(value => value)

  return {
    cfg: config
  , msg: `${preparePostMessage(diff)} been deleted!`
  }
}
