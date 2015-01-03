FROM ubuntu:14.04
MAINTAINER Richard Willis <richard@fathomlondon.com>

ENV DEBIAN_FRONTEND noninteractive

RUN sed -i "s/\/\/archive.ubuntu.com/\/\/gb.archive.ubuntu.com/g" /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup | sudo bash -
RUN apt-get install -y nodejs sox libsox-fmt-mp3 id3v2 lame

# Bundle app source
# ADD . /app

# Install app dependencies
# RUN cd /app && npm install

WORKDIR /app
# RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

CMD ["bash"]