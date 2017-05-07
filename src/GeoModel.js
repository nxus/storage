import BaseModel from './BaseModel'
import Promise from 'bluebird'

import _ from "underscore"
import rewind from 'geojson-rewind'
import turf from '@turf/meta'
import turfCentroid from '@turf/centroid'
turf.centroid = turfCentroid

/** Cleans up polygon coordinates.
 * For each linear ring that defines the polygon, it removes repeated
 * coordinates, ensures ring is closed. It discards rings with less than
 * four points, and if the outer ring is discarded the polygon becomes
 * undefined.
 * @private
 */
function cleanPolygon(coordinates) {
  function near(v1, v2) { return Math.abs(v1 - v2) < 0.000001 } // about 10 cm
  function same(c1, c2) { return near(c1[0], c2[0]) && near(c1[1], c2[1]) }

  let rslt = []
  coordinates.forEach((ring, index) => {
    ring = ring.reduce((acc, val, idx) => {
      if ((idx === 0) || !same(acc[acc.length - 1], val)) acc.push(val)
      return acc
    }, [])
    if (same(ring[0], ring[ring.length - 1])) ring.pop()
    ring.push(ring[0])
    if (ring.length < 4) ring = undefined
    if (ring || (index === 0)) rslt.push(ring)
  })
  return rslt[0] && rslt
}

function cleanGeometryCoordinates(parts) {
  let cleaned = []
  parts.Polygon.forEach((coordinates) => {
    coordinates = cleanPolygon(coordinates)
    if (coordinates) {
      let obj = rewind({type: 'Polygon', coordinates})
      cleaned.push(obj.coordinates)
    }
  })
  parts.Polygon = cleaned
}

/** Extracts geometry coordinates from a GeoJSON object.
 * It is strict in that it processes only portions of the object that it
 * recognizes as valid GeoJSON, but lenient in that it accomodates
 * missing properties and ignores misplaced or unrecognized properties.
 * @private
 * @returns {Object} An object with `Polygon`, `Point` and `LineString`
 *   properties, each an array of geometry coordinates matching the
 *   property name
 */
function extractGeometryCoordinates(obj) {
  let parts = { Polygon: [], Point: [], LineString: [] }

  function save(type, coordinates) { if (coordinates) parts[type].push(coordinates) }

  // extract coordinates from GeoJSON geometry object, breaking down 'Multi' objects into their parts
  function extract(node) {
    switch (node.type) {
    case 'Polygon':
      save('Polygon', node.coordinates)
      break
    case 'MultiPolygon':
      if (node.coordinates) node.coordinates.forEach((coordinates) => { save('Polygon', coordinates) })
      break
    case 'Point':
      save('Point', node.coordinates)
      break
    case 'MultiPoint':
      if (node.coordinates) node.coordinates.forEach((coordinates) => { save('Point', coordinates) })
      break
    case 'LineString':
      save('LineString', node.coordinates)
      break
    case 'MultiLineString':
      if (node.coordinates) node.coordinates.forEach((coordinates) => { save('LineString', coordinates) })
      break
    case 'GeometryCollection':
      if (node.geometries) node.geometries.forEach((geometry) => { extract(geometry) })
      break
    }
  }

  if (obj) turf.geomEach(obj, extract)
  return parts
}

/** Assembles geometry object from geometry coordinates.
 * @private
 * @param {Object} parts - geometry coordinates, as returned by
 *   `extractGeometryCoordinates()`
 * @returns {Object} A GeoJSON object assembled from the geometry
 *   coordinates; undefined if there were no coordinates
 */
function assembleGeometryObject(parts) {
  let geometries = []

  // reassemble geometry objects, combining parts into 'Multi' objects as needed
  _.each(parts, (coordinates, type) => {
    if (coordinates.length > 0) {
      geometries.push(
        (coordinates.length > 1) ?
          { type: 'Multi' + type, coordinates: coordinates } :
          { type: type, coordinates: coordinates[0] } )
    }
  })

  return (geometries.length === 0) ? undefined :
      (geometries.length > 1) ?
        { type: 'GeometryCollection', geometries: geometries } :
        geometries[0]
}

