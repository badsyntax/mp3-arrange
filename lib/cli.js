var pkg = require('../package');
var util = require('util');
var fs = require('fs-extra');
var path = require('path');

var glob = require('glob');
var async = require('async');
var bytes = require('bytes');
var numeral = require('numeral');
var opts = require('nomnom');

var Mp3File = require('./Mp3File');
var ProgressBar = require('./ProgressBar');

var args;
var logger;
var startTime = new Date();

opts
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
  default: 'mp3-arrange.log'
})
.option('dry-run', {
  abbr: 'r',
  flag: true,
  default: false,
  help: 'Do a dry run, no changes will be made, and no logs files will be generated'
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
  help: 'Move the files instead of copying'
})
.option('save-progress', {
  abbr: 'p',
  flag: true,
  default: false,
  help: 'Save (and resume) progress'
})
.option('dev', {
  abbr: 'e',
  flag: true,
  default: false,
  help: 'Dev mode (everything is slowed down)'
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
     return 'version ' + pkg.version;
  }
});

function echo() {
  if (!args.quiet) {
    process.stdout.write(util.format.apply(util, arguments));
  }
}

function exit(code, msg) {
  if (msg) echo(msg);
  process.exit(code);
}

function saveProgressToFile(logs) {
  var progress = {};
  logs.forEach(function(log) {
    progress[log.srcFile] = log;
  });
  var location = path.join(args.destination, 'mp3-tools.progress.json');
  fs.writeFileSync(location, JSON.stringify(progress, null, 2));
}

function showSummary(done) {

   var options = {
    from: startTime,
    until: new Date(),
    limit: Infinity,
    start: 0,
    order: 'desc',
    fields: ['level','fileSize','srcFile','destFile','message']
  };

  logger.query(options, function (err, logs) {

    if (err) throw err;
    if (args['save-progress']) saveProgressToFile(logs.file);

    var errors = logs.file.filter(function(log){
      return (log.level === 'error');
    });
    var success = logs.file.filter(function(log){
      return (log.level === 'success');
    });

    function getTotalFileSize(prev, cur) {
      return prev + cur.fileSize;
    }

    var sourceFileSize = logs.file.reduce(getTotalFileSize, 0);
    var errorsFileSize = errors.reduce(getTotalFileSize, 0);
    var successFileSize = success.reduce(getTotalFileSize, 0);

    echo('Copied: %d (%s)', success.length, bytes(successFileSize), '\n');
    echo('Skipped: %d (%s)', errors.length, bytes(errorsFileSize), '\n');
    echo('Source size: %s', bytes(sourceFileSize), '\n');
    echo('See %s for more information.', args.logfile, '\n');

    if (done) done();
    if (args.done) args.done();
  });
}

function processFiles(filesOnDisk, processedFiles) {

  var progressBar = new ProgressBar({
    total: filesOnDisk.length,
    size: 30,
    frequency: 100,
    quiet: args.quiet
  });

  var files = filesOnDisk.map(function(file) {
    return new Mp3File(
      path.join(args.source, file),
      args,
      logger
    );
  });

  function processFile(file, done) {
    if (args['save-progress'] && (file.filePath in processedFiles)) {
      progressBar.progress();
      var processed = processedFiles[file.filePath];
      logger.log(processed.level, processed.message, processed, done);
    } else {
      var action = args.move ? 'move' : 'copy';
      file.process(action, args.destination, function(err) {
        progressBar.progress();
        if (err) file.log('error', err, null, done);
        else file.log('success', 'Successfully ' + (args.move ? 'moved' : 'copied'), null, done);
      });
    }
  }

  // Handle interruptions during the copy process
  process.on('SIGINT', function() {
    progressBar.finish();
    showSummary(process.exit);
  });

  async.eachSeries(files,
    function devMode(file, done) {
      if (args.dev)
        setTimeout(processFile.bind(null, file, done), 420);
      else
        setImmediate(processFile.bind(null, file, done));
    },
    showSummary
  );
}

function promptContinueProgress(progressFile, done) {

  var _processedFiles;
  var processedFiles;

  try {
    _processedFiles = require(path.resolve(progressFile));
  } catch(e) {
    return done({});
  }

  var promptMsg = echo.bind(null,
    'Do you want to continue your progress? [Y/n] ');

  echo('NOTE: Found progress file at: %s', progressFile, '\n');
  echo('%d files have been processed.', Object.keys(_processedFiles).length, '\n');
  promptMsg();

  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', function (text) {
    text = String(text).trim().toLowerCase();
    if (!text || text === 'y') {
      processedFiles = _processedFiles;
      echo('Skipping processed files...', '\n');
    } else if (text !== 'n') {
      echo('Invalid option!\n');
      promptMsg();
      return;
    }
    process.stdin.pause();
    done(processedFiles || {});
  });
}

function readProgressFromFile(filesOnDisk, done) {
  var progressFile = path.join(args.destination, 'mp3-tools.progress.json');
  if (args['save-progress'] && fs.existsSync(progressFile)) {
    promptContinueProgress(progressFile, function(processedFiles) {
      done(null, filesOnDisk, processedFiles);
    });
  } else {
    done(null, filesOnDisk, {});
  }
}

function onFindFiles(err, filesOnDisk) {
  if (err) exit(1, err);
  if (!args.quiet) echo('done\n');
  async.waterfall([
    readProgressFromFile.bind(null, filesOnDisk),
    processFiles
  ]);
}

function start(argv, done) {

  args = opts.parse(argv);
  args.done = done;

  logger = require('./logger')(args.logfile);
  if (!args.quiet) {
    echo('\u001B[2J\u001B[0;0f'); // clear terminal
    echo('Finding files...');
  }
  glob('**/*.mp3', { cwd: args.source }, onFindFiles);
}

module.exports = start;
