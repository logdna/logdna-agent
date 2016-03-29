# logdna-agent

[![Build Status](http://logdna-ci.westus.cloudapp.azure.com/api/badges/sedouard/logdna-agent/status.svg)](http://logdna-ci.westus.cloudapp.azure.com/sedouard/logdna-agent)

LogDNA's collector agent which streams log files to your LogDNA account.

## Getting Started

### From an Official Release

Check out the offical [LogDNA site](https://logdna.com/) on how to get started from a released version of LogDNA CLI and agent.

### From Source

Follow these quick instructions to run the LogDNA agent from source

```bash
git clone https://github.com/logdna/logdna-agent.git
cd logdna-agent
npm install

# help
sudo node index.js --help

# configure
sudo node index.js -k <YOUR LOGDNA AGENT KEY>
# /var/log is monitored/added by default (recursively), optionally specify more folders here
sudo node index.js -d /path/to/log/folders

# start the agent
sudo node index.js
```

## How it Works

The LogDNA agent authenticates using your LogDNA agent key and opens a secure web socket to LogDNA's ingestion servers. It then 'tails' for new log files added to your specific logging directories, watching for file changes. Those changes are sent to to LogDNA via the secure web socket.

## Contributing

Contributions are always welcome. See the [contributing guide]() to learn how you can help.
