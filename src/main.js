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

  // Ensure trailing slash on all roots
  for (var i=0;i<config.users.length;i++) {
    if (config.users[i].root.endsWith("/")) {
      if (!config.users[i].root.endsWith("/")) {
        config.users[i].root = config.users[i].root + "/";
      }
    }
  }

  passive.init();
  server.start();
}

main();
