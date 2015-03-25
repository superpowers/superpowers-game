path = require 'path'
fs = require 'fs'

module.exports = class TileSetAsset extends SupCore.data.base.Asset

  @schema:
    image: { type: 'buffer' }
    gridSize: { type: 'integer', min: 1, mutable: true }
    tileProperties:
      type: 'hash'
      values:
        type: 'hash'
        keys: { minLength: 1, maxLength: 80 }
        values: { type: 'string', minLength: 0, maxLength: 80 }

  constructor: (pub, serverData) ->
    super pub, @constructor.schema, serverData

  init: (callback) ->
    @pub =
      image: new Buffer(0)
      gridSize: 40
      tileProperties: {}

    super callback; return

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "asset.json"), { encoding: 'utf8' }, (err, json) =>
      @pub = JSON.parse(json)
      fs.readFile path.join(assetPath, "image.dat"), (err, buffer) =>
        @pub.image = buffer
        @setup()
        @emit 'load'
        return
      return
    return

  save: (assetPath, callback) ->
    buffer = @pub.image
    delete @pub.image
    json = JSON.stringify @pub, null, 2
    @pub.image = buffer
    fs.writeFile path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, =>
      fs.writeFile path.join(assetPath, "image.dat"), buffer, callback
      return
    return

  server_upload: (client, image, callback) ->
    if ! (image instanceof Buffer) then callback 'Image must be an ArrayBuffer'; return

    @pub.image = image

    callback null, image
    @emit 'change'
    return

  client_upload: (image) ->
    @pub.image = image
    return

  server_addTileProperty: (client, tile, name, callback) ->
    if typeof(tile) != 'object' or
    ! tile.x? or typeof(tile.x) != 'number' or
    ! tile.y? or typeof(tile.y) != 'number'

      callback "Invalid tile location"
      return

    if typeof(name) != 'string' then callback "Invalid property name"; return

    property = []
    property[name] = ""
    violation = SupCore.data.base.getRuleViolation property, @constructor.schema.tileProperties.values, true
    if violation? then callback "Invalid property: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    if @pub.tileProperties["#{tile.x}_#{tile.y}"]?[name]? then callback "Property #{name} already exists"; return

    @pub.tileProperties["#{tile.x}_#{tile.y}"] ?= {}
    @pub.tileProperties["#{tile.x}_#{tile.y}"][name] = ""
    callback null, tile, name
    @emit 'change'
    return

  client_addTileProperty: (tile, name) ->
    @pub.tileProperties["#{tile.x}_#{tile.y}"] ?= {}
    @pub.tileProperties["#{tile.x}_#{tile.y}"][name]= ""
    return

  server_renameTileProperty: (client, tile, name, newName, callback) ->
    if typeof(tile) != 'object' or
    ! tile.x? or typeof(tile.x) != 'number' or
    ! tile.y? or typeof(tile.y) != 'number'

      callback "Invalid tile location"
      return

    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"]? then callback "Tile #{x}_#{y} doesn't have any property"; return
    if typeof(name) != 'string' then callback "Invalid property name"; return
    if typeof(newName) != 'string' then callback "Invalid new property name"; return

    property = []
    property[newName] = ""
    violation = SupCore.data.base.getRuleViolation property, @constructor.schema.tileProperties.values, true
    if violation? then callback "Invalid property: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"]?[name]? then callback "Property #{name} doesn't exists"; return
    if @pub.tileProperties["#{tile.x}_#{tile.y}"]?[newName]? then callback "Property #{newName} already exists"; return

    @pub.tileProperties["#{tile.x}_#{tile.y}"][newName] = @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    delete @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    callback null, tile, name, newName
    @emit 'change'
    return

  client_renameTileProperty: (tile, name, newName) ->
    @pub.tileProperties["#{tile.x}_#{tile.y}"][newName] = @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    delete @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    return

  server_deleteTileProperty: (client, tile, name, callback) ->
    if typeof(tile) != 'object' or
    ! tile.x? or typeof(tile.x) != 'number' or
    ! tile.y? or typeof(tile.y) != 'number'

      callback "Invalid tile location"
      return

    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"]? then callback "Tile #{x}_#{y} doesn't have any property"; return
    if typeof(name) != 'string' then callback "Invalid property name"; return

    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"][name]? then callback "Property #{name} doesn't exists"; return

    delete @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    if Object.keys(@pub.tileProperties["#{tile.x}_#{tile.y}"]).length == 0
      delete @pub.tileProperties["#{tile.x}_#{tile.y}"]

    callback null, tile, name
    @emit 'change'
    return

  client_deleteTileProperty: (tile, name) ->
    delete @pub.tileProperties["#{tile.x}_#{tile.y}"][name]
    if Object.keys(@pub.tileProperties["#{tile.x}_#{tile.y}"]).length == 0
      delete @pub.tileProperties["#{tile.x}_#{tile.y}"]
    return

  server_editTileProperty: (client, tile, name, value, callback) ->
    if typeof(tile) != 'object' or
    ! tile.x? or typeof(tile.x) != 'number' or
    ! tile.y? or typeof(tile.y) != 'number'

      callback "Invalid tile location"
      return

    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"]? then callback "Tile #{x}_#{y} doesn't have any property"; return
    if typeof(name) != 'string' then callback "Invalid property name"; return
    if ! @pub.tileProperties["#{tile.x}_#{tile.y}"][name]? then callback "Property #{name} doesn't exists"; return
    if typeof(value) != 'string' then callback "Invalid property value"; return

    property = []
    property[name] = value
    violation = SupCore.data.base.getRuleViolation property, @constructor.schema.tileProperties.values, true
    if violation? then callback "Invalid property: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    @pub.tileProperties["#{tile.x}_#{tile.y}"][name] = value
    callback null, tile, name, value
    @emit 'change'
    return

  client_editTileProperty: (tile, name, value) ->
    @pub.tileProperties["#{tile.x}_#{tile.y}"][name] = value
    return
