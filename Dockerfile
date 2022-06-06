FROM debian:9.11-slim as debian
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG PACKAGE_NAME=logdna-agent

RUN   apt-get -q -y update \
  && apt-get -y --no-install-recommends install \
    git="1:2.*" \
    # Ruby needed for fpm: https://github.com/jordansissel/fpm
    ruby="1:2.3.*" ruby-dev="1:2.3.*" \
    binutils 


RUN gem install --no-document fpm:1.13 deb-s3
RUN fpm --version

RUN mkdir -p .build

COPY ./.debian-build .build

WORKDIR ${APT_DIR}/.build
RUN fpm \
    --input-type dir \
    --output-type deb \
    --name "${PACKAGE_NAME}" \
    --version "${VERSION}" \
    --license MIT \
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

### START NEW BASE IMAGE ###
# FROM centos:7.6.1810 as centos
# SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# ARG PACKAGE_NAME=logdna-agent

# RUN  yum install epel-release -y \
#   && yum install -y which centos-release-scl \
#   && yum install -y  git rh-ruby23 rh-ruby23-ruby-devel rpm-s3 \
#                     make gcc  awscli python3-pip \
#   && python3 -m pip install awscli \
#   && scl enable rh-ruby23 bash \
#   && yum clean all \
#   && rm -rf /var/cache/yum

# SHELL [ "/usr/bin/scl", "enable", "rh-ruby23"]

# RUN gem install --no-document fpm -v 1.13
# RUN fpm --version

# WORKDIR .build/
# RUN fpm \
#     --input-type dir \
#     --output-type rpm \
#     --name ${PACKAGE_NAME} \
#     --version ${VERSION} \
#     --license ${LICENSE} \
#     --vendor "LogDNA, Inc." \
#     --description "LogDNA Agent for Linux" \
#     --url "https://logdna.com/" \
#     --maintainer "LogDNA <support@logdna.com>" \
#     --before-remove ./before-remove \
#     --after-upgrade ./after-upgrade \
#     --force \
#       ./${PACKAGE_NAME}=/usr/bin/${PACKAGE_NAME} \
#       ./init-script=/etc/init.d/${PACKAGE_NAME} \
#       ./logrotate=/etc/logrotate.d/${PACKAGE_NAME}

FROM alpine:latest

RUN mkdir .pkg
WORKDIR /.pkg

# bringing in debian package
RUN mkdir debian
COPY --from=debian /.build/*.deb ./

