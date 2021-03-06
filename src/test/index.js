/* globals before: false, beforeEach: false, after: false, afterEach: false, describe: false, it: false, expect: false */
'use strict';

import Storage from '../'
import {storage as storageProxy} from '../'
import {Waterline, BaseModel} from '../'

import sinon from 'sinon'
import {application as app} from 'nxus-core'

import One from './model/One'
import Two from './model/Two'


describe("Storage", () => {
  var storage;
  var storageProvideSpy, storageEmitSpy

  before(() => {
    sinon.spy(app, "once")
    sinon.spy(app, "onceAfter")
    sinon.spy(storageProxy, "respond")
    sinon.spy(storageProxy, "request")
  })

  //nb: these tests are order dependent right now

  describe("Load", () => {
    it("should not be null", () => Storage.should.not.be.null)
    it("should provide waterline", () => Waterline.should.not.be.null)
    it("should provide BaseModel", () => BaseModel.should.not.be.null)

    it("should not be null", () => {
      Storage.should.not.be.null
      storageProxy.should.not.be.null
    })

    it("should be instantiated", () => {
      storage = new Storage();
      storage.should.not.be.null;
    });
  });

  describe("Init", () => {
    before(() => {
      storageProvideSpy = sinon.spy(storage, 'provide')
      storageEmitSpy = sinon.spy(storage, 'emit')
    })
    it("should register for app lifecycle", () => app.once.called.should.be.true)
    it("should register app init event", () => app.once.calledWith('init').should.be.true)
    it("should register app load event", () => app.onceAfter.calledWith('load').should.be.true)
    it("should register app stop event", () => app.once.calledWith('stop').should.be.true)
    //fire both the init and load, then check state of internal configuration
    it("should have config after application 'init' and 'load'", () => {
      return app.emit('init').then(() => {
        return app.emit('load')
      }).then(() => {
        storage.should.have.property('_adapters');
        storage.should.have.property('config');
        storage.config.should.have.property('adapters');
        storage.config.should.have.property('connections');
        storage.should.have.property('connections');
        storage.connections.should.not.be.null
      });
    }).timeout(3000);
  });
  describe("Models", () => {
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
      }

      var Dummy = BaseModel.extend({
        identity: 'dummy',
        connection: 'default',
        attributes: {
          name: 'string'
        }
      });

      // Shortcut around gather stub
      storage.model(Dummy)
      storage._setupAdapter()
      return storage._connectDb()
    });

    afterEach(() => {
      return storage._disconnectDb()
    })

    it("should have a collection of models", () => {
      storage.collections.should.not.be.null;
      storage.connections.should.not.be.null;
      storage.collections.should.have.property('dummy');
    });
    it("should return model by identity", () => {
      var dummy = storage.getModel('dummy')
      dummy.should.exist
      dummy.identity.should.equal('dummy')
    });


  });
  describe("Model Dupes", () => {
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
      }
      
      var Dummy = BaseModel.extend({
        identity: 'dummy',
        connection: 'default',
        attributes: {
          name: 'string'
        }
      });

      // Shortcut around gather stub
      storage.model(Dummy)
      // Register twice is ok
      storage.model(Dummy)
      storage._setupAdapter()
      return storage._connectDb()
    });

    afterEach(() => {
      return storage._disconnectDb()
    })

    it("should have a collection of models", () => {
      storage.collections.should.not.be.null;
      storage.connections.should.not.be.null;
      storage.collections.should.have.property('dummy');
    });
    it("should return model by identity", () => {
      var dummy = storage.getModel('dummy')
      dummy.should.exist
      dummy.identity.should.equal('dummy')
      return dummy.create({name:"test"}).then((obj) => {
        obj.name.should.equal("test")
      })
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
      }
      storage._setupAdapter()
      return storage._connectDb()
    });

    afterEach(() => {
      return storage._disconnectDb()
    })

    it("should register local models", () => {
      return storage.modelDir(__dirname+"/model").then((ids) => {
        storage.provide.calledTwice.should.be.true
        storage.provide.calledWith('model').should.be.true
        ids.length.should.equal(2)
        ids.includes('one').should.be.true
        ids.includes('two').should.be.true
      })
    });

    it("should throw an error on on invalid models", () => {
      return storage.modelDir(__dirname+"/error-models").catch((e) => {
        e.should.not.be.null
        e.message.should.equal('Module file missing export (empty file?) Empty.js')
      })
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
      }
      storage._setupAdapter()
      return storage._connectDb()
    });

    afterEach(() => {
      return storage._disconnectDb()
    })

    it("should have required the adapter", (done) => {
      storage._adapters["default"].should.have.property("identity", "sails-memory");
      done()
    });
  });

  describe("Model Base class", () => {
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
      }
      storage._setupAdapter()
      storage.model(One)
      storage.model(Two)
      return storage._connectDb()
    });

    afterEach(() => {
      return storage._disconnectDb()
    })
    it("should return models with correct methods inherited", () => {
      var one = storage.getModel('one')
      var two = storage.getModel('two')

      one.should.have.property("createOrUpdate")
      two.should.have.property("createOrUpdate")
      two.should.have.property("helperMethod")
      two.helperMethod("xx").should.equal("xx")
      two.attributes.should.have.property('name')
      two.attributes.should.have.property('other')
    })
    it("should have a displayName", () => {
      var one = storage.getModel('one')
      return one.create({color: 'red'}).then((obj) => {
        storage.emit.calledWith('model.create').should.be.true
        storage.emit.calledWith('model.create.one').should.be.true
        obj.displayName().should.equal('red')
      })
    })
    it("should emit CRUD events", () => {
      var one = storage.getModel('one')
      return one.create({color: 'red'}).then((obj) => {
        storage.emit.calledWith('model.create').should.be.true
        storage.emit.calledWith('model.create.one').should.be.true
        obj.color = 'blue'
        return obj.save()
          .then(() => obj) // save doesn't return object as of waterline 0.11.0
      }).then((obj) => {
        storage.emit.calledWith('model.update').should.be.true
        storage.emit.calledWith('model.update.one').should.be.true
        return obj.destroy()
      }).then(() => {
        storage.emit.calledWith('model.destroy').should.be.true
        storage.emit.calledWith('model.destroy.one').should.be.true
      })
    })

    it("should handle a destroy that matches no instances", () => {
      var one = storage.getModel('one')
      storageEmitSpy.reset()
      return one.destroy({color: 'red'}).then((objs) => {
        objs.length.should.equal(0)
        storage.emit.calledWith('model.destroy').should.be.false
        storage.emit.calledWith('model.destroy.one').should.be.false
      })
    })
    it("should handle a destroy that matches multiple instances", () => {
      var one = storage.getModel('one')
      return Promise.all([one.create({color: 'red'}), one.create({color: 'red'})]).then((objs) => {
        storageEmitSpy.reset()
        one.destroy({color: 'red'}).then((objs) => {
          objs.length.should.equal(2)
          storage.emit.callCount.should.equal(4)
          storage.emit.calledWith('model.destroy').should.be.true
          storage.emit.calledWith('model.destroy.one').should.be.true
        })
      })
    })

  });
});
