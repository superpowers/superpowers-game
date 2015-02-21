async = require 'async'

TsCompiler = require './tsCompiler'
tsSource = require './tsSource'
tsGlobals = require './tsGlobals'
tsDefinition = require './tsDefinition'

globalNames = ["globals"]
globals = {"globals.ts": tsGlobals}

scriptNames = []
scripts = {}

exports.init = (player, callback) ->
  player.behaviorClasses = {}
  player.createActor = (name, parentActor) -> new player.Sup.Actor name, parentActor
  player.createComponent = (type, actor, config) ->
    if type == 'Behavior'
      behaviorClass = player.behaviorClasses[config.behaviorName]
      new behaviorClass actor, config.properties, true
    else
      new player.Sup[type] actor

  for name, plugin of SupRuntime.plugins
    if plugin.typescript?
      globalNames.push name
      globals["#{name}.ts"] = plugin.typescript

    tsDefinition += plugin.typescriptDefs if plugin.typescriptDefs?

  callback()
  return

exports.start = (player, callback) ->
  actorComponentAccessors = ""
  for componentName, component of SupEngine.componentPlugins
    continue if componentName == "Behavior"
    actorComponentAccessors += "#{componentName.charAt(0).toLowerCase() + componentName.slice(1)}: #{componentName}; "

  globals["globals.ts"] = globals["globals.ts"].replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors
  tsDefinition = tsDefinition.replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors

  jsGlobals = TsCompiler globalNames, globals, "#{tsSource}\ndeclare var console, window, localStorage, player, SupEngine, SupRuntime;"
  if jsGlobals.errors.length > 0
    console.log error for error in jsGlobals.errors

  else
    results = TsCompiler scriptNames, scripts, "#{tsSource}#{tsDefinition}"
    if results.errors.length > 0
      console.log error for error in results.errors

    else
      code = jsGlobals.script + results.script
      scriptFunction = new Function 'player', code
      scriptFunction player

  callback()
  return

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/script.txt", 'text', (err, script) ->
    scriptNames.push entry.name
    scripts["#{entry.name}.ts"] = "#{script}\n"

    callback null, script
    return
  return
