var assert = require('chai').assert;
var users = require('../src/users');

describe('users', function() {
  it('should find correct user by name', function() {
    // FIXME: Uses hardcoded config
    assert.isNull(users.findUserByName('non-existing'));
    assert.isNotNull(users.findUserByName('john'));
  });
});
