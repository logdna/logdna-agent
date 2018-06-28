FROM resin/aarch64-node:8.11

RUN [ "cross-build-start" ]

RUN npm install -g nexe

WORKDIR /app
COPY package*.json /app/

RUN npm install 

COPY . /app/

RUN nexe --build index.js