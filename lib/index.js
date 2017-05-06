/**
 * # Storage Module
 * 
 * [![Build Status](https://travis-ci.org/nxus/storage.svg?branch=master)](https://travis-ci.org/nxus/storage)
 * 
 * A storage framework for Nxus applications using [waterline](https://github.com/balderdashy/waterline).
 * 
 * # Configuration
 * 
 *     "config": {
 *       "storage": {
 *         "adapter": {
 *           "default": "sails-mongo"
 *         },
 *         "connections": {
 *           "default": {
 *             "adapter": "default",
 *             "url": "mongodb://...."
 *           }
 *         },
 *         "modelsDir": "./src/models"
 *       }
 *     }
 * 
 * # Creating models
 * 
 * Inherit your models from BaseModel
 * 
 *     import {BaseModel} from '@nxus/storage'
 * 
 *     var User = BaseModel.extend({
 *       identity: 'user',
 *       attributes: {
 *         name: 'string'
 *       }
 *     })
 * 
 * # Register models
 * 
 * Either import your model class and pass it to `model()`:
 * 
 *     storage.model(modelClass)
 * 
 * Or register all models in a directory with `modelDir()`:
 * 
 *     storage.modelDir(__dirname+"/models")
 * 
 * # Model events
 * 
 * The storage model emits events for create, update, and destroy, you can register a handler for all events:
 * 
 *       storage.on('model.create', (identity, record) => {})
 *       storage.on('model.update', (identity, record) => {})
 *       storage.on('model.destroy', (identity, record) => {})
 * 
 * Or just a specific model identity:
 * 
 *       storage.on('model.create.user', (identity, record) => {})
 *       storage.on('model.update.user', (identity, record) => {})
 *       storage.on('model.destroy.user', (identity, record) => {})
 * 
 * # Lifecycle notes
 * 
 * -   `load`
 *     -   Models should be registered during `load`, e.g.
 *             var User = BaseModel.extend({
 *               identity: 'user',
 *               ...
 *             });
 *             application.get('storage').model(User)
 * -   `startup`
 *     -   The configured database is connected during `load.after`
 *     -   You can query models from `startup` and beyond, retrieve the model by the 'identity':
 * 
 *             application.get('storage').getModel('user').then((User) => {
 *                 User.create(...);
 *             });
 *
 * # API
 * -------
 */

'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.storage = exports.HasModels = exports.GeoModel = exports.BaseModel = exports.Waterline = undefined;

var _nxusCore = require('nxus-core');

var _waterline = require('waterline');

var _waterline2 = _interopRequireDefault(_waterline);

var _BaseModel = require('./BaseModel');

var _BaseModel2 = _interopRequireDefault(_BaseModel);

var _GeoModel = require('./GeoModel');

var _GeoModel2 = _interopRequireDefault(_GeoModel);

var _HasModels = require('./HasModels');

var _HasModels2 = _interopRequireDefault(_HasModels);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const fs = _bluebird2.default.promisifyAll(_fs2.default);

var Waterline = exports.Waterline = _waterline2.default;
var BaseModel = exports.BaseModel = _BaseModel2.default;
var GeoModel = exports.GeoModel = _GeoModel2.default;
var HasModels = exports.HasModels = _HasModels2.default;

const REGEX_FILE = /[^\/\~]$/;
/**
 * Storage provides a common interface for defining models.  Uses the Waterline ORM.
 */
class Storage extends _nxusCore.NxusModule {

  constructor() {
    super();

    BaseModel.prototype.storageModule = this;
    this.waterline = _bluebird2.default.promisifyAll(new Waterline());
    this.waterlineConfig = null;
    this.collections = {};
    this.connections = null;

    _nxusCore.application.once('init', () => {
      return _bluebird2.default.all([this._setupAdapter()]);
    });

    _nxusCore.application.onceAfter('load', () => {
      return this._connectDb();
    });

    _nxusCore.application.once('stop', () => {
      return this._disconnectDb();
    });
  }

  _userConfig() {
    return {
      adapters: {
        'default': "waterline-sqlite3"
      },
      connections: {
        'default': {
          adapter: 'default' }
      }
    };
  }

  // Handlers

  /**
   * Register a model
   * @param {object} model A Waterline-compatible model class
   * @example storage.model(...)
   */

  model(model) {
    this.log.debug('Registering model', model.prototype.identity);
    this.waterline.loadCollection(model);
  }

  /**
   * Request a model based on its identity (name)
   * @param {string|array} id The identity of a registered model, or array of identities
   * @return {Promise}  The model class(es)
   * @example storage.getModel('user')
   */

  getModel(id) {
    if (_underscore2.default.isArray(id)) {
      return id.map(i => {
        return this.collections[i];
      });
    }
    return this.collections[id];
  }

  /**
   * Register all models in a directory
   * @param {string} dir Directory containing model files
   * @return {Promise}  Array of model identities
   * @example application.get('storage').model(...)
   */

  modelDir(dir) {
    try {
      fs.accessSync(dir);
    } catch (e) {
      return;
    }
    let identities = [];
    return fs.readdirAsync(dir).each(file => {
      if (REGEX_FILE.test(file)) {
        var p = _path2.default.resolve(_path2.default.join(dir, _path2.default.basename(file, '.js')));
        var m = require(p);
        if (m.default) {
          m = m.default;
        }
        identities.push(m.prototype.identity);
        return this.provide('model', m);
      }
    }).then(() => {
      return identities;
    });
  }

  // Internal

  _setupAdapter() {
    for (var key in this.config.adapters) {
      if (_underscore2.default.isString(this.config.adapters[key])) {
        var adapter = require(this.config.adapters[key]);
        adapter._name = this.config.adapters[key];
        this.config.adapters[key] = adapter;
      }
    }
  }

  _disconnectDb() {
    var adapters = _underscore2.default.values(this.config.adapters).map(e => e['_name']);
    return _bluebird2.default.all(_underscore2.default.values(this.config.adapters), adapter => {
      return new _bluebird2.default(resolve => {
        adapter.teardown(null, resolve);
      });
    }).then(() => {
      return this.waterline.teardownAsync();
    }).then(() => {
      return new _bluebird2.default(resolve => {
        // we only want to reload nxus code
        // but we need to always reload mongoose so that models can be rebuilt
        adapters = new RegExp("^.*(" + adapters.join("|") + ").*.js");
        _underscore2.default.each(require.cache, (v, k) => {
          if (!adapters.test(k)) return;
          delete require.cache[k];
        });
        resolve();
      });
    });
  }

  _connectDb() {
    this.log.debug('Connecting to dB', this.config.connections);
    return this.waterline.initializeAsync({
      adapters: this.config.adapters,
      connections: this.config.connections,
      defaults: this.config.defaults
    }).then(obj => {
      this.connections = obj.connections;
      this.collections = obj.collections;
    }).catch(e => {
      this.log.error(e);
    });
  }

  emitModelEvent(action, identity, record) {
    this.log.debug('Emitting model event', action, identity);
    this.emit('model.' + action, identity, record);
    this.emit('model.' + action + '.' + identity, identity, record);
  }
}

exports.default = Storage;
let storage = exports.storage = Storage.getProxy();