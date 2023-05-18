# LogDNA Agent

LogDNA Agent streams from log files to your LogDNA account. Works with Linux, Windows, and macOS Servers.
## :warning: Deprecation Warning
logdna-agent will soon be deprecated and will cease to have support. Please refer to [LogDNA Agent V2](https://github.com/logdna/logdna-agent-v2) for all future implementations. 
## Getting Started

### From an Official Release

Check out the official [LogDNA site](https://logdna.com/) to learn how to sign up for an account and get started.

### From Source

Follow these instructions to run the LogDNA agent from source:

```bash
git clone https://github.com/logdna/logdna-agent.git
cd logdna-agent
npm install

# help
sudo node index.js --help

# configure
sudo node index.js -k <YOUR LOGDNA INGESTION KEY>
# On Linux, this will generate a config file at: /etc/logdna.conf
# On Windows, this will generate a config file at: C:\ProgramData\logdna\logdna.conf

# on Linux, /var/log is monitored/added by default (recursively). You can optionally specify more folders
# on Windows, C:\ProgramData\logs is monitored/added by default (recursively). You can optionally specify more folders
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

# other commands
sudo node index.js -l                                     # show all saved options from config
sudo node index.js -l tags,key,logdir                     # show specific entries from config
sudo node index.js -u tags                                # unset tags
sudo node index.js -u tags,logdir                         # unset tags and logdir
sudo node index.js -u all                                 # unset everything except ingestion key

# start the agent
sudo node index.js
```

Note that when using glob patterns with `index.js`, you must enclose the pattern in double quotes.

### Configuration File

Normally a config file is automatically generated (e.g. when you set a key using `index.js -k`) and updated (e.g. when you add a directory
using `index.js -d`) but you can create your own config file `/etc/logdna.conf` on Linux and `C:\ProgramData\logdna\logdna.conf` on Windows and
save your settings there:

```conf
logdir = /var/log/myapp,/path/to/2nd/dir
key = <YOUR LOGDNA INGESTION KEY>
```
On Windows, use `\\` as a separator:

```conf
logdir = C:\\Users\\username\\AppData\\myapp
key = <YOUR LOGDNA INGESTION KEY>
```

#### Configuration File Options
* `logdir`: sets the paths that the agent will monitor for new files. Multiple paths can be specified, separated by `,`. Supports glob patterns + specific
   files. By default this option is set to monitor `.log` and extensionless files under `/var/log/`.
* `exclude`: sets files to exclude that would otherwise match what's set in `logdir`. Multiple paths can be specified, separated by `,`.
   Supports glob patterns + specific files
* `exclude_regex`: filters out any log lines matching this pattern in any file. Should not include leading or trailing `/`.
* `key`: your LogDNA Ingestion Key. You can obtain one by creating an account at [LogDNA](https://logdna.com/). Once logged in, click on the Gear icon,
   then Account Profile to find your key.
* `tags`: tags can be used e.g. to separate data from production, staging, or autoscaling use cases
* `hostname`: set this to override the os hostname

### Features
* The Agent maintains persistent connections to LogDNA ingestion servers with HTTPS encryption
* Reconnects if disconnected and will queue up new log lines while disconnected
* Compresses on upload (gzip)
* Rescans for new files in all `logdir` paths every minute
* Handles log rotated files on most operating systems (supports: renamed, truncated & "new file per day" log rotation methods)
* [Init script is available here](https://github.com/logdna/logdna-agent/blob/master/scripts/init-script) (rpm/deb packages already include this)
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

The LogDNA agent authenticates using your [LogDNA Ingestion Key](https://app.logdna.com/manage/profile) and opens a secure web socket to LogDNA's
ingestion servers. It then 'tails' for new log data, as well as watches for new files added to your specific logging directories.  Of note, for a single log in a log file to be considered ready to send to LogDNA, it must end with ```\n``` or ```\r\n```.  Otherwise it is assumed more information is being added and the agent holds off.

If you don't have a LogDNA account, you can create one on https://logdna.com. Or if you're using macOS w/[Homebrew](https://brew.sh) installed:

```
brew cask install logdna-cli
logdna register <email>
```

## Kubernetes Logging

Please see [our documentation](./docs/kubernetes.md) for Kubernetes instructions.

## OpenShift Logging

OpenShift logging requires a few additional steps over Kubernetes, but still pretty easy! Like Kubernetes, we extract pertinent metadata: pod name,
container name, container id, namespace, project, and labels etc:

```
oc adm new-project --node-selector='' logdna-agent
oc project logdna-agent
oc create serviceaccount logdna-agent
oc adm policy add-scc-to-user privileged system:serviceaccount:logdna-agent:logdna-agent
oc create secret generic logdna-agent-key --from-literal=logdna-agent-key=<YOUR LOGDNA INGESTION KEY>
oc create -f https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-ds-os.yaml
```

This automatically installs a logdna-agent pod into each node in your cluster and ships stdout/stderr from all containers, both application logs
and node logs. Note: By default, the agent pod will collect logs from all namespaces on each node, including `kube-system`. View your logs
at https://app.logdna.com. See [YAML file](https://raw.githubusercontent.com/logdna/logdna-agent/master/logdna-agent-ds-os.yaml) for additional
options such as `LOGDNA_TAGS`.

Notes:
* The `oc adm new-project` method prevents having to adjust the project namespace's node-selector after creation.
* This uses `JOURNALD=files`, you may need to change this if you have changed OpenShift logging configuration.
* This has been tested on OpenShift 3.5-11

## Fedora CoreOS Logging

If you're using a docker-less containerized (e.g. podman) operating system like
Fedora CoreOS where logs are forwarded to journald, you will be unable to use
logspout (if your OS does use Docker, refer to [LogDNA LogSpout][1] for
instructions on how to set that up).

You can run logdna-agent inside a container to read from journald with a few
modifications. First, you'll need to set up systemd inside the container so
that it can read from `journalctl`. Note that due to the systemd dependency,
you may have some difficulties starting from a base image like Alpine. Instead,
try starting from a distribution such as Debian or CentOS. The following
assumes that you're starting from the Ubuntu based image provided by LogDNA.

In your Containerfile, install systemd:

    FROM logdna/logdna-agent

    # Install systemd so we can read logs via journalctl
    RUN apt-get update \
        && apt-get install -y --no-install-recommends systemd \
        && rm -rf /var/lib/apt/lists/*

Next, you need to ensure the `USEJOURNALD` environment variable is set. If set
to `files`, the agent will read from journald and forward the logs. The agent
can be configured either in your image or entrypoint.

By default the agent will read logs from the `/var/log`. These logs won't be
very useful since they'll be referencing the container and not the host. You
cannot omit `logdir` since the agent will still read from `/var/log` if
`logdir` is missing from the configuration. Instead, to disable reading from
files, set `logdir` to an empty directory (e.g. `/usr/src`).

Finally, mount `/var/log/journal` inside the container so the agent can use
`journalctl` to read logs. An example systemd service configuration could look
like the following:

    [Unit]
    Description=LogDNA Forwarder
    After=network-online.target
    Wants=network-online.target

    [Service]
    Restart=on-failure
    ExecStartPre=-/bin/podman kill logdna
    ExecStartPre=-/bin/podman rm logdna
    ExecStartPre=/bin/podman pull my-custom/logdna-agent
    ExecStart=/bin/podman run -v /var/log/journal:/var/log/journal:z --name logdna my-custom/logdna-agent

    [Install]
    WantedBy=multi-user.target

[1]: https://github.com/logdna/logspout

## Windows Logging
The LogDNA agent can be installed through Chocolatey. You will need:
* Windows PowerShell v3+ (not PowerShell Core aka PowerShell 6 yet)
* Windows 7+/Windows 2003+ (Server Core also, but not Windows Nano Server)
* .NET Framework 4.x+

For more details, view our [Windows Agent docs](https://docs.logdna.com/docs/windows-logging)

## Manual Install
In some cases, you may have a system that is restricted from incoming connections.  You can find executables in this repo's [Releases](https://github.com/logdna/logdna-agent/releases) and install them directly any time via a flash drive or connection behind your firewall.

### Windows Specific
To automatically run the agent and avoid nssm install/setup, you can use the following ```.bat``` in conjunction with the default Task Scheduler on bootup.  Note that the executable, configuration file and debug output are defined via the ```set``` commands.  You will likely need to tweak these for your system.

```bash
set agent_exe_loc=C:\Users\Administrator\Documents\logdna-agent.exe
set agent_conf_loc=C:\Users\Administrator\Documents\logdna.conf
set agent_debug_log_loc=C:\Users\Administrator\Documents\logdna_debug_out.log

%agent_exe_loc% -c %agent_conf_loc% > %agent_debug_log_loc%
```

### LogDNA Pay-per-gig Pricing

Our [paid plans](https://logdna.com/pricing/) start at $1.50/GB per month. Pay only for what you use, with no fixed data buckets.
All paid plans include all features.

## Contributors

* Lee Liu (LogDNA)
* Mike Hu (LogDNA)
* Ryan Staatz (LogDNA)
* Samir Musali (LogDNA)
* [Steven Edouard](https://github.com/sedouard) (Microsoft)
* [Rita Zhang](https://github.com/ritazh) (Microsoft)
* [Lauren Tran](https://github.com/laurentran) (Microsoft)

## Contributing

Contributions are always welcome. See the [contributing guide](/CONTRIBUTING.md) to learn how you can help. Build instructions for the
agent are also in the guide.
