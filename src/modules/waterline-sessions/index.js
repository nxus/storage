import {application} from 'nxus-core'
import RouterSessions from 'nxus-router/lib/modules/router-sessions'
import waterline from 'waterline'
import {defaultModelDefinition} from 'connect-waterline'
import Promise from 'bluebird'

var session = require('express-session');
var WaterlineStore = require('connect-waterline')(session);

/**
 * WaterlineSessions provides a `nxus-router` session middleware using `connect-waterline`
 * 
 * The session model will be saved in your configured 'default' database connection.
 * 
 * ## Usage:
 * 
 *  Application config (.nxusrc) for router:
 * 
 *    "router": {
 *      "sessionStoreName": "waterline-session"
 *    }
 * 
 */

class WaterlineSessions extends RouterSessions {

  _defaultConfig() {
    let config = super._defaultConfig()
    config.connectionName = 'default'
    config.resave = false
    config.saveUninitialized = false
    return config
  }
  
  _sessionName() {
    return 'waterline-session'
  }
  
  async _createStore(settings) {
    let wl = Promise.promisifyAll(new waterline());
    let config = await application.get('storage').getWaterlineConfig()
    let connection = config.connections[this.config.connectionName]
    let options = {
      adapters: config.adapters,
      connections: {
        'connect-waterline': connection
      },
      defaults: { migrate: 'safe'}
    }
    wl.loadCollection(waterline.Collection.extend(defaultModelDefinition));    
    let res = await wl.initializeAsync(options)
    
    return new WaterlineStore({model: res.collections.sessions})
  }
}

export default WaterlineSessions
export let waterlineSessions = WaterlineSessions.getProxy()
