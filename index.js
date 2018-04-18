#!/usr/bin/env node
/* globals process */
// override es6 promise with bluebird
Promise = require('bluebird'); // eslint-disable-line
var debug = require('debug')('logdna:index');
var log = require('./lib/log');
var program = require('commander');
var pkg = require('./package.json');
var _ = require('lodash');
var os = require('os');
var fs = require('fs');

var properties = Promise.promisifyAll(require('properties'));
var macaddress = Promise.promisifyAll(require('macaddress'));
var request = require('request');
var distro = Promise.promisify(require('./lib/os-version'));
var config = require('./lib/config');
var fileUtils = require('./lib/file-utilities');
var apiClient = require('./lib/api-client');
var connectionManager = require('./lib/connection-manager');
var k8s = require('./lib/k8s');
var utils = require('./lib/utils');

process.title = 'logdna-agent';
program._name = 'logdna-agent';
program
    .version(pkg.version, '-v, --version')
    .description('This agent collect and ship logs for processing. Defaults to /var/log if run without parameters.')
    .option('-c, --config <file>', 'uses alternate config file (default: ' + config.DEFAULT_CONF_FILE + ')')
    .option('-k, --key <key>', 'sets your LogDNA Ingestion Key in the config')
    .option('-d, --logdir <dir>', 'adds log directories to config, supports glob patterns', fileUtils.appender(), [])
    .option('-f, --logfile <file>', 'adds log files to config', fileUtils.appender(), [])
    .option('-e, --exclude <file>', 'exclude files from logdir', fileUtils.appender(), [])
    .option('-r, --exclude-regex <pattern>', 'filter out lines matching pattern')
    .option('-n, --hostname <hostname>', 'uses alternate hostname (default: ' + os.hostname().replace('.ec2.internal', '') + ')')
    .option('-t, --tags <tags>', 'add tags for this host, separate multiple tags by comma', fileUtils.appender(), [])
    .option('-l, --list [params]', 'show the saved configuration (all unless params specified)', utils.split)
    .option('-u, --unset <params>', 'clear some saved configurations (use "all" to unset all except key)', fileUtils.appender(), [])
    .option('-w, --winevent <winevent>', 'set Windows Event Log Providers (only on Windows)', fileUtils.appender(), [])
    .on('--help', function() {
        console.log('  Examples:');
        console.log();
        console.log('    $ logdna-agent --key YOUR_INGESTION_KEY');
        console.log('    $ logdna-agent -d /home/ec2-user/logs');
        console.log('    $ logdna-agent -d /home/ec2-user/logs -d /path/to/another/log_dir  # multiple logdirs in 1 go');
        console.log('    $ logdna-agent -d "/var/log/*.txt"                                 # supports glob patterns');
        console.log('    $ logdna-agent -d "/var/log/**/myapp.log"                          # myapp.log in any subfolder');
        console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log');
        console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log -f /usr/local/nginx/logs/error.log');
        console.log('    $ logdna-agent -t production                                       # tags');
        console.log('    $ logdna-agent -t staging,2ndtag');
        console.log('    $ logdna-agent -w System                                           # Windows System event logs (all providers)');
        console.log('    $ logdna-agent -w "WinEvent/*,EventLog/System"                     # all WinEvent, just System from EventLog');
        console.log('    $ logdna-agent -l tags,key,logdir                                  # show saved config');
        console.log('    $ logdna-agent -u tags,logdir                                      # unset specific entries from config');
        console.log();
    })
    .parse(process.argv);


// windows only
var isWinAdmin;

if (os.platform() === 'linux') {
    pkg.name += '-linux';
} else if (os.platform() === 'win32') {
    isWinAdmin = require('is-administrator');
    pkg.name += '-windows';
} else if (os.platform() === 'darwin') {
    pkg.name += '-mac';
}

var socket, processed;
var HOSTNAME_IP_REGEX = /[^0-9a-zA-Z\-.]/g;

function checkElevated() {
    return new Promise(resolve => {
        if (os.platform() === 'win32') {
            resolve(isWinAdmin());
        } else if (process.getuid() <= 0) {
            resolve(true);
        } else {
            resolve(false);
        }
    });
}

config.UA = pkg.name + '/' + pkg.version;
config.CONF_FILE = program.config || config.DEFAULT_CONF_FILE;

