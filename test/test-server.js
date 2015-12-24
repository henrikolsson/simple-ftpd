var assert = require('chai').assert;
var sinon = require('sinon');
var server = require('../src/server');

before(function() {
  require('winston').clear();
});

describe('server', function() {
  it('should not allow authenticated commands without authentication', function() {
    var client = {state: "CONNECTED",
                  send: sinon.spy()};
    server.handleCommand(client, "PASV");
    assert.isTrue(client.send.calledOnce);
    assert.strictEqual(client.send.firstCall.args[0], "530 Not logged in.");
  });

  it('should verify number of parameters required', function() {
    var client = {state: "CONNECTED",
                  send: sinon.spy()};
    server.handleCommand(client, "USER");
    assert.isTrue(client.send.calledOnce);
    assert.strictEqual(client.send.firstCall.args[0], "501 Syntax error in parameters or arguments.");
  });
});
