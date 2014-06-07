/**
 * NOTE: ensure you have run `bin/setup` first.
 */
'use strict';

var spawn = require('child_process').spawn;
var async = require('async');
var fs = require('fs-extra');
var path = require('path');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

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

function createMp3(opts, done) {
  async.waterfall([
    function(next) {
      run('sox', [
        '-n', '-r', '44100',
        '-c', '2', opts.filename,
        'trim', '0.0', '0.0'
      ], next);
    },
    function(code, stderr, next) {
      run('id3v2', [
        '-g', opts.genre,
        '-a', opts.artist,
        '-A', opts.album,
        '-t', opts.song,
        opts.filename
      ], next);
    }
  ], function(err, code, stdout) {
    if (err || code !== 0) done(err || stdout);
    else done();
  });
}

describe('Options', function() {
  it('Should exit with code 1 if any of the required options are not supplied', function(done) {
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
});

describe('Dry run', function() {

  var song = 'song.mp3';

  afterEach(function() {
    fs.removeSync(path.join(SOURCE_PATH, song));
  });

  it('Should NOT copy the file when the dry run option is set', function(done) {

    async.waterfall([
      createMp3.bind(null, {
        filename: path.join(SOURCE_PATH, song),
        genre: 20,
        artist: 'Test Artist',
        album: 'Test Album'
      }),
      run.bind(null, 'bin/id3-arrange', [
        '-s', SOURCE_PATH,
        '-d', DEST_PATH,
        '--dry-run'
      ])
    ], function(err) {
      if (err) return done(err);
      var exists = fs.existsSync(path.join(
        DEST_PATH,
        'Alternative',
        'Test Artist',
        'Test Album',
        song
      ));
      expect(exists).toBe(false);
      done();
    });
  });
});

describe('Copy', function() {

  var song1 = 'song1.mp3';
  var song2 = 'song2.mp3';

  afterEach(function() {
    fs.removeSync(path.join(DEST_PATH, 'Alternative'));
    fs.removeSync(path.join(SOURCE_PATH, song1));
    fs.removeSync(path.join(SOURCE_PATH, song2));
  });

  it('Should copy the files in the correct directory format in the specified destination directory', function(done) {

    async.waterfall([
      createMp3.bind(null, {
        filename: path.join(SOURCE_PATH, song1),
        genre: 20,
        artist: 'Test Artist',
        album: 'Test Album'
      }),
      createMp3.bind(null, {
        filename: path.join(SOURCE_PATH, song2),
        genre: 20,
        artist: 'Test Artist 2',
        album: 'Test Album 2'
      }),
      run.bind(null, 'bin/id3-arrange', [
        '-s', SOURCE_PATH,
        '-d', DEST_PATH
      ])
    ], function(err) {
      if (err) return done(err);
      var exists1 = fs.existsSync(path.join(
        DEST_PATH,
        'Alternative',
        'Test Artist',
        'Test Album',
        song1
      ));
      expect(exists1).toBe(true);
      var exists2 = fs.existsSync(path.join(
        DEST_PATH,
        'Alternative',
        'Test Artist 2',
        'Test Album 2',
        song2
      ));
      expect(exists2).toBe(true);
      done();
    });
  });
});
