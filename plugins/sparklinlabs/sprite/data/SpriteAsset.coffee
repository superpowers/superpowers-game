path = require 'path'
fs = require 'fs'

SpriteAnimations = require './SpriteAnimations'

module.exports = class SpriteAsset extends SupCore.data.base.Asset

  @schema:
    image: { type: 'buffer' }
    filtering: { type: 'enum', items: [ 'pixelated', 'smooth'], mutable: true }
    pixelsPerUnit: { type: 'number', min: 1, mutable: true }
    framesPerSecond: { type: 'number', min: 1, mutable: true }
    alphaTest: { type: 'number', min: 0, max: 1, mutable: true }

    grid:
      type: 'hash'
      properties:
        width: { type: 'integer', min: 1, mutable: true }
        height: { type: 'integer', min: 1, mutable: true }

    origin:
      type: 'hash'
      properties:
        x: { type: 'number', min: 0, max: 1, mutable: true }
        y: { type: 'number', min: 0, max: 1, mutable: true }

    animations: { type: 'listById' }

  constructor: (pub, serverData) ->
    super pub, @constructor.schema, serverData

  setup: ->
    @animations = new SpriteAnimations @pub.animations
    return

  init: ->
    @pub =
      image: new Buffer(0)
      filtering: 'pixelated'
      pixelsPerUnit: 100
      framesPerSecond: 10
      alphaTest: 0.1

      grid: { width: 100, height: 100 }
      origin: { x: 0.5, y: 0.5 }

      animations: []

    super(); return

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

  server_upload: (client, image, callback) ->
    if ! (image instanceof Buffer) then callback 'Image must be an ArrayBuffer'; return

    @pub.image = image

    callback null, image
    @emit 'change'
    return

  client_upload: (image) ->
    @pub.image = image
    return

  server_newAnimation: (client, name, callback) ->
    animation = { name, startFrameIndex: 0, endFrameIndex: 0 }

    @animations.add animation, null, (err, actualIndex) =>
      if err? then callback? err; return

      animation.name = SupCore.data.ensureUniqueName animation.id, animation.name, @animations.pub

      callback null, animation, actualIndex
      @emit 'change'
      return
    return

  client_newAnimation: (animation, actualIndex) ->
    @animations.client_add animation, actualIndex
    return

  server_deleteAnimation: (client, id, callback) ->
    @animations.remove id, (err) =>
      if err? then callback? err; return

      callback null, id
      @emit 'change'
      return
    return

  client_deleteAnimation: (id) ->
    @animations.client_remove id
    return

  server_moveAnimation: (client, id, newIndex, callback) ->
    @animations.move id, newIndex, (err, actualIndex) =>
      if err? then callback? err; return

      callback null, id, actualIndex
      @emit 'change'
      return
    return

  client_moveAnimation: (id, newIndex) ->
    @animations.client_move id, newIndex
    return

  server_setAnimationProperty: (client, id, key, value, callback) ->
    if key == 'name'
      if typeof(value) != 'string' then callback "Invalid value"; return
      value = value.trim()

      if SupCore.data.hasDuplicateName id, value, @animations.pub
        callback "There's already an animation with this name"; return

    @animations.setProperty id, key, value, (err, actualValue) =>
      if err? then callback? err; return

      callback null, id, key, actualValue
      @emit 'change'
      return
    return

  client_setAnimationProperty: (id, key, actualValue) ->
    @animations.client_setProperty id, key, actualValue
    return
