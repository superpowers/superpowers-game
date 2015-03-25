fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'Sup.Tween', {
  code: fs.readFileSync __dirname + '/Sup.Tween.ts', encoding: 'utf8'
  defs: fs.readFileSync __dirname + '/Sup.Tween.d.ts', encoding: 'utf8'
}

SupAPI.registerPlugin 'typescript', 'TWEEN', {
  defs: fs.readFileSync __dirname + '/TWEEN.d.ts', encoding: 'utf8'
}
