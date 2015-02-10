var pkg = require('./package');
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
  if (!opts.quiet) {
    process.stdout.write(util.format.apply(util, arguments));
  }
}

function exit(code, msg) {
  if (msg) echo(msg);
  process.exit(code);
}

function saveProgressToFile(logs) {
  var progress = {}
  logs.forEach(function(log) {
    progress[log.srcFile] = log;
  });
  // Here we should merge the json file with the progress json instead
  // of over-writing it.
  var location = path.join(opts.destination, 'mp3-tools.progress.json');
  fs.writeFileSync(location, JSON.stringify(progress, null, 2));
}

function showSummary(done) {

   var options = {
    from: startTime,
    until: new Date,
    limit: Infinity,
    start: 0,
    order: 'desc',
    fields: ['level','fileSize','srcFile','destFile','message']
  };

  logger.query(options, function (err, logs) {

    if (err) throw err;
    if (opts['save-progress']) saveProgressToFile(logs.file);

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
    echo('See %s for more information.', opts.logfile, '\n');

    if (done) done();
  });
}

function processFiles(found, processedFiles) {

  var progressBar = new ProgressBar({
    total: found.length,
    size: 30,
    frequency: 100,
    quiet: opts.quiet
  });

  var files = found.map(function(file) {
    return new Mp3File(
      path.join(opts.source, file),
      opts,
      logger
    );
  });

  function processFile(file, done) {
    // console.log('PROCSEED FILES', processedFiles);
    if (opts['save-progress'] && (file.filePath in processedFiles)) {
      progressBar.progress();
      var processed = processedFiles[file.filePath];
      logger.log(processed.level, processed.message, processed, done);
    } else {
      var action = opts.move ? 'move' : 'copy';
      file.process(action, opts.destination, function(err) {
        progressBar.progress();
        if (err) file.log('error', err, null, done);
        else file.log('success', 'Successfully ' + (opts.move ? 'moved' : 'copied'), null, done);
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
      if (opts.dev) setTimeout(processFile.bind(null, file, done), 420);
      else processFile(file, done)
    },
    showSummary
  );
}

function getProcessedFiles(progressFile, done) {

  var processedFiles = {};
  var promptMsg = echo.bind(null,
    'Do you want to want to continue your progress? [Y/n] ');

  echo('\nNOTE: Found progress file at: %s', progressFile, '\n');
  promptMsg();
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', function (text) {
    text = String(text).trim().toLowerCase();
    if (!text || text === 'y') {
      try {
        processedFiles = require(path.resolve(progressFile));
        echo('Skipping processed files', '\n');
      } catch(e) {};
    } else if (text !== 'n') {
      echo('Invalid option!\n')
      promptMsg();
      return;
    }
    process.stdin.pause();
    done(processedFiles);
  });
}

function readProgressFromFile(allFiles, done) {
  var progressFile = path.join(opts.destination, 'mp3-tools.progress.json');
  if (opts['save-progress'] && fs.existsSync(progressFile)) {
    getProcessedFiles(progressFile, function(processedFiles) {
      done(null, allFiles, processedFiles);
    });
  } else {
    done(null, allFiles, {})
  }
}

function onFindFiles(err, found) {
  if (err) exit(1, err);
  if (!opts.quiet) echo('done\n');
  async.waterfall([
    readProgressFromFile.bind(null, found),
    processFiles
  ]);
}

function start() {

  // Parse the arguments
  opts = opts.parse();

  // Init the logger
  logger = require('./logger')(opts.logfile);

  if (!opts.quiet) {
    echo('\u001B[2J\u001B[0;0f'); // clear terminal
    echo('Finding files...');
  }

  // Find the source files
  glob('**/*.mp3', { cwd: opts.source }, onFindFiles);
}

/***********
 * BEGIN
 ***********/
start();