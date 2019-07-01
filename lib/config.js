var os = require('os');
var path = require('path');

module.exports = {
    AWS_INSTANCE_CHECK_URL: 'http://169.254.169.254/latest/dynamic/instance-identity/document/'
    , BUF_LIMIT: process.env.BUF_LIMIT || 10000 // 10000 lines
    , COMPRESS: isNaN(process.env.COMPRESS) ? true : +process.env.COMPRESS
    , DEFAULT_CONF_FILE: os.platform() !== 'win32' ? '/etc/logdna.conf' : path.join(process.env.ALLUSERSPROFILE, '/logdna/logdna.conf')
    , DEFAULT_HTTP_ERRORS: ['ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']
    , DEFAULT_LOG_PATH: os.platform() !== 'win32' ? '/var/log' : path.join(process.env.ALLUSERSPROFILE, '/logs')
    , DEFAULT_REQ_HEADERS: { 'Content-Type': 'application/json; charset=UTF-8' }
    , DEFAULT_REQ_HEADERS_GZIP: { 'Content-Type': 'application/json; charset=UTF-8', 'Content-Encoding': 'gzip' }
    , DEFAULT_WINTAIL_FILE: os.platform() !== 'win32' ? '/etc/winTail.ps1' : path.join(process.env.ALLUSERSPROFILE, '/logdna/winTail.ps1')
    , FILEQUEUE_PATH: os.platform() !== 'win32' ? (process.env.FILEQUEUE_PATH || '/tmp') : path.join(process.env.ALLUSERSPROFILE, (process.env.FILEQUEUE_PATH || '/tmp'))
    , FLUSH_INTERVAL: process.env.FLUSH_INTERVAL || 250 // 250 millisec
    , FLUSH_LIMIT: process.env.FLUSH_LIMIT || 5000 // 5000 lines
    , GZIP_COMPRESS_LEVEL: process.env.GZIP_COMPRESS_LEVEL || 2
    , HEALTHCHECK_INTERVAL: process.env.FLUSH_INTERVAL || 300000 // 30 minutes
    , HTTP_KEEPALIVE: process.env.HTTP_KEEPALIVE || 60000 // 1 min
    , HTTP_RETRY: isNaN(process.env.HTTP_RETRY) ? true : +process.env.HTTP_RETRY
    , HTTP_TIMEOUT: process.env.HTTP_TIMEOUT || 30000 // 30 sec
    , LOGDNA_HEALTHCHECK: process.env.LDHEALTHCHECK || '/healthcheck'
    , LOGDNA_LOGENDPOINT: process.env.LDLOGPATH || '/logs/agent'
    , LOGDNA_LOGHOST: process.env.LDLOGHOST || 'logs.logdna.com'
    , LOGDNA_LOGPORT: process.env.LDLOGPORT || 443
    , LOGDNA_LOGSSL: isNaN(process.env.LDLOGSSL) ? true : +process.env.LDLOGSSL
    , LOGDNA_LOGURL: process.env.LDLOGURL || 'http' + (isNaN(process.env.LDLOGSSL) ? 's' : '') + '://' + (process.env.LDLOGHOST || 'logs.logdna.com') + ':' + (process.env.LDLOGPORT || 443)
    , LOGDNA_RECONNECT: true
    , MAX_LINE_LENGTH: 32000
    , MAX_SOCKETS: process.env.MAX_SOCKETS || 20
    , RESCAN_INTERVAL: process.env.RESCAN_INTERVAL || 60000 // 1 min
    , RESCAN_INTERVAL_K8S: process.RESCAN_INTERVAL_K8S || 10000 // 10 sec
    , SOCKET_KEEPALIVE: 60000 // 1 min
    , SOCKET_PATH: process.env.LOGDNA_DOCKER_SOCKET || '/var/run/docker.sock'
    , STATS_INTERVAL: 300000 // 5 min
    , TAIL_MODE: process.env.TAIL_MODE || 'trs'
    , TRANSPORT: process.env.TRANSPORT || 'http'
    , TRS_READ_INTERVAL: process.env.TRS_READ_INTERVAL || 1000 // 1 sec
    , TRS_READ_TIMEOUT: process.env.TRS_READ_TIMEOUT || 300000 // 5 min
    , TRS_TAILHEAD_AGE: process.env.TRS_TAILHEAD_AGE || 60000 // 1 min
    , TRS_TAILHEAD_SIZE: process.env.TRS_TAILHEAD_SIZE || 8192 // 8kb
    , TRS_WATCH_INTERVAL: process.env.TRS_WATCH_INTERVAL || 1000 // 1 sec
};
