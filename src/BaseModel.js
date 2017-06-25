import Waterline from 'waterline'
import _ from 'underscore'

/**
 * BaseModel extends Waterline.Collection to provide the following defaults and methods:
 *  * uses the 'default' connection
 *  * merges attributes provided by subsequent base classes to share attribute definitions
 *  * displayName() attribute property for consistent access to an object's "name"
 *  * emit the nxus-storage CRUD events
 *  * findOrCreate(criteria, values) - creates the object if it does not exist
 *  * createOrUpdate(criteria, values) - creates the object, or updates if it exists
 *
 * You should almost always extend this or one of its subclasses when defining your models.
 */

var BaseModel = Waterline.Collection.extend({
  connection: 'default',
  storageModule: null,
  attributes: {
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
      if(record && record[0]) record = record[0]
      this.storageModule.emitModelEvent('destroy', this.identity, record)
    }
    next()
  },

  findOrCreate: function(criteria, values) {
    return this.findOne(criteria).then((obj) => {
      if(obj) {
        return obj
      } else {
        return this.create(values)
      }
    })
  },
  
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

BaseModel.extend = function(protoProps, staticProps) {
  // Waterline wants each model to have its own connection property, rather than inheriting
  if (protoProps.connection === undefined) {
    protoProps.connection = this.prototype.connection
  }
  // Waterline wants each model to have its own attributes property, we want to combine
  if (protoProps.attributes === undefined) {
    protoProps.attributes = {}
  }
  protoProps.attributes = _.extend({}, this.prototype.attributes, protoProps.attributes)
  return Waterline.Collection.extend.call(this, protoProps, staticProps)
}

export default BaseModel
