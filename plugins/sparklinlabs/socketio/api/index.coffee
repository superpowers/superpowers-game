fs = require 'fs'

SupAPI.registerPlugin('typescript', 'socketio', {
  defs: fs.readFileSync(__dirname + '/../typings/socket.io-client/socket.io-client.d.ts', encoding: 'utf8')
});
