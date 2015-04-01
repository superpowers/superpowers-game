SupRuntime = require './'
async = require 'async'

module.exports = class Player
  @updateInterval: 1 / SupEngine.GameInstance.framesPerSecond * 1000
  @maxAccumulatedTime: 5 * @updateInterval

  constructor: (@canvas, @dataURL, options) ->
    @gameInstance = new SupEngine.GameInstance @canvas, options

    @entriesById = {}
    @entriesByPath = {}
    @resources = {}

    @_assetsById = {}
    @outerAssetsById = {}

  load: (progressCallback, callback) ->
    progress = 0

    innerProgressCallback = =>
      progress++
      total = @resourcesToLoad.length + @assetsToLoad.length
      progressCallback progress, total
      return

    async.series [
      @_initPlugins
      @_loadManifest
      (cb) => @_loadResources innerProgressCallback, cb; return
      (cb) => @_loadAssets innerProgressCallback, cb; return
      @_startPlugins
    ], callback
    return

  _initPlugins: (callback) =>
    async.each Object.keys(SupRuntime.plugins), (name, cb) =>
      plugin = SupRuntime.plugins[name]
      if plugin.init? then plugin.init @, cb
      else cb()
      return
    , callback
    return

  _loadManifest: (callback) =>
    @getAssetData "game.json", 'json', (err, gameData) =>
      if err? then callback new Error "Failed to load game manifest"; return

      document.title = gameData.name

      @resourcesToLoad = Object.keys(SupRuntime.resourcePlugins)

      @assetsToLoad = []
      walk = (asset, parent="") =>
        children = ( child.name for child in asset.children ) if asset.children?
        @assetsToLoad.push { id: asset.id, name: "#{parent}#{asset.name}", type: asset.type, children: children }
        parent += "#{asset.name}/"
        walk child, parent for child in asset.children if asset.children?
        return

      walk asset for asset in gameData.assets
      callback(); return
    return

  _loadResources: (progressCallback, callback) =>
    if @resourcesToLoad.length == 0 then callback(); return
    resourcesLoaded = 0

    onResourceLoaded = (err, resourceName, resource) =>
      if err? then callback new Error "Failed to load resource #{resourceName}: #{err.message}"; return

      @resources[resourceName] = resource

      progressCallback()
      resourcesLoaded++
      callback() if resourcesLoaded == @resourcesToLoad.length
      return

    @resourcesToLoad.forEach (resourceName) =>
      plugin = SupRuntime.resourcePlugins[resourceName]
      if ! plugin?
        # This resource isn't meant to be loaded at runtime, skip
        onResourceLoaded null, resourceName, null; return

      plugin.loadResource @, resourceName, (err, data) => onResourceLoaded err, resourceName, data; return
      return
    return

  _loadAssets: (progressCallback, callback) =>
    if @assetsToLoad.length == 0 then callback(); return
    assetsLoaded = 0

    onAssetLoaded = (err, entry, asset) =>
      if err? then callback new Error "Failed to load asset #{entry.name}: #{err.message}"; return

      @entriesById[entry.id] = entry
      @entriesByPath[entry.name] = entry
      @_assetsById[entry.id] = asset

      progressCallback()
      assetsLoaded++
      callback() if assetsLoaded == @assetsToLoad.length
      return

    @assetsToLoad.forEach (entry) =>
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

  _startPlugins: (callback) =>
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
