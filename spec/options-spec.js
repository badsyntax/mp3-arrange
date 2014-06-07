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

      var args = [];
      if (opts.genre) args.push('-g', opts.genre);
      if (opts.artist) args.push('-a', opts.artist);
      if (opts.album) args.push('-A', opts.album);
      if (opts.title) args.push('-t', opts.title);
      args.push(opts.filename);

      run('id3v2', args, next);
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

describe('Overwrite', function() {

  var song = 'song1.mp3';

  afterEach(function() {
    fs.removeSync(path.join(DEST_PATH, 'Alternative'));
    fs.removeSync(path.join(SOURCE_PATH, song));
  });

  function isChanged(overwrite, done) {
    var changed = false;
    var args = [
      '-s', SOURCE_PATH,
      '-d', DEST_PATH,
    ];
    if (overwrite) args.push('-o');
    async.waterfall([
      createMp3.bind(null, {
        filename: path.join(SOURCE_PATH, song),
        genre: 20,
        artist: 'Test Artist',
        album: 'Test Album'
      }),
      function (next) {

        var songDir = path.join(DEST_PATH, 'Alternative', 'Test Artist', 'Test Album');
        var songPath = path.join(songDir, song);

        fs.mkdirpSync(songDir);

        createMp3({
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album'
        }, function(err) {
          if (err) return next(err);
          fs.watch(songPath, {
            persistent: false
          }, function(event, filename) {
            changed = true;
          });
          next();
        });
      },
      run.bind(null, 'bin/id3-arrange', args)
    ], function(err) {
      done(err, changed);
    });
  }

  it('Should NOT overwrite the file if the overwrite option is not set', function(done) {
    isChanged(false, function(err, changed) {
      if (err) return done(err);
      expect(changed).toBe(false);
      done();
    });
  });

  it('Should overwrite the file if the overwrite option is set', function(done) {
    isChanged(true, function(err, changed) {
      if (err) return done(err);
      expect(changed).toBe(true);
      done();
    });
  });
});
