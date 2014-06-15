'use strict';

var util = require('util');
var fsExtra = require('fs-extra');
var fs = require('graceful-fs');
var path = require('path');
var glob = require('glob');
var async = require('async');
var pace = require('pace')
var bytes = require('bytes');
var Mp3File = require('./Mp3File');

var opts = require('nomnom')
.option('source', {
  abbr: 's',
  metavar: 'DIR',
  help: 'Source directory',
  required: true,
  callback: function(dir) {
    if (!fs.existsSync(dir)) {
      return 'Source directory does not exist';
    }
  }
})
.option('destination', {
  abbr: 'd',
  metavar: 'DIR',
  help: 'Destination directory',
  required: true,
  callback: function(dir) {
    if (!fs.existsSync(dir)) {
      return 'Destination directory does not exist';
    }
  }
})
.option('logfile', {
  abbr: 'l',
  metavar: 'FILE',
  help: 'Log file',
  default: 'logs.json'
})
.option('dry-run', {
  abbr: 'r',
  flag: true,
  default: false,
  help: 'Do a dry run, no changes will be made, and no logs files will be generated'
})
.option('skip-unknowns', {
  abbr: 'u',
  flag: true,
  default: true,
  help: 'Skip processing the file if no id3 data can be read'
})
.option('format-filenames', {
  abbr: 'f',
  flag: true,
  default: true,
  help: 'Re-name the files to match the song name'
})
.option('overwrite', {
  abbr: 'o',
  flag: true,
  default: false,
  help: 'Overwrite the destination file if it exists'
})
.option('move', {
  abbr: 'm',
  flag: true,
  default: false,
  help: 'Move the files, instead of copying'
})
.option('quiet', {
  abbr: 'q',
  flag: true,
  default: false,
  help: 'Only output errors'
})
.option('version', {
  abbr: 'v',
  flag: true,
  help: 'Print version and exit',
  default: false,
  callback: function() {
     return 'version 0.0.1';
  }
});

// Parse the arguments
opts = opts.parse();

// Define globals
var dryRun = opts['dry-run'];
var logs = [];

function echo() {
  if (!opts.quiet) {
    console.log.apply(console, arguments);
  }
}

function exit(code, msg) {
  if (msg) echo(msg);
  process.exit(code);
}

function log(file, status, msg) {
  file.log = {
    status: status,
    msg: msg || ''
  };
}

function genlogs(files) {
  logs = files.map(function(file) {
    return {
      status: file.log.status,
      msg: file.log.msg,
      srcFile: file.filePath,
      destFile: file.destFile
    };
  })
}

function writelogs() {
  fs.writeFile(opts.logfile, JSON.stringify(logs, null, 2), function(err) {
    if(err) exit(1, 'Error writing log file! (' + opts.logfile + ') ' + err);
  });
}

function summary() {

  var errors = logs.filter(function(log){
    return (log.status === 'error');
  });
  var success = logs.filter(function(log){
    return (log.status === 'success');
  });

  echo('Copied:', success.length);
  echo('Skipped:', errors.length);

  if (errors.length) {
    echo(
      '!! There were %d errors while copying the files, please see %s for more information.',
      errors.length,
      opts.logfile
    );
  }
}

// Begin
echo('Finding files...\n');
glob('**/*.mp3', { cwd: opts.source }, function onFindFiles(err, found) {

  if (err) exit(1, err);

  var totalSize = 0;
  var barMsg = '%s :current of :total [:bar] :percent ETA: :etas';

  var progress = pace({
    total: found.length,
    showBurden: false,
    maxBurden: 0.5
  });

  var files = found.map(function(file) {
    return new Mp3File(
      path.join(opts.source, file),
      opts
    );
  });

  function processFile(file, next) {
    var action = opts.move ? 'move' : 'copy';
    async.series([
      function(next) {
        file.read(function(err) {
          if (err) log(file, 'error', err);
          if (file.fileSize) totalSize += file.fileSize;
          next();
        })
      },
      function(next) {
        file[action](opts.destination, function(err) {
          if (err) log(file, 'error', err);
          else log(file, 'success');
          progress.op();
          next();
        });
      }
    ], next);
  }

  async.waterfall([
    function processFiles(next) {
      async.eachLimit(files, 5, processFile, next);
    }
  ], function onProcessedAllFiles(err) {
    genlogs(files);
    writelogs();
    summary();
  });
});

// Handle interruptions
process.on('SIGINT', function() {
  summary();
  process.exit();
});
