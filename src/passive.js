var net = require('net');
var config = require('./config');
var passivePorts = [];
var logger = require('./logger');
var Promise = require("bluebird");
var fs = require('fs');
var tls = require('tls');

function applyQueue(queue, client) {
  logger.info("sending... client: " + client);
  var l = queue.length;
  for (var i=0;i<l;i++) {
    queued = queue[i];
    client.write(queued.data);
    client.end();
    queued.resolve();
  }
  return l > 0;
}

function getSocketHandler() {
  var client = null;
  var queue = [];
  return {
    send: function(data) {
      var promise = new Promise(function(resolve, reject) {
        queue.push({data: data,
                    resolve: resolve,
                    reject: reject});
      });
      if (client !== null) {
        applyQueue(queue, client);
        //freePassiveHandler(port, server);
      }
      return promise;
    },
    handler: function(socket) {
      client = socket;

      logger.info("passive client connected");
      if (applyQueue(queue, client)) {
        //freePassiveHandler(port, server);
      }

      socket.on('data', function (data) {
        var s = data.toString().trim();
        console.log(s);
      });

      socket.on('end', function () {
        logger.info("passive client disconnected");
      });
    }
  };
};

// FIXME: This could should be cleaned up
function createPassiveHandler(client, port) {
  var server;
  var protectionLevel = client.protectionLevel || 'C';

  var socketHandler = getSocketHandler();
    if (protectionLevel == 'C') {
    server = net.createServer(socketHandler.handler).listen(port);
  } else {
    // TODO: Can the rest of the levels be assumed to use TLS?
    var options = {
      key: config.privateKeyFile,
      cert: config.certificateFile
    };
    server = tls.createServer(options, socketHandler.handler).listen(port);
  }

  var handler = {
    use: function(data) {
      return socketHandler.send(data);
    },
    port: port
  };
  return handler;
}

module.exports.init = function() {
  for (var i=config.passivePortMin;i<=config.passivePortMax;i++) {
    passivePorts.push({"port": i, "state": "FREE"});
  }
};

module.exports.allocatePassivePort = function(client) {
  for (var i=0;i<passivePorts.length;i++) {
    if (passivePorts[i].state === "FREE") {
      passivePorts[i].state = "IN_USE";
      var p = passivePorts[i].port;
      logger.info("allocating passive port: " + p);
      return createPassiveHandler(client, p);
    }
  }
  return null;
};

module.exports.freePassiveHandler = freePassiveHandler;

function freePassiveHandler(port, server) {
  for (var i=0;i<passivePorts.length;i++) {
    if (passivePorts[i].port === port) {
      if (passivePorts[i].state !== "IN_USE") {
        throw new Error("Expected passive port: " + port +
                        " to be in use, but was: " + passivePorts[i].state);
      }
      passivePorts[i].state = "FREE";
      logger.info("closing passive: " + port);
      server.close();
      return;
    }
  }
  throw new Error("Undefined passive port: " + port);
}

