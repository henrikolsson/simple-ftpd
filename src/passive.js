var net = require('net');
var config = require('./config');
var passivePorts = [];
var winston = require('winston');

function applyQueue(queue, client) {
  var l = queue.length;
  for (var i=0;i<l;i++) {
    queued = queue[i];
    client.write(queued.data);
    client.end();
    queued.cb();
  }
  return l > 0;
}

// FIXME: This could should be cleaned up
function createPassiveHandler(port) {
  var queue = [];
  var client = null;
  var server = net.createServer(function(socket) {
    client = socket;

    winston.info("passive client connected");
    if (applyQueue(queue, client)) {
      freePassiveHandler(port, server);
    }

    socket.on('data', function (data) {
      var s = data.toString().trim();
      console.log(s);
    });

    socket.on('end', function () {
      winston.info("passive client disconnected");
    });
  }).listen(port);

  return {
    use: function(data, cb) {
      queue.push({data: data,
                  cb: cb});
      if (client != null) {
        applyQueue(queue, client);
        freePassiveHandler(port, server);
      }
    },
    port: port
  };
}

module.exports.init = function() {
  for (var i=config.passivePortMin;i<=config.passivePortMax;i++) {
    passivePorts.push({"port": i, "state": "FREE"});
  }
};

module.exports.allocatePassivePort = function() {
  for (var i=0;i<passivePorts.length;i++) {
    if (passivePorts[i].state === "FREE") {
      passivePorts[i].state = "IN_USE";
      var p = passivePorts[i].port;
      winston.info("allocating passive port: " + p);
      return createPassiveHandler(p);
    }
  }
  return null;
};

module.exports.freePassiveHandler = freePassiveHandler;

function freePassiveHandler(port, server) {
  for (var i=0;i<passivePorts.length;i++) {
    if (passivePorts[i].port === port) {
      if (passivePorts[i].state !== "IN_USE") {
        throw new Exception("Expected passive port: " + port + " to be in use, but was: " + passivePorts[i].state);
      }
      passivePorts[i].state = "FREE";
      winston.info("closing passive: " + port);
      server.close();
      return;
    }
  }
  throw new Exception("Undefined passive port: " + port);
}

