#!/usr/bin/env node
/* globals process */
// override es6 promise with bluebird
/* jshint ignore:start */
Promise = require('bluebird');
/* jshint ignore:end */
var debug = require('debug')('logdna:index');
var log = require('./lib/log');
var program = require('commander');
var pkg = require('./package.json');
var _ = require('lodash');
var os = require('os');

var properties = Promise.promisifyAll(require('properties'));
var macaddress = Promise.promisifyAll(require('macaddress'));
var got = require('got');
var distro = Promise.promisify(require('./lib/os-version'));
var config = require('./lib/config');
var fileUtils = require('./lib/file-utilities');
var apiClient = require('./lib/api-client');
var connectionManager = require('./lib/connection-manager');


process.title = 'logdna-agent';
program._name = 'logdna-agent';
program
    .version(pkg.version, '-v, --version')
    .description('This agent collect and ship logs for processing. Defaults to /var/log if run without parameters.')
    .option('-c, --config <file>', 'uses alternate config file (default: ' + config.DEFAULT_CONF_FILE + ')')
    .option('-k, --key <key>', 'sets LogDNA API Key in config')
    .option('-d, --logdir <dir>', 'adds log dir to config, supports glob patterns', fileUtils.appender(), [])
    .option('-f, --logfile <file>', 'adds log file to config', fileUtils.appender(), [])
    .option('-t, --tags <tags>', 'set tags for this host (for auto grouping), separate multiple tags by comma')
    .on('--help', function() {
        console.log('  Examples:');
        console.log();
        console.log('    $ logdna-agent --key YOUR_API_KEY');
        console.log('    $ logdna-agent -d /home/ec2-user/logs');
        console.log('    $ logdna-agent -d /home/ec2-user/logs -d /path/to/another/log_dir  # multiple logdirs in 1 go');
        console.log('    $ logdna-agent -d /var/log/*.txt                                   # supports glob patterns');
        console.log('    $ logdna-agent -d /var/log/**/myapp.log                            # myapp.log in any subfolder');
        console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log');
        console.log('    $ logdna-agent -f /usr/local/nginx/logs/access.log -f /usr/local/nginx/logs/error.log');
        console.log('    $ logdna-agent -t tag  # replaces config with this tag');
        console.log('    $ logdna-agent -t staging,2ndtag');
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

var socket;

function checkElevated() {
    return new Promise((resolve) => {
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

checkElevated()
.then(isElevated => {
    if (!isElevated) {
        console.log('You must be an Administrator (root, sudo) run this agent! See -h or --help for more info.');
        process.exit();
    }

    return properties.parseAsync(program.config || config.DEFAULT_CONF_FILE, { path: true })
        .catch(() => {});
})
.then(parsedConfig => {
    parsedConfig = parsedConfig || {};

    // allow key to be passed via env
    if (process.env.LOGDNA_AGENT_KEY) {
        parsedConfig.key = process.env.LOGDNA_AGENT_KEY;
    }

    if (!program.key && !parsedConfig.key) {
        console.error('LogDNA API Key not set! Use -k to set or use environment variable LOGDNA_AGENT_KEY.');
        process.exit();
    }

    // sanitize
    if (!parsedConfig.logdir) {
        parsedConfig.logdir = [config.DEFAULT_LOG_PATH]; // default entry
    } else if (!Array.isArray(parsedConfig.logdir)) {
        parsedConfig.logdir = parsedConfig.logdir.split(','); // force array
    }

    if (program.key) {
        parsedConfig.key = program.key;
        return fileUtils.saveConfig(parsedConfig, program.config || config.DEFAULT_CONF_FILE).then(() => {
            console.log('Your LogDNA API Key has been successfully saved!');
            process.exit(0);
        });
    }

    if (program.logdir && program.logdir.length > 0) {
        parsedConfig.logdir = _.uniq(parsedConfig.logdir.concat(program.logdir));
        return fileUtils.saveConfig(parsedConfig, program.config || config.DEFAULT_CONF_FILE).then(() => {
            console.log('Added ' + program.logdir.join(', ') + ' to config.');
            process.exit(0);
        });
    }

    if (program.logfile && program.logfile.length > 0) {
        parsedConfig.logdir = _.uniq(parsedConfig.logdir.concat(program.logfile));
        return fileUtils.saveConfig(parsedConfig, program.config || config.DEFAULT_CONF_FILE).then(() => {
            console.log('Added ' + program.logfile.join(', ') + ' to config.');
            process.exit(0);
        });
    }

    if (program.tags) {
        parsedConfig.tags = program.tags.replace(/\s*,\s*/g, ',').replace(/^,|,$/g, ''); // trim spaces around comma
        return fileUtils.saveConfig(parsedConfig, program.config || config.DEFAULT_CONF_FILE).then(() => {
            console.log('Tags ' + parsedConfig.tags + ' saved to config.');
            process.exit(0);
        });
    }

    // merge into single var after all potential saveConfigs finished
    _.defaults(config, parsedConfig);

    // debug(console.log(config));

    config.hostname = parsedConfig.hostname || os.hostname().replace('.ec2.internal', '');

    return distro()
        .catch(() => {});
})
.then(dist => {
    if (dist && dist.os) {
        config.osdist = dist.os + (dist.release ? ' ' + dist.release : '');
    }
    return got('http://169.254.169.254/latest/dynamic/instance-identity/document/', { timeout: 1000, retries: 0, json: true, headers: { 'user-agent': config.UA } })
        .catch(() => {});
})
.then(res => {
    if (res && res.body) {
        config.awsid = res.body.instanceId;
        config.awsregion = res.body.region;
        config.awsaz = res.body.availabilityZone;
        config.awsami = res.body.imageId;
        config.awstype = res.body.instanceType;
    }
    return macaddress.allAsync()
        .catch(() => {});
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
