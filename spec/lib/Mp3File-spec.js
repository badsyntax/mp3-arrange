'use strict';

var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var helpers = require('../helpers');
var Mp3File = require('../../lib/Mp3File');

var SOURCE_PATH = 'spec/fixtures/source';
var DEST_PATH = 'spec/fixtures/dest';

var createMp3 = helpers.createMp3;

describe('Mp3File', function() {

  var file;
  var song = 'song.mp3';
  var srcSongPath = path.join(SOURCE_PATH, song);

  afterEach(function() {
    fs.removeSync(srcSongPath);
  });

  it('Should read the file id3 metadata', function(done) {
    async.waterfall([
      function(next) {
        createMp3({
          filename: srcSongPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album',
          title: 'Test Title'
        }, next);
      },
      function(next) {
        file = new Mp3File(srcSongPath);
        file.read(next);
      }
    ], function(err) {
      if (err) return done(err);

      expect(!!file.id3Data && !!file.fileSize).toBe(true, 'fileSize and id3Data properties should exist be truthy the file instance');
      expect(typeof file.fileSize).toBe('number', 'The fileSize should exist on the file instance', file);
      expect(typeof file.id3Data).toBe('object', 'The id3 data should exist on the file instance', file);

      if (file.id3Data) {
        expect(file.id3Data.title).toBe('Test Title');
        expect(file.id3Data.album).toBe('Test Album');
        expect(file.id3Data.artist).toEqual(['Test Artist']);
        expect(file.id3Data.genre).toEqual(['Alternative']);
      }
      done();
    });
  });

  it('Should copy the file to the destination directory', function(done) {
    async.waterfall([
      function(next) {
        createMp3({
          filename: srcSongPath,
          genre: 20,
          artist: 'Test Artist',
          album: 'Test Album',
          title: 'Test Title'
        }, next);
      },
      function(next) {
        file = new Mp3File(srcSongPath);
        file.read(next);
      },
      function(next) {
        file.copy(DEST_PATH, next);
      }
    ], function(err) {
      if (err) return done(err);
      var destPath = path.join(
        DEST_PATH,
        'Alternative',
        'Test Artist',
        'Test Album',
        song
      );
      var exists = fs.existsSync(destPath);
      fs.removeSync(path.join(
        DEST_PATH,
        'Alternative'
      ));
      expect(exists).toBe(true);
      expect(!!file.destFile).toBe(true);
      done();
    });
  });
});
