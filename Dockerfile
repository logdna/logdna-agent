FROM node:10.17.0-stretch

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.url="https://logdna.com"
LABEL org.label-schema.maintainer="LogDNA <support@logdna.com>"
LABEL org.label-schema.name="logdna/logdna-agent"
LABEL org.label-schema.description="LogDNA agent"
LABEL org.label-schema.vcs-url="https://github.com/logdna/logdna-agent"
LABEL org.label-schema.vendor="LogDNA Inc."
LABEL org.label-schema.docker.cmd="docker run logdna/logdna-agent:latest"

COPY lib/ ./lib/
COPY index.js ./index.js
COPY package.json ./package.json

RUN npm install --production

CMD ["sudo node ./index.js"]
