var config = require('./config');
var passive = require('./passive');
var users = require('./users');
var winston = require('winston');

module.exports = {
  "USER": {
    state: "CONNECTED",
    handler: userHandler,
    parameters: 1
  },
  "PASS": {
    state: "AUTHENTICATING",
    handler: passHandler,
    parameters: 1
  },
  "PWD": {
    handler: function(client) {
      return "257 \"" + client.pwd + "\"";
    },
    parameters: 0
  },
  "SYST": {
    handler: function(client) {
      return "215 UNIX Type: L8";
    },
    parameters: 0
  },
  "PASV": {
    handler: pasvHandler,
    parameters: 0
  },
  "QUIT": {
    handler: function(client) {
      client.doClose = true;
      return "221 Service closing control connection.";
    },
    parameters: 0,
    state: "ANY"
  },
  "LIST": {
    handler: listHandler,
    parameters: 0
  },
  "TYPE": {
    handler: typeHandler,
    parameters: 1
  }
};

function typeHandler(client, command, type) {
  return "200 Command okay.";
}

function listHandler(client) {
  // FIXME: This is bad.
  client.send("150 Here comes the directory listing.");
  client.passiveHandler.use("drwx------    2 1000     1000           79 Dec 24 13:01 foo\r\ndrwx------    2 1001     1001           59 Dec 24 13:11 bar\r\n", function() {
    client.send("226 Directory send OK..");
  });
}

function userHandler(client, command, username) {
  var user = users.findUserByName(username);
  if (user !== null) {
    client.state = "AUTHENTICATING";
    client.user = user;
    return "331 User name okay, need password.";
  } else {
    return "530 Not logged in.";
  }
}

function passHandler(client, command, password) {
  if (client.user.password === password) {
    client.state = "AUTHENTICATED";
    return "230 User logged in, proceed.";
  } else {
    return "530 Not logged in.";
  }
}

function pasvHandler(client) {
  var passiveHandler = passive.allocatePassivePort();
  if (passiveHandler === null) {
    winston.warn("Unable to allocate passive port");
    client.doClose = true;
    return "421 Service not available";
  }
  var p1 = parseInt(passiveHandler.port / 256, 10);
  var p2 = passiveHandler.port % 256;
  client.passiveHandler = passiveHandler;
  return "227 Entering Passive Mode (" + config.passiveIp.replace(/\./g, ",") + ","+p1+","+p2+").";
}

module.exports.userHandler = userHandler;

