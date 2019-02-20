'use strict'

import {BaseModel} from '../../'

var One = BaseModel.extend({
  identity: 'one',
  attributes: {
    'color': 'string',
  }
});

export default One;
