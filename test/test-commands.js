var assert = require('chai').assert;
var sinon = require('sinon');
var commands = require('../src/commands');

describe('commands', function() {
  it('can verify correct username', function() {
    var client = {address: '127.0.0.1'};
    var result = commands.userHandler(client, "USER", "john");
    assert.strictEqual(result, "331 User name okay, need password.");
    assert.strictEqual(client.state, "AUTHENTICATING");
    assert.isNotNull(client.user);
  });

  it('can verify incorrect username', function() {
    var client = {state: "CONNECTED"};
    var result = commands.userHandler(client, "USER", "invalid");
    assert.strictEqual(result, "530 Not logged in.");
    assert.strictEqual(client.state, "CONNECTED");
    assert.isUndefined(client.user);
  });
});
