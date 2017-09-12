import {application} from 'nxus-core'
import RouterSessions from 'nxus-router/lib/modules/router-sessions'
var session = require('express-session');
var WaterlineStore = require('connect-waterline')(session);

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
    let config = await application.get('storage').getWaterlineConfig()
    let options = {
      adapters: config.adapters,
      connections: {
        'connect-waterline': config.connections[this.config.connectionName]
      }
    }
    return new WaterlineStore(options)
  }
}

export default WaterlineSessions
export let waterlineSessions = WaterlineSessions.getProxy()
