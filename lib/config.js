/* globals process */
var os = require('os');
var path = require('path');

module.exports = {
    DEFAULT_LOG_PATH: os.platform() !== 'win32' ? '/var/log' : path.join(process.env.ALLUSERSPROFILE, '/logs'),
    DEFAULT_CONF_FILE: os.platform() !== 'win32' ? '/etc/logdna.conf' : path.join(process.env.ALLUSERSPROFILE, '/logdna/logdna.conf'),
    LOGDNA_APIHOST: process.env.LDAPIHOST || 'api.logdna.com',
    LOGDNA_APISSL: isNaN(process.env.LDAPISSL) ? true : +process.env.LDAPISSL,
    LOGDNA_LOGHOST: process.env.LDLOGHOST,
    LOGDNA_LOGPORT: process.env.LDLOGPORT,
    LOGDNA_LOGSSL: isNaN(process.env.LDLOGSSL) ? true : +process.env.LDLOGSSL,
    LOGDNA_RECONNECT: true,
    TAIL_MODE: process.env.TAIL_MODE || 'lib',
    TRANSPORT: process.env.TRANSPORT || 'websocket',
    COMPRESS: isNaN(process.env.COMPRESS) ? true : +process.env.COMPRESS,
    STATS_INTERVAL: 300000, // 5 min
    AUTHERROR_DELAY: 60000, // 1 min
    AUTHFAIL_DELAY: 3600000, // 1 hr
    RESCAN_INTERVAL: 60000, // 1 min
    FLUSH_INTERVAL: 250,
    FLUSH_LIMIT: 5000,
    BUF_LIMIT: 10000,
    MAX_SOCKETS: 20
};
