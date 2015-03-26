SupRuntime = require './'
async = require 'async'

module.exports = class Player
  @updateInterval: 1 / SupEngine.GameInstance.framesPerSecond * 1000
  @maxAccumulatedTime: 5 * @updateInterval

  constructor: (@canvas, @dataURL, options) ->
    @gameInstance = new SupEngine.GameInstance @canvas, options

    @entriesById = {}
    @entriesByPath = {}

    @_assetsById = {}
    @outerAssetsById = {}

  load: (progressCallback, callback) ->
    assetsToLoad = null
    assetCount = 1
    loadedAssetCount = 0

    onAssetLoaded = (err, entry, asset) =>
      if err? then alert "Failed to load #{entry.name}: #{err.message}"; return

      loadedAssetCount += 1
      progressCallback loadedAssetCount, assetsToLoad.length

      @entriesById[entry.id] = entry
      @entriesByPath[entry.name] = entry

      @_assetsById[entry.id] = asset

      @_startPlugins callback if loadedAssetCount == assetsToLoad.length
      return

    @_initPlugins (err) =>
      @getAssetData "game.json", 'json', (err, gameData) =>
        if err? then alert "Failed to load game manifest"; return

        document.title = gameData.name

        assetsToLoad = []
        walk = (asset, parent="") =>
          if asset.children?
            children = []
            children.push child.name for child in asset.children

          assetsToLoad.push {id: asset.id, name: "#{parent}#{asset.name}", type: asset.type, children: children}
          parent += "#{asset.name}/"

          walk child, parent for child in asset.children if asset.children?
          return
        walk asset for asset in gameData.assets

        assetsToLoad.forEach (entry) =>
          if entry.children?
            onAssetLoaded null, entry, {}
            return

          plugin = SupRuntime.plugins[entry.type]
          if ! plugin?.loadAsset?
            console.warn "Don't know how to load assets of type '#{entry.type}'"
            onAssetLoaded null, entry, {}
            return

          plugin.loadAsset @, entry, (err, data) => onAssetLoaded err, entry, data; return
          return
        return
      return
    return

  _initPlugins: (callback) ->
    async.each Object.keys(SupRuntime.plugins), (name, cb) =>
      plugin = SupRuntime.plugins[name]
      if plugin.init? then plugin.init @, cb
      else cb()
      return
    , callback
    return

  _startPlugins: (callback) ->
    async.each Object.keys(SupRuntime.plugins), (name, cb) =>
      plugin = SupRuntime.plugins[name]
      if plugin.start? then plugin.start @, cb
      else cb()
      return
    , callback
    return

  run: ->
    @lastTimestamp = 0
    @accumulatedTime = 0
    @canvas.focus()
    @tick()
    return

  tick: (timestamp) =>
    timestamp |= 0
    @accumulatedTime += timestamp - @lastTimestamp
    @lastTimestamp = timestamp

    # If the game is running slowly, don't fall into the well of dispair
    @accumulatedTime = @constructor.maxAccumulatedTime if @accumulatedTime > @constructor.maxAccumulatedTime

    # Update
    gameUpdated = false
    while @accumulatedTime >= @constructor.updateInterval
      @gameInstance.update()
      if @gameInstance.exited then return
      @accumulatedTime -= @constructor.updateInterval
      gameUpdated = true

    # Render
    @gameInstance.draw() if gameUpdated

    # Do it again soon
    @tickAnimationFrameId = requestAnimationFrame @tick
    return

  getAssetData: (path, responseType, callback) ->
    xhr = new XMLHttpRequest()
    xhr.open 'GET', "#{@dataURL}#{path}", true
    xhr.responseType = responseType

    xhr.onload = (event) ->
      # Local file access returns status code 0
      if xhr.status not in [ 200, 0 ] then callback new Error "Could not get #{path}"; return

      # WORKAROUND: IE <= 11 does not support responseType = 'json'
      response = xhr.response
      if xhr.responseType != 'json' then try response = JSON.parse(response)

      callback null, response; return

    xhr.send()
    return

  getOuterAsset: (assetId) ->
    outerAsset = @outerAssetsById[assetId]
    asset = @_assetsById[assetId]
    entry = @entriesById[assetId]

    if ! outerAsset? and asset?
      if ! entry.type?
        outerAsset = { name: entry.name, type: "folder", children: entry.children }

      else
        plugin = SupRuntime.plugins[@entriesById[assetId].type]
        outerAsset = @outerAssetsById[assetId] =
          # Temporary check until every asset is correctly handled
          if plugin.createOuterAsset? then plugin.createOuterAsset @, asset
          else asset

        outerAsset.name = entry.name
        outerAsset.type = entry.type

    outerAsset

  createActor: -> throw new Error 'Player.createActor should be defined by a scripting plugin'
  createComponent: -> throw new Error 'Player.createComponent should be defined by a scripting plugin'
