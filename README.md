# logdna-agent

[![Build Status](https://travis-ci.org/logdna/logdna-agent.svg?branch=master)](https://travis-ci.org/logdna/logdna-agent)
[![Build status](https://ci.appveyor.com/api/projects/status/mk5rb0uk6xkjxhk2/branch/master?svg=true)](https://ci.appveyor.com/project/mikehu/logdna-agent/branch/master)

LogDNA's collector agent which streams log files to your LogDNA account. LogDNA is a hosted, cloud logging service.

## Getting Started

### From an Official Release

Check out the official [LogDNA site](https://logdna.com/) on how to get started from a released version of LogDNA CLI and agent.

### From Source

Follow these quick instructions to run the LogDNA agent from source

```bash
git clone https://github.com/logdna/logdna-agent.git
cd logdna-agent
npm install

# help
sudo node index.js --help

# configure
sudo node index.js -k <YOUR LOGDNA API KEY>
# On Linux, this will generate a config file: /etc/logdna.conf
# On Windows, this will generate a config file: C:\ProgramData\logdna\logdna.conf

# On Linux, /var/log is monitored/added by default (recursively), optionally specify more folders
# On Windows, C:\ProgramData\logs is monitored/added by default (recursively), optionally specify more folders
sudo node index.js -d "/path/to/log/folders" -d "/path/to/2nd/folder"
sudo node index.js -d "/var/log"                          # folder only assumes *.log + extensionless files
sudo node index.js -d "/var/log/*.txt"                    # supports glob patterns
sudo node index.js -d "/var/log/**/*.txt"                 # *.txt in any subfolder
sudo node index.js -d "/var/log/**/myapp.log"             # myapp.log in any subfolder
sudo node index.js -d "/var/log/+(name1|name2).log"       # supports extended glob patterns
sudo node index.js -e "/var/log/nginx/error.log"          # exclude specific files from -d
sudo node index.js -f "/usr/local/nginx/logs/access.log"  # add specific files

# start the agent
sudo node index.js
```

### Configuration File

Normally a config file is automatically generated (e.g. when you set a key using `-k`), but you can create your own config file `/etc/logdna.conf` on Linux and `C:\ProgramData\logdna\logdna.conf` on Windows:

```conf
logdir = /var/log/myapp,/path/to/2nd/dir
key = <YOUR LOGDNA API KEY>
```
On Windows, you can use Windows paths, just make sure to use `\\` as a separator:

```conf
logdir = C:\\Users\\username\\AppData\\myapp
key = <YOUR LOGDNA API KEY>
```

#### Options
* `logdir`: sets the paths that the agent will monitor for new files, separate multiple paths using `,`, supports glob patterns + specific files
* `exclude`: excludes files that otherwise would've matched `logdir`, separate multiple excludes using `,`, supports glob patterns + specific files
* `key`: your LogDNA API Key. You can obtain one by creating an account on LogDNA.com and once logged in to the webapp, click the Gear icon, then Account Profile.
* `tags`: host tagging to create dynamic groups on the webapp
* `hostname`: override os hostname
* `windowseventlogprovider`: see section below
* `autoupdate`: sets whether the agent should update itself when new versions are available on the public repo (default is `1`, set to `0` to disable)

### Features
* Agent connects to LogDNA ingestion servers around the world (currently: US West California, US East Virginia & EU West Ireland)
* Uses secure websockets (wss://) protocol
* Uses websocket compression (perMessageDeflate) to minimize data transfer
* Reconnects if disconnected and will queue up new log lines while disconnected
* Rescans for new files in all `logdir` paths, every minute
* Transparently handles log rotated files in most OS's (including "new file per day" date stamped files)
* [Init script is available here](https://github.com/logdna/logdna-agent/blob/master/scripts/init-script)
* Agent is self-updating, no need to maintain latest versions. This requires LogDNA YUM/APT repo to be installed
```
# YUM Repo
echo "[logdna]
name=LogDNA packages
baseurl=http://repo.logdna.com/el6/
enabled=1
gpgcheck=0" | sudo tee /etc/yum.repos.d/logdna.repo

# APT Repo
echo "deb http://repo.logdna.com stable main" | sudo tee /etc/apt/sources.list.d/logdna.list
sudo apt-get update
```

## Windows Event Log

The LogDNA agent supports reading from the Application log on Windows. To stream these events, you'll need to add an additional property to your configuration file:

```
windowseventlogprovider = yourprovidername
```

Then in a C# application you can do:

```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;
namespace LogDNATest
{
    class Program
    {
        static void Main(string[] args)
        {
            string source = "yourprovidername";
            string log = "application";

            if (!EventLog.SourceExists(source))
            {
                EventLog.CreateEventSource(source, log);
            }

            while (true)
            {
                EventLog.WriteEntry(source, "logged event message");
                System.Threading.Thread.Sleep(1000);
            }
                
        }
    }
}
```

And you'll see your event log messages appear on the LogDNA webapp.

You can find a [more detailed write-up here](http://partnercatalyst.azurewebsites.net/pulls/189/2016/03/22/Open-Sourcing-LogDNA-Client.html), courtesy of our friends at Microsoft.

## How it Works

The LogDNA agent authenticates using your LogDNA API key and opens a secure web socket to LogDNA's ingestion servers. It then 'tails' for new log files added to your specific logging directories, watching for file changes. Those changes are sent to to LogDNA via the secure web socket.

## Kubernetes Logging

Set up Kubernetes logging with 2 `kubectl` commands with the LogDNA agent! We extract pertinent Kubernetes metadata: pod name, container name, container id, namespace, etc:

```
kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA API KEY>
kubectl create -f https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-ds.yaml
```

This automatically installs a logdna-agent pod into each node in your cluster and ships stdout/stderr from all containers, both application logs and node logs. Note: By default, the agent pod will collect logs from all namespaces on each node, including `kube-system`. View your logs at https://app.logdna.com

If you don't have a LogDNA account, you can create one on https://logdna.com or if you're on macOS w/[Homebrew](https://brew.sh) installed:

```
brew cask install logdna-cli
logdna register <email>
# now paste the api key into the kubectl commands above
```

We created this integration mainly based on customer feedback and that [logging with Kubernetes should not be this painful](https://blog.logdna.com/2017/03/14/logging-with-kubernetes-should-not-be-this-painful/).

### LogDNA Pay-per-gig Pricing

Our [paid plans](https://logdna.com/#pricing) start at $1.25/GB per month, pay for what you use / no fixed data buckets / all paid plans include all features.

## Contributors

* Lee Liu (LogDNA)
* Mike Hu (LogDNA)
* Ryan Staatz (LogDNA)
* [Steven Edouard](https://github.com/sedouard) (Microsoft)
* [Rita Zhang](https://github.com/ritazh) (Microsoft)
* [Lauren Tran](https://github.com/laurentran) (Microsoft)

## Contributing

Contributions are always welcome. See the [contributing guide](/CONTRIBUTING.md) to learn how you can help.
