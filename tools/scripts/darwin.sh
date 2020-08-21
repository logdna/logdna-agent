#!/bin/bash
# THIS SHOULD RUN ON MACOSX FROM THE PROJECT DIRECTORY

# VARIABLES
ARCH=x64
INPUT_TYPE=dir
LICENSE=MIT
NODE_VERSION=8.3.0 # Will upgrade after 1.6.5
OSXPKG_IDENTIFIER_PREFIX=com.logdna
OUTPUT_TYPE=osxpkg
PACKAGE_NAME=logdna-agent
S3_BUCKET=repo.logdna.com
VERSION=$(cat tools/files/darwin/logdna-agent.rb | grep "version '" | cut -d"'" -f2)

# PAUSE FUNCTION
function pause(){
	read -s -n 1 -p "Press any key to continue . . ."
}

# PREPARE FOLDER AND FILES
mkdir -p .build/ .pkg/
cp \
	tools/files/darwin/com.logdna.logdna-agent.plist \
	tools/files/darwin/mac-after-install \
	tools/files/darwin/uninstall-mac-agent \
	.build/

# STEP 1: COMPILE AND BUILD EXECUTABLE
npm install --production
nexe -i index.js -o .build/${PACKAGE_NAME} -t darwin-${ARCH}-${NODE_VERSION}

# STEP 2: PACKAGE
cd .build/
fpm \
	--input-type ${INPUT_TYPE} \
	--output-type ${OUTPUT_TYPE} \
	--name ${PACKAGE_NAME} \
	--version ${VERSION} \
	--license ${LICENSE} \
	--vendor "LogDNA, Inc." \
	--description "LogDNA Agent for Darwin" \
	--url "https://logdna.com/" \
	--maintainer "LogDNA <support@logdna.com>" \
	--after-install ./mac-after-install \
	--osxpkg-identifier-prefix ${OSXPKG_IDENTIFIER_PREFIX} \
	--force \
		./logdna-agent=/usr/local/bin/logdna-agent \
		./com.logdna.logdna-agent.plist=/Library/LaunchDaemons/com.logdna.logdna-agent.plist

# STEP 3: SIGN THE PACKAGE
cd ../.pkg
mv ../.build/logdna-agent-${VERSION}.pkg logdna-agent-${VERSION}-unsigned.pkg
productsign --sign "Developer ID Installer: Answerbook, Inc. (TT7664HMU3)" logdna-agent-${VERSION}-unsigned.pkg logdna-agent-${VERSION}.pkg
SHA256CHECKSUM=$(shasum -a 256 logdna-agent-${VERSION}.pkg | cut -d' ' -f1)
OLDSHA256CHECKSUM=$(cat ../tools/files/darwin/logdna-agent.rb | grep sha256 | cut -d"'" -f2)
sed "s/${OLDSHA256CHECKSUM}/${SHA256CHECKSUM}/" ../tools/files/darwin/logdna-agent.rb > logdna-agent.rb
cd ..

# STEP 4: RELEASE
ghr -draft \
	-n "LogDNA Agent v${VERSION}" \
	-r ${PACKAGE_NAME} \
	-t ${GITHUB_API_TOKEN} \
	-u logdna \
	${VERSION} .pkg/

# PAUSE TO GET APPROVAL
pause

# STEP 5: PUBLISH
echo "Update logdna-agent.rb on https://github.com/logdnabot/homebrew-cask/blob/master/Casks/logdna-agent.rb"
echo "Create a Pull Request to update logdna-agent.rb on https://github.com/Homebrew/homebrew-cask/blob/master/Casks/logdna-agent.rb"
