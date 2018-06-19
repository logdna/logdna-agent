/* globals process */
var os = require('os');
var path = require('path');

module.exports = {
    DEFAULT_LOG_PATH: os.platform() !== 'win32' ? '/var/log' : path.join(process.env.ALLUSERSPROFILE, '/logs')
    , DEFAULT_CONF_FILE: os.platform() !== 'win32' ? '/etc/logdna.conf' : path.join(process.env.ALLUSERSPROFILE, '/logdna/logdna.conf')
    , LOGDNA_APIHOST: process.env.LDAPIHOST || 'api.logdna.com'
    , LOGDNA_APISSL: isNaN(process.env.LDAPISSL) ? true : +process.env.LDAPISSL
    , LOGDNA_LOGHOST: process.env.LDLOGHOST
    , LOGDNA_LOGPORT: process.env.LDLOGPORT
    , LOGDNA_LOGSSL: isNaN(process.env.LDLOGSSL) ? true : +process.env.LDLOGSSL
    , LOGDNA_RECONNECT: true
    , TAIL_MODE: process.env.TAIL_MODE || 'trs'
    , TRANSPORT: process.env.TRANSPORT || 'http'
    , COMPRESS: isNaN(process.env.COMPRESS) ? true : +process.env.COMPRESS
    , HTTP_RETRY: isNaN(process.env.HTTP_RETRY) ? true : +process.env.HTTP_RETRY
    , SOCKET_KEEPALIVE: 60000
    , STATS_INTERVAL: 300000 // 5 min
    , AUTHERROR_DELAY: 60000 // 1 min
    , AUTHFAIL_DELAY: 3600000 // 1 hr
    , RESCAN_INTERVAL: 60000 // 1 min
    , RESCAN_INTERVAL_K8S: 10000 // 10 sec
    , FLUSH_INTERVAL: 250
    , FLUSH_LIMIT: 5000
    , BUF_LIMIT: process.env.BUF_LIMIT || 10000
    , MAX_SOCKETS: 20
    , MAX_LINE_LENGTH: 32000
    , HTTP_TIMEOUT: 30000
    , HTTP_KEEPALIVE: 60000
    , GZIP_COMPRESS_LEVEL: process.env.GZIP_COMPRESS_LEVEL || 2
    , FILEQUEUE_PATH: os.platform() !== 'win32' ? (process.env.FILEQUEUE_PATH || '/tmp') : path.join(process.env.ALLUSERSPROFILE, (process.env.FILEQUEUE_PATH || '/tmp'))
};
