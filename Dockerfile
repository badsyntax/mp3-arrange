FROM ubuntu:14.04
MAINTAINER Richard Willis <richard@fathomlondon.com>

ENV DEBIAN_FRONTEND noninteractive

RUN sed -i "s/\/\/archive.ubuntu.com/\/\/gb.archive.ubuntu.com/g" /etc/apt/sources.list
RUN apt-get update
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup | sudo bash -
RUN apt-get install -y nodejs sox libsox-fmt-mp3 id3v2 lame

RUN mkdir /app
WORKDIR /app

CMD ["bash"]