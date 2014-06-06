/**
 * NOTE: ensure you have run `bin/setup` first.
 */

var spawn = require('child_process').spawn;
var async = require('async');
var fs = require('fs-extra');
var path = require('path');

function run(cmd, args, done) {

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
}

function createMp3(song, done) {
  run('sox', [
    '-n', '-r', '44100',
    '-c', '2', song,
    'trim', '0.0', '0.0'
  ], function(err, code, stdout) {
    if (err || code !== 0) return done(err || stdout);
    run('id3v2', [
      '-g', '20',
      '-a', 'Test Artist',
      '-A', 'Test Album',
      '-t', 'Test Song',
      song
    ], done);
  });
}

describe('Options', function() {

  it('Should exit with code 1 if any of the required options are not suplied', function(done) {
    async.parallel([
      function(next) {
        run('bin/id3-arrange', [], function(err, code, stdout) {
          expect(code).toBe(1);
          next();
        });
      },
      function(next) {
        run('bin/id3-arrange', [
          '-s', 'none',
          '-d', 'none'
        ], function(err, code, stdout) {
          expect(code).toBe(1);
          next();
        });
      }
    ], done);
  });

  it('Should create the correct directory format', function(done) {

    var song = 'spec/fixtures/source/song.mp3';

    createMp3(song, function(err, code, stdout) {

      if (err || code !== 0) return done(err || stdout);

      run('bin/id3-arrange', [
        '-s', 'spec/fixtures/source',
        '-d', 'spec/fixtures/dest'
      ], function(err, code, stdout) {
        expect(code).toBe(0);
        var exists = fs.existsSync('spec/fixtures/dest/Alternative/Test Artist/Test Album/song.mp3');
        expect(exists).toBe(true);
        fs.removeSync('spec/fixtures/dest/Alternative');
        fs.removeSync(song);
        done();
      });
    });
  });
});
