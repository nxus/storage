'use strict';

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _nxusCore = require('nxus-core');

var _ = require('../');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe("HasModels", () => {
  class MyModule extends _.HasModels {
    modelNames() {
      return ['user'];
    }
  }
  class MyModuleRename extends _.HasModels {
    modelNames() {
      return { 'user2': 'User2' };
    }
  }
  var module;

  before(() => {
    _sinon2.default.spy(_.storage, "provide");
    _sinon2.default.spy(_nxusCore.application, "on");
  });

  it("should request models", () => {
    module = new MyModule();
    _nxusCore.application.on.calledWith('startup.before').should.be.true;
    _nxusCore.application.emit('startup.before').then(() => {
      _.storage.provide.calledWith('getModel', 'user').should.be.true;
    });
  });
  it("should request models from object", () => {
    module = new MyModuleRename();
    _nxusCore.application.emit('startup.before').then(() => {
      _.storage.provide.calledWith('getModel', 'user').should.be.true;
    });
  });
});