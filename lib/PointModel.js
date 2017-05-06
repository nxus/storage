'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _BaseModel = require('./BaseModel');

var _BaseModel2 = _interopRequireDefault(_BaseModel);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createPoint(values, next) {
  var latitude = values.latitude;
  var longitude = values.longitude;
  if (!latitude || !longitude) return next();
  values[this.queryField] = { type: "Point", coordinates: [longitude, latitude] };
  next();
} /*
  * @Author: mike
  * @Date:   2016-04-05 17:03:20
  * @Last Modified 2016-04-05
  * @Last Modified time: 2016-04-05 19:46:20
  */

exports.default = _BaseModel2.default.extend({

  // Lifecycle

  queryField: 'geoPoint',

  beforeCreate: createPoint,

  beforeUpdate: createPoint,

  createGeoIndex: function () {
    this.native((err, collection) => {
      var index = {};
      index[this.queryField] = '2dsphere';
      collection.ensureIndex(index, () => {});
    });
  },

  findNear: function (latitude, longitude, distance = 1000, query = {}) {
    return this._geoFind('$near', [longitude, latitude], distance, query);
  },

  _geoFind: function (op, coordinates, distance, query = {}) {
    let geo_query = _underscore2.default.extend(query, {});
    geo_query[this.queryField] = {};
    geo_query[this.queryField][op] = {
      $geometry: {
        type: "Point",
        coordinates: coordinates
      },
      $maxDistance: distance
    };
    return new _bluebird2.default((resolve, reject) => {
      this.native((err, collection) => {
        if (err) {
          reject(err);
        }
        collection.find(geo_query).toArray((err, objs) => {
          if (err) {
            reject(err);
          }
          resolve(objs);
        });
      });
    });
  }

});