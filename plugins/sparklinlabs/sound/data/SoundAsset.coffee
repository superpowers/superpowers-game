path = require 'path'
fs = require 'fs'

module.exports = class SoundAsset extends SupCore.data.base.Asset

  @schema:
    sound: { type: 'buffer' }
    streaming: { type: 'boolean', mutable: true }

  constructor: (pub, serverData) ->
    super pub, @constructor.schema, serverData

  init: (callback) ->
    @pub =  sound: new Buffer(0), streaming: false
    super callback; return

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "asset.json"), { encoding: 'utf8' }, (err, json) =>
      @pub = JSON.parse(json)
      @pub.streaming ?= false

      fs.readFile path.join(assetPath, "sound.dat"), (err, buffer) =>
        @pub.sound = buffer
        @emit 'load'
        return
      return
    return

  save: (assetPath, callback) ->
    buffer = @pub.sound
    delete @pub.sound
    json = JSON.stringify @pub, null, 2
    @pub.sound = buffer
    fs.writeFile path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, =>
      fs.writeFile path.join(assetPath, "sound.dat"), buffer, callback
    return

  server_upload: (client, sound, callback) ->
    if ! (sound instanceof Buffer) then callback 'Sound must be an ArrayBuffer'; return

    @pub.sound = sound

    callback null, sound
    @emit 'change'
    return

  client_upload: (sound) ->
    @pub.sound = sound
    return
