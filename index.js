// Load deps.
var util = require('util');
var fs = require('fs-extra');
var path = require('path');
var glob = require('glob');
var async = require('async');
var mm = require('musicmetadata');

// Define the script arguments.
var opts = require("nomnom")
.option('source', {
  abbr: 's',
  metavar: 'DIR',
  help: 'Source directory.',
  required: true,
  callback: function(dir) {
    if (!fs.existsSync(dir)) {
      return 'Source directory does not exist.'
    }
  }
})
.option('destination', {
  abbr: 'd',
  metavar: 'DIR',
  help: 'Destination directory.',
  required: true,
  callback: function(dir) {
    if (!fs.existsSync(dir)) {
      return 'Destination directory does not exist.'
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
  help: 'Do a dry run, no changes will be made, and no logs files will be generated.'
})
.option('skip-unknowns', {
  abbr: 'u',
  flag: true,
  default: true,
  help: 'Skip processing the file if no id3 data can be read.'
})
.option('format-filenames', {
  abbr: 'f',
  flag: true,
  default: true,
  help: 'Re-name the files to match the song name.'
})
.option('overwrite', {
  abbr: 'o',
  flag: true,
  default: false,
  help: 'Overwrite the destination file if it exists'
})
.option('version', {
  abbr: 'v',
  flag: true,
  help: 'Print version and exit.',
  default: false,
  callback: function() {
     return 'version 0.0.1';
  }
});

// Parse the arguments.
opts = opts.parse();

// Define globals.
var dryRun = opts['dry-run'];
var processed = {};

if (dryRun) {
  console.log('');
  console.log('*********************************');
  console.log('**           DRY RUN           **');
  console.log('*********************************');
  console.log('');
}

/**
 * Print an exit message and exit the process with the specified code.
 * @param  {Number} code Exit code.
 * @param  {String} msg  Message.
 */
function exit(code, msg) {
  code = parseInt(code, 10) || 1;
  if (msg) console.log(msg);
  process.exit(code);
}

/**
 * Generate and return the destination file name.
 * @param  {String} file    The source filename.
 * @param  {Object} id3data The id3 data.
 * @return {String}         The destination file name.
 */
function getDestFileName(file, id3data) {

  var genre = id3data.genre[0] || 'Unknown Genre';
  var artist = id3data.artist[0] || 'Unknown Artist';
  var album = id3data.album || 'Uknown Abum';

  var destDir = path.resolve(opts.destination, genre, artist, album);

  // Default track name.
  var destTrackName = path.basename(file);
  var hasTrackData = (id3data.title && id3data.track && id3data.track.no && id3data.track.of);

  if (opts['format-filenames'] && hasTrackData) {
    // add leading zeros
    var trackNo = ('00' + parseInt(id3data.track.no)).slice(-2);
    // eg: 04 My Track.mp3
    destTrackName = util.format('%s %s.mp3', trackNo, id3data.title);
  }

  // Full path to file.
  var destFile = path.resolve(destDir, destTrackName);

  return destFile;
}

/**
 * Copy the source file to the destination file.
 * @param  {String}   file    The source filename.
 * @param  {Object}   id3data The id3 data.
 * @param  {Function} next    Done callback.
 */
function copyFile(file, id3data, next) {

  var sourceFile = path.resolve(opts.source, file);
  var destFile = getDestFileName(file, id3data);

  fs.exists(destFile, function (exists) {
    if (!exists || opts.overwrite) {
      if (!dryRun) {
        fs.copy(sourceFile, destFile, function onCopy(err) {
          next(err, destFile);
        });
      } else {
        next(null, destFile);
      }
    } else {
      next('File already exists', destFile);
    }
  });
}

/**
 * Process a file: read the id3 data and copy it to the new destination.
 * @param  {Arra}   files The array of all files to process.
 * @param  {ProgressBar}   bar   A ProgressBar instance.
 * @param  {String}   file  The source filename
 * @param  {Function} next  Done callback.
 */
function processFile(files, bar, file, next) {

  processed[file] = { status: 'success' };

  var stream = fs.createReadStream(path.join(opts.source, file));
  var parser = mm(stream);

  parser.on('metadata', onFileMetadata);
  parser.on('done', onDone);

  /**
   * Event handler: on successful read of id3 data.
   * @param  {Object} id3data The id3 data.
   */
  function onFileMetadata(id3data) {
    // Skip unknown tracks
    if (opts['skip-unknowns'] && !id3data.genre[0] && !id3data.artist[0] && !id3data.album) {
      bar.tick();
      processed[file] = {
        status: 'error',
        errorMsg: 'Skipped unknown track: missing genre, artist & album id3 data'
      }
      next();
    }
    // Attempt to copy the file
    else {
      copyFile(file, id3data, function onCopyFile(err, destFileName) {
        bar.tick();
        processed[file].destination = destFileName;
        if (err) {
          processed[file] = {
            status: 'error',
            errorMsg: 'Error copying file. ' + err,
            destination: destFileName
          }
        }
        next();
      });
    }
  }

  /**
   * Event handler: called when the parser has completed.
   * @param  {String} err Error string.
   */
  function onDone(err) {
    stream.destroy();
    if (err) {
      bar.tick();
      processed[file] = {
        status: 'error',
        errorMsg: 'Unable to process id3 metadata. ' + err
      };
      next();
    }
  }
}

/**
 * Write processed data to a log file.
 */
function writeToLogs() {
  console.log('\nWriting to logfile:', opts.logfile);
  if (!dryRun) {
    fs.writeFile(opts.logfile, JSON.stringify(processed, null, 4), function(err) {
      if(err) exit(1, 'Error writing log file! (' + opts.logfile + ') ' + err);
    });
  }
}

/**
 * Show a summary of the processed data.
 */
function showSummary() {

  var errors = Object.keys(processed).filter(function(key) {
    return processed[key].status === 'error';
  });
  var successful = Object.keys(processed).filter(function(key) {
    return processed[key].status === 'success';
  });

  console.log('Processed: ', successful.length);
  console.log('Skipped: ', errors.length);

  if (errors.length) {
    console.log('\nThe following files were skipped due to errors:\n');
    errors.forEach(function(key) {
      console.log(util.format('* %s (%s)', key, processed[key].errorMsg));
    });
  }
}

/**
 * Print logs to stdout.
 */
function showLogs() {
  console.log('')
  console.log(JSON.stringify(processed, null, 2));
}

/**
 * Show a special dry-run summary.
 */
function showDryRunSummary() {
  showLogs();
}

/**
 * Event handler: called when all files have been processed.
 * @param  {String} err The error string.
 */
function onProcessedAllFiles(err) {
  if (opts.logfile) {
    writeToLogs();
  }
  showSummary();
  if (dryRun) {
    showDryRunSummary();
  }
}

/**
 * Event handler: called when all valid files have been found.
 * @param  {String} err   The error handler.
 * @param  {Array} files The array of files.
 * @return {[type]}       [description]
 */
function onFindFiles(err, files) {
  if (err) exit(1, err);

  var ProgressBar = require('progress');
  var bar = new ProgressBar('Processing :current of :total files [:bar] :percent ETA: :etas', {
    total: files.length
  });

  async.each(files, processFile.bind(null, files, bar), onProcessedAllFiles);
}

// Begin!
glob("**/*.mp3", { cwd: path.resolve(opts.source) }, onFindFiles);

// Handle interruptions
process.on('SIGINT', function() {
  writeToLogs();
  process.exit();
});
