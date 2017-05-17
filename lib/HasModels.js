'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _nxusCore = require('nxus-core');

var _index = require('./index');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** 
 * The HasModels class is a Base class for defining helper classes with Models.
 * All models contained in a `./models` directory will be registered automatically, and are the
 * default list of model identities made available in the `this.models` object.
 * You may override or extend this list of model identities, or a mapping of model identities to variable names,
 * by overriding `.modelNames()`
 * 
 */
class HasModels extends _nxusCore.NxusModule {
  constructor({ modelNames = null } = {}) {
    super();
    this._modelNames = modelNames;
    this.models = {};
    this._model_identities = [];

    _index.storage.modelDir(this._dirName + "/models").then(identities => {
      this._model_identities = identities;
    });

    _nxusCore.application.before('startup', () => {
      let mods = this.modelNames();
      if (_underscore2.default.isArray(mods)) {
        mods = _underscore2.default.object(mods, mods);
      }
      return Promise.all(Object.keys(mods).map(id => {
        return _index.storage.getModel(id).then(model => {
          this.models[id] = model;
          this.models[mods[id]] = model;
        });
      }));
    });
  }

  /**
   * Deprecated: Override to define the model names to access
   * @return {array|object} Model identities to add to this.models, or object of {identity: name}
   * @example modelNames() { 
   *   return ['user']
   * }
   */
  modelNames() {
    return this._modelNames || this._model_identities;
  }
}
exports.default = HasModels;