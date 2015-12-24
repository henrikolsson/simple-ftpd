var server = require('./server');
var passive = require('./passive');
var winston = require('winston');

function main() {
  winston.remove(winston.transports.Console);
  winston.add(winston.transports.Console, {'timestamp':true,
                                           'level': 'debug',
                                           'prettyPrint': true,
                                           'colorize': true});

  passive.init();
  server.start();
}

main();
