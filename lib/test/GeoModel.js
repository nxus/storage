/* globals before: false, beforeEach: false, after: false, afterEach: false, describe: false, it: false, expect: false */
'use strict';

var _ = require('../');

var _2 = _interopRequireDefault(_);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// example from RFC 7946, section 1.5 (deconstructed and reassembled)
const geoJSONPoint = { 'type': 'Point', 'coordinates': [102.0, 0.5] },
      geoJSONLineString = { 'type': 'LineString',
  'coordinates': [[102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]] },
      geoJSONPolygon = { 'type': 'Polygon',
  'coordinates': [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]] },
      geoJSON = { 'type': 'FeatureCollection',
  'features': [{ 'type': 'Feature',
    'geometry': geoJSONPoint,
    'properties': { 'prop0': 'value0' } }, { 'type': 'Feature',
    'geometry': geoJSONLineString,
    'properties': { 'prop0': 'value0', 'prop1': 0.0 } }, { 'type': 'Feature',
    'geometry': geoJSONPolygon,
    'properties': { 'prop0': 'value0', 'prop1': { 'this': 'that' } } }]
},
      geoJSONGeometry = { 'type': 'GeometryCollection',
  'geometries': [geoJSONPolygon, geoJSONPoint, geoJSONLineString] },
      geoJSONCentroid = { 'type': 'Point', 'coordinates': [102.0, 0.5] };

// does not follow the right-hand rule; missing closure point
const geoJSONMess = { 'type': 'Polygon',
  'coordinates': [[[-78.81248474121094, 35.68853320738875], [-78.81248474121094, 35.862343734896484], [-78.45817565917967, 35.862343734896484], [-78.45817565917967, 35.68853320738875]]] },
      geoJSONCleaned = { 'type': 'Polygon',
  'coordinates': [[[-78.81248474121094, 35.68853320738875], [-78.45817565917967, 35.68853320738875], [-78.45817565917967, 35.862343734896484], [-78.81248474121094, 35.862343734896484], [-78.81248474121094, 35.68853320738875]]] };

// these are slightly larger than the area covered by the geoJSONGeometry - seems to be necessary; probably issues with spherical geometry
const surroundCoord = { 'type': 'Polygon',
  'coordinates': [[[99.5, -0.5], [105.5, -0.5], [105.5, 1.5], [99.5, 1.5], [99.5, -0.5]]] };
const intersectCoord = { 'type': 'Polygon',
  'coordinates': [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]] };
const throughCoord = { 'type': 'LineString',
  'coordinates': [[100.0, 0.5], [105.0, 0.5]] };
const multiSurroundCoord = { 'type': 'MultiPolygon',
  'coordinates': [[[[99.5, -0.5], [101.5, -0.5], [101.5, 1.5], [99.5, 1.5], [99.5, -0.5]]], [[[101.5, -0.5], [105.5, -0.5], [105.5, 1.5], [101.5, 1.5], [101.5, -0.5]]]] };

const geoJSONMultiPolygon = { 'type': 'MultiPolygon',
  'coordinates': [[[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]], [[[102.0, 0.0], [103.0, 0.0], [103.0, 1.0], [102.0, 1.0], [102.0, 0.0]]], [[[104.0, 0.0], [105.0, 0.0], [105.0, 1.0], [104.0, 1.0], [104.0, 0.0]]]] },
      geoJSONMultiPoint = { 'type': 'MultiPoint',
  'coordinates': [[100.5, 0.5], [102.5, 0.5], [104.5, 0.5]] },
      geoJSONOtherPolygon = { 'type': 'Polygon',
  'coordinates': [[[106.0, 0.0], [107.0, 0.0], [107.0, 1.0], [106.0, 1.0], [106.0, 0.0]]] },
      geoJSONOtherPoint = { 'type': 'Point',
  'coordinates': [106.5, 0.5] };

