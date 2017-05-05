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

import {application, NxusModule} from 'nxus-core'

import waterline from 'waterline'
import baseModel from './BaseModel'
import geoModel from './GeoModel'
import hasModels from './HasModels'
import Promise from 'bluebird'
import _ from 'underscore'

import path from 'path'
import fs_ from 'fs'
const fs = Promise.promisifyAll(fs_);

export var Waterline = waterline
export var BaseModel = baseModel
export var GeoModel = geoModel
export var HasModels = hasModels

const REGEX_FILE = /[^\/\~]$/;
/**
 * Storage provides a common interface for defining models.  Uses the Waterline ORM.
 */
class Storage extends NxusModule {
  
  constructor () {
    super()

    BaseModel.prototype.storageModule = this
    this.waterline = Promise.promisifyAll(new Waterline());
    this.waterlineConfig = null;
    this.collections = {};
    this.connections = null;
    this._adapters = {}

    application.once('init', () => {
      return Promise.all([
        this._setupAdapter(),
      ]);
    });

    application.onceAfter('load', () => {
      return this._connectDb();
    });

    application.once('stop', () => {
      return this._disconnectDb();
    })
  }

  _userConfig () {
    return {
      adapters: {
        'default': "waterline-sqlite3"
      },
      connections: {
        'default': {
          adapter: 'default', // or 'memory' 
        }
      }
    };
  }

  // Handlers

  /**
   * Register a model
   * @param {object} model A Waterline-compatible model class
   * @example storage.model(...)
   */
  
  model (model) {
    this.log.debug('Registering model', model.prototype.identity)
    this.waterline.loadCollection(model)
  }

  /**
   * Request a model based on its identity (name)
   * @param {string|array} id The identity of a registered model, or array of identities
   * @return {Promise}  The model class(es)
   * @example storage.getModel('user')
   */
  
  getModel (id) {
    if (_.isArray(id)) {
      return id.map((i) => { return this.collections[i]})
    }
    return this.collections[id];
  }

  /**
   * Register all models in a directory
   * @param {string} dir Directory containing model files
   * @return {Promise}  Array of model identities
   * @example application.get('storage').model(...)
   */
  
  modelDir (dir) {
    try {
      fs.accessSync(dir);
    } catch (e) {
      this.log.debug('modelDir skipping:', dir, e.message)
      return;
    }
    let identities = []
    return fs.readdirAsync(dir).each((file) => {
      if (REGEX_FILE.test(file)) {
        var p = path.resolve(path.join(dir,path.basename(file, '.js')))
        var m = require(p)
        if (m.default) {
          m = m.default
        }
        identities.push(m.prototype.identity)
        this.log.debug('modelDir adding model', file)
        return this.provide('model', m)
      }
    }).then(() => {
      return identities
    });
  }

  // Internal
  
  _setupAdapter () {
    for (var key in this.config.adapters) {
      if (_.isString(this.config.adapters[key])) {
        try {
          var adapter = require(this.config.adapters[key]);
          adapter['_name'] = this.config.adapters[key]
          this._adapters[key] = adapter;
        } catch (err) {
          this.log.error('_setupAdapter config for', key, 
            'adapter:', this.config.adapters[key], 
            'not found in installed dependencies.' )
        }
      }
    }
  }

  _disconnectDb () {
    var adapterNames = _.values(this._adapters).map(e => e['_name']);
    return Promise.all(_.values(this._adapters), (adapter) => {
      return new Promise((resolve) => {
        adapter.teardown(null, resolve);
      });
    }).then(() => {
      return this.waterline.teardownAsync()
    }).then(() => {
      return new Promise((resolve) => {
        // we only want to reload nxus code
        // but we need to always reload mongoose so that models can be rebuilt
        let adaptersExp = new RegExp("^.*("+adapterNames.join("|")+")\\"+path.sep+".*.js")
        _.each(require.cache, (v, k) => {
          if (!adaptersExp.test(k)) return
          delete require.cache[k]
        })
        resolve()
      })
    });
  }
  
  _connectDb () {
    this.log.debug('Connecting to dB', this.config.connections)
    return this.waterline.initializeAsync({
      adapters: this._adapters,
      connections: this.config.connections,
      defaults: this.config.defaults
    }).then((obj) => {
      this.connections = obj.connections;
      this.collections = obj.collections;
    }).catch((e) => {
      this.log.error(e)
    });
  }

  emitModelEvent (action, identity, record) {
    this.log.debug('Emitting model event', action, identity)
    this.emit('model.'+action, identity, record)
    this.emit('model.'+action+'.'+identity, identity, record)
  }
}

export default Storage
export let storage = Storage.getProxy()
