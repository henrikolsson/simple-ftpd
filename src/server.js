"use strict";
var net = require('net');
var config = require('./config');
var util = require('./util');
var commands = require('./commands');
var logger = require('./logger');
var tls = require('tls');

var clients = [];
var clientCounter = 0;

function handleCommand (client, message) {
  logger.info("(" + util.clientInfo(client) + ") <-- " + message);
  var tokens = message.split(" ");
  var command = commands[tokens[0]];
  if (!command) {
    client.send("500 Syntax error, command unrecognized.");
    return;
  }

  var commandState = command.state || "AUTHENTICATED";
  if (command.parameters !== 'varargs' && command.parameters !== (tokens.length - 1)) {
    client.send("501 Syntax error in parameters or arguments.");
  } else if ((commandState !== "ANY") &&
             (commandState !== client.state)) {
    logger.info(client.state);
    client.send("530 Not logged in.");
  } else {
    var args;
    if (command.parameters === 'varargs') {
      args = [client].concat([tokens[0], tokens.slice(1)]);
    } else {
      args = [client].concat(tokens);
    }
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
                pwd: '/',
                send: function send(message) {
                  logger.info("(" + util.clientInfo(client) + ") --> " + message);
                  this.socket.write(message + "\r\n");
                }};
  clients.push(client);

  client.send("220 simple-ftpd 0.0.1");
  logger.info("client connected: " + util.clientInfo(client));

  socket.on('data', function (data) {
    var s = data.toString().trim();
    handleCommand(client, s);
  });

  socket.on('end', function () {
    logger.info("client disconnected: " + util.clientInfo(client));
    if (client.passiveHandler) {
      client.passiveHandler.end();
    }
    clients.splice(clients.indexOf(client), 1);
  });
}

module.exports.start = function() {
  if (config.implicitTLS) {
    var options = {
      key: config.privateKeyFile,
      cert: config.certificateFile
    };
    tls.createServer(options, socketHandler).listen(config.port);
    logger.info("Listening on " + config.port + " (tls)...");
  } else {
    net.createServer(socketHandler).listen(config.port);
    logger.info("Listening on " + config.port + "...");
  }
};

module.exports.handleCommand = handleCommand;
