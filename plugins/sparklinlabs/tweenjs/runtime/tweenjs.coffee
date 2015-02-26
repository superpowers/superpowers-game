fs = require 'fs'
exports.typescript = fs.readFileSync(__dirname + '/tweenjs.ts', encoding: 'utf8')
exports.typescriptDefs = fs.readFileSync(__dirname + '/tweenjs.d.ts', encoding: 'utf8')
