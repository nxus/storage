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
    return new Promise((resolve, reject) => {
      this.native((err, collection) => {
        if(err) { reject(err); return }
        let index = { [this.queryField]: '2dsphere' }
        resolve(collection.createIndex(index))
      })
    })
  },

  findNear: function(latitude, longitude, distance=1000, query={}) {
    return this._geoFindPoint('$near', [longitude, latitude], distance, query)
  },

    /** Finds records within specified geographic coordinates.
   *
   * The method goes through some odd gyrations in order to mesh the
   * MongoDB geographic query with Waterline query handling.
   *
   * First, it _indirectly_ returns a Waterline query, by returning a
   * promise that resolves to a function that evaluates to the query.
   * This due to the fact that the query has promise semantics.
   * Returning it indirectly defers evaluation, allowing you to refine
   * it (using the chainable methods such as .populate()`, `.where()`,
   * and `.sort()`) before evaluating it.
   *
   * Second, it actually evaluates the MongoDB geographic query to
   * produce a list of matching record ids, and the returned Waterline
   * query is a second query based on these ids. Again, this to allow
   * you to refine the query before evaluation. Be aware that this
   * won't scale well to huge record sets, but should work for any of
   * moderate size.
   *
   * @param {Object} coordinates - A GeoJSON geometry object
   *   specifying the geographic region to select; it must be of type
   *   `Polygon` or `MultiPolygon`.
   * @returns {Promise} A promise that resolves to a function that
   *   returns a Waterline query for the specified coordinates.
   *
   * @example
   *   ```
   *   model.findWithin({ 'type': 'Polygon', 'coordinates': ... }).then((query) => {
   *     return query().where(...).populate(...)
   *   }).then((records) => {
   *     ...
   *   })
   *   ```
   */
  findWithin: function(coordinates) {
    return this._geoFind('$geoWithin', coordinates)
  },

  /** Finds records intersecting specified geographic coordinates.
   * @param {Object} coordinates - A GeoJSON geometry object
   *   specifying the geographic region to select.
   * @returns {Promise} A promise that resolves to a function that
   *   returns a Waterline query for the specified coordinates. See
   *   `findWithin()` for further explanation.
   */
  findIntersects: function(coordinates) {
    return this._geoFind('$geoIntersects', coordinates)
  },

  _geoFind: function(op, coordinates) {
    let geoQuery = { [this.queryField]: { [op]: {$geometry: coordinates} } }
    return new Promise((resolve, reject) => {
      this.native((err, collection) => {
        if(err) { reject(err); return }
        collection.find(geoQuery, {_id: 1}).toArray((err, objs) => {
          if(err) { reject(err); return }
          let ids = _.pluck(objs, '_id'),
              wlQuery = { 'id': (ids.length > 0) ? ids : "" }
                // FIX ME: Waterline (^0.12.2) ignores criteria with empty array, at least when combined with additional .where() clause
          resolve(() => { return this.find(wlQuery)})
        })
      })
    })
  },
  
  _geoFindPoint: function(op, coordinates, distance, query={}) {
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
