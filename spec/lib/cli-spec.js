// /**
//  * NOTE: ensure you have run `setup.sh` first.
//  */
// 'use strict';

// var expect = require('chai').expect;
// var async = require('async');
// var fs = require('fs-extra');
// var path = require('path');
// var helpers = require('../helpers');
// var cli = require('../../lib/cli');

// var SOURCE_PATH = 'spec/fixtures/source';
// var DEST_PATH = 'spec/fixtures/dest';

// var run = helpers.run;
// var createMp3 = helpers.createMp3;

// describe('bin', function() {

//   afterEach(function() {
//     fs.removeSync(path.join(DEST_PATH, 'Alternative'));
//   });

//   describe('Dry run', function() {

//     console.log('DRY RUN');
//     // console.log(cli);
//     try {
//       cli([
//         '--source', 'mp3_src',
//         '--dry-run'
//       ]);
//     } catch(e) {
//       console.log('ERROR');
//     }
//   });
// });
