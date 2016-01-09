module.exports = {
  port: 2521,
  users: [{"username": "john",
           "password": "doe"}],
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
