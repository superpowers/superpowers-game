fs = require 'fs'

SupAPI.addPlugin 'typescript', 'CANNON', {
  code: ""
  defs: fs.readFileSync(__dirname + '/Cannon.d.ts', encoding: 'utf8')
}
