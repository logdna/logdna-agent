#!/bin/bash
# Assuming it is running on Debian

# Variables
ARCH=x64
DEBIAN=deb
INPUT_TYPE=dir
LICENSE=MIT
NAME=logdna-agent
NODE_VERSION=12.13.0
REDHAT=rpm

# Step 1: Install Dependencies
sudo npm install -g nexe
sudo apt-get install -y ruby ruby-dev rubygems build-essential rpm
sudo gem install --no-ri --no-rdoc fpm

# Step 2: Prepare Folders and Files
mkdir -p .build/scripts
cp ./scripts/linux/files/* .build/scripts/

# Step 3: Compile and Build Executable
nexe -i index.js -o .build/logdna-agent -t linux-${ARCH}-${NODE_VERSION}
pushd . > /dev/null 2>&1
cd .build

# Step 4: Debian Packaging
fpm \
	--input-type ${INPUT_TYPE} \
	--output-type ${DEBIAN} \
	--name ${NAME} \
	--version ${VERSION} \
	--license ${LICENSE} \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Linux" \
	--url "http://logdna.com/" \
	--maintainer "support@logdna.com" \
	--before-remove ./scripts/before-remove \
	--after-upgrade ./scripts/after-upgrade \
	--force --deb-no-default-config-files \
		./logdna-agent=/usr/bin/logdna-agent \
		./scripts/init-script=/etc/init.d/logdna-agent \
		./scripts/logrotate=/etc/logrotate.d/logdna-agent

# Step 5: RedHat Packaging
fpm \
	--input-type ${INPUT_TYPE} \
	--output-type ${REDHAT} \
	--name ${NAME} \
	--version ${VERSION} \
	--license ${LICENSE} \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Linux" \
	--url "http://logdna.com/" \
	--maintainer "support@logdna.com" \
	--before-remove ./scripts/before-remove \
	--after-upgrade ./scripts/after-upgrade \
	--force \
		./logdna-agent=/usr/bin/logdna-agent \
		./scripts/init-script=/etc/init.d/logdna-agent \
		./scripts/logrotate=/etc/logrotate.d/logdna-agent

cp *.deb *.rpm ../
popd > /dev/null 2>&1 || return