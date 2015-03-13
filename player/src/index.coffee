async = require 'async'

progressBar = document.querySelector('progress')
loadingElt = document.getElementById('loading')
canvas = document.querySelector('canvas')

qs = require('querystring').parse window.location.search.slice(1)
player = null

if qs.debug? and window.nwDispatcher?
  gui = window.nwDispatcher.requireNwGui()
  gui.Window.get().showDevTools()

# Load plugins
pluginsXHR = new XMLHttpRequest
pluginsXHR.open 'GET', '../plugins.json', false # Synchronous
pluginsXHR.send null

if pluginsXHR.status != 200
  console.error "Could not get plugins list"
  return

pluginPaths = JSON.parse(pluginsXHR.responseText)

async.each pluginPaths.all, (pluginName, pluginCallback) ->
  async.series [
    (cb) ->
      apiScript = document.createElement('script')
      apiScript.src = "../plugins/#{pluginName}/api.js"
      apiScript.addEventListener 'load', -> cb()
      apiScript.addEventListener 'error', -> cb()
      document.body.appendChild apiScript

    (cb) ->
      componentsScript = document.createElement('script')
      componentsScript.src = "../plugins/#{pluginName}/components.js"
      componentsScript.addEventListener 'load', -> cb()
      componentsScript.addEventListener 'error', -> cb()
      document.body.appendChild componentsScript

    (cb) ->
      runtimeScript = document.createElement('script')
      runtimeScript.src = "../plugins/#{pluginName}/runtime.js"
      runtimeScript.addEventListener 'load', -> cb()
      runtimeScript.addEventListener 'error', -> cb()
      document.body.appendChild runtimeScript
  ], pluginCallback
, (err) ->
  if err? then console.log err
  # Load game
  buildPath = if qs.project? then "/builds/#{qs.project}/#{qs.build}/" else '../'
  player = new SupRuntime.Player canvas, buildPath
  player.load onLoadProgress, onLoaded

onLoadProgress = (value, max) ->
  progressBar.value = value
  progressBar.max = max
  return

onLoaded = ->
  setTimeout ->
    loadingElt.classList.remove 'start'
    loadingElt.classList.add 'end'

    setTimeout ->
      loadingElt.parentElement.removeChild loadingElt
      canvas.style.display = ''

      player.run()
      return
    , if ! qs.project? then 500 else 50
  , if ! qs.project? then 500 else 0

loadingElt.classList.add 'start'
