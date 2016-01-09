"use strict";
var net = require('net');
var config = require('./config');
var logger = require('./logger');
var Promise = require("bluebird");
var tls = require('tls');
var stream = require('stream');

var passivePorts = [];

function allocatePassivePort() {
  for (var i=0;i<passivePorts.length;i++) {
    if (passivePorts[i].state === "FREE") {
      passivePorts[i].state = "IN_USE";
      var p = passivePorts[i].port;
      logger.info("allocating passive port: " + p);
      return p;
    }
  }
  return null;
}

function PassiveHandler(client) {
  this.port = allocatePassivePort();
  this.queue = [];
  this.freed = false;
  this.client = client;

  var protectionLevel = client.protectionLevel || 'C';

  var self = this;
  if (protectionLevel === 'C') {
    this.server = net.createServer(function(s) { self.socketHandler(s); }).listen(this.port);
  } else {
    // TODO: Can the rest of the levels be assumed to use TLS?
    var options = {
      key: config.privateKeyFile,
      cert: config.certificateFile
    };
    this.server = tls.createServer(options, function(s) { self.socketHandler(s); }).listen(this.port);
  }
}

PassiveHandler.prototype.socketHandler = function(socket) {
  if (this.socket) {
    logger.error("Multiple passive connections!");
  } else {
    this.socket = socket;
    this.applyQueue();
  }
};

function endHandler(handler, queued) {
  return function(e) {
    if (e) {
      logger.error("passive write failure", e);
    }
    handler.free();
    queued.resolve();
  };
}

PassiveHandler.prototype.applyQueue = function() {
  if (!this.socket) {
    return false;
  }
  for (var i=0;i<this.queue.length;i++) {
    var queued = this.queue[i];
    var client = this.client;
    logger.clientInfo(client, "writing passive data");
    queued.stream.pipe(this.socket, { end: false }).on('error', endHandler(this, queued));
    queued.stream.on('end', endHandler(this, queued));
    queued.stream.on('error', endHandler(this, queued));
  }
  return this.queue.length > 0;
};

PassiveHandler.prototype.use = function(data) {
  var s = new stream.Readable();
  s._read = function noop() {};
  s.push(data);
  s.push(null);
  return this.pipe(s);
};

var counter = 0;

PassiveHandler.prototype.pipe = function(data) {
  var self = this;
  if (self.queue.length > 0) {
    throw new Error("Queue cannot be larger than 1");
  }
  logger.info("queued: " + data);
  var p = new Promise(function(resolve, reject) {
    var id = counter++;
    self.queue.push({stream: data,
                     resolve: resolve,
                     reject: reject,
                     id: id});
  });
  //p.id = counter++;
  this.applyQueue();
  return p;
};

PassiveHandler.prototype.free = function() {
  if (!this.freed) {
    for (var i=0;i<passivePorts.length;i++) {
      if (passivePorts[i].port === this.port) {
        if (passivePorts[i].state !== "IN_USE") {
          throw new Error("Expected passive port: " + this.port +
                          " to be in use, but was: " + passivePorts[i].state);
        }
        passivePorts[i].state = "FREE";
        logger.clientInfo(this.client, "closing passive: " + this.port);
        this.server.close();
        this.freed = true;
        if (this.socket) {
          this.socket.end();
        }
        return;
      }
    }
    throw new Error("Undefined passive port: " + this.port);
  }
};

PassiveHandler.prototype.end = function() {
  this.free();
};

module.exports.PassiveHandler = PassiveHandler;

module.exports.init = function() {
  for (var i=config.passivePortMin;i<=config.passivePortMax;i++) {
    passivePorts.push({"port": i, "state": "FREE"});
  }
};
