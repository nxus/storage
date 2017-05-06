'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ExtraBase = require('../base/ExtraBase');

var _ExtraBase2 = _interopRequireDefault(_ExtraBase);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = _ExtraBase2.default.extend({
  identity: 'two',
  attributes: {
    other: 'string'
  }
});