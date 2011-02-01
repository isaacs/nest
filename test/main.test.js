var assert = require('assert');
var c      = require('../').createClient({
});

module.exports = {
  "test exports": function () {
    assert.equal('function', typeof c.get);
    assert.equal('function', typeof c.post);
    assert.equal('function', typeof c.put);
    assert.equal('function', typeof c.delete);
  },
  "test defaults": function () {

  }
};
