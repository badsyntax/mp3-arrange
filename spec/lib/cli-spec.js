/**
 * NOTE: ensure you have run `setup.sh` first.
 */
'use strict';

var expect = require('chai').expect;
var async = require('async');
var fs = require('fs-extra');
var path = require('path');
var helpers = require('../helpers');
var cli = require('../../lib/cli');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

var run = helpers.run;
var createMp3 = helpers.createMp3;

describe('cli', function() {

  afterEach(function() {
    fs.removeSync(path.join(DEST_PATH, 'Alternative'));
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
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--dry-run',
          '--quiet'
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

  describe('Log file location', function() {

    var song = 'song.mp3';
    var songPath = path.join(SOURCE_PATH, song);

    afterEach(function() {
      fs.removeSync(songPath);
    });

    function checkLogFile(filename, done) {

      var opts = [
        '-s', SOURCE_PATH,
        '-d', DEST_PATH,
        '--quiet'
      ];

      if (filename) {
        opts.push('--logfile');
        opts.push(filename);
      }

      async.waterfall([
        createMp3.bind(null, {
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album'
        }),
        cli.bind(null, opts)
      ], done);
    }

    it('Should write logs to the default file', function(next) {
      var filename = 'mp3-arrange.log';
      checkLogFile(filename, function(err) {
        if (err) return next(err);
        var exists = fs.existsSync(filename);
        expect(exists).to.equal(true);
        next();
      });
    });

    it('Should write logs to a specified log file', function(next) {
      var filename = '/tmp/mp3logfile.log';
      checkLogFile(filename, function(err) {
        if (err) return next(err);
        var exists = fs.existsSync(filename);
        expect(exists).to.equal(true);
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
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--quiet'
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
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--move',
          '--quiet'
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

  describe('Format filenames', function() {

    var song = 'song.mp3';
    var songPath = path.join(SOURCE_PATH, song);

    afterEach(function() {
      fs.removeSync(songPath);
    });

    it('Should rename the filename to be in format of "01 Track Title.mp3"', function(next) {
      async.waterfall([
        createMp3.bind(null, {
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album',
          title:' Track Title',
          track: 2
        }),
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--format-filenames',
          '--quiet'
        ])
      ], function(err) {
        if (err) return next(err);
        var exists = fs.existsSync(path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist',
          'Test Album',
          '02 Track Title.mp3'
        ));
        expect(exists).to.equal(true);
        next();
      });
    });

    it('Should rename the filename to be in format of "Track Title.mp3" if no track information is found', function(next) {
      async.waterfall([
        createMp3.bind(null, {
          filename: songPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album',
          title:' Track Title'
        }),
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '--format-filenames',
          '--quiet'
        ])
      ], function(err) {
        if (err) return next(err);
        var exists = fs.existsSync(path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist',
          'Test Album',
          'Track Title.mp3'
        ));
        expect(exists).to.equal(true);
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
        '--quiet'
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
        cli.bind(null, args)
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

  describe('Save progress', function() {
    it('Should save progress to a json log file in the destination directory', function(next) {
       async.series([
        helpers.createMp3s.bind(null, 4),
        cli.bind(null, [
          '-s', SOURCE_PATH,
          '-d', DEST_PATH,
          '-p',
          '--quiet'
        ])
      ], function(err, results) {
        if (err) return next(err);

        var location = path.join(DEST_PATH, 'mp3-tools.progress.json');
        var exists = fs.existsSync(location);

        expect(exists).to.equal(true, 'The progress log file should exist at location: ' + location);

        var data = fs.readFileSync(location);
        try {
          data = JSON.parse(data);
        } catch(e){}

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
