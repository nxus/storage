/* globals before: false, beforeEach: false, after: false, afterEach: false, describe: false, it: false, expect: false */
'use strict';

var _ = require('../');

var _2 = _interopRequireDefault(_);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _nxusCore = require('nxus-core');

var _One = require('./models/One');

var _One2 = _interopRequireDefault(_One);

var _Two = require('./models/Two');

var _Two2 = _interopRequireDefault(_Two);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("Storage", () => {
  var storage;

  before(() => {
    _sinon2.default.spy(_nxusCore.application, "once");
    _sinon2.default.spy(_nxusCore.application, "onceAfter");
    _sinon2.default.spy(_.storage, "respond");
    _sinon2.default.spy(_.storage, "request");
  });

  //nb: these tests are order dependent right now

  describe("Load", () => {
    it("should not be null", () => _2.default.should.not.be.null);
    it("should provide waterline", () => _.Waterline.should.not.be.null);
    it("should provide BaseModel", () => _.BaseModel.should.not.be.null);

    it("should not be null", () => {
      _2.default.should.not.be.null;
      _.storage.should.not.be.null;
    });

    it("should be instantiated", () => {
      storage = new _2.default();
      storage.should.not.be.null;
    });
  });

  describe("Init", () => {
    it("should register for app lifecycle", () => _nxusCore.application.once.called.should.be.true);
    it("should register app init event", () => _nxusCore.application.once.calledWith('init').should.be.true);
    it("should register app load event", () => _nxusCore.application.onceAfter.calledWith('load').should.be.true);
    it("should register app stop event", () => _nxusCore.application.once.calledWith('stop').should.be.true);
    //fire both the init and load, then check state of internal configuration
    it("should have config after application 'init' and 'load'", () => {
      return _nxusCore.application.emit('init').then(() => {
        return _nxusCore.application.emit('load');
      }).then(() => {
        storage._adapters.should.have.property('default');
        storage.should.have.property('config');
        storage.config.should.have.property('connections');
        storage.should.have.property('connections');
        storage.connections.should.not.be.null;
      });
    }).timeout(3000);
  });
  describe("Models", () => {
    before(() => {
      _sinon2.default.spy(storage, 'provide');
      _sinon2.default.spy(storage, 'emit');
    });
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };

      var Dummy = _.BaseModel.extend({
        identity: 'dummy',
        connection: 'default',
        attributes: {
          name: 'string'
        }
      });

      // Shortcut around gather stub
      storage.model(Dummy);
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should have a collection of models", () => {
      storage.collections.should.not.be.null;
      storage.connections.should.not.be.null;
      storage.collections.should.have.property('dummy');
    });
    it("should return model by identity", () => {
      var dummy = storage.getModel('dummy');
      dummy.should.exist;
      dummy.identity.should.equal('dummy');
    });
  });
  describe("Model Dir", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should register local models", () => {
      return storage.modelDir(__dirname + "/models").then(ids => {
        storage.provide.calledTwice.should.be.true;
        storage.provide.calledWith('model').should.be.true;
        ids.length.should.equal(2);
        ids.includes('one').should.be.true;
        ids.includes('two').should.be.true;
      });
    });
  });

  describe("Dynamic Adapter", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should have required the adapter", done => {
      storage._adapters["default"].should.have.property("identity", "sails-memory");
      done();
    });
  });

  describe("Model Base class", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        modelsDir: './test/models',
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      storage.model(_One2.default);
      storage.model(_Two2.default);
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });
    it("should return models with correct methods inherited", () => {
      var one = storage.getModel('one');
      var two = storage.getModel('two');

      one.should.have.property("createOrUpdate");
      two.should.have.property("createOrUpdate");
      two.should.have.property("helperMethod");
      two.helperMethod("xx").should.equal("xx");
      two.attributes.should.have.property('name');
      two.attributes.should.have.property('other');
    });
    it("should have a displayName", () => {
      var one = storage.getModel('one');
      return one.create({ color: 'red' }).then(obj => {
        storage.emit.calledWith('model.create').should.be.true;
        storage.emit.calledWith('model.create.one').should.be.true;
        obj.displayName().should.equal('red');
      });
    });
    it("should emit CRUD events", () => {
      var one = storage.getModel('one');
      return one.create({ color: 'red' }).then(obj => {
        storage.emit.calledWith('model.create').should.be.true;
        storage.emit.calledWith('model.create.one').should.be.true;
        obj.color = 'blue';
        return obj.save().then(() => obj); // save doesn't return object as of waterline 0.11.0
      }).then(obj => {
        storage.emit.calledWith('model.update').should.be.true;
        storage.emit.calledWith('model.update.one').should.be.true;
        return obj.destroy();
      }).then(() => {
        storage.emit.calledWith('model.destroy').should.be.true;
        storage.emit.calledWith('model.destroy.one').should.be.true;
      });
    });
  });
});