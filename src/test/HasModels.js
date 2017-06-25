import sinon from 'sinon'
import {application as app} from 'nxus-core'
import {storage as storageProxy, HasModels} from '../'

describe("HasModels", () => {
  class MyModule extends HasModels {
    modelNames() {
      return ['user']
    }
  }
  class MyModuleRename extends HasModels {
    modelNames() {
      return {'user2': 'User2'}
    }
  }
  var module

  before(() => {
    sinon.spy(storageProxy, "provide")
    sinon.spy(app, "on")
  });

  it("should request models", () => {
    module = new MyModule()
    app.on.calledWith('startup.before').should.be.true;
    app.emit('startup.before').then(() => {
      storageProxy.provide.calledWith('getModel', 'user').should.be.true;
    })
  });
  it("should request models from object", () => {
    module = new MyModuleRename()
    app.emit('startup.before').then(() => {
      storageProxy.provide.calledWith('getModel', 'user').should.be.true;
    })
  });
})
