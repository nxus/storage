'use strict'

import _ from 'underscore'
import {application, NxusModule} from 'nxus-core'
import {storage} from './index'

/** 
 * The HasModels class is a Base class for defining helper classes with Models.
 * All models contained in a `./models` directory will be registered automatically, and are the
 * default list of model identities made available in the `this.models` object.
 * You may override or extend this list of model identities, or a mapping of model identities to variable names,
 * by overriding `.modelNames()`
 * 
 */
export default class HasModels extends NxusModule {
  constructor({modelNames=null}={}) {
    super()
    this._modelNames = modelNames
    this.models = {}
    this._model_identities = []

    storage.modelDir(this._dirName+"/models").then((identities) => {
      this._model_identities = identities
    })
    
    application.before('startup', () => {
      let mods = this.modelNames()
      if (_.isArray(mods)) {
        mods = _.object(mods, mods)
      }
      return Promise.all(Object.keys(mods).map((id) => {
        return storage.getModel(id).then((model) => {
          this.models[id] = model;
          this.models[mods[id]] = model;
        })
      }))
    })
  }

  /**
   * Deprecated: Override to define the model names to access
   * @return {array|object} Model identities to add to this.models, or object of {identity: name}
   * @example modelNames() { 
   *   return ['user']
   * }
   */
  modelNames () {
    return this._modelNames || this._model_identities
  }
}
