fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Camera', {
  code: fs.readFileSync(__dirname + '/Camera.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Camera.d.ts', encoding: 'utf8')
  exposeAsActorComponent: true
}
