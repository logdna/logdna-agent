#!/bin/bash
# Assuming it is running on Debian

# Step 1: Install Dependencies
sudo npm install -g nexe
sudo apt-get install -y ruby ruby-dev rubygems build-essential rpm
sudo gem install --no-ri --no-rdoc fpm

# Step 2: Prepare Folders and Files
mkdir -p dist/scripts
cp ./scripts/linux/files/* dist/scripts/

# Step 3: Compile and Build Executable
nexe -i index.js -o dist/logdna-agent -t linux-x64-12.13.0

# Step 4: Debian Packaging
fpm \
	--input-type dir \
	--output-type deb \
	--name logdna-agent \
	--version ${VERSION} \
	--license MIT \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Linux" \
	--url "http://logdna.com/" \
	--maintainer "support@logdna.com" \
	--before-remove ./dist/scripts/before-remove \
	--after-upgrade ./dist/scripts/after-upgrade \
	--force --deb-no-default-config-files \
		./dist/logdna-agent=/usr/bin/logdna-agent \
		./dist/scripts/init-script=/etc/init.d/logdna-agent \
		./dist/scripts/logrotate=/etc/logrotate.d/logdna-agent

# Step 5: RedHat Packaging
fpm \
	--input-type dir \
	--output-type rpm \
	--name logdna-agent \
	--version ${VERSION} \
	--license MIT \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Linux" \
	--url "http://logdna.com/" \
	--maintainer "support@logdna.com" \
	--before-remove ./dist/scripts/before-remove \
	--after-upgrade ./dist/scripts/after-upgrade \
	--force \
		./dist/logdna-agent=/usr/bin/logdna-agent \
		./dist/scripts/init-script=/etc/init.d/logdna-agent \
		./dist/scripts/logrotate=/etc/logrotate.d/logdna-agent