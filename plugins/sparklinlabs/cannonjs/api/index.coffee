fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'CANNON', {
  code: ""
  defs: fs.readFileSync(__dirname + '/CANNON.d.ts', encoding: 'utf8')
}
