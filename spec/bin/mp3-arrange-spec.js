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
          '--quiet'
        ])
      ], function(err, code, stdout) {
        if (err) return next(err);
        expect(String(stdout).length).to.equal(0);
        next();
      });
    });
  });
});
