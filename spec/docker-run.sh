  #/usr/bin/env bash

  cd ../
  docker run -it --rm -v `pwd`:/app badsyntax/mp3-arrange npm test