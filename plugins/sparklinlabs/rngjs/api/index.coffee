fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'rng', {
  defs: fs.readFileSync(__dirname + '/rng.d.ts', encoding: 'utf8')
}
