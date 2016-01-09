"use strict";

module.exports.clientInfo = function(client) {
  var s = client.id + ", " + client.address;
  if (client.state === "AUTHENTICATED") {
    s = s + ", " + client.user.username;
  } else {
    s = s + ", not authenticated";
  }
  return s;
};
