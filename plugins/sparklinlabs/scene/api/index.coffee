fs = require 'fs'

SupAPI.addPlugin 'typescript', 'scene', {
  code: fs.readFileSync(__dirname + '/scene.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/scene.d.ts', encoding: 'utf8')
}
