'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _waterline = require('waterline');

var _waterline2 = _interopRequireDefault(_waterline);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var BaseModel = _waterline2.default.Collection.extend({
  connection: 'default',
  storageModule: null,
  attributes: {
    displayName: function displayName() {
      // Appears there is no way to get to the attribute definitions from an instance.
      var firstString = _underscore2.default.first(_underscore2.default.compact((0, _underscore2.default)(this).pairs().map(([key, value]) => {
        if (!_underscore2.default.contains(['id', 'createdAt', 'updatedAt'], key) && _underscore2.default.isString(value)) return key;
      })));
      return this[firstString];
    }
  },

  afterCreate: function (record, next) {
    if (this.storageModule) {
      this.storageModule.emitModelEvent('create', this.identity, record);
    }
    next();
  },

  afterUpdate: function (record, next) {
    if (this.storageModule) {
      this.storageModule.emitModelEvent('update', this.identity, record);
    }
    next();
  },

  afterDestroy: function (record, next) {
    if (this.storageModule) {
      if (record && record[0]) record = record[0];
      this.storageModule.emitModelEvent('destroy', this.identity, record);
    }
    next();
  },

  createOrUpdate: function (criteria, values) {
    return this.findOne(criteria).then(obj => {
      if (obj) {
        return this.update(obj.id, values).then(objs => {
          return objs[0];
        });
      } else {
        return this.create(values);
      }
    });
  }
});

BaseModel.extend = function (protoProps, staticProps) {
  // Waterline wants each model to have its own connection property, rather than inheriting
  if (protoProps.connection === undefined) {
    protoProps.connection = this.prototype.connection;
  }
  // Waterline wants each model to have its own attributes property, we want to combine
  if (protoProps.attributes === undefined) {
    protoProps.attributes = {};
  }
  protoProps.attributes = _underscore2.default.extend({}, this.prototype.attributes, protoProps.attributes);
  return _waterline2.default.Collection.extend.call(this, protoProps, staticProps);
};

exports.default = BaseModel;