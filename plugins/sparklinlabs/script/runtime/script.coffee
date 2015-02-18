async = require 'async'

SupScript = require './SuperpowersScript.js'
globals = null
globalSymbols = null
scripts = []

exports.init = (player, callback) ->

  player.createActor = (name, parentActor) -> new player.scriptRoot.Sup.Actor name, parentActor
  player.createComponent = (type, actor, config) ->
    if type == 'Behavior'
      # TODO: Set provided behavior properties
      # behavior[propertyName] = value for propertyName, value of config.properties?

      behaviorClass = player.scriptRoot
      behaviorClass = behaviorClass[part] for part in config.behaviorName.split('.')
      new behaviorClass actor
    else
      new player.scriptRoot.Sup[type] actor

  globals = require('./jsGlobals') player

  merge = (dst, src) ->
    Object.keys(src).forEach (key) ->
      if typeof src[key] == "object"
        dst[key] ?= {}
        merge dst[key], src[key]
      else
        dst[key] = src[key]
      return
    return

  scriptGlobals = require './scriptGlobals'

  for name, plugin of SupRuntime.plugins
    continue if ! plugin.script?
    scriptGlobals += "\n\n#{plugin.script}"
    merge globals, plugin.js(player)

  SupScript.appendScript scriptGlobals, null, (err, globalsScriptData) =>
    globalSymbols = globalsScriptData.symbols
    globalsScriptData.name = 'globals'
    scripts.push globalsScriptData
    callback()
    return
  return

exports.start = (player, callback) ->
  declarationsList = []
  mainList = []

  async.each scripts, (script, cb) ->
    SupScript.symbolizer.buildSymbolsTable 'local', script.ast, globalSymbols, (err, localSymbols, symbolErrors) ->
      script.symbols = localSymbols
      script.symbolErrors = script.symbolErrors.concat(symbolErrors)

      if script.symbolErrors.length > 0
        console.error "#{script.name}: Encountered #{script.symbolErrors.length} symbol errors"
        SupScript.printError error, script.linesOfCode[error.line] for error in script.symbolErrors

      SupScript.generateCode script.ast, localSymbols, (err, declarations, main) ->
        declarationsList.push declarations
        mainList.push main
        cb(); return
      return
    return
  , ->
    linkedCode = SupScript.link declarationsList, mainList
    scriptFunction = new Function 'root', 'globals', linkedCode
    player.scriptRoot = {}
    scriptFunction player.scriptRoot, globals

    callback()
    return
  return

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/script.txt", 'text', (err, script) ->
    SupScript.appendScript script, globalSymbols, (err, data) =>
      if err?
        console.error "#{entry.name}: Encountered tokenizer error"
        console.error err
        data = { parseErrors: [], symbolErrors: [] }

      data.linesOfCode = script.split('\n')
      data.name = entry.name
      scripts.push data

      if data.parseErrors.length > 0
        console.error "#{data.name}: Encountered #{data.parseErrors.length} parse errors"
        SupScript.printError error, data.linesOfCode[error.line] for error in data.parseErrors

      callback null, script
      return
    return
  return
