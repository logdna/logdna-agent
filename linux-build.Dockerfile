FROM centos:7

# Install node.js development environment
RUN curl -sL https://rpm.nodesource.com/setup_14.x | bash - \
    && yum install -y nodejs \
    && npm install -g grunt-cli

# Install nexe to package the LogDNA agent as a native executable with the
# node.js runtime bundled
RUN npm install -g nexe@1.1.2

# Install build tools
RUN yum groupinstall -y "Development Tools"

# Install npm dependencies
COPY package.json /logdna-agent/package.json
WORKDIR /logdna-agent
RUN npm install

# Now build the package
COPY . /logdna-agent
RUN grunt exec:nexe

# Test that the package is usable
FROM alpine
COPY --from=0 /logdna-agent/logdna-agent /usr/local/bin
RUN logdna-agent --help
