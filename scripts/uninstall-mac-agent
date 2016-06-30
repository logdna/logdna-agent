#!/bin/bash
if sudo /bin/launchctl list com.logdna.logdna-agentd &> /dev/null; then
    sudo /bin/launchctl unload "/Library/LaunchDaemons/com.logdna.logdna-agent.plist"
fi

sudo pkill -f logdna-agent

( cd / ; sudo pkgutil --only-files --files com.logdna.logdna-agent | tr '\n' '\0' | xargs -n 1 -0 sudo rm -if )
sudo pkgutil --forget com.logdna.logdna-agent