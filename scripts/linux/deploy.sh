#!/bin/bash
# Assuming it is running on Debian

# Variables
export ANSIBLE_HOST_KEY_CHECKING=False
export TERRAFORM_STATE_ROOT=.

# Step 1: Install Dependencies
go get -u github.com/tcnksm/ghr

# Step 2:
ghr -n "LogDNA Agent v${VERSION}" -draft ${VERSION} logdna-agent_${VERSION}*