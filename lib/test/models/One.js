'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ = require('../../');

var One = _.BaseModel.extend({
  identity: 'one',
  attributes: {
    'color': 'string'
  }
});

exports.default = One;