#!/bin/bash

TAG_VERSION=$(git tag --sort=-creatordate | head -n 1)
PKG_VERSION=$(cat package.json | grep version | cut -d':' -f2 | cut -d '"' -f2)
if [[ "${TAG_VERSION}" != "${PKG_VERSION}" || ${TAG_VERSION} != ${MAJOR_VERSION}* ]]; then
  echo "There is mismatch:"
  echo "  TAG_VERSION: ${TAG_VERSION}"
  echo "  PKG_VERSION: ${PKG_VERSION}"
  exit 1
fi
echo "export VERSION=${TAG_VERSION}" >> ${BASH_ENV}
source ${BASH_ENV}