describe("Storage", () => {
  var storage;

  before(() => {
    storage = new _2.default();
    _sinon2.default.spy(storage, 'provide');
    _sinon2.default.spy(storage, 'emit');
  });

  describe("Model Geo class", () => {
    const Geo = _.GeoModel.extend({
      identity: 'geo',
      connection: 'nxus-storage-test',
      attributes: {
        'name': 'string',
        'location': 'json',
        'locationFeatures': 'json'
      },
      geometryField: 'location',
      geometryFeatureField: 'locationFeatures'
    });
    const record = {
      'location': geoJSON };

    beforeEach(() => {
      storage.config = {
        adapters: {
          "mongo": "sails-mongo"
        },
        connections: {
          'nxus-storage-test': {
            adapter: 'mongo',
            url: 'mongodb://localhost/nxus-storage-test'
          }
        }
      };
      storage._setupAdapter();
      storage.model(Geo);
      return storage._connectDb().then(() => {
        var geo = storage.getModel('geo');
        return geo.destroy({});
      });
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should return models with correct methods inherited", () => {
      var geo = storage.getModel('geo');
      geo.should.have.property('createGeoIndex');
      geo.should.have.property('findWithin');
      geo.should.have.property('findIntersects');
    });

    it("should create Geo index", () => {
      var geo = storage.getModel('geo');
      return geo.createGeoIndex();
    });

    it("should emit CRUD events", () => {
      var geo = storage.getModel('geo');
      return geo.create(record).then(obj => {
        storage.emit.calledWith('model.create').should.be.true;
        storage.emit.calledWith('model.create.geo').should.be.true;
        obj.location = null;
        return obj.save().then(() => obj); // save doesn't return object as of waterline 0.11.0
      }).then(obj => {
        storage.emit.calledWith('model.update').should.be.true;
        storage.emit.calledWith('model.update.geo').should.be.true;
        return obj.destroy();
      }).then(() => {
        storage.emit.calledWith('model.destroy').should.be.true;
        storage.emit.calledWith('model.destroy.geo').should.be.true;
      });
    });

    it("should manage features property", () => {
      var geo = storage.getModel('geo');
      return geo.create(record).then(obj => {
        expect(obj).to.exist;
        obj.should.have.property('id');
        obj.should.have.property('createdAt');
        obj.should.have.property('updatedAt');
        expect(obj.location).to.deep.equal(geoJSON);
        expect(obj.locationFeatures).to.deep.equal(geoJSONGeometry);
        obj.location = null;
        return obj.save().then(() => geo.findOne({ id: obj.id }));
      }).then(obj => {
        expect(obj).to.exist;
        expect(obj.location).to.be.null;
        expect(obj.locationFeatures).to.be.null;
        return obj.destroy().then(() => geo.findOne({ id: obj.id }));
      }).then(obj => {
        expect(obj).to.be.undefined;
      });
    });

    describe("Model Geo class findWithin() and findIntersects() methods", () => {
      var geo, obj;

      beforeEach(() => {
        geo = storage.getModel('geo');
        return geo.create(record).then(rslt => {
          obj = rslt;
        });
      });
      afterEach(() => {
        return obj.destroy();
      });

      it("findWithin() should find entity within coordinates", () => {
        return geo.findWithin(surroundCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findWithin() should find entity within MultiPolygon coordinates", () => {
        return geo.findWithin(multiSurroundCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findWithin() should not find entity intersecting coordinates", () => {
        return geo.findWithin(intersectCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 0);
        });
      });

      it("findIntersects() should find entity within coordinates", () => {
        return geo.findIntersects(surroundCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findIntersects() should find entity intersecting coordinates", () => {
        return geo.findIntersects(intersectCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findIntersects() should find entity lined through coordinates", () => {
        return geo.findIntersects(throughCoord).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findIntersects() should find entity matching GeometryCollection coordinates", () => {
        return geo.findIntersects(geoJSONGeometry).then(query => {
          return query();
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });
    });

    describe("Model Geo class findIntersects() with MultiPoint and MultiPolygon", () => {
      var geo, objs;

      const records = [{ 'location': geoJSONMultiPolygon }, { 'location': geoJSONMultiPoint }, { 'location': { 'type': 'Polygon', 'coordinates': geoJSONMultiPolygon['coordinates'][0] } }, { 'location': { 'type': 'Point', 'coordinates': geoJSONMultiPoint['coordinates'][0] } }, { 'location': geoJSONOtherPolygon }, { 'location': geoJSONOtherPoint }];

      const intersectsMaps = [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 2, 3], [4, 5], [4, 5]];

      const withinMaps = [[0, 1, 2, 3], null, [2, 3], null, [4, 5], null];

      beforeEach(() => {
        geo = storage.getModel('geo');
        return Promise.mapSeries(records, record => {
          return geo.create(record);
        }).then(rslts => {
          objs = rslts;
        });
      });

      afterEach(() => {
        return Promise.each(objs, obj => {
          return obj.destroy();
        });
      });

      it("findIntersects() should find intersecting records", () => {
        return Promise.each(objs, (obj, idx) => {
          let coordinates = geo.getGeometry(obj),
              rsltMap = intersectsMaps[idx];
          return geo.findIntersects(coordinates).then(query => {
            return query().then(rslts => {
              expect(rslts).to.be.instanceof(Array);
              rslts.should.have.property('length', rsltMap.length);
              for (let i = 0; i < rsltMap.length; i += 1) rslts[i].should.deep.equal(objs[rsltMap[i]]);
            });
          });
        });
      });

      it("findWithin() should find contained records", () => {
        return Promise.each(objs, (obj, idx) => {
          let coordinates = geo.getGeometry(obj, 'Polygon'),
              rsltMap = withinMaps[idx];
          if (!rsltMap) expect(coordinates).to.not.exist;else {
            return geo.findWithin(coordinates).then(query => {
              return query().then(rslts => {
                expect(rslts).to.be.instanceof(Array);
                rslts.should.have.property('length', rsltMap.length);
                for (let i = 0; i < rsltMap.length; i += 1) rslts[i].should.deep.equal(objs[rsltMap[i]]);
              });
            });
          }
        });
      });
    });

    describe("Model Geo class findWithin() method with .where() clause", () => {
      var geo, obj;

      const record = {
        'name': "whatever",
        'location': geoJSON };

      beforeEach(() => {
        geo = storage.getModel('geo');
        return geo.create(record).then(rslt => {
          obj = rslt;
        });
      });
      afterEach(() => {
        return obj.destroy();
      });

      it("findWithin() should find entity within coordinates", () => {
        return geo.findWithin(surroundCoord).then(query => {
          return query().where({ name: "whatever" });
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 1);
        });
      });

      it("findWithin() should not find entity intersecting coordinates", () => {
        return geo.findWithin(intersectCoord).then(query => {
          return query().where({ name: "whatever" });
        }).then(rslts => {
          expect(rslts).to.be.instanceof(Array);
          rslts.should.have.property('length', 0);
        });
      });
    });

    describe("Model Geo class getGeometry() and getCentroid() methods", () => {
      var geo, obj;

      beforeEach(() => {
        geo = storage.getModel('geo');
        return geo.create(record).then(rslt => {
          obj = rslt;
        });
      });
      afterEach(() => {
        return obj.destroy();
      });

      it("getGeometry(obj) should find all geometry objects", () => {
        let geometry = geo.getGeometry(obj);
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONGeometry);
      });

      it("getGeometry(obj, 'Polygon') should find Polygon objects", () => {
        let geometry = geo.getGeometry(obj, 'Polygon');
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONPolygon);
      });

      it("getGeometry(obj, 'Point') should find Point objects", () => {
        let geometry = geo.getGeometry(obj, 'Point');
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONPoint);
      });

      it("getGeometry(obj, 'LineString') should find LineString objects", () => {
        let geometry = geo.getGeometry(obj, 'LineString');
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONLineString);
      });

      it("getGeometry(obj, 'Polygon', 'Point', 'LineString') should find all geometry objects", () => {
        let geometry = geo.getGeometry(obj, 'Polygon', 'Point', 'LineString');
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONGeometry);
      });

      it("getCentroid(obj) should find centroid", () => {
        let centroid = geo.getCentroid(obj);
        expect(centroid).to.be.instanceof(Object);
        expect(centroid).to.deep.equal(geoJSONCentroid);
      });
    });

    describe("Model Geo class Polygon cleanup", () => {
      var geo, obj;

      const record = {
        'location': geoJSONMess };

      beforeEach(() => {
        geo = storage.getModel('geo');
        return geo.create(record).then(rslt => {
          obj = rslt;
        });
      });
      afterEach(() => {
        return obj.destroy();
      });

      it("getGeometry(obj) should return cleaned geometry objects", () => {
        let geometry = geo.getGeometry(obj);
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONCleaned);
      });
    });
  });
});