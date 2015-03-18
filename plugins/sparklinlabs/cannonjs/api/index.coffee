fs = require 'fs'

SupAPI.addPlugin 'typescript', 'CANNON', {
  code: ""
  defs: fs.readFileSync(__dirname + '/CANNON.d.ts', encoding: 'utf8')
}
