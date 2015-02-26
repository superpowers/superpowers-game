TileMap = require '../components/TileMap'
exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) ->
    callback null, new TileMap data
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new player.Sup.TileMap asset

fs = require 'fs'
exports.typescript = fs.readFileSync __dirname + '/tileMap.ts', { encoding: 'utf8' }
exports.typescriptDefs = fs.readFileSync __dirname + '/tileMap.d.ts', { encoding: 'utf8' }
