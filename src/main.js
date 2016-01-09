"use strict";
var config = require('./config');
var server = require('./server');
var passive = require('./passive');
var logger = require('./logger');
var chroot = require('chroot');
var fs = require('fs');

function main() {
  process.on('uncaughtException', function(err) {
    console.info("uncaught error", err, err.stack.split("\n"));
    process.exit(1);
  });

  logger.info("starting up...");
  if (config.implicitTLS) {
    config.privateKeyFile = fs.readFileSync(config.privateKeyFile);
    config.certificateFile = fs.readFileSync(config.certificateFile);
  }
  logger.info("initializing passive handler...");
  passive.init();
  logger.info("starting server...");
  server.start();
  logger.info('dropping privileges and changing root to: ' + config.root);
  chroot(config.root, config.user, config.group);

}
main();
