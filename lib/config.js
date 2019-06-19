var os = require('os');
var path = require('path');

module.exports = {
    DEFAULT_LOG_PATH: os.platform() !== 'win32' ? '/var/log' : path.join(process.env.ALLUSERSPROFILE, '/logs')
    , DEFAULT_REQ_HEADERS: { 'Content-Type': 'application/json; charset=UTF-8' }
    , DEFAULT_HTTP_ERRORS: ['ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']
    , DEFAULT_REQ_HEADERS_GZIP: { 'Content-Type': 'application/json; charset=UTF-8', 'Content-Encoding': 'gzip' }
    , DEFAULT_WINTAIL_FILE: os.platform() !== 'win32' ? '/etc/winTail.ps1' : path.join(process.env.ALLUSERSPROFILE, '/logdna/winTail.ps1')
    , DEFAULT_CONF_FILE: os.platform() !== 'win32' ? '/etc/logdna.conf' : path.join(process.env.ALLUSERSPROFILE, '/logdna/logdna.conf')
    , LOGDNA_APIHOST: process.env.LDAPIHOST || 'api.logdna.com'
    , LOGDNA_APISSL: isNaN(process.env.LDAPISSL) ? true : +process.env.LDAPISSL
    , LOGDNA_LOGHOST: process.env.LDLOGHOST
    , LOGDNA_LOGENDPOINT: process.env.LDLOGPATH || '/logs/agent'
    , LOGDNA_LOGPORT: process.env.LDLOGPORT
    , LOGDNA_LOGSSL: isNaN(process.env.LDLOGSSL) ? true : +process.env.LDLOGSSL
    , LOGDNA_RECONNECT: true
    , TAIL_MODE: process.env.TAIL_MODE || 'trs'
    , TRANSPORT: process.env.TRANSPORT || 'http'
    , COMPRESS: isNaN(process.env.COMPRESS) ? true : +process.env.COMPRESS
    , HTTP_RETRY: isNaN(process.env.HTTP_RETRY) ? true : +process.env.HTTP_RETRY
    , SOCKET_KEEPALIVE: 60000 // 1 min
    , SOCKET_PATH: process.env.LOGDNA_DOCKER_SOCKET || '/var/run/docker.sock'
    , STATS_INTERVAL: 300000 // 5 min
    , AUTHERROR_DELAY: 60000 // 1 min
    , AUTHFAIL_DELAY: 3600000 // 1 hr
    , RESCAN_INTERVAL: process.env.RESCAN_INTERVAL || 60000 // 1 min
    , RESCAN_INTERVAL_K8S: process.RESCAN_INTERVAL_K8S || 10000 // 10 sec
    , FLUSH_INTERVAL: process.env.FLUSH_INTERVAL || 250 // 250 millisec
    , FLUSH_LIMIT: process.env.FLUSH_LIMIT || 5000 // 5000 lines
    , BUF_LIMIT: process.env.BUF_LIMIT || 10000 // 10000 lines
    , MAX_SOCKETS: process.env.MAX_SOCKETS || 20
    , MAX_LINE_LENGTH: 32000
    , HTTP_TIMEOUT: process.env.HTTP_TIMEOUT || 30000 // 30 sec
    , HTTP_KEEPALIVE: process.env.HTTP_KEEPALIVE || 60000 // 1 min
    , GZIP_COMPRESS_LEVEL: process.env.GZIP_COMPRESS_LEVEL || 2
    , FILEQUEUE_PATH: os.platform() !== 'win32' ? (process.env.FILEQUEUE_PATH || '/tmp') : path.join(process.env.ALLUSERSPROFILE, (process.env.FILEQUEUE_PATH || '/tmp'))
    , TRS_READ_INTERVAL: process.env.TRS_READ_INTERVAL || 1000 // 1 sec
    , TRS_READ_TIMEOUT: process.env.TRS_READ_TIMEOUT || 300000 // 5 min
    , TRS_WATCH_INTERVAL: process.env.TRS_WATCH_INTERVAL || 1000 // 1 sec
    , TRS_TAILHEAD_SIZE: process.env.TRS_TAILHEAD_SIZE || 8192 // 8kb
    , TRS_TAILHEAD_AGE: process.env.TRS_TAILHEAD_AGE || 60000 // 1 min
};
