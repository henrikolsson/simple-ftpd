"use strict";
var Netmask = require('netmask').Netmask;

module.exports = {
  port: 2521,
  users: [{"username": "john",
           "password": "doe",
           "source": new Netmask('127.0.0.2/32')}],
  root: "/srv/ftp/",
  user: 1000,
  group: 1000,
  passiveIp: "192.168.70.2",
  passivePortMin: 2100,
  passivePortMax: 2110,
  implicitTLS: true,
  privateKeyFile: 'private-key.pem',
  certificateFile: 'public-cert.pem'
};
