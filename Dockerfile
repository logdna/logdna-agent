FROM ubuntu:16.04

ARG CA_CERTIFICATES_VERSION=20170717~16.04.2
ARG CURL_VERSION=7.*


LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.url="https://logdna.com"
LABEL org.label-schema.maintainer="LogDNA <support@logdna.com>"
LABEL org.label-schema.name="logdna/logdna-agent"
LABEL org.label-schema.description="LogDNA agent"
LABEL org.label-schema.vcs-url="https://github.com/logdna/logdna-agent"
LABEL org.label-schema.vendor="LogDNA Inc."
LABEL org.label-schema.docker.cmd="docker run logdna/logdna-agent:latest"

RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  ca-certificates=${CA_CERTIFICATES_VERSION} \
  curl=${CURL_VERSION} \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://s3.amazonaws.com/repo.logdna.com/pool/l/lo/logdna-agent_1.6.3_amd64.deb -O && \
  dpkg -i logdna-agent_1.6.3_amd64.deb && \
  rm logdna-agent_1.6.3_amd64.deb


CMD ["/usr/bin/logdna-agent"]
