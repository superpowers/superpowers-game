module.exports = class TileMapRendererConfig extends SupCore.data.base.ComponentConfig

  @schema =
    tileMapAssetId: { type: 'string?', min: 0, mutable: true }
    tileSetAssetId: { type: 'string?', min: 0, mutable: true }

  @create: ->
    tileMapAssetId: null
    tileSetAssetId: null

  constructor: (pub) ->
    # TODO: Remove these casts at some point, legacy stuff from Superpowers 0.4
    if typeof pub.tileMapAssetId == 'number' then pub.tileMapAssetId = pub.tileMapAssetId.toString()
    if typeof pub.tileSetAssetId == 'number' then pub.tileSetAssetId = pub.tileSetAssetId.toString()

    super pub, @constructor.schema

  restore: ->
    if @pub.tileMapAssetId? then @emit 'addDependencies', [ @pub.tileMapAssetId ]
    if @pub.tileSetAssetId? then @emit 'addDependencies', [ @pub.tileSetAssetId ]
    return

  destroy: ->
    if @pub.tileMapAssetId? then @emit 'removeDependencies', [ @pub.tileMapAssetId ]
    if @pub.tileSetAssetId? then @emit 'removeDependencies', [ @pub.tileSetAssetId ]
    return

  setProperty: (path, value, callback) ->
    if path in [ 'tileMapAssetId', 'tileSetAssetId' ]
      oldDepId = @pub[path]

    super path, value, (err, actualValue) =>
      if err? then callback? err; return

      if path in [ 'tileMapAssetId', 'tileSetAssetId' ]
        @emit 'removeDependencies', [ oldDepId ] if oldDepId?
        @emit 'addDependencies', [ actualValue ] if actualValue?

      callback null, actualValue
      return