function extractGeometryFeatures(values, next) {
  let val = values[this.geometryField], geo
  if (val !== undefined) {
    try {
      if (_.isString(val)) val = JSON.parse(val)
      let parts = extractGeometryCoordinates(val)
      cleanGeometryCoordinates(parts)
      geo = assembleGeometryObject(parts)
    }
    catch (e) {} // FIX ME: should this cause create/update to fail?
    values[this.geometryFeatureField] = geo || null
  }
  next()
}

/** Base for Waterline models containing a GeoJSON geographic field.
 *
 * It provides methods for performing geo queries on the GeoJSON field
 * &ndash; `findWithin()` selects records that lie within specified
 * coordinates, and `findIntersects()` selects records that intersect.
 *
 * To implement the geo queries, the GeoJSON data must be indexed. And
 * because the MongoDB 2dsphere index can handle only GeoJSON geometry
 * features, the index is applied to a derived _features_ field that
 * contains just the geometry features from the primary GeoJSON field.
 * The `GeoModel` provides the machinery for keeping the features field
 * synchronized with the primary GeoJSON field.
 *
 * The `createGeoIndex()` method should be invoked to ensure the index
 * is created. Typically, after the startup lifecycle phase.
 *
 * Configuration is through these model properties:
 * *   `geometryField` (string) - Name of the primary GeoJSON field (default is `geo`).
 * *   `geometryFeatureField` (string) - Name of the geometry features field (default is `geoFeatures`).
 * Both of these fields must also be defined as model attributes with
 * type `json`.
 */
const GeoModel = BaseModel.extend(
  /** @lends GeoModel */
  {

    // Lifecycle

    geometryField: 'geo',
    geometryFeatureField: 'geoFeatures',

    beforeCreate: extractGeometryFeatures,
    beforeUpdate: extractGeometryFeatures,

    /** Ensures index is defined for geographic field.
     * (Actually, on the field specified by `geometryFeatureField`.)
     * @returns {Promise} A promise that resolves or rejects when index
     *   creation completes. It's worthwhile attaching a `.catch()`
     *   clause to this promise to log errors; index creation can fail
     *   for a variety of reasons, including invalid data in the
     *   geometry feature field.
     */
    createGeoIndex: function() {
      return new Promise((resolve, reject) => {
        this.native((err, collection) => {
          if(err) { reject(err); return }
          let index = { [this.geometryFeatureField]: '2dsphere' }
          resolve(collection.createIndex(index))
        })
      })
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
     *   model.findWithin({ 'type': 'Polygon', 'coordinates': ... }).then((fn) => {
     *     return fn().where(...).populate(...)
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

    /** Gets GeoJSON geometry object from the GeoJSON geographic field.
     * Typical use is to extract `Polygon` geometry objects for use as
     * coordinates for the `findWithin()` or `findIntersects()` methods.
     * @param {Object} record - `GeoModel` record containing geographic field
     * @param {...string} types - geometry types to include (default is `Polygon`)
     * @returns {Object} GeoJSON geometry object; undefined if no
     *   matching geometry objects were present
     */
    getGeometry: function(record, ...types) {
      let val = record[this.geometryFeatureField], geo
      if (val) {
        if (types.length === 0) types.push('Polygon')
        try {
          let parts = extractGeometryCoordinates(val)
          geo = assembleGeometryObject(_.pick(parts, types))
        }
        catch (e) {}
      }
      return geo
    },

    /** Gets the centroid of the GeoJSON geographic field.
     * @param {Object} record - `GeoModel` record containing geographic field
     * @returns {Object} GeoJSON Point object; undefined if no
     *   geometry objects were present from which to derive a centroid
     */
    getCentroid: function(record) {
      let val = record[this.geometryFeatureField], geo
      if (val) {
        try {
          let feature = turf.centroid(val)
          geo = feature.geometry
        }
        catch (e) {}
      }
      return geo
    },

    _geoFind: function(op, coordinates) {
      let geoQuery = { [this.geometryFeatureField]: { [op]: {$geometry: coordinates} } }
      return new Promise((resolve, reject) => {
        this.native((err, collection) => {
          if(err) { reject(err); return }
          collection.find(geoQuery, {_id: 1}).toArray((err, objs) => {
            if(err) { reject(err); return }
            let wlQuery = { 'id': _.pluck(objs, '_id') }
            resolve(() => { return this.find(wlQuery)})
          })
        })
      })
    }

  })

export {GeoModel as default}
