TileMapLayers = require './TileMapLayers'

path = require 'path'
fs = require 'fs'
_ = require 'lodash'

module.exports = class TileMapAsset extends SupCore.data.base.Asset

  @schema:
    tileSetId: { type: 'string?' }

    pixelsPerUnit: { type: 'number', min: 1, mutable: true }

    width: { type: 'integer', min: 1 }
    height: { type: 'integer', min: 1 }
    layerDepthOffset: { type: 'number', mutable: true }

    layers: { type: 'array' }

  #             x,  y, flipX, flipY, angle
  @emptyTile: [-1, -1, false, false, 0]

  constructor: (id, pub, serverData) ->
    # TODO: Remove this cast by Superpowers 0.6, legacy stuff
    if pub? and typeof pub.tileSetId == 'number' then pub.tileSetId = pub.tileSetId.toString()

    super id, pub, @constructor.schema, serverData

  init: (options, callback) ->
    this.serverData.resources.acquire "tileMapSettings", null, (err, tileMapSettings) =>
      @pub =
        tileSetId: null
        pixelsPerUnit: tileMapSettings.pub.pixelsPerUnit
        width: tileMapSettings.pub.width, height: tileMapSettings.pub.height
        layerDepthOffset: tileMapSettings.pub.layerDepthOffset
        layers: []

      super options, =>
        @layers.add @createEmptyLayer("Layer"), null, (err, index) =>
          if err? then callback err; return
          callback()
          return
      return
    return

  setup: ->
    @layers = new TileMapLayers @pub.layers
    return

  restore: ->
    if @pub.tileSetId? then @emit 'addDependencies', [ @pub.tileSetId ]
    return

  server_changeTileSet: (client, tileSetId, callback) ->
    if tileSetId?
      if typeof(tileSetId) != 'string' then callback 'Id must be a string or null'; return

      entry = @serverData.entries.byId[tileSetId]
      if ! entry? then callback 'Invalid tileSetId'; return
      if entry.type != 'tileSet' then callback 'Invalid asset type'; return

    if @pub.tileSetId? then @emit 'removeDependencies', [ @pub.tileSetId ]
    if tileSetId? then @emit 'addDependencies', [ tileSetId ]

    @pub.tileSetId = tileSetId

    callback null, tileSetId
    @emit 'change'
    return

  client_changeTileSet: (tileSetId) ->
    @pub.tileSetId = tileSetId
    return

  server_resizeMap: (client, width, height, callback) ->
    if typeof width != 'number' or width < 0 then callback "width must be positive integer"; return
    if typeof height != 'number' or height < 0 then callback "height must be positive integer"; return
    return if width == @pub.width and height == @pub.height

    if width != @pub.width
      for row in [@pub.height...0]
        for layer in @pub.layers
          if width > @pub.width
            layer.data.splice row*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...width-@pub.width]
          else
            layer.data.splice (row-1)*@pub.width + width, @pub.width - width

      @pub.width = width

    if height != @pub.height
      for layer, layerIndex in @pub.layers
        if height > @pub.height
          layer.data.splice @pub.height*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...(height-@pub.height)*@pub.width]
        else
          layer.data.splice height*@pub.width, (@pub.height-height)*@pub.width

      @pub.height = height

    callback null, width, height
    @emit 'change'
    return

  client_resizeMap: (width, height) ->
    if width != @pub.width
      for row in [@pub.height...0]
        for layer in @pub.layers
          if width > @pub.width
            layer.data.splice row*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...width-@pub.width]
          else
            layer.data.splice (row-1)*@pub.width + width, @pub.width-width

      @pub.width = width

    if height != @pub.height
      for layer, layerIndex in @pub.layers
        if height > @pub.height
          layer.data.splice @pub.height*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...(height-@pub.height)*@pub.width]
        else
          layer.data.splice height*@pub.width, (@pub.height-height)*@pub.width

      @pub.height = height
    return

  server_moveMap: (client, horizontalOffset, verticalOffset, callback) ->
    if typeof horizontalOffset != 'number' then callback "horizontalOffset must be an integer"; return
    if typeof verticalOffset != 'number' then callback "verticalOffset must be an integer"; return
    return if horizontalOffset == 0 and verticalOffset == 0

    @client_moveMap horizontalOffset, verticalOffset

    callback null, horizontalOffset, verticalOffset
    @emit 'change'
    return

  client_moveMap: (horizontalOffset, verticalOffset) ->
    if horizontalOffset != 0
      for row in [@pub.height...0]
        for layer in @pub.layers
          if horizontalOffset > 0
            layer.data.splice row*@pub.width - horizontalOffset, horizontalOffset
            layer.data.splice (row-1)*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...horizontalOffset]
          else
            layer.data.splice row*@pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...-horizontalOffset]
            layer.data.splice (row-1)*@pub.width, -horizontalOffset

    if verticalOffset != 0
      for layer, layerIndex in @pub.layers
        if verticalOffset > 0
          layer.data.splice (@pub.height - verticalOffset) * @pub.width - 1, verticalOffset * @pub.width
          layer.data.splice 0, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...verticalOffset*@pub.width]
        else
          layer.data.splice @pub.height * @pub.width, 0, _.cloneDeep(@constructor.emptyTile) for i in [0...-verticalOffset*@pub.width]
          layer.data.splice 0, -verticalOffset * @pub.width

    return

  server_editMap: (client, layerId, x, y, values, callback) ->
    if typeof layerId != 'string' or ! @layers.byId[layerId]? then callback "no such layer"; return
    if typeof x != 'number' or x < 0 or x >= @pub.width then callback "x must be an integer between 0 and #{@pub.width-1}"; return
    if typeof y != 'number' or y < 0 or y >= @pub.height then callback "y must be an integer between 0 and #{@pub.height-1}"; return
    if values?
      if not Array.isArray(values) or values.length != 5 then callback "values must be an array with 5 items"; return
      if typeof values[0] != 'number' or values[0] < -1 then callback "tileX must be an integer greater than -1"; return
      if typeof values[1] != 'number' or values[1] < -1 then callback "tileY must be an integer greater than -1"; return
      if typeof values[2] != 'boolean' then callback "flipX must be a boolean"; return
      if typeof values[3] != 'boolean' then callback "flipY must be a boolean"; return
      if typeof values[4] != 'number' or [0, 90, 180, 270].indexOf(values[4]) == -1 then callback "angle must be an integer in [0, 90, 180, 270]"; return

    index = y * @pub.width + x
    values ?= _.cloneDeep(@constructor.emptyTile)
    @layers.byId[layerId].data[index] = values
    callback null, layerId, x, y, values
    @emit 'change'
    return

  client_editMap: (layerId, x, y, values) ->
    index = y * @pub.width + x
    @layers.byId[layerId].data[index] = values
    return

  createEmptyLayer: (layerName) ->
    newLayer =
      name: layerName
      data: []

    for y in [0...@pub.height]
      for x in [0...@pub.width]
        index = y * @pub.width + x
        newLayer.data[index] =  _.cloneDeep(@constructor.emptyTile)

    return newLayer

  server_newLayer: (client, layerName, index, callback) ->
    newLayer = @createEmptyLayer layerName
    @layers.add newLayer, index, (err, actualIndex) =>
      if err? then callback err; return

      callback null, newLayer, actualIndex
      @emit 'change'
    return

  client_newLayer: (newLayer, actualIndex) ->
    @layers.client_add newLayer, actualIndex
    return

  server_renameLayer: (client, layerId, newName, callback) ->
    if typeof layerId != 'string' or ! @layers.byId[layerId]? then callback "no such layer"; return

    @layers.setProperty layerId, 'name', newName, (err) =>
      if err? then callback err; return

      callback null, layerId, newName
      @emit 'change'
    return

  client_renameLayer: (layerId, newName) ->
    @layers.client_setProperty layerId, 'name', newName
    return

  server_deleteLayer: (client, layerId, callback) ->
    if typeof layerId != 'string' or ! @layers.byId[layerId]? then callback "no such layer"; return
    if @pub.layers.length == 1 then callback "Last layer can't be deleted"; return

    @layers.remove layerId, (err, index) =>
      if err? then callback err; return

      callback null, layerId, index
      @emit 'change'
    return

  client_deleteLayer: (layerId) ->
    @layers.client_remove layerId
    return

  server_moveLayer: (client, layerId, layerIndex, callback) ->
    if typeof layerId != 'string' or ! @layers.byId[layerId]? then callback "no such layer"; return
    if typeof layerIndex != 'number' then callback "index must be an integer"; return

    @layers.move layerId, layerIndex, (err, index) =>
      if err? then callback err; return

      callback null, layerId, index
      @emit 'change'
    return

  client_moveLayer: (layerId, layerIndex) ->
    @layers.client_move layerId, layerIndex
    return
