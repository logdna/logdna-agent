FROM gcr.io/plasma-column-128721/pkg-builder:amd64

WORKDIR /app
COPY package*.json /app/

RUN npm install 

COPY . /app/

RUN node /builder/lib-es5/bin.js --targets node10-linux-x86_64 index.js

ARG ARTIFACTORY_PASSWORD=PASSWORD_HERE
ARG ARTIFACTORY_URL=https://sixriver.jfrog.io/sixriver/debian/pool/main

RUN ls -lah &&\
    ./deploy.sh &&\
    ls -lah
