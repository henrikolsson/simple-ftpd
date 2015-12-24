var config = require('./config');

module.exports.findUserByName = function(username) {
  for (var i=0;i<config.users.length;i++) {
    if (config.users[i].username == username) {
      return config.users[i];
    }
  }
  return null;
};
