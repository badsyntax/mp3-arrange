'use strict';

var expect = require('chai').expect;
var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var helpers = require('./helpers');
var Mp3File = require('../lib/Mp3File');

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

  it('Should read the file id3 metadata', function(next) {

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
      if (err) return next(err);

      expect(!!file.id3Data && !!file.fileSize).to.equal(true, 'fileSize and id3Data properties should exist on the file instance');
      expect(typeof file.fileSize).to.equal('number', 'The fileSize should exist on the file instance', file);
      expect(typeof file.id3Data).to.equal('object', 'The id3 data should exist on the file instance', file);

      if (file.id3Data) {
        expect(file.id3Data.title).to.equal('Test Title');
        expect(file.id3Data.album).to.equal('Test Album');
        expect(file.id3Data.artist).to.deep.equal(['Test Artist']);
        expect(file.id3Data.genre).to.deep.equal(['Alternative']);
      }
      next();
    });
  });

  it('Should escape and format filename paths', function() {
    var mp3File = new Mp3File(null, {
      'format-filenames': true
    });
    mp3File.id3Data = {
      title: '      Test Title',
      artist: [ 'Test  Artist      ' ],
      genre: [ 'Reggae/Dub' ]
    };
    var filename = mp3File.getDestFileName('.');
    expect(filename).to.equal('Reggae-Dub/Test  Artist/Uknown Abum/Test Title.mp3');
  });

  describe('Copy and move', function() {

    function copy(opts, destSong, next) {
      async.waterfall([
        function(next) {
          createMp3({
            filename: srcSongPath,
            genre: 20,
            artist: 'Test Artist',
            album: 'Test Album',
            title: 'Test Title',
            track: 1
          }, next);
        },
        function(next) {
          file = new Mp3File(srcSongPath, opts);
          file.read(next);
        },
        function(next) {
          file.process('copy', DEST_PATH, next);
        }
      ], function(err) {
        if (err) return next(err);
        var destPath = path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist',
          'Test Album',
          destSong
        );
        var exists = fs.existsSync(destPath);
        fs.removeSync(path.join(
          DEST_PATH,
          'Alternative'
        ));
        expect(exists).to.equal(true, 'Destination file does not exist: ', destPath, file);
        expect(!!file.destFile).to.equal(true);
        next();
      });
    }

    function move(opts, destSong, next) {
      async.waterfall([
        function(next) {
          createMp3({
            filename: srcSongPath,
            genre: 20,
            artist: 'Test Artist',
            album: 'Test Album',
            title: 'Test Title',
            track: 1
          }, next);
        },
        function(next) {
          file = new Mp3File(srcSongPath, opts);
          file.read(next);
        },
        function(next) {
          file.process('move', DEST_PATH, next);
        }
      ], function(err) {
        if (err) return next(err);
        var destPath = path.join(
          DEST_PATH,
          'Alternative',
          'Test Artist',
          'Test Album',
          destSong
        );
        var existsDest = fs.existsSync(destPath);
        fs.removeSync(path.join(
          DEST_PATH,
          'Alternative'
        ));
        expect(existsDest).to.equal(true);
        expect(!!file.destFile).to.equal(true);
        var existsSrc = fs.existsSync(srcSongPath);
        expect(existsSrc).to.equal(false);
        next();
      });
    }

    it('Should copy the file to the destination directory', function(next) {
      copy({}, song, next);
    });

    it('Should copy the file to the destination directory with formatted file names', function(next) {
      copy({
        'format-filenames': true
      }, '01 Test Title.mp3', next)
    });

    it('Should move the file to the destination directory', function(next) {
      move({}, song, next);
    });

    it('Should move the file to the destination directory with formatted file names', function(next) {
      move({
        'format-filenames': true
      }, '01 Test Title.mp3', next)
    });
  });
});
