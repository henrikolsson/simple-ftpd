var config = require('./config');
var server = require('./server');
var passive = require('./passive');
var winston = require('winston');

function main() {
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {'timestamp':true,
                                           'level': 'debug',
                                           'prettyPrint': true,
                                           'colorize': true});

  // Remove trailing slash from all roots
  for (var i=0;i<config.users.length;i++) {
    if (config.users[i].root.endsWith("/")) {
      config.users[i].root = config.users[i].root.replace(/\/$/, "");
    }
  }

  passive.init();
  server.start();
}

main();
