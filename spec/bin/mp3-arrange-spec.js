/**
 * NOTE: ensure you have run `setup.sh` first.
 */
'use strict';

var expect = require('chai').expect;
var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var helpers = require('../helpers');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

var run = helpers.run;
var createMp3 = helpers.createMp3;

describe('bin', function() {

  afterEach(function() {
    fs.removeSync(path.join(DEST_PATH, 'Alternative'));
  });

  describe('Options validation', function() {
    it('Should exit with code 1 if any of the required options are not supplied', function(next) {
      async.parallel([
        function(next) {
          run('bin/mp3-arrange', [], function(err, code, stdout) {
            expect(code).to.equal(1);
            next();
          });
        },
        function(next) {
          run('bin/mp3-arrange', [
            '-s', 'none',
            '-d', 'none'
          ], function(err, code, stdout) {
            expect(code).to.equal(1);
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
        run.bind(null, 'bin/mp3-arrange', [
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
        expect(exists).to.equal(false);
        next();
      });
    });
  });

  describe('Copy and move', function() {

    var song1 = 'song1.mp3';
    var song2 = 'song2.mp3';

    afterEach(function() {
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
        run.bind(null, 'bin/mp3-arrange', [
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
        expect(exists1).to.equal(true);
        var exists2 = fs.existsSync(path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist 2',
          'Test Album 2',
          song2
        ));
        expect(exists2).to.equal(true);
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
        run.bind(null, 'bin/mp3-arrange', [
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
        expect(exists1).to.equal(true);
        var exists2 = fs.existsSync(path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist 2',
          'Test Album 2',
          song2
        ));
        expect(exists2).to.equal(true);

        var existsSrc1 = fs.existsSync(path.join(SOURCE_PATH, song1));
        expect(existsSrc1).to.equal(false);
        var existsSrc2 = fs.existsSync(path.join(SOURCE_PATH, song2));
        expect(existsSrc2).to.equal(false);
        next();
      });
    });
  });

  describe('Overwrite', function() {

    var song = 'song1.mp3';

    afterEach(function() {
      fs.removeSync(path.join(DEST_PATH, 'Alternative'));
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
        run.bind(null, 'bin/mp3-arrange', args)
      ], function(err) {
        next(err, changed);
      });
    }

    it('Should NOT overwrite the file if the overwrite option is not set', function(next) {
      isChanged(false, function(err, changed) {
        if (err) return next(err);
        expect(changed).to.equal(false);
        next();
      });
    });

    it('Should overwrite the file if the overwrite option is set', function(next) {
      isChanged(true, function(err, changed) {
        if (err) return next(err);
        expect(changed).to.equal(true);
        next();
      });
    });
  });

  describe('Quiet', function() {

    var song = 'song.mp3';
    var songPath = path.join(SOURCE_PATH, song);

    afterEach(function() {
      fs.removeSync(songPath);
    });

    it('Should not send any data to stdout when the quiet option is set', function(next) {
      async.waterfall([
        createMp3.bind(null, {
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album'
        }),
        run.bind(null, 'bin/mp3-arrange', [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '-q'
        ])
      ], function(err, code, stdout) {
        if (err) return next(err);
        expect(String(stdout).length).to.equal(0);
        next();
      });
    });
  });

  describe('Save progress', function() {
    it('Should save progress to a json log file in the destination directory', function(next) {
       async.series([
        helpers.createMp3s.bind(null, 4),
        run.bind(null, 'bin/mp3-arrange', [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '-p'
        ])
      ], function(err, results) {
        if (err) return next(err);

        var location = path.join(DEST_PATH, 'mp3-tools.progress.json');
        var exists = fs.existsSync(location);

        expect(exists).to.equal(true, 'The progress log file should exist at location: ' + location);

        var data = fs.readFileSync(location);
        try {
          data = JSON.parse(data);
        } catch(e){};

        expect(typeof data).to.equal('object', 'The progress data should be stored in JSON format');
        expect(Object.keys(data).length).to.equal(4, 'The progress array should contain all files');

        fs.removeSync(location);

        var songs = results[0];
        helpers.removeMp3s(songs);
        next();
      });
    });
  });
});
