module.exports = class SpriteRendererConfig extends SupCore.data.base.ComponentConfig

  @schema =
    spriteAssetId: { type: 'integer?', min: 0, mutable: true }
    animationId: { type: 'integer?', min: 0, mutable: true }

  @create: ->
    spriteAssetId: null
    animationId: null

  constructor: (pub) ->
    super pub, @constructor.schema

  restore: ->
    if @pub.spriteAssetId? then @emit 'addDependencies', [ @pub.spriteAssetId ]
    return

  destroy: ->
    if @pub.spriteAssetId? then @emit 'removeDependencies', [ @pub.spriteAssetId ]
    return

  setProperty: (path, value, callback) ->
    if path in [ 'spriteAssetId' ]
      oldDepId = @pub[path]

    super path, value, (err, actualValue) =>
      if err? then callback? err; return

      if path in [ 'spriteAssetId' ]
        @emit 'removeDependencies', [ oldDepId ] if oldDepId?
        @emit 'addDependencies', [ actualValue ] if actualValue?

      callback null, actualValue
      return
