#!/bin/bash

#pkg packages it up as `index` need to rename it
mv index logdna-agent


VERSION="$(node -p "require('./package.json').version")"
NAME="$(node -p "require('./package.json').name" |  rev | cut -d/ -f1 | rev)"

fpm -s dir -t deb -n "${NAME}" -v "${VERSION}" ./logdna-agent=/usr/local/bin/logdna-agent

DEB_NAME="$(ls *.deb)"
url="${ARTIFACTORY_URL}"
MAIN_OPTS="${DEB_NAME};deb.distribution=xenial;deb.component=main;"
IFS='_' read -ra ADDR <<< "$DEB_NAME"
for i in "${!ADDR[@]}"; do
    case "$i" in
        0) PKG_NAME="${ADDR[$i]}"
           CHAR="$(echo ${PKG_NAME} | head -c1)"
           url="${url}/${CHAR}/${PKG_NAME}/${DEB_NAME};${MAIN_OPTS}"
           ;;
       2) ARCH="$(echo ${ADDR[$i]} | awk -F"." '{ print $1}')"
           url="${url}deb.architecture=${ARCH}"
           ;;
    esac
done
echo "${url}"

time curl --fail \
  -H "X-JFrog-Art-Api: ${ARTIFACTORY_PASSWORD}" \
  -T "${DEB_NAME}" \
  "${url}"