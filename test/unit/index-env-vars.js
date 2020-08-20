'use strict'

process.env.LOGDNA_AGENT_KEY = 'mykey'
process.env.LOGDNA_HOSTNAME = 'hostnameFromEnv'
process.env.LOGDNA_EXCLUDE = '/biz/baz/exclude.txt,/bleck/blarg/exclude.log'
process.env.LOGDNA_EXCLUDE_REGEX = '/*.exclude/'
process.env.USERJOURNALD = 'files'

// Setting these vars is just for execution.  It will be for when we
// have integration tests running
