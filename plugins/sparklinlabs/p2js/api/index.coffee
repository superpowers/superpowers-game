fs = require 'fs'

SupAPI.addPlugin 'typescript', 'p2', {
  code: ""
  defs: fs.readFileSync(__dirname + '/p2.d.ts', encoding: 'utf8')
}
