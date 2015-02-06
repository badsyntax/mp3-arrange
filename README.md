# mp3-arrange [![Build Status](https://travis-ci.org/badsyntax/mp3-arrange.svg?branch=master)](https://travis-ci.org/badsyntax/mp3-arrange)

A simple script to arrange your music collection. Files will be copied in the format `Genre/Artist/Album/Song/`.

This script only works with `.mp3` files with valid id3 metadata.

### Installation

*Please note, this script has not yet been published to npm, there is still [work to be done](https://github.com/badsyntax/mp3-arrange/issues/1) before I can release an Alpha version.*

`sudo npm install -g mp3-arrange`

### Usage

```
Usage: mp3-arrange [options]

Options:
   -s DIR, --source DIR        Source directory
   -d DIR, --destination DIR   Destination directory
   -l FILE, --logfile FILE     Log file  [logs.json]
   -r, --dry-run               Do a dry run, no changes will be made, and no logs files will be generated  [false]
   -u, --skip-unknowns         Skip processing the file if no id3 data can be read  [true]
   -f, --format-filenames      Re-name the files to match the song name  [true]
   -o, --overwrite             Overwrite the destination file if it exists  [false]
   -m, --move                  Move the files, instead of copying  [false]
   -q, --quiet                 Only output errors  [false]
   -v, --version               Print version and exit  [false]

```

#### Example usage:

```bash
# Copy files to a directory
mp3-arrange -s /home/richard/Music -d /media/hdd1/music
```

### Development

Clone and install dependencies:

```
git clone https://github.com/badsyntax/mp3-arrange.git mp3-arrange && cd $_ && npm install
```

## Docker

If you're on OSX:

* Ensure you have the latest version of boot2docker installed.
* Ensure the project is cloned in your home folder (this is a restriction of boot2docker).

### Build and Run

```
docker build -t=badsyntax/mp3-arrange .
docker run -it --rm -v `pwd`:/app badsyntax/mp3-arrange
# Or
docker run -it --rm -v `pwd`:/app badsyntax/mp3-arrange npm run watch
```

### Testing

Test files can be found in the `spec/` folder.

If running tests from your host machine, you need to install sox and id3v2 first.

```bash
# Install id3v2 and sox
sudo apt-get install sox libsox-fmt-mp3 id3v2 -y
```

Run `npm test` to run the tests.

#### Generating test mp3 files

```bash
# Create the mp3 file
sox -n -r 44100 -c 2 song.mp3 trim 0.0 0.0
id3v2 -g 20 -a "Test Artist" -A "Test Album" -t "Test Song" song.mp3
```
