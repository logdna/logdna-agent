FROM ubuntu:16.04

MAINTAINER Lee Liu <lee@logdna.com>

COPY logdna.gpg /etc/

RUN echo "deb http://repo.logdna.com stable main" > /etc/apt/sources.list.d/logdna.list && \
    apt-key add /etc/logdna.gpg && \
    apt-get -y update && \
    apt-get -y install logdna-agent && \
    apt-get -y install devscripts && \
    dget -u https://launchpadlibrarian.net/405766075/systemd_229-4ubuntu21.15.dsc && \
    dget -u https://launchpadlibrarian.net/406779380/apt_1.2.29ubuntu0.1.dsc

CMD ["/usr/bin/logdna-agent"]
