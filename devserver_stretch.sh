#!/bin/bash

cd "$(dirname $0)"

docker run -ti --rm --name homeui-stretch --network host -v $(pwd):/build debian:stretch \
  /bin/bash -c '
  echo "deb http://archive.debian.org/debian/ stretch main" > /etc/apt/sources.list && \
  echo "deb [trusted=yes] http://deb.wirenboard.com/dev-tools stable main" >> /etc/apt/sources.list && \
  apt-get update && \
  apt-get install -y nodejs-12 && \
  cd /build && \
  npm install && \
  npm run clean && \
  npm run start'
