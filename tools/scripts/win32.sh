#!/bin/bash
# THIS SHOULD RUN ON WIN32 FROM THE PROJECT DIRECTORY

# VARIABLES
ARCH=x64
NODE_VERSION=14.15.3
PACKAGE_NAME=logdna-agent
VERSION=$(cat tools/files/win32/logdna-agent.nuspec | grep "<version>" | cut -d'>' -f2 | cut -d'<' -f1)

# PAUSE FUNCTION
function pause(){
	read -s -n 1 -p "Press any key to continue . . ."
}

# PREPARE FOLDER AND FILES
mkdir -p .win-build/tools/ 
cp tools/files/win32/logdna-agent.nuspec .build/
cp LICENSE .win-build/tools/license.txt
cp tools/files/win32/*.ps1 tools/files/win32/*.txt .build/tools/

# STEP 1: COMPILE AND BUILD EXECUTABLE
npm install --production
nexe -i index.js -o .build/tools/${PACKAGE_NAME}.exe -t win32-${ARCH}-${NODE_VERSION}

# STEP 2: PACKAGE
cd .build/
sed -i "s/latest/${VERSION}/" ./tools/VERIFICATION.txt
SHA256CHECKSUM=$(shasum -a 256 tools/${PACKAGE_NAME}.exe | cut -d' ' -f1)
OLDSHA256CHECKSUM=$(cat tools/VERIFICATION.txt | grep 'checksum: ' | cut -d' ' -f4)
sed -i "s/${OLDSHA256CHECKSUM}/${SHA256CHECKSUM}/" ./tools/VERIFICATION.txt
choco pack logdna-agent.nuspec
cd ..
cp .build/*.nupkg .build/tools/*.exe .pkg/

# STEP 3: RELEASE
# ghr \
# 	-n "LogDNA Agent v${VERSION}" \
# 	-r ${PACKAGE_NAME} \
# 	-u logdna \
# 	${VERSION} .pkg/

# # PAUSE TO GET APPROVAL
# pause

# # STEP 4: PUBLISH
# choco apikey --key ${CHOCO_API_KEY} --source https://push.chocolatey.org/
# choco push .pkg/*.nupkg --source https://push.chocolatey.org/
