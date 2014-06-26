var spawn = require('child_process').spawn;
var path = require('path');
var async = require('async');
var fs = require('fs-extra');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

var helpers = module.exports = {};

helpers.run = function(cmd, args, done) {

  var proc = spawn(cmd, args || []);
  var stdout = [];
  var stderr = [];

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  proc.stdout.on('data', function (data) {
    stdout.push(data);
  });
  proc.stderr.on('data', function (data) {
    stderr.push(data);
  });
  proc.on('close', function (code) {
    done(stderr.join(), code, stdout.join());
  });
};

helpers.createMp3 = function(opts, done) {
  async.waterfall([
    function(next) {
      run('sox', [
        '-n', '-r', '44100',
        '-c', '2', opts.filename,
        'trim', '0.0', '0.0'
      ], next);
    },
    function(code, stderr, next) {

      var args = [];
      if (opts.genre) args.push('-g', opts.genre);
      if (opts.artist) args.push('-a', opts.artist);
      if (opts.album) args.push('-A', opts.album);
      if (opts.title) args.push('-t', opts.title);
      if (opts.track) args.push('-T', opts.track);
      args.push(opts.filename);

      run('id3v2', args, next);
    }
  ], function(err, code, stdout) {
    if (err || code !== 0) done(err || stdout);
    else done();
  });
};

helpers.createMp3s = function(amount, done) {

  var mp3s = [];
  var create = [];

  for(var i = 1; i <= amount; i++) {

    var data = {
      filename: path.join(SOURCE_PATH, 'song'+i+'.mp3'),
      genre: 20,
      artist: 'Test Artist',
      album: 'Test Album'
    };

    mp3s.push(data);
    create.push(helpers.createMp3.bind(null, data));
  }

  async.parallel(create, function(err) {
    if (err) return done(err);
    done(null, mp3s);
  });
};

helpers.removeMp3s = function(mp3s) {
  mp3s.forEach(function(mp3) {
    fs.removeSync(mp3.filename);
  });
}
