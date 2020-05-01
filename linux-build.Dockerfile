FROM ubuntu:18.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        wget

# Install nodejs
RUN wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash \
    && export NVM_DIR="$HOME/.nvm" \
    && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" \
    && nvm install 12.9.1 \
    && nvm use node \
    && ln -s $(which node) /usr/local/bin/node \
    && ln -s $(which npm) /usr/local/bin/npm

# Install nexe to package the LogDNA agent as a native executable with the
# node.js runtime bundled
RUN npm install -g nexe \
    && export NVM_DIR="$HOME/.nvm" \
    && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" \
    && nvm use node \
    && ln -s $(which nexe) /usr/local/bin/nexe

# Install npm dependencies
COPY package.json /logdna-agent/package.json
WORKDIR /logdna-agent
RUN npm install

# Build the package
COPY . /logdna-agent
RUN nexe index.js

# Test that the package is usable
FROM ubuntu:18.04
COPY --from=0 /logdna-agent/logdna-agent /usr/local/bin
RUN logdna-agent --help
