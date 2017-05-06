'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ = require('../../');

exports.default = _.BaseModel.extend({
  attributes: {
    name: 'string'
  },
  helperMethod: function (a) {
    return a;
  }
});