module.exports = class ModelRendererConfig extends SupCore.data.base.ComponentConfig

  @schema =
    modelAssetId: { type: 'string?', min: 0, mutable: true }
    animationId: { type: 'string?', min: 0, mutable: true }

  @create: ->
    modelAssetId: null
    animationId: null

  constructor: (pub) ->
    # TODO: Remove these casts at some point, legacy stuff from Superpowers 0.4
    if typeof pub.modelAssetId == 'number' then pub.modelAssetId = pub.modelAssetId.toString()
    if typeof pub.animationId == 'number' then pub.animationId = pub.animationId.toString()

    super pub, @constructor.schema

  restore: ->
    if @pub.modelAssetId? then @emit 'addDependencies', [ @pub.modelAssetId ]
    return

  destroy: ->
    if @pub.modelAssetId? then @emit 'removeDependencies', [ @pub.modelAssetId ]
    return

  setProperty: (path, value, callback) ->
    if path in [ 'modelAssetId' ]
      oldDepId = @pub[path]

    super path, value, (err, actualValue) =>
      if err? then callback? err; return

      if path in [ 'modelAssetId' ]
        @emit 'removeDependencies', [ oldDepId ] if oldDepId?
        @emit 'addDependencies', [ actualValue ] if actualValue?

      callback null, actualValue
      return
