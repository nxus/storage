/*
* @Author: mike
* @Date:   2016-04-05 17:03:20
* @Last Modified 2016-04-05
* @Last Modified time: 2016-04-05 19:46:20
*/

import BaseModel from './BaseModel'
import Promise from 'bluebird'

import _ from "underscore"

function createPoint(values, next) {
  var latitude = values.latitude
  var longitude = values.longitude
  if(!latitude || !longitude) return next()
  values[this.queryField] = { type: "Point", coordinates: [ longitude, latitude ] }
  next()
}

/** Base collection for Waterline models containing a GeoJSON coordinate point attribute.
 * @augments BaseModel
 * @deprecated Use {@link GeoModel}.
 */
export default BaseModel.extend({

  // Lifecycle

  queryField: 'geoPoint',
  
  beforeCreate: createPoint,
  
  beforeUpdate: createPoint,

  createGeoIndex: function() {
    this.native((err, collection) => {
      var index = {}
      index[this.queryField] = '2dsphere'
      collection.ensureIndex(index, () => {})
    })
  },

  findNear: function(latitude, longitude, distance=1000, query={}) {
    return this._geoFind('$near', [longitude, latitude], distance, query)
  },
  
  _geoFind: function(op, coordinates, distance, query={}) {
    let geo_query = _.extend(query, {})
    geo_query[this.queryField] = {}
    geo_query[this.queryField][op] = {
      $geometry: {
        type: "Point" ,
        coordinates: coordinates
      }, 
      $maxDistance: distance
    }
    return new Promise((resolve, reject) => {
      this.native((err, collection) => {
        if(err) { reject(err) }
        collection.find(geo_query).toArray((err, objs) => {
          if(err) { reject(err) }
          resolve(objs)
        })
      })
    })
  }

})
