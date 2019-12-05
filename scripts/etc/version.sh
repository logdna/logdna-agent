#!/bin/bash

# Gather Both Given Versions
TAG_VERSION=$(git tag --sort=-creatordate | head -n 1)
PKG_VERSION=$(cat package.json | grep "\"version\"" | cut -d':' -f2 | cut -d '"' -f2)

# Check and Fail if No Match
if [ "${TAG_VERSION}" != "${PKG_VERSION}" ]; then
  echo "There is mismatch:"
  echo "  TAG_VERSION: ${TAG_VERSION}"
  echo "  PKG_VERSION: ${PKG_VERSION}"
  exit 1
fi

# Export VERSION if Successful
echo "export VERSION=${TAG_VERSION}" >> ${BASH_ENV}
source ${BASH_ENV}