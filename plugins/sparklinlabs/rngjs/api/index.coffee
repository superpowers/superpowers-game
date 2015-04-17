fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'rng', {
  defs: fs.readFileSync(__dirname + '/rng.d.ts.txt', encoding: 'utf8')
}
