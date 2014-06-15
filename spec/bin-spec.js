/**
 * NOTE: ensure you have run `setup.sh` first.
 */
'use strict';

var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var helpers = require('./helpers');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

var run = helpers.run;
var createMp3 = helpers.createMp3;

describe('bin', function() {
  describe('Options', function() {
    it('Should exit with code 1 if any of the required options are not supplied', function(next) {
      async.parallel([
        function(next) {
          run('id3-arrange', [], function(err, code, stdout) {
            expect(code).toBe(1);
            next();
          });
        },
        function(next) {
          run('id3-arrange', [
            '-s', 'none',
            '-d', 'none'
          ], function(err, code, stdout) {
            expect(code).toBe(1);
            next();
          });
        }
      ], next);
    });
  });

  describe('Dry run', function() {

    var song = 'song.mp3';
    var songPath = path.join(SOURCE_PATH, song);

    afterEach(function() {
      fs.removeSync(songPath);
    });

    it('Should NOT copy the file when the dry run option is set', function(next) {
      async.waterfall([
        createMp3.bind(null, {
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album'
        }),
        run.bind(null, 'id3-arrange', [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--dry-run'
        ])
      ], function(err) {
        if (err) return next(err);
        var exists = fs.existsSync(path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist',
          'Test Album',
          song
        ));
        expect(exists).toBe(false);
        next();
      });
    });
  });

  describe('Copy and move', function() {

    var song1 = 'song1.mp3';
    var song2 = 'song2.mp3';

    afterEach(function() {
      fs.removeSync(path.join(DEST_PATH, 'Alternative'));
      fs.removeSync(path.join(SOURCE_PATH, song1));
      fs.removeSync(path.join(SOURCE_PATH, song2));
    });

    it('Should copy the files to the specified destination directory', function(next) {
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
        run.bind(null, 'id3-arrange', [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH
        ])
      ], function(err) {
        if (err) return next(err);
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
        next();
      });
    });

    it('Should move the files to the specified destination directory', function(next) {
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
        run.bind(null, 'id3-arrange', [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--move'
        ])
      ], function(err) {
        if (err) return next(err);
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

        var existsSrc1 = fs.existsSync(path.join(SOURCE_PATH, song1));
        expect(existsSrc1).toBe(false);
        var existsSrc2 = fs.existsSync(path.join(SOURCE_PATH, song2));
        expect(existsSrc2).toBe(false);
        next();
      });
    });
  });

  describe('Overwrite', function() {

    var song = 'song1.mp3';

    afterEach(function() {
      fs.removeSync(path.join(DEST_PATH, 'Alternative'));
      fs.removeSync(path.join(SOURCE_PATH, song));
    });

    function isChanged(overwrite, next) {
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
        run.bind(null, 'id3-arrange', args)
      ], function(err) {
        next(err, changed);
      });
    }

    it('Should NOT overwrite the file if the overwrite option is not set', function(next) {
      isChanged(false, function(err, changed) {
        if (err) return next(err);
        expect(changed).toBe(false);
        next();
      });
    });

    it('Should overwrite the file if the overwrite option is set', function(next) {
      isChanged(true, function(err, changed) {
        if (err) return next(err);
        expect(changed).toBe(true);
        next();
      });
    });
  });
});