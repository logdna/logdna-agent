# logdna-agent

[![Build Status](https://travis-ci.org/logdna/logdna-agent.svg?branch=master)](https://travis-ci.org/logdna/logdna-agent)
[![Build status](https://ci.appveyor.com/api/projects/status/mk5rb0uk6xkjxhk2/branch/master?svg=true)](https://ci.appveyor.com/project/mikehu/logdna-agent/branch/master)

LogDNA's collector agent which streams log files to your LogDNA account. LogDNA is a hosted, cloud logging service.

## Getting Started

### From an Official Release

Check out the official [LogDNA site](https://logdna.com/) on how to signup for an account and get started.

### From Source

Follow these quick instructions to run the LogDNA agent from source:

```bash
git clone https://github.com/logdna/logdna-agent.git
cd logdna-agent
npm install

# help
sudo node index.js --help

# configure
sudo node index.js -k <YOUR LOGDNA INGESTION KEY>
# On Linux, this will generate a config file: /etc/logdna.conf
# On Windows, this will generate a config file: C:\ProgramData\logdna\logdna.conf

# on Linux, /var/log is monitored/added by default (recursively), optionally specify more folders
# on Windows, C:\ProgramData\logs is monitored/added by default (recursively), optionally specify more folders
sudo node index.js -d /path/to/log/folders -d /path/to/2nd/folder
sudo node index.js -d /var/log                            # folder only assumes *.log + extensionless files
sudo node index.js -d "/var/log/*.txt"                    # supports glob patterns
sudo node index.js -d "/var/log/**/*.txt"                 # *.txt in any subfolder
sudo node index.js -d "/var/log/**/myapp.log"             # myapp.log in any subfolder
sudo node index.js -d "/var/log/+(name1|name2).log"       # supports extended glob patterns
sudo node index.js -e /var/log/nginx/error.log            # exclude specific files from -d
sudo node index.js -f /usr/local/nginx/logs/access.log    # add specific files
sudo node index.js -t production                          # tags
sudo node index.js -t production,app1=/opt/app1           # tags for specific paths
sudo node index.js -w System                              # Windows System event logs (all providers)

# other commands
sudo node index.js -l                                     # show all saved options from config
sudo node index.js -l tags,key,logdir                     # show specific entries from config
sudo node index.js -u tags                                # unset tags
sudo node index.js -u tags,logdir                         # unset tags and logdir
sudo node index.js -u all                                 # unset everything except ingestion key

# start the agent
sudo node index.js
```

### Configuration File

Normally a config file is automatically generated (e.g. when you set a key using `-k`), but you can create your own config file `/etc/logdna.conf` on Linux and `C:\ProgramData\logdna\logdna.conf` on Windows:

```conf
logdir = /var/log/myapp,/path/to/2nd/dir
key = <YOUR LOGDNA INGESTION KEY>
```
On Windows, you can use Windows paths, just make sure to use `\\` as a separator:

```conf
logdir = C:\\Users\\username\\AppData\\myapp
key = <YOUR LOGDNA INGESTION KEY>
```

#### Options
* `logdir`: sets the paths that the agent will monitor for new files, separate multiple paths using `,`, supports glob patterns + specific files. By default this option is set to monitor .log and extensionless files under `/var/log/`. Glob patterns should be given in double-quotes.
* `exclude`: excludes files that otherwise would've matched `logdir`, separate multiple excludes using `,`, supports glob patterns + specific files
* `exclude_regex`: filters out any lines matching pattern in any file. Don't include leading and trailing /.
* `key`: your LogDNA Ingestion Key. You can obtain one by creating an account on [LogDNA site](https://logdna.com/) and once logged in to the webapp, click the Gear icon, then Account Profile.
* `tags`: use tags to separate data for production, staging, or autoscaling use cases
* `hostname`: override os hostname
* `autoupdate`: sets whether the agent should update itself when new versions are available on the public repo (default is `1`, set to `0` to disable)
* `winevent`: sets Windows Event Log Configurations in `logname` format


### Features
* Agent maintains persistent connections to LogDNA ingestion servers with HTTPS encryption
* Reconnects if disconnected and will queue up new log lines while disconnected
* Compression on upload (currently gzip)
* Rescans for new files in all `logdir` paths, every minute
* Transparently handles log rotated files in most OS's (supports: renamed, truncated & "new file per day" log rotation methods)
* [Init script is available here](https://github.com/logdna/logdna-agent/blob/master/scripts/init-script) (rpm/deb packages already include this)
* Agent is self-updating to latest point releases, no need to maintain latest versions (this requires LogDNA YUM/APT repo to be installed)
```
# YUM Repo
echo "[logdna]
name=LogDNA packages
baseurl=https://repo.logdna.com/el6/
enabled=1
gpgcheck=1
gpgkey=https://repo.logdna.com/logdna.gpg" | sudo tee /etc/yum.repos.d/logdna.repo

# APT Repo
echo "deb https://repo.logdna.com stable main" | sudo tee /etc/apt/sources.list.d/logdna.list
wget -O- https://repo.logdna.com/logdna.gpg | sudo apt-key add -
sudo apt-get update
```

## How it Works

The LogDNA agent authenticates using your [LogDNA Ingestion Key](https://app.logdna.com/manage/profile) and opens a secure web socket to LogDNA's ingestion servers. It then 'tails' for new log data, as well as watches for new files added to your specific logging directories.

If you don't have a LogDNA account, you can create one on https://logdna.com or if you're on macOS w/[Homebrew](https://brew.sh) installed:

```
brew cask install logdna-cli
logdna register <email>
# now paste the Ingestion Key into the kubectl commands above
```

## Kubernetes Logging

Set up Kubernetes logging with 2 `kubectl` commands with the LogDNA agent! We extract pertinent Kubernetes metadata: pod name, container name, container id, namespace, and labels etc:

```
kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA INGESTION KEY>
kubectl create -f https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-ds.yaml
```

This automatically installs a logdna-agent pod into each node in your cluster and ships stdout/stderr from all containers, both application logs and node logs. Note: By default, the agent pod will collect logs from all namespaces on each node, including `kube-system`. View your logs at https://app.logdna.com. See [YAML file](https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-ds.yaml) for additional options such as `LOGDNA_TAGS`.

### Upgrading to LogDNA Agent 2.0 for Kubernetes

We've recently made the LogDNA Agent 2.0 publicly available for Kubernetes users. We'll be rolling this out to existing users as well as other platforms and operating systems over the next few weeks, but if you'd like to upgrade your existing Kubernetes agent you can simply run the following:

```
kubectl patch ds/logdna-agent -p '{"spec":{"updateStrategy":{"type":"RollingUpdate", "maxUnavailable":"100%"}}}'

kubectl patch ds/logdna-agent -p '{"spec":{"template":{"spec":{"containers":[{"name":"logdna-agent","image":"logdna/logdna-agent-v2:stable", "imagePullPolicy": "Always"}]}}}}'
```

To confirm it upgraded correctly, please run `kubectl get ds logdna-agent -o yaml | grep "image: logdna/"` and if you see `image: logdna/logdna-agent-v2:stable` then you are good to go.

If you'd like to to install LogDNA's Agent 2.0 into a new cluster, you can simply run the following two `kubectl` commands:

```
kubectl create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA INGESTION KEY>

kubectl create -f https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-v2.yaml
```

If you don't have a LogDNA account, you can create one on https://logdna.com or if you're on macOS w/[Homebrew](https://brew.sh) installed:

```
brew cask install logdna-cli
logdna register <email>
# now paste the Ingestion Key into the kubectl commands above
```

We created this integration mainly based on customer feedback and that [logging with Kubernetes should not be this painful](https://blog.logdna.com/2017/03/14/logging-with-kubernetes-should-not-be-this-painful/).

### LogDNA Pay-per-gig Pricing

Our [paid plans](https://logdna.com/#pricing) start at $1.50/GB per month, pay for what you use / no fixed data buckets / all paid plans include all features.

## Contributors

* Lee Liu (LogDNA)
* Mike Hu (LogDNA)
* Ryan Staatz (LogDNA)
* Samir Musali (LogDNA)
* [Steven Edouard](https://github.com/sedouard) (Microsoft)
* [Rita Zhang](https://github.com/ritazh) (Microsoft)
* [Lauren Tran](https://github.com/laurentran) (Microsoft)

## Contributing

Contributions are always welcome. See the [contributing guide](/CONTRIBUTING.md) to learn how you can help. Build instructions for the agent are also in the guide.
