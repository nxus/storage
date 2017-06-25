'use strict'

import _ from 'underscore'
import {application, NxusModule} from 'nxus-core'
import {storage} from './index'

/** Base class for nxus modules that define or use models.
 * It automatically registers all model definitions contained in
 * the module `./models` subdirectory. It makes model definitions
 * available through its {@link #HasModels#models} property, which you
 * can configure to load models defined by your module or other modules.
 * @param {Object} options - Configuration options.
 * @param {Object|Array} options.modelNames - Model definitions to load.
 *       If specified as an object, each object property specifies a
 *       model &ndash; its key is a model identity (the model's
 *       `identity` property), and its value is used as the model's
 *       name in {@link HasModels#models}. If specified as an array,
 *       each array element specifies a model &ndash; the element
 *       string serves as both model identity and name.
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

  /** Collection of model definitions.
   * You can use the constructor `modelNames` option to configure which
   * model definitions to load. By default, the model definitions
   * that were registered from the module `./models` subdirectory are
   * also loaded into the model definitions.
   *
   * @member {Object} models
   * @memberof HasModels
   * @instance
   */

  /** Override to define the model names to access.
   * @deprecated Use the constructor `modelNames` option to specify names of models to be made available in the `this.models` property.
   * @return {Array|Object} Model identities to add to `this.models`, or object of {identity: name}
   * @example modelNames() { 
   *   return ['user']
   * }
   */
  modelNames () {
    return this._modelNames || this._model_identities
  }
}
