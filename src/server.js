var net = require('net');
var config = require('./config');
var util = require('./util');
var commands = require('./commands');
var passive = require('./passive');
var winston = require('winston');
var tls = require('tls');
var fs = require('fs');

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

function socketHandler(socket) {
  var id = clientCounter++;
  var client = {"socket": socket,
                state: "CONNECTED",
                id: id,
                pwd: null,
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
    // FIXME: this isn't working right now
    //passive.freePassiveHandler(client.passiveHandler.port,
    //                           client.passiveHandler.server);
    clients.splice(clients.indexOf(client), 1);
  });
}

module.exports.start = function() {
  if (config.implicitTLS) {
    var options = {
      key: fs.readFileSync(config.privateKeyFile),
      cert: fs.readFileSync(config.certificateFile)
    };
    tls.createServer(options, socketHandler).listen(config.port);
    winston.info("Listening on " + config.port + " (tls)...");
  } else {
    net.createServer(socketHandler).listen(config.port);
    winston.info("Listening on " + config.port + "...");
  }
};

module.exports.handleCommand = handleCommand;
