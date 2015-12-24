var net = require('net');
var config = require('./config');
var util = require('./util');
var commands = require('./commands');
var passive = require('./passive');
var winston = require('winston');

var clients = [];
var clientCounter = 0;

function handleCommand (client, message) {
  winston.info("(" + util.clientInfo(client) + ") <-- " + message);
  var tokens = message.split(" ");
  var command = commands[tokens[0]];
  if (!command) {
    client.send("500 Syntax error, command unrecognized.");
    return;
  }

  var commandState = command.state || "AUTHENTICATED";
  if (command.parameters !== (tokens.length - 1)) {
    client.send("501 Syntax error in parameters or arguments.");
  } else if ((commandState !== "ANY") &&
             (commandState !== client.state)) {
    winston.info(client.state);
    client.send("530 Not logged in.");
  } else {
    var args = [client].concat(tokens);
    var resp = command.handler.apply(undefined, args);
    if (resp) {
      client.send(resp);
    }
    if (client.doClose) {
      client.socket.end();
    }
  }
}

module.exports.start = function() {
  net.createServer(function (socket) {
    var id = clientCounter++;
    var client = {"socket": socket,
                  state: "CONNECTED",
                  id: id,
                  pwd: "/",
                  send: function send(message) {
                    winston.info("(" + util.clientInfo(client) + ") --> " + message);
                    this.socket.write(message + "\r\n");
                  }};
    clients.push(client);

    client.send("220 simple-ftpd 0.0.1");
    winston.info("client connected: " + util.clientInfo(client));

    socket.on('data', function (data) {
      var s = data.toString().trim();
      handleCommand(client, s);
    });

    socket.on('end', function () {
      winston.info("client disconnected: " + util.clientInfo(client));
      if (client.passiveHandler) {
        passive.freePassiveHandler(client.passiveHandler);
      }
      clients.splice(clients.indexOf(client), 1);
    });

  }).listen(config.port);

  winston.info("Listening on " + config.port + "...");
};

module.exports.handleCommand = handleCommand;
