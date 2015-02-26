fs = require 'fs'
exports.typescript = fs.readFileSync(__dirname + '/SoundInstance.ts', encoding: 'utf8')
exports.typescriptDefs = fs.readFileSync(__dirname + '/SoundInstance.d.ts', encoding: 'utf8')
