var async = require('async');
var spawn = require('child_process').spawn;

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
