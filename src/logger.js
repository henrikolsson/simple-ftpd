"use strict";
var winston = require('winston');
var util = require('./util');

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
module.exports.clientInfo = function(client, s) {
  return logger.info("(" + util.clientInfo(client) + ") --> " + s);
};

module.exports.stream = {
  write: function(message){
    logger.info(message);
  }
};
