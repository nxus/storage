import Waterline from 'waterline'
import _ from 'underscore'

/** Base class for Waterline model definitions.
 *
 * It extends the `Waterline.Collection` to make it less awkward to use
 * and better adapted to the nxus environment.
 *
 * It provides an {@link #BaseModel.extend|extend()} method that is
 * better-behaved than the Waterline `extend()` method.
 *
 * It emits create, update, and destroy events for model instances. The
 * model identity and record are passed as parameters to the handler.
 * You can register to be notified of all events of a specified type,
 * or restrict notifications to a specific model by specifying its
 * identity as a suffix to the event type:
 * *    `model.create`, `model.create.`_`identity`_ - emitted after create
 * *    `model.update`, `model.update.`_`identity`_ - emitted after update
 * *    `model.destroy`, `model.destroy.`_`identity`_ - emitted after destroy
 * 
 * Use the `extend()` method to create a Waterline model based on
 * `BaseModel`. For example:
 * ```
 *   import {BaseModel} from 'nxus-storage'
 *   const MyModel = BaseModel.extend({
 *       identity: 'my-model',
 *       attributes: {
 *           name: 'string'
 *       }
 *   })
 * ```
 *
 * @typedef BaseModel
 * @extends Waterline.Collection
 */
var BaseModel = Waterline.Collection.extend(
  /** @lends BaseModel */
  {
    /** Name of the database connection for the model.
     * Connections are defined in the storage [configuration](#configuration) settings.
     * The default connection is `default`; override to select another
     * configuration.
     */
    connection: 'default',
    storageModule: null,
    attributes: {
      /** Gets a display name for the record.
       * Provides a consistent way to obtain a display name. The default
       * definition examines the record's `id`, `createdAt`, and
       * `updatedAt` attributes, returning the first that has a string
       * value. Override the default definition to provide a more useful
       * display name.
       * @instance
       * @memberof BaseModel
       * @returns {string} display name
       */
      displayName: function displayName() {
        // Appears there is no way to get to the attribute definitions from an instance.
        var firstString = _.first(_.compact(_(this).pairs().map(([key, value]) => { if (!_.contains(['id', 'createdAt', 'updatedAt'], key) && _.isString(value)) return key })))
        return this[firstString]
      }
    },

    afterCreate: function (record, next) {
      if(this.storageModule) {
        this.storageModule.emitModelEvent('create', this.identity, record)
      }
      next()
    },

    afterUpdate: function(record, next) {
      if(this.storageModule) {
        this.storageModule.emitModelEvent('update', this.identity, record)
      }
      next()
    },

    afterDestroy: function(record, next) {
      if(this.storageModule) {
        for (let rec of record)
          this.storageModule.emitModelEvent('destroy', this.identity, rec)
      }
      next()
    },

    /** Finds a record if it exists, creates it if not.
     * @param {Object} criteria - search criteria
     * @param {Object} values - attributes of the new record, if created
     * @returns {Object} existing or newly created record
     */
    findOrCreate: function(criteria, values) {
      return this.findOne(criteria).then((obj) => {
        if(obj) {
          return obj
        } else {
          return this.create(values)
        }
      })
    },

    /** Creates a record if it doesn't exist, updates it if it does.
     * @param {Object} criteria - search criteria
     * @param {Object} values - record attributes
     * @returns {Object} newly created or updated record
     */
    createOrUpdate: function(criteria, values) {
      return this.findOne(criteria).then((obj) => {
        if (obj) {
          return this.update(obj.id, values).then((objs) => { return objs[0]})
        } else {
          return this.create(values)
        }
      })
    }
  })

/** Extends this model definition to create a new definition.
 * @param {Object} properties - prototype properties for the created
 *   model; the `attributes` property, if specified, augments (rather
 *   than replaces) the attributes of the model being extended
 * @returns {Object} extended Waterline model definition
 */
BaseModel.extend = function(properties) {
  // Waterline wants each model to have its own connection property, rather than inheriting
  if (properties.connection === undefined) {
    properties.connection = this.prototype.connection
  }
  // Waterline wants each model to have its own attributes property, we want to combine
  if (properties.attributes === undefined) {
    properties.attributes = {}
  }
  properties.attributes = _.extend({}, this.prototype.attributes, properties.attributes)
  return Waterline.Collection.extend.call(this, properties)
}

export default BaseModel
