FROM mcr.microsoft.com/windows/servercore:ltsc2019

# Install nodejs
RUN powershell -Command Invoke-WebRequest -Uri \
        https://github.com/coreybutler/nvm-windows/releases/download/1.1.7/nvm-noinstall.zip \
        -OutFile nvm-noinstall.zip
RUN powershell -Command Expand-Archive nvm-noinstall.zip
RUN fsutil file createnew settings.txt 0
RUN /nvm-noinstall/nvm install 12.9.1
RUN setx /M PATH "%PATH%;C:\\v12.9.1"
RUN rename C:\\v12.9.1\\node64.exe node.exe

# Install nexe to package the LogDNA agent as a native executable with the
# node.js runtime bundled
RUN npm install -g nexe

# Install npm dependencies
COPY package.json /logdna-agent/package.json
WORKDIR /logdna-agent
RUN npm install

# Build the package
COPY . /logdna-agent
RUN nexe index.js

# Test that the package is usable
FROM mcr.microsoft.com/windows/servercore:ltsc2019
COPY --from=0 /logdna-agent/logdna-agent.exe .
RUN logdna-agent --help
