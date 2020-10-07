'use strict'

// External Modules
const os = require('os')
const path = require('path')

module.exports = {
  AWS_INSTANCE_CHECK_URL: 'http://169.254.169.254/latest/dynamic/instance-identity/document/'
, COMPRESS: isNaN(process.env.COMPRESS) || process.env.COMPRESS === '1'
, DEFAULT_CONF_FILE: os.platform() !== 'win32' ? '/etc/logdna.conf' : path.join(process.env.ALLUSERSPROFILE, '/logdna/logdna.conf')
, DEFAULT_LOG_PATH: os.platform() !== 'win32' ? '/var/log' : path.join(process.env.ALLUSERSPROFILE, '/logs')
, DEFAULT_WINTAIL_FILE: os.platform() !== 'win32' ? '/etc/winTail.ps1' : path.join(process.env.ALLUSERSPROFILE, '/logdna/winTail.ps1')
, FILEQUEUE_PATH: os.platform() !== 'win32'
    ? (process.env.FILEQUEUE_PATH || '/tmp')
    : path.join(process.env.ALLUSERSPROFILE, (process.env.FILEQUEUE_PATH || '/tmp'))
, FLUSH_INTERVAL: process.env.FLUSH_INTERVAL
, FLUSH_LIMIT: process.env.FLUSH_LIMIT
, PROXY: process.env.HTTPS_PROXY || process.env.HTTP_PROXY
, LOGDNA_URL: process.env.LOGDNA_URL || 'https://logs.logdna.com/logs/agent'
, RESCAN_INTERVAL: process.env.RESCAN_INTERVAL || 60000 // 1 min
, RESCAN_INTERVAL_K8S: process.RESCAN_INTERVAL_K8S || 10000 // 10 sec
, SOCKET_PATH: process.env.LOGDNA_DOCKER_SOCKET || process.env.DOCKER_SOCKET || '/var/run/docker.sock'
, TAIL_MODE: process.env.TAIL_MODE || 'trs'
, TRS_READ_INTERVAL: process.env.TRS_READ_INTERVAL || 1000 // 1 sec
, TRS_READ_TIMEOUT: process.env.TRS_READ_TIMEOUT || 300000 // 5 min
, TRS_TAILHEAD_AGE: process.env.TRS_TAILHEAD_AGE || 60000 // 1 min
, TRS_TAILHEAD_SIZE: process.env.TRS_TAILHEAD_SIZE || 8192 // 8kb
, TRS_WATCH_INTERVAL: process.env.TRS_WATCH_INTERVAL || 1000 // 1 sec
}
