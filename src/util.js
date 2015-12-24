var config = require('./config');

module.exports.clientInfo = function(client) {
  var s = client.id;
  if (client.state === "AUTHENTICATED") {
    s = s + ", " + client.user.username;
  } else {
    s = s + ", not authenticated";
  }
  return s;
};