checkElevated()
    .then(isElevated => {
        if (!isElevated) {
            console.log('You must be an Administrator (root, sudo) run this agent! See -h or --help for more info.');
            process.exit();
        }

        return properties.parseAsync(config.CONF_FILE, { path: true })
            .catch(() => {});
    })
    .then(parsedConfig => {
        parsedConfig = parsedConfig || {};

        // allow key to be passed via env
        if (process.env.LOGDNA_AGENT_KEY) {
            parsedConfig.key = process.env.LOGDNA_AGENT_KEY;
        }

        // allow exclude to be passed via env
        if (process.env.LOGDNA_EXCLUDE) {
            parsedConfig.exclude = process.env.LOGDNA_EXCLUDE;
        }

        // allow exclude regex to be passed via env
        if (process.env.LOGDNA_EXCLUDE_REGEX) {
            parsedConfig.exclude_regex = process.env.LOGDNA_EXCLUDE_REGEX;
        }

        if (process.env.USEJOURNALD) {
            parsedConfig.usejournald = process.env.USEJOURNALD;
        }

        if (!program.key && !parsedConfig.key) {
            console.error('LogDNA Ingestion Key not set! Use -k to set or use environment variable LOGDNA_AGENT_KEY.');
            process.exit();
        }

        // sanitize
        if (!parsedConfig.logdir) {
            parsedConfig.logdir = [config.DEFAULT_LOG_PATH]; // default entry
        } else if (!Array.isArray(parsedConfig.logdir)) {
            parsedConfig.logdir = parsedConfig.logdir.split(','); // force array
        }

        if (parsedConfig.exclude && !Array.isArray(parsedConfig.exclude)) {
            parsedConfig.exclude = parsedConfig.exclude.split(',');
        }

        var saveMessages = [];

        if (program.key) {
            parsedConfig.key = program.key;
            saveMessages.push('Your LogDNA Ingestion Key has been successfully saved!');
        }

        if (program.winevent && program.winevent.length > 0) {
            if (os.platform() === 'win32') {
                const weoResult = utils.processWinEventOption(program.winevent, parsedConfig.winevent);
                if (weoResult.valid) {
                    parsedConfig.winevent = weoResult.values;
                    saveMessages.push('Windows Events: ' + weoResult.diff.join(', ') + ' saved to config.');
                } else {
                    saveMessages.push('Windows Events: Nothing new saved to config.');
                }
            } else {
                saveMessages.push('-w is only available for Windows.');
            }
        }

        if (program.list) {
            if (typeof program.list === 'boolean') {
                program.list = ['all'];
            }
            var conf = properties.parse(fs.readFileSync(config.CONF_FILE).toString());
            const listResult = utils.pick2list(program.list, conf);
            if (listResult.valid) {
                var msg = utils.stringify(listResult.cfg, {
                    delimiter: ' ='
                    , indent: ' '
                    , aligned: true
                    , broken: true
                    , numbered: true
                });
                saveMessages.push(config.CONF_FILE + ':\n' + msg);
            } else {
                saveMessages.push(listResult.msg);
            }
        }

        if (program.unset && program.unset.length > 0) {

            const unsetResult = utils.unsetConfig(program.unset, parsedConfig);
            parsedConfig = unsetResult.cfg;
            saveMessages.push(unsetResult.msg);

        }

        if (program.logdir && program.logdir.length > 0) {
            processed = utils.processOption(program.logdir, parsedConfig.logdir);
            parsedConfig.logdir = processed.values;
            saveMessages.push('Log Directories: ' + processed.diff.join(', ') + ' saved to config.');
        }

        if (program.logfile && program.logfile.length > 0) {
            processed = utils.processOption(program.logfile, parsedConfig.logdir);
            parsedConfig.logdir = processed.values;
            saveMessages.push('Log Files: ' + processed.diff.join(', ') + ' saved to config.');
        }

        if (program.exclude && program.exclude.length > 0) {
            processed = utils.processOption(program.exclude, parsedConfig.exclude);
            parsedConfig.exclude = processed.values;
            saveMessages.push('Exclusions: ' + processed.diff.join(', ') + ' saved to config.');
        }

        if (program.excludeRegex) {
            parsedConfig.exclude_regex = program.excludeRegex;
            // strip leading and trailing / if exists
            if (parsedConfig.exclude_regex.substring(0, 1) === '/' && parsedConfig.exclude_regex.substring(parsedConfig.exclude_regex.length - 1) === '/') {
                parsedConfig.exclude_regex = parsedConfig.exclude_regex.substring(1, parsedConfig.exclude_regex.length - 1);
            }
            saveMessages.push('Added exclude pattern /' + parsedConfig.exclude_regex + '/ to config.');
        }

        if (program.hostname) {
            parsedConfig.hostname = program.hostname;
            saveMessages.push('Hostname: ' + parsedConfig.hostname + ' saved to config.');
        }

        if (program.tags && program.tags.length > 0) {
            processed = utils.processOption(program.tags, parsedConfig.tags);
            parsedConfig.tags = processed.values;
            saveMessages.push('Tags: ' + processed.diff.join(', ') + ' saved to config.');
        }

        if (saveMessages.length) {
            return fileUtils.saveConfig(parsedConfig, config.CONF_FILE).then(() => {
                for (var i = 0; i < saveMessages.length; i++) {
                    console.log(saveMessages[i]);
                }
                process.exit(0);
            });
        }

        // merge into single var after all potential saveConfigs finished
        _.extend(config, parsedConfig);

        // debug(console.log(config));

        config.hostname = process.env.LOGDNA_HOSTNAME || fs.existsSync('/etc/logdna-hostname') && fs.statSync('/etc/logdna-hostname').isFile() && fs.readFileSync('/etc/logdna-hostname').toString().trim().replace(HOSTNAME_IP_REGEX, '') || config.hostname || os.hostname().replace('.ec2.internal', '');
        config.tags = process.env.LOGDNA_TAGS || config.tags;

        if (process.env.LOGDNA_PLATFORM) {
            config.platform = process.env.LOGDNA_PLATFORM;
            config.tags = config.tags ? config.tags + ',' + config.platform : config.platform;

            if (config.platform.indexOf('k8s') === 0) {
                config.RESCAN_INTERVAL = config.RESCAN_INTERVAL_K8S;
            }
        }

        return distro()
            .catch(() => {});
    })
    .then(dist => {
        if (dist && dist.os) {
            config.osdist = dist.os + (dist.release ? ' ' + dist.release : '');
        }
        return new Promise(resolve => {
            request('http://169.254.169.254/latest/dynamic/instance-identity/document/', { timeout: 1000, json: true }, function(err, res, body) {
                if (res && res.statusCode && body) {
                    config.awsid = body.instanceId;
                    config.awsregion = body.region;
                    config.awsaz = body.availabilityZone;
                    config.awsami = body.imageId;
                    config.awstype = body.instanceType;
                }
                resolve(macaddress.allAsync()
                    .catch(() => {})
                );
            });
        });
    })
    .then(all => {
        if (all) {
            var ifaces = Object.keys(all);
            for (var i = 0; i < ifaces.length; i++) {
                if (all[ifaces[i]].ipv4 && (
                    all[ifaces[i]].ipv4.indexOf('10.') === 0 ||
                all[ifaces[i]].ipv4.indexOf('172.1') === 0 ||
                all[ifaces[i]].ipv4.indexOf('172.2') === 0 ||
                all[ifaces[i]].ipv4.indexOf('172.3') === 0 ||
                all[ifaces[i]].ipv4.indexOf('192.168.') === 0)
                ) {
                    config.mac = all[ifaces[i]].mac;
                    config.ip = all[ifaces[i]].ipv4 || all[ifaces[i]].ipv6;
                    break;
                }
            }
        }

        log(program._name + ' ' + pkg.version + ' started on ' + config.hostname + ' (' + config.ip + ')');

        if (config.platform && config.platform.indexOf('k8s') === 0) {
            k8s.init();
        }

        return apiClient.getAuthToken(config, pkg.name, socket);
    })
    .then(() => {
        debug('got auth token:');
        debug(config.auth_token);
        debug('connecting to log server');
        return connectionManager.connectLogServer(config, pkg.name);
    })
    .then(sock => {
        socket = sock;
        debug('logdna agent successfully started');
    });

Promise.onPossiblyUnhandledRejection(function(error) {
    throw error;
});

process.on('uncaughtException', function(err) {
    log('------------------------------------------------------------------');
    log('Uncaught Error: ' + (err.stack || '').split('\r\n'));
    log('------------------------------------------------------------------');
});
