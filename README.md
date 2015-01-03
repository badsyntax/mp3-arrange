# mp3-arrange  ![Build Status](https://api.travis-ci.org/badsyntax/mp3-arrange.svg?branch=master)

A simple script to arrange your music collection. Files will be copied in the format `Genre/Artist/Album/Song/`.

This script only works with `.mp3` files with valid id3 metadata.

### Installation

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
mp3-arrange -s /home/richard/Music -d /media/hdd1/music`
```

#### Usage notes

* Ensure you have write permissions on the destination directory.

### Development

Create a global bin link:

```bash
cd mp3-arrange
npm link
```

## Docker

* Ensure you have the latest version of boot2docker and virtualbox installed.
* You can only mount directories as volumes within your home folder.

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
