var winston = require('winston');
var fs = require('fs-extra');

module.exports = function(logFile) {

  var logger = new (winston.Logger)({
    levels: {
      debug: 0,
      verbose: 1,
      info: 2,
      warn: 3,
      error: 4,
      success: 5
    }
  });

  fs.removeSync(logFile);
  logger.add(winston.transports.File, {
    filename: logFile,
  });

  return logger;
};
