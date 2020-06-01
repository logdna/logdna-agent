FROM ubuntu:16.04

ARG CA_CERTIFICATES_VERSION=20170717~16.04.2
ARG CURL_VERSION=7.*

COPY build/logdna.gpg /etc/

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.url="https://logdna.com"
LABEL org.label-schema.maintainer="LogDNA <support@logdna.com>"
LABEL org.label-schema.name="logdna/logdna-agent"
LABEL org.label-schema.description="LogDNA agent"
LABEL org.label-schema.vcs-url="https://github.com/logdna/logdna-agent"
LABEL org.label-schema.vendor="LogDNA Inc."
LABEL org.label-schema.docker.cmd="docker run logdna/logdna-agent:latest"

RUN echo "deb http://repo.logdna.com stable main" > /etc/apt/sources.list.d/logdna.list && \	
    apt-key add /etc/logdna.gpg && \	
    apt-get -y update && \	
    apt-get -y install logdna-agent && \	
    apt-get -y upgrade && \	
    rm -rf /var/lib/apt/lists/*
    
CMD ["/usr/bin/logdna-agent"]
