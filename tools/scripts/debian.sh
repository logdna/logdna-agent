#!/bin/bash
# THIS SHOULD RUN ON DEBIAN FROM THE PROJECT DIRECTORY

# VARIABLES
ARCH=x64
DEB_SIGNATURE_ID=EF506BE8
INPUT_TYPE=dir
LICENSE=MIT
NODE_VERSION=12.16.2
OUTPUT_TYPE=deb
PACKAGE_NAME=logdna-agent
S3_BUCKET=repo.logdna.com
VERSION=$(cat ./package.json | grep version | cut -d'"' -f4)

# PAUSE FUNCTION
function pause(){
	read -s -n 1 -p "Press any key to continue . . ."
}

# PREPARE FOLDER AND FILES
mkdir -p .build/ .pkg/
cp \
	tools/files/linux/before-remove \
	tools/files/linux/after-upgrade \
	tools/files/linux/init-script \
	tools/files/linux/logrotate \
	.build/

# STEP 1: COMPILE AND BUILD EXECUTABLE
npm install --production
nexe -i index.js -o .build/${PACKAGE_NAME} -t linux-${ARCH}-${NODE_VERSION}

# STEP 2: PACKAGE
cd .build/
fpm \
	--input-type ${INPUT_TYPE} \
	--output-type ${OUTPUT_TYPE} \
	--name ${PACKAGE_NAME} \
	--version ${VERSION} \
	--license ${LICENSE} \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Linux" \
	--url "https://logdna.com/" \
	--maintainer "LogDNA <support@logdna.com>" \
	--before-remove ./before-remove \
	--after-upgrade ./after-upgrade \
	--force --deb-no-default-config-files \
		./${PACKAGE_NAME}=/usr/bin/${PACKAGE_NAME} \
		./init-script=/etc/init.d/${PACKAGE_NAME} \
		./logrotate=/etc/logrotate.d/${PACKAGE_NAME}
mv *.deb ../.pkg/
cd ..

# STEP 3: RELEASE
ghr \
	-n "LogDNA Agent v${VERSION}" \
	-r ${PACKAGE_NAME} \
	-u logdna \
	${VERSION} .pkg/

# PAUSE TO GET APPROVAL
pause

# STEP 4: PUBLISH
gpg --import ${SECRET_GPG_KEY_FILE}
deb-s3 upload \
	--access-key-id=${AWS_ACCESS_KEY} \
	--gpg-options="--digest-algo SHA256" \
	--preserve-versions --bucket ${S3_BUCKET} \
	--secret-access-key=${AWS_SECRET_KEY} \
	--sign ${DEB_SIGNATURE_ID} ${PACKAGE_NAME}*${VERSION}*.deb
