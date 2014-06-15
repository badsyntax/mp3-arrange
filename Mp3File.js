var fs = require('fs');
var fsExtra = require('fs-extra');
var path = require('path');
var mm = require('musicmetadata');
var async = require('async');
var util = require('util');

var Mp3File = module.exports = function(filePath, opts) {
  this.filePath = filePath;
  this.opts = opts || {};
  this.id3Data = null;
  this.fileSize = null;
};

Mp3File.prototype.read = function(done) {
  async.waterfall([
    this.readFileSize.bind(this),
    this.readMetadata.bind(this)
  ], done);
};

Mp3File.prototype.readFileSize = function(done) {
  fs.stat(this.filePath, function(err, stat) {
    if (err) return done(err);
    this.fileSize = stat.size;
    done();
  }.bind(this));
};

Mp3File.prototype.readMetadata = function(done) {

  if (this.opts['dry-run']) return done();

  var stream = fs.createReadStream(this.filePath);
  var parser = mm(stream);

  parser.on('metadata', function(data) {
    this.id3Data = data;
    done();
  }.bind(this));

  parser.on('done', function(err) {
    stream.destroy();
    if (err) done(err);
  });
};

Mp3File.prototype.copy = function(destination, done) {
  if (!this.id3Data) return done('No file metadata');
  var destFile = this.destFile = this.getDestFileName(destination);

  fs.exists(destFile, function (exists) {
    if (exists && !this.opts.overwrite) {
      return done('File already exists', destFile);
    }
    if (this.opts['dry-run']) {
      return done(null, destFile);
    }
    fsExtra.copy(this.filePath, destFile, function onCopy(err) {
      done(err, destFile);
    });
  }.bind(this));
};

Mp3File.prototype.move = function(destination, done) {
  if (!this.id3Data) return done('No file metadata');
  var destFile = this.destFile = this.getDestFileName(destination);

  fs.exists(destFile, function (exists) {
    if (exists && !this.opts.overwrite) {
      fsExtra.remove(this.filePath, done);
    }
    if (this.opts['dry-run']) {
      return done(null, destFile);
    }
    fsExtra.move(this.filePath, destFile, function onCopy(err) {
      done(err, destFile);
    });
  }.bind(this));
};

Mp3File.prototype.getDestFileName = function(destination) {

  var genre = this.id3Data.genre[0] || 'Unknown Genre';
  var artist = this.id3Data.artist[0] || 'Unknown Artist';
  var album = this.id3Data.album || 'Uknown Abum';

  var destDir = path.resolve(destination, genre, artist, album);

  // Default track name.
  var destTrackName = path.basename(this.filePath);
  var hasTrackData = (this.id3Data.track && this.id3Data.track.no);

  if (this.opts['format-filenames'] && this.id3Data.title) {
    // add leading zeros
    var trackNo = hasTrackData ? (('00' + parseInt(this.id3Data.track.no)).slice(-2) + ' ') : '';
    // eg: 04 My Track.mp3
    destTrackName = util.format('%s%s.mp3', trackNo, this.id3Data.title);
  }

  // Full path to file.
  var destFile = path.join(destDir, destTrackName);

  return destFile;
};
