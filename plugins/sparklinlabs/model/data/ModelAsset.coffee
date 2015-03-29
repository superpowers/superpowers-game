path = require 'path'
fs = require 'fs'
async = require 'async'

ModelAnimations = require './ModelAnimations'

module.exports = class ModelAsset extends SupCore.data.base.Asset

  @schema:
    attributes:
      type: 'hash'
      properties:
        position:   { type: 'buffer?', mutable: true }
        index:      { type: 'buffer?', mutable: true }
        color:      { type: 'buffer?', mutable: true }
        uv:         { type: 'buffer?', mutable: true }
        normal:     { type: 'buffer?', mutable: true }
        skinIndex:  { type: 'buffer?', mutable: true }
        skinWeight: { type: 'buffer?', mutable: true }

    bones:
      type: 'array'
      items:
        type: 'hash'
        properties:
          name: { type: 'string', minLength: 1, maxLength: 80 }
          parentIndex: { type: 'integer?' }
          matrix: { type: 'array', length: 16, items: { type: 'number' } }

    # TODO: Material

    maps:
      type: 'hash'
      properties:
        # TODO: Each map should have filters, etc.
        diffuse: { type: 'buffer?', mutable: true }

    animations: { type: 'listById' }

  constructor: (id, pub, serverData) ->
    super id, pub, @constructor.schema, serverData

  init: (options, callback) ->
    @pub =
      attributes: { position: null, index: null, color: null, uv: null, normal: null }
      bones: null
      maps: { diffuse: null }
      animations: []

    super options, callback; return

  setup: ->
    @animations = new ModelAnimations @pub.animations
    return

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "asset.json"), { encoding: 'utf8' }, (err, json) =>
      @pub = JSON.parse(json)
      @pub.attributes = {}
      @pub.maps = {}
      @pub.animations ?= []

      async.series [

        (callback) =>
          async.each Object.keys(@constructor.schema.attributes.properties), (key, cb) =>
            fs.readFile path.join(assetPath, "attr-#{key}.dat"), (err, buffer) =>
              # TODO: Handle error but ignore ENOENT
              if err? then cb(); return
              @pub.attributes[key] = buffer
              cb(); return
            return
          , callback
          return

        (callback) =>
          async.each Object.keys(@constructor.schema.maps.properties), (key, cb) =>
            fs.readFile path.join(assetPath, "map-#{key}.dat"), (err, buffer) =>
              # TODO: Handle error but ignore ENOENT
              if err? then cb(); return
              @pub.maps[key] = buffer
              cb(); return
            return
          , callback
          return

      ], (err) =>
        @setup()
        @emit 'load'
        return

    ###(callback) => callback()
      async.each @pub.animations, (animation, cb) =>
        fs.readFile path.join(assetPath, "anim-#{animation.id}.dat"), (err, buffer) =>###

    return

  save: (assetPath, saveCallback) ->
    attributes = @pub.attributes
    maps = @pub.maps

    @pub.attributes = ( key for key, value of attributes when value? )
    @pub.maps = ( key for key, value of maps when value? )

    json = JSON.stringify @pub, null, 2
    @pub.attributes = attributes
    @pub.maps = maps

    async.series [

      (callback) => fs.writeFile path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, callback; return

      (callback) =>
        async.each Object.keys(@constructor.schema.attributes.properties), (key, cb) =>
          value = attributes[key]

          if ! value?
            fs.unlink path.join(assetPath, "attr-#{key}.dat"), (err) =>
              if err? and err.code != 'ENOENT' then cb err; return
              cb(); return
            return

          fs.writeFile path.join(assetPath, "attr-#{key}.dat"), value, cb
          return
        , callback
        return

      (callback) =>
        async.each Object.keys(@constructor.schema.maps.properties), (key, cb) =>
          value = maps[key]

          if ! value?
            fs.unlink path.join(assetPath, "map-#{key}.dat"), (err) =>
              if err? and err.code != 'ENOENT' then cb err; return
              cb(); return
            return

          fs.writeFile path.join(assetPath, "map-#{key}.dat"), value, cb
          return
        , callback

    ], saveCallback

    return

  # TODO: Replace with setModel
  server_setAttributes: (client, attributes, callback) ->
    if typeof(attributes) != 'object' then callback "Attributes must be an object"; return

    for key, value of attributes
      if ! @constructor.schema.attributes.properties[key]? then callback "Unsupported attribute type: #{key}"; return
      if value? and ! (value instanceof Buffer) then callback "Value for #{key} must be an ArrayBuffer or null"; return

    for key of @constructor.schema.attributes.properties
      @pub.attributes[key] = attributes[key]

    callback null, attributes
    @emit 'change'
    return

  client_setAttributes: (attributes) ->
    for key of @constructor.schema.attributes.properties
      @pub.attributes[key] = attributes[key]
    return

  server_setBones: (client, bones, callback) ->
    if bones?
      violation = SupCore.data.base.getRuleViolation bones, @constructor.schema.bones, true
      if violation? then callback "Invalid bones: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    @pub.bones = bones
    callback null, bones
    @emit 'change'
    return

  client_setBones: (bones, callback) ->
    @pub.bones = bones
    return

  server_setMaps: (client, maps, callback) ->
    if typeof(maps) != 'object' then callback "Maps must be an object"; return

    for key, value of maps
      if ! @constructor.schema.maps.properties[key]? then callback "Unsupported map type: #{key}"; return
      if value? and ! (value instanceof Buffer) then callback "Value for #{key} must be an ArrayBuffer or null"; return

    @pub.maps[key] = value for key, value of maps

    callback null, maps
    @emit 'change'
    return

  client_setMaps: (maps) ->
    @pub.maps[key] = value for key, value of maps
    return

  # Animations
  server_newAnimation: (client, name, duration, keyFrames, callback) ->
    duration ?= 0
    keyFrames ?= []
    animation = { name, duration, keyFrames }

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

  server_setAnimation: (client, id, duration, keyFrames, callback) ->
    violation = SupCore.data.base.getRuleViolation duration, ModelAnimations.schema.duration, true
    if violation? then callback "Invalid duration: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    violation = SupCore.data.base.getRuleViolation keyFrames, ModelAnimations.schema.keyFrames, true
    if violation? then callback "Invalid duration: #{SupCore.data.base.formatRuleViolation(violation)}"; return

    animation = @animations.byId[id]
    if ! animation? then callback "Invalid animation id"; return

    animation.duration = duration
    animation.keyFrames = keyFrames

    callback null, id, duration, keyFrames
    @emit 'change'
    return

  client_setAnimation: (id, duration, keyFrames) ->
    animation = @animations.byId[id]

    animation.duration = duration
    animation.keyFrames = keyFrames
    return
