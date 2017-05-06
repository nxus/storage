/* globals before: false, beforeEach: false, after: false, afterEach: false, describe: false, it: false, expect: false */
'use strict';

var _ = require('../');

var _2 = _interopRequireDefault(_);

var _sinon = require('sinon');

var _sinon2 = _interopRequireDefault(_sinon);

var _nxusCore = require('nxus-core');

var _One = require('./models/One');

var _One2 = _interopRequireDefault(_One);

var _Two = require('./models/Two');

var _Two2 = _interopRequireDefault(_Two);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// example from RFC 7946, section 1.5
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

// these are slightly larger than the area covered by the geoJSONGeometry - seems to be necessary; probably issues with spherical geometry
const surroundCoord = { 'type': 'Polygon',
  'coordinates': [[[99.5, -0.5], [105.5, -0.5], [105.5, 1.5], [99.5, 1.5], [99.5, -0.5]]] };
const intersectCoord = { 'type': 'Polygon',
  'coordinates': [[[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]]] };
const throughCoord = { 'type': 'LineString',
  'coordinates': [[100.0, 0.5], [105.0, 0.5]] };
const multiSurroundCoord = { 'type': 'MultiPolygon',
  'coordinates': [[[[99.5, -0.5], [101.5, -0.5], [101.5, 1.5], [99.5, 1.5], [99.5, -0.5]]], [[[101.5, -0.5], [105.5, -0.5], [105.5, 1.5], [101.5, 1.5], [101.5, -0.5]]]] };

describe("Storage", () => {
  var storage;

  before(() => {
    _sinon2.default.spy(_nxusCore.application, "once");
    _sinon2.default.spy(_nxusCore.application, "onceAfter");
    _sinon2.default.spy(_.storage, "respond");
    _sinon2.default.spy(_.storage, "request");
  });

  // beforeEach(() => {
  //   app = new TestApp();
  //   app.config.storage = {
  //     adapters: {
  //       "default": "sails-memory"
  //     },
  //     modelsDir: './src/models',
  //     connections: {
  //       'default': {
  //         adapter: 'default'
  //       }
  //     }
  //   }
  // });

  describe("Load", () => {
    it("should not be null", () => _2.default.should.not.be.null);
    it("should provide waterline", () => _.Waterline.should.not.be.null);
    it("should provide BaseModel", () => _.BaseModel.should.not.be.null);

    it("should not be null", () => {
      _2.default.should.not.be.null;
      _.storage.should.not.be.null;
    });

    it("should be instantiated", () => {
      storage = new _2.default(_nxusCore.application);
      storage.should.not.be.null;
    });
  });

  describe("Init", () => {
    it("should register for app lifecycle", () => {
      _nxusCore.application.once.called.should.be.true;
      _nxusCore.application.onceAfter.calledWith('load').should.be.true;
      _nxusCore.application.once.calledWith('init').should.be.true;
      _nxusCore.application.once.calledWith('stop').should.be.true;
    });

    it("should have config after load", () => {
      return _nxusCore.application.emit('load').then(() => {
        storage.should.have.property('config');
        storage.config.should.have.property('connections');
      });
    });
  });
  describe("Models", () => {
    before(() => {
      _sinon2.default.spy(storage, 'provide');
      _sinon2.default.spy(storage, 'emit');
    });
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };

      var Dummy = _.BaseModel.extend({
        identity: 'dummy',
        connection: 'default',
        attributes: {
          name: 'string'
        }
      });
      // Shortcut around gather stub
      storage.model(Dummy);
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should have a collection of models", () => {
      storage.collections.should.not.be.null;
      storage.connections.should.not.be.null;
      storage.collections.should.have.property('dummy');
    });
    it("should return model by identity", () => {
      var dummy = storage.getModel('dummy');
      dummy.should.exist;
      dummy.identity.should.equal('dummy');
    });
  });
  describe("Model Dir", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should register local models", () => {
      return storage.modelDir(__dirname + "/models").then(ids => {
        storage.provide.calledTwice.should.be.true;
        storage.provide.calledWith('model').should.be.true;
        ids.length.should.equal(2);
        ids.includes('one').should.be.true;
        ids.includes('two').should.be.true;
      });
    });
  });

  describe("Dynamic Adapter", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });

    it("should have required the adapter", done => {
      storage.config.adapters["default"].should.have.property("identity", "sails-memory");
      done();
    });
  });

  describe("Model Base class", () => {
    beforeEach(() => {
      storage.config = {
        adapters: {
          "default": "sails-memory"
        },
        modelsDir: './test/models',
        connections: {
          'default': {
            adapter: 'default'
          }
        }
      };
      storage._setupAdapter();
      storage.model(_One2.default);
      storage.model(_Two2.default);
      return storage._connectDb();
    });

    afterEach(() => {
      return storage._disconnectDb();
    });
    it("should return models with correct methods inherited", () => {
      var one = storage.getModel('one');
      var two = storage.getModel('two');

      one.should.have.property("createOrUpdate");
      two.should.have.property("createOrUpdate");
      two.should.have.property("helperMethod");
      two.helperMethod("xx").should.equal("xx");
      two.attributes.should.have.property('name');
      two.attributes.should.have.property('other');
    });
    it("should have a displayName", () => {
      var one = storage.getModel('one');
      return one.create({ color: 'red' }).then(obj => {
        storage.emit.calledWith('model.create').should.be.true;
        storage.emit.calledWith('model.create.one').should.be.true;
        obj.displayName().should.equal('red');
      });
    });
    it("should emit CRUD events", () => {
      var one = storage.getModel('one');
      return one.create({ color: 'red' }).then(obj => {
        storage.emit.calledWith('model.create').should.be.true;
        storage.emit.calledWith('model.create.one').should.be.true;
        obj.color = 'blue';
        return obj.save().then(() => obj); // save doesn't return object as of waterline 0.11.0
      }).then(obj => {
        storage.emit.calledWith('model.update').should.be.true;
        storage.emit.calledWith('model.update.one').should.be.true;
        return obj.destroy();
      }).then(() => {
        storage.emit.calledWith('model.destroy').should.be.true;
        storage.emit.calledWith('model.destroy.one').should.be.true;
      });
    });
  });
  describe("Model Geo class", () => {
    const Geo = _.GeoModel.extend({
      identity: 'geo',
      attributes: {
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
          "default": "sails-mongo"
        },
        connections: {
          'default': {
            adapter: 'default',
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

      it("getGeometry(obj) should find Polygon objects", () => {
        let geometry = geo.getGeometry(obj);
        expect(geometry).to.be.instanceof(Object);
        expect(geometry).to.deep.equal(geoJSONPolygon);
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
  });
});