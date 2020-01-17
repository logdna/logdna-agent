#!/bin/bash

# Gather Both Given Versions
TAG_VERSION=$(git tag --sort=-creatordate | head -n 1)
PKG_VERSION=$(grep "\"version\"" package.json | cut -d'"' -f4)

# Check and Fail if No Match
if [[ "${TAG_VERSION}" != "${PKG_VERSION}" ]]; then
  echo "There is mismatch:"
  echo "  TAG_VERSION: ${TAG_VERSION}"
  echo "  PKG_VERSION: ${PKG_VERSION}"
  exit 1
fi

# Export VERSION if Successful
echo "export VERSION=${TAG_VERSION}" >> ${BASH_ENV}
source ${BASH_ENV}