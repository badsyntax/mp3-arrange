# id3-arrange

A simple script to arrange your music collection. Files will be copied in the format `Genre/Artist/Album/Song/`.

This script only works with `.mp3` files with valid id3 metadata.

## Installation

`sudo npm install -g id3-arrange`

## Usage

```
Usage: id3-arrange [options]

Options:
   -s DIR, --source DIR        Source directory.
   -d DIR, --destination DIR   Destination directory.
   -l FILE, --logfile FILE     Log file  [logs.json]
   -r, --dry-run               Do a dry run, no changes will be made, and no logs files will be generated.  [false]
   -u, --skip-unknowns         Skip processing the file if no id3 data can be read.  [true]
   -f, --format-filenames      Re-name the files to match the song name.  [true]
   -o, --overwrite             Overwrite the destination file if it exists  [false]
   -v, --version               Print version and exit.  [false]
```

### Example usage:

```bash
# Copy files to a directory
id3-arrange -s /home/richard/Music -d /media/hdd1/music`
```

### Usage notes

* Ensure you have write permissions on the destination directory.

## Development

Create a global bin link:

```bash
cd id3-arrange
npm link
```

## Testing

Test files can be found in the `spec/` folder.

Run `npm test` to run the tests.

### Generating test mp3 files

```bash
# Install id3v2 and sox
sudo apt-get install sox libsox-fmt-mp3 id3v2 -y
```

```bash
# Create the mp3 file
sox -n -r 44100 -c 2 song.mp3 trim 0.0 0.0
id3v2 -g 20 -a "Test Artist" -A "Test Album" -t "Test Song" song.mp3
```
