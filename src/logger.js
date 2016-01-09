var winston = require('winston');

winston.emitErrs = true;

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      json: false,
      handleExceptions: false,
      colorize: true,
      prettyPrint: true,
      timestamp: true
    })
  ],
  exitOnError: false
});

module.exports = logger;
module.exports.stream = {
  write: function(message, encoding){
    logger.info(message);
  }
};
