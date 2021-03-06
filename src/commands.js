"use strict";
var config = require('./config');
var passive = require('./passive');
var users = require('./users');
var logger = require('./logger');
var path = require('path');
var sprintf = require("sprintf-js").sprintf;
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));

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
      return "257 \"" +  client.pwd + "\"";
    },
    parameters: 0
  },
  "SYST": {
    handler: function() {
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
  },
  "CWD": {
    handler: cwdHandler,
    parameters: 'varargs'
  },
  "CDUP": {
    handler: function(client) {
      cwdHandler(client, "CWD", [".."]);
    },
    parameters: 0
  },
  "RETR": {
    handler: retrHandler,
    parameters: 'varargs'
  },
  "STOR": {
    handler: storHandler,
    parameters: 'varargs'
  },
  "MKD": {
    handler: mkdirHandler,
    parameters: 'varargs'
  },
  "DELE": {
    handler: deleteHandler,
    parameters: 'varargs'
  },
  "RMD": {
    handler: deleteDirectoryHandler,
    parameters: 'varargs'
  },
  "PROT": {
    handler: protHandler,
    parameters: 1
  },
  "PBSZ": {
    handler: function() {
      // Pretend for now..
      return "200 Command okay.";
    }
  }
};

function protHandler(client, command, type) {
  client.protectionLevel = type;
  return "200 Command okay.";
}

function mkdirHandler(client, command, file) {
  file = makeAbsolute(client, file.join(' '));
  fs.mkdir(file, function(e) {
    if (e) {
      logger.error("mkdir failed", e);
      client.send("550 Failed to create directory");
    } else {
      client.send("257 \"" + file + "\" created");
    }
  });
}

function deleteDirectoryHandler(client, command, file) {
  file = makeAbsolute(client, file.join(' '));
  fs.rmdir(file, function(e) {
    if (e) {
      logger.error("delete failed", e);
      client.send("550 Failed to delete");
    } else {
      client.send("250 Deleted");
    }
  });
}
function deleteHandler(client, command, file) {
  file = makeAbsolute(client, file.join(' '));
  fs.unlink(file, function(e) {
    if (e) {
      logger.error("delete failed", e);
      client.send("550 Failed to delete");
    } else {
      client.send("250 Deleted");
    }
  });
}

function retrHandler(client, command, file) {
  file = file.join(' ');
  client.send("150 Here comes the file.");
  sanitizeAbsolutePath(client, file).then(function(args) {
    var path = args[0];
    var s = fs.createReadStream(path);
    client.passiveHandler.pipeFrom(s).then(function() {
      client.send("226 File sent.");
    });
  }).catch(function(error) {
    logger.error("failed to send file", error);
    client.passiveHandler.use("").then(function() {
      client.send("451 Requested action aborted: local error in processing.");
    }).catch(function(e) {
      logger.error("failed to send file", e);
    });
  });
}

function storHandler(client, command, file) {
  file = makeAbsolute(client, file);
  client.send("150 Do the needful");
  var s = fs.createWriteStream(file);
  client.passiveHandler.pipeTo(s).then(function() {
    client.send("226 File retrieved.");
  });
}

function makeAbsolute(client, p) {
  if (/^\//.test(p)) {
    return path.normalize(p);
  } else {
    return path.normalize(client.pwd + "/" + p);
  }
}

function sanitizeAbsolutePath(client, p) {
  p = makeAbsolute(client, p);
  return Promise.join(new Promise(function(resolve) {
    resolve(p);
  }), fs.statAsync(p));
}

function cwdHandler(client, command, p) {
  p = p.join(' ');
  var sanitized = sanitizeAbsolutePath(client, p);
  sanitized.then(function(args) {
    var path = args[0];
    var stats = args[1];
    if (stats.isDirectory()) {
      client.pwd = path;
      client.send("250 CWD successful");
    } else {
      throw new Error("Not a directory");
    }
  }).catch(function(err) {
    logger.error("CWD Failed", err);
    client.send("550 Illegal directory");
  });
}

function typeHandler() {
  return "200 Command okay.";
}

function listHandler(client) {
  // FIXME: This is ugly.
  client.send("150 Here comes the directory listing.");
  fs.readdirAsync(client.pwd).map(function(fileName) {
    var stat = fs.statAsync(client.pwd + "/" + fileName);
    return Promise.join(stat, function(stat) {
      return {filename: fileName,
              stat: stat};
    });
  }).then(function(files) {
    var s = "";
    for (var i=0;i<files.length;i++) {
      var line = sprintf("%s   1 %-10s %-10s %10d Jan  1  1980 %s\r\n",
                         (files[i].stat.isDirectory() ? "d" : "-") + "rw-rw-rw-",
                         "nobody",
                         "nobody",
                         files[i].stat.size,
                         files[i].filename);
      s = s + line;
    }
    client.passiveHandler.use(s).then(function() {
      client.send("226 Directory send OK.");
    });
  }).catch(function(error) {
    logger.error("failed to list", error);
    client.passiveHandler.use("").then(function() {
      client.send("451 Requested action aborted: local error in processing.");
    });
  });
}

function userHandler(client, command, username) {
  var user = users.findUserByName(username);
  if (user === null) {
    return "530 Not logged in.";
  }
  if (user.source && !user.source.contains(client.address)) {
    return "530 Not logged in.";
  }
  client.state = "AUTHENTICATING";
  client.user = user;
  return "331 User name okay, need password.";
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
  var passiveHandler = new passive.PassiveHandler(client);
  if (passiveHandler === null) {
    logger.warn("Unable to allocate passive port");
    client.doClose = true;
    return "421 Service not available";
  }
  var p1 = parseInt(passiveHandler.port / 256, 10);
  var p2 = passiveHandler.port % 256;
  client.passiveHandler = passiveHandler;
  return "227 Entering Passive Mode (" + config.passiveIp.replace(/\./g, ",") + ","+p1+","+p2+").";
}

module.exports.userHandler = userHandler;

