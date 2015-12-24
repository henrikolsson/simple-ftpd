var assert = require('chai').assert;
var sinon = require('sinon');
var server = require('../src/server');

before(function() {
  require('winston').clear();
});

describe('server', function() {
  it('should not allow authenticated commands without authentication', function() {
    var client = {state: "CONNECTED",
                  socket: {
                    write: sinon.spy()
                  }};
    server.handleCommand(client, "PASV");
    assert.isTrue(client.socket.write.calledOnce);
    assert.strictEqual(client.socket.write.firstCall.args[0], "530 Not logged in.\r\n");
  });

  it('should verify number of parameters required', function() {
    var client = {state: "CONNECTED",
                  socket: {
                    write: sinon.spy()
                  }};
    server.handleCommand(client, "USER");
    assert.isTrue(client.socket.write.calledOnce);
    assert.strictEqual(client.socket.write.firstCall.args[0], "501 Syntax error in parameters or arguments.\r\n");
  });
});
