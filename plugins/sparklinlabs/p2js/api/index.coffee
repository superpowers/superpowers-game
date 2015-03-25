fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'p2', {
  code: ""
  defs: fs.readFileSync(__dirname + '/p2.d.ts', encoding: 'utf8')
}
