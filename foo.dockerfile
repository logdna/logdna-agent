FROM resin/aarch64-node:8.11

RUN [ "cross-build-start" ]

RUN npm install -g pkg

WORKDIR /app
COPY package*.json /app/

RUN npm install 

COPY . /app/

RUN pkg --build --targets node8-linux-arm64 index.js