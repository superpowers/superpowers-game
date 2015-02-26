exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', callback
  return

exports.createOuterAsset = (player, asset) ->
  return new player.Sup.Scene asset

fs = require 'fs'
exports.typescript = fs.readFileSync(__dirname + '/scene.ts', encoding: 'utf8')
exports.typescriptDefs = fs.readFileSync(__dirname + '/scene.d.ts', encoding: 'utf8')
