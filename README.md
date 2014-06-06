## Generating test mp3 files

```bash
# Install id3v2 and sox
sudo apt-get install sox libsox-fmt-mp3 id3v2-y
```

```bash
# Create the mp3 file
sox -n -r 44100 -c 2 song.mp3 trim 0.0 0.0
id3v2 -g 20 -a "Test Artist" -A "Test Album" -t "Test Song" song.mp3
```