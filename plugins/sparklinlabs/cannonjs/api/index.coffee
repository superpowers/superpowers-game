fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Cannon', {
  code: ""
  defs: fs.readFileSync(__dirname + '/Cannon.d.ts', encoding: 'utf8')
}
