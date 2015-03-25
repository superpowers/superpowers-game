fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'Sup.Scene', {
  code: fs.readFileSync __dirname + '/Sup.Scene.ts', encoding: 'utf8'
  defs: fs.readFileSync __dirname + '/Sup.Scene.d.ts', encoding: 'utf8'
}
