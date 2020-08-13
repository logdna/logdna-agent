'use strict'

// External Modules
const async = require('async')
const debug = require('debug')('logdna:index')
const fs = require('fs')
const getos = require('getos')
const os = require('os')
const program = require('commander')
const properties = require('properties')
const request = require('request')

// Internal Modules
const connectionManager = require('./lib/connection-manager')
const k8s = require('./lib/k8s')
const pkg = require('./package.json')
const utils = require('./lib/utils')

// Constants
const HOSTNAME_IP_REGEX = /[^0-9a-zA-Z\-.]/g
const HOSTNAME_PATH = '/etc/logdna-hostname'

// Variables
var config = require('./lib/config')
var processed

process.title = 'logdna-agent'
program._name = 'logdna-agent'
program
  .version(pkg.version, '-v, --version')
  .description('This agent collect and ship logs for processing. Defaults to /var/log if run without parameters.')
  .option('-c, --config <file>', `uses alternate config file (default: ${config.DEFAULT_CONF_FILE})`)
  .option('-k, --key <key>', 'sets your LogDNA Ingestion Key in the config')
  .option('-d, --logdir <dir>', 'adds log directories to config, supports glob patterns', utils.appender(), [])
  .option('-f, --logfile <file>', 'adds log files to config', utils.appender(), [])
  .option('-e, --exclude <file>', 'exclude files from logdir', utils.appender(), [])
  .option('-r, --exclude-regex <pattern>', 'filter out lines matching pattern')
  .option('-n, --hostname <hostname>', `uses alternate hostname (default: ${os.hostname().replace('.ec2.internal', '')})`)
  .option('-t, --tags <tags>', 'add tags for this host, separate multiple tags by comma', utils.appender(), [])
  .option('-l, --list [params]', 'show the saved configuration (all unless params specified)', utils.appender(), false)
  .option('-u, --unset <params>', 'clear some saved configurations (use "all" to unset all except key)', utils.appender(), [])
  .option('-w, --winevent <winevent>', 'set Windows Event Log Names (only on Windows)', utils.appender(), [])
  .option('-s, --set [key=value]', 'set config variables', utils.appender(), false)
  .on('--help', () => {
    console.log('  Examples:')
    console.log()
    console.log('    $ logdna-agent --key YOUR_INGESTION_KEY')
    console.log('    $ logdna-agent -d /home/ec2-user/logs')
    console.log('    $ logdna-agent -d /home/ec2-user/logs -d /path/to/another/log_dir  # multiple logdirs in 1 go')
    console.log('    $ logdna-agent -d "/var/log/*.txt"                                 # supports glob patterns')
    console.log('    $ logdna-agent -d "/var/log/**/myapp.log"                          # myapp.log in any subfolder')
    console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log')
    console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log -f /usr/local/nginx/logs/error.log')
    console.log('    $ logdna-agent -t production                                       # tags')
    console.log('    $ logdna-agent -t staging,2ndtag')
    console.log('    $ logdna-agent -w System                                           # Windows System event logs (all providers)')
    console.log('    $ logdna-agent -l tags,key,logdir                                  # show specific config parameters')
    console.log('    $ logdna-agent -l                                                  # show all')
    console.log('    $ logdna-agent -u tags,logdir                                      # unset specific entries from config')
    console.log('    $ logdna-agent -u all                                              # unset all except LogDNA API Key')
    console.log()
  })
  .parse(process.argv)

