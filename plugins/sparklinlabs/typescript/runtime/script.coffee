async = require 'async'
convert = require 'convert-source-map'
combine = require 'combine-source-map'

TsCompiler = require './tsCompiler'

fs = require 'fs'
tsLib = fs.readFileSync(__dirname + '/lib.d.ts', encoding: 'utf8')
tsSup = fs.readFileSync(__dirname + '/Sup.ts', encoding: 'utf8')
tsSupDefs = fs.readFileSync(__dirname + '/Sup.d.ts', encoding: 'utf8')

globalNames = ["globals"]
globals = { "globals.ts": tsSup }

scriptNames = []
scripts = {}

exports.init = (player, callback) ->
  player.behaviorClasses = {}
  player.createActor = (name, parentActor) -> new player.Sup.Actor name, parentActor
  player.createComponent = (type, actor, config) ->
    if type == 'Behavior'
      behaviorClass = player.behaviorClasses[config.behaviorName]
      new behaviorClass actor.__inner, config.properties
    else
      new player.Sup[type] actor

  for name, plugin of SupRuntime.plugins
    if plugin.typescript?
      globalNames.push name
      globals["#{name}.ts"] = plugin.typescript

    tsSupDefs += plugin.typescriptDefs if plugin.typescriptDefs?

  callback()
  return

exports.start = (player, callback) ->
  console.log "Compiling scripts..."

  actorComponentAccessors = ""
  for componentName, component of SupEngine.componentPlugins
    continue if componentName == "Behavior"
    actorComponentAccessors += "#{componentName.charAt(0).toLowerCase() + componentName.slice(1)}: #{componentName}; "

  globals["globals.ts"] = globals["globals.ts"].replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors
  tsSupDefs = tsSupDefs.replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors
  jsGlobals = TsCompiler globalNames, globals, "#{tsLib}\ndeclare var console, window, localStorage, player, SupEngine, SupRuntime;", sourceMap: false
  if jsGlobals.errors.length > 0
    for error in jsGlobals.errors
      console.log "#{error.file}(#{error.position.line}): #{error.message}"

  else
    results = TsCompiler scriptNames, scripts, "#{tsLib}#{tsSupDefs}", sourceMap: true
    if results.errors.length > 0
      for error in results.errors
        console.log "#{error.file}(#{error.position.line}): #{error.message}"

    else
      console.log "Compilation successful!"

      getLineCounts = (string) =>
        count = 1; index = -2
        loop
          index = string.indexOf("\n",index+1)
          break if index == -1
          count += 1
        return count

      line = getLineCounts( jsGlobals.script ) + 2
      combinedSourceMap = combine.create('bundle.js')
      for file in results.files
        comment = convert.fromObject( results.sourceMaps[file.name] ).toComment();
        combinedSourceMap.addFile( { sourceFile: file.name, source: file.text + "\n#{comment}" }, {line} )
        line += ( getLineCounts( file.text ) )

      convertedSourceMap = convert.fromBase64(combinedSourceMap.base64()).toObject();
      url = URL.createObjectURL(new Blob([ JSON.stringify(convertedSourceMap) ]));
      code = jsGlobals.script + results.script + "//# sourceMappingURL=#{url}"
      scriptFunction = new Function 'player', code
      scriptFunction player

  callback()
  return

exports.loadAsset = (player, entry, callback) ->
  scriptNames.push entry.name
  player.getAssetData "assets/#{entry.id}/script.txt", 'text', (err, script) ->
    scripts["#{entry.name}.ts"] = "#{script}\n"
    callback null, script
    return
  return