if ((os.platform() === 'win32' && require('is-administrator')()) || process.getuid() <= 0) {
  const conf_file = program.config || config.DEFAULT_CONF_FILE
  debug(`Path to Configuration File: ${conf_file}`)
  async.waterfall([
    (cb) => {
      fs.access(conf_file, (error) => {
        if (error) {
          return cb(null, {})
        }

        return properties.parse(conf_file, {
          path: true
        }, (error, parsedConfig) => {
          if (error) {
            utils.log(`error in parsing ${conf_file}: ${error}`, 'error')
          }
          return cb(null, error ? {} : parsedConfig)
        })
      })
    }
  , (parsedConfig, cb) => {
      parsedConfig = parsedConfig || {}

      // allow key to be passed via env
      if (process.env.LOGDNA_AGENT_KEY) {
        parsedConfig.key = process.env.LOGDNA_AGENT_KEY
      }

      if (!program.key && !parsedConfig.key) {
        console.error('LogDNA Ingestion Key not set! Use -k to set or use environment variable LOGDNA_AGENT_KEY.')
        process.exit()
      }

      if (process.env.LOGDNA_HOSTNAME) {
        parsedConfig.hostname = process.env.LOGDNA_HOSTNAME
      }

      if (!program.hostname && !parsedConfig.hostname) {
        if (fs.existsSync(HOSTNAME_PATH) && fs.statSync(HOSTNAME_PATH).isFile()) {
          parsedConfig.hostname = fs.readFileSync(HOSTNAME_PATH).toString().trim().replace(HOSTNAME_IP_REGEX, '')
        } else if (os.hostname()) {
          parsedConfig.hostname = os.hostname().replace('.ec2.internal', '')
        } else {
          console.error('Hostname information cannot be found! Use -n to set or use environment variable LOGDNA_HOSTNAME.')
          process.exit()
        }
      }

      // allow exclude to be passed via env
      if (process.env.LOGDNA_EXCLUDE) {
        parsedConfig.exclude = process.env.LOGDNA_EXCLUDE
      }

      // allow exclude regex to be passed via env
      if (process.env.LOGDNA_EXCLUDE_REGEX) {
        parsedConfig.exclude_regex = process.env.LOGDNA_EXCLUDE_REGEX
      }

      if (process.env.USEJOURNALD) {
        parsedConfig.usejournald = process.env.USEJOURNALD
      }

      // sanitize
      if (!parsedConfig.logdir) {
        parsedConfig.logdir = [config.DEFAULT_LOG_PATH] // default entry
      } else if (!Array.isArray(parsedConfig.logdir)) {
        parsedConfig.logdir = parsedConfig.logdir.split(',') // force array
      }

      if (parsedConfig.exclude && !Array.isArray(parsedConfig.exclude)) {
        parsedConfig.exclude = parsedConfig.exclude.split(',')
      }

      var saveMessages = []

      if (program.key) {
        parsedConfig.key = program.key
        saveMessages.push('Your LogDNA Ingestion Key has been successfully saved!')
      }

      if (program.set && program.set.length > 0) {
        program.set.forEach((setOption) => {
          const kvPair = setOption.split('=')
          if (kvPair.length === 2) {
            parsedConfig[kvPair[0]] = kvPair[1]
            saveMessages.push(`Config variable: ${kvPair[0]} = ${kvPair[1]} has been saved to config.`)
          } else {
            saveMessages.push(`Unknown setting: ${setOption}. Usage: -s [key=value]`)
          }
        })
      }

      if (program.winevent && program.winevent.length > 0) {
        if (os.platform() === 'win32') {
          processed = utils.processOption(program.winevent, parsedConfig.winevent, true)
          parsedConfig.winevent = processed.values
          saveMessages.push(`Windows Events: ${processed.diff} been saved to config.`)
        } else {
          saveMessages.push('-w is only available for Windows.')
        }
      }

      if (program.list) {
        if (typeof program.list === 'boolean') {
          program.list = ['all']
        }
        var conf = properties.parse(fs.readFileSync(conf_file).toString())
        const listResult = utils.pick2list(program.list, conf)
        if (listResult.valid) {
          var msg = utils.stringify(listResult.cfg)
          saveMessages.push(`${conf_file}:\n${msg}`)
        } else {
          saveMessages.push(listResult.msg)
        }
      }

      if (program.unset && program.unset.length > 0) {
        const unsetResult = utils.unsetConfig(program.unset, parsedConfig)
        parsedConfig = unsetResult.cfg
        saveMessages.push(unsetResult.msg)
      }

      if (program.logdir && program.logdir.length > 0) {
        processed = utils.processOption(program.logdir, parsedConfig.logdir)
        parsedConfig.logdir = processed.values
        saveMessages.push(`Log Directories: ${processed.diff} been saved to config.`)
      }

      if (program.logfile && program.logfile.length > 0) {
        processed = utils.processOption(program.logfile, parsedConfig.logdir)
        parsedConfig.logdir = processed.values
        saveMessages.push(`Log Files: ${processed.diff} been saved to config.`)
      }

      if (program.exclude && program.exclude.length > 0) {
        processed = utils.processOption(program.exclude, parsedConfig.exclude)
        parsedConfig.exclude = processed.values
        saveMessages.push(`Exclusions: ${processed.diff} been saved to config.`)
      }

      if (program.excludeRegex) {
        parsedConfig.exclude_regex = program.excludeRegex
        // strip leading and trailing / if exists
        if (parsedConfig.exclude_regex.substring(0, 1) === '/' && parsedConfig.exclude_regex.substring(parsedConfig.exclude_regex.length - 1) === '/') {
          parsedConfig.exclude_regex = parsedConfig.exclude_regex.substring(1, parsedConfig.exclude_regex.length - 1)
        }
        saveMessages.push(`Exclude pattern: /${parsedConfig.exclude_regex}/ been saved to config.`)
      }

      if (program.hostname) {
        parsedConfig.hostname = program.hostname
        saveMessages.push(`Hostname: ${parsedConfig.hostname} has been saved to config.`)
      }

      if (program.tags && program.tags.length > 0) {
        processed = utils.processOption(program.tags, parsedConfig.tags)
        parsedConfig.tags = processed.values
        saveMessages.push(`Tags: ${processed.diff} been saved to config.`)
      }

      if (saveMessages.length) {
        return utils.saveConfig(parsedConfig, conf_file, (error, success) => {
          if (error) {
            return utils.log(`error while saving to: ${conf_file}: ${error}`, 'error')
          }

          saveMessages.forEach((message) => { console.log(message) })
          process.exit(0)
        })
      }

      // merge into single var after all potential saveConfigs finished
      config = {...config, ...parsedConfig}
      config.tags = process.env.LOGDNA_TAGS || config.tags
      if (process.env.LOGDNA_PLATFORM) {
        config.platform = process.env.LOGDNA_PLATFORM
        config.tags = config.tags ? `${config.tags},${config.platform}` : config.platform
        if (config.platform.indexOf('k8s') === 0) {
          config.RESCAN_INTERVAL = config.RESCAN_INTERVAL_K8S
        }
      }

      return getos(cb)
    }
  , (distro, cb) => {
      config.package = `${pkg.name}/${pkg.version}`
      config.distro = `${(distro.dist || distro.os).replace(/Linux| /g, '')}`
      if (distro.release) { config.distro += `/${distro.release}` }
      config.userAgent = `${config.package} (${config.distro})`
      if (config.platform) { config.userAgent += ` ${config.platform}` }

      return request(config.AWS_INSTANCE_CHECK_URL, {
        timeout: 1000
      , json: true
      }, (error, response, body) => {
        return cb(error, body)
      })
    }
  ], (_, responseBody) => {
    if (responseBody) {
      config.awsid = responseBody.instanceId
      config.awsregion = responseBody.region
      config.awsaz = responseBody.availabilityZone
      config.awsami = responseBody.imageId
      config.awstype = responseBody.instanceType
    }

    const networkInterface = Object.values(os.networkInterfaces()).reduce((networkData, interfaces) => {
      interfaces.forEach(interfce => networkData.push(interfce))
      return networkData
    }, []).filter((interfce) => {
      return interfce.family && interfce.family === 'IPv4' && interfce.mac && interfce.address && (
        interfce.address.startsWith('10.')
          || interfce.address.startsWith('172.')
          || interfce.address.startsWith('192.168.'))
    })[0]

    if (networkInterface) {
      if (networkInterface.mac) { config.mac = networkInterface.mac }
      if (networkInterface.address) { config.ip = networkInterface.address }
    }

    utils.log(`${config.package} started on ${config.hostname} (${config.ip})`)
    if (config.platform && config.platform.startsWith('k8s')) { k8s.init() }
    if (config.userAgent) {
      config.DEFAULT_REQ_HEADERS['user-agent'] = config.userAgent
      config.DEFAULT_REQ_HEADERS_GZIP['user-agent'] = config.userAgent
    }

    debug('connecting to log server')
    connectionManager.connectLogServer(config)
    debug('logdna agent successfully started')
  })
} else {
  console.log('You must be an Administrator (root, sudo) run this agent! See -h or --help for more info.')
  process.exit()
}

process.on('uncaughtException', err => utils.log(`uncaught error: ${(err.stack || '').split('\r\n')}`, 'error'))
