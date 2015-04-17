OT = require 'operational-transform'
fs = require 'fs'
path = require 'path'
_ = require 'lodash'

if ! window?
  serverRequire = require
  compileTypeScript = serverRequire '../runtime/compileTypeScript'
  ts = serverRequire 'typescript'
  globalDefs = ""

  actorComponentAccessors = []
  for pluginName, plugin of SupAPI.contexts["typescript"].plugins
    globalDefs += plugin.defs if plugin.defs?
    if plugin.exposeActorComponent?
      actorComponentAccessors.push "#{plugin.exposeActorComponent.propertyName}: #{plugin.exposeActorComponent.className};"

  globalDefs = globalDefs.replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join('\n    ')

module.exports = class ScriptAsset extends SupCore.data.base.Asset

  @schema:
    text: { type: 'string' }
    draft: { type: 'string' }
    revisionId: { type: 'integer' }

  constructor: (id, pub, serverData) ->
    @document = new OT.Document
    super id, pub, @constructor.schema, serverData

  init: (options, callback) ->
    # Transform "script asset name" into "ScriptAssetNameBehavior"
    behaviorName = options.name.trim()
    behaviorName = behaviorName.slice(0, 1).toUpperCase() + behaviorName.slice(1)

    loop
      index = behaviorName.indexOf(' ')
      break if index == -1

      behaviorName =
        behaviorName.slice(0, index) +
        behaviorName.slice(index + 1, index + 2).toUpperCase() +
        behaviorName.slice(index + 2)

    behaviorName += "Behavior" if ! _.endsWith(behaviorName, "Behavior")

    defaultContent =
      """
      class #{behaviorName} extends Sup.Behavior {
        awake() {

        }
        update() {

        }
      }
      Sup.registerBehavior(#{behaviorName});

      """

    @pub =
      text: defaultContent
      draft: defaultContent
      revisionId: 0

    @serverData.resources.acquire 'behaviorProperties', null, (err, behaviorProperties) =>
      if ! behaviorProperties.pub.behaviors[behaviorName]?
        behaviors = {}
        behaviors[behaviorName] = []
        behaviorProperties.setScriptBehaviors @id, behaviors

      @serverData.resources.release 'behaviorProperties', null
      super options, callback; return
    return

  setup: ->
    @document.text = @pub.draft
    @document.operations.push 0 for i in [0...@pub.revisionId] by 1

    @hasDraft = @pub.text != @pub.draft
    return

  restore: ->
    if @hasDraft then @emit 'setDiagnostic', 'draft', 'info'
    return

  destroy: (callback) ->
    @serverData.resources.acquire 'behaviorProperties', null, (err, behaviorProperties) =>
      behaviorProperties.clearScriptBehaviors @id
      @serverData.resources.release 'behaviorProperties', null
      callback(); return
    return

  load: (assetPath) ->
    fs.readFile path.join(assetPath, "asset.json"), { encoding: 'utf8' }, (err, json) =>
      @pub = JSON.parse json

      fs.readFile path.join(assetPath, "script.txt"), { encoding: 'utf8' }, (err, text) =>
        @pub.text = text

        fs.readFile path.join(assetPath, "draft.txt"), { encoding: 'utf8' }, (err, draft) =>
          # Temporary asset migration
          draft ?= @pub.text

          @pub.draft = draft
          @setup()
          @emit 'load'
        return
      return
    return

  save: (assetPath, callback) ->
    text = @pub.text; delete @pub.text
    draft = @pub.draft; delete @pub.draft

    json = JSON.stringify @pub, null, 2

    @pub.text = text
    @pub.draft = draft

    fs.writeFile path.join(assetPath, "asset.json"), json, { encoding: 'utf8' }, (err) ->
      if err? then callback err; return
      fs.writeFile path.join(assetPath, "script.txt"), text, { encoding: 'utf8' }, (err) ->
        if err? then callback err; return
        fs.writeFile path.join(assetPath, "draft.txt"), draft, { encoding: 'utf8' }, callback
    return

  server_editText: (client, operationData, revisionIndex, callback) ->
    if operationData.userId != client.id then callback 'Invalid client id'; return

    operation = new OT.TextOperation
    if ! operation.deserialize operationData then callback 'Invalid operation data'; return

    try operation = @document.apply operation, revisionIndex
    catch err then callback "Operation can't be applied"; return

    @pub.draft = @document.text
    @pub.revisionId++

    callback null, operation.serialize(), @document.operations.length - 1

    if ! @hasDraft
      @hasDraft = true
      @emit 'setDiagnostic', 'draft', 'info'

    @emit 'change'
    return

  client_editText: (operationData, revisionIndex) ->
    operation = new OT.TextOperation
    operation.deserialize operationData
    @document.apply operation, revisionIndex
    @pub.draft = @document.text
    @pub.revisionId++
    return

  server_saveText: (client, callback) ->
    @pub.text = @pub.draft

    scriptNames = []
    scripts = {}
    ownScriptName = ""

    finish = (errors) =>
      callback null, errors

      if @hasDraft
        @hasDraft = false
        @emit 'clearDiagnostic', 'draft'

      @emit 'change'
      return

    compile = =>
      try results = compileTypeScript scriptNames, scripts, globalDefs, sourceMap: false
      catch e then finish [ { file: "", position: { line: 1, character: 1 }, message: e.message } ]; return

      ownErrors = ( error for error in results.errors when error.file == ownScriptName )
      if ownErrors.length > 0 then finish ownErrors; return
      # If there were no errors in this script but there are errors in others, report them
      if results.errors.length > 0 then finish results.errors; return

      libSourceFile = results.program.getSourceFile("lib.d.ts")
      supTypeSymbols =
        "Sup.Actor": libSourceFile.locals.Sup.exports.Actor
        "Sup.Behavior": libSourceFile.locals.Sup.exports.Behavior
        "Sup.Math.Vector3": libSourceFile.locals.Sup.exports.Math.exports.Vector3
        "Sup.Asset": libSourceFile.locals.Sup.exports.Asset

      supTypeSymbolsList = (value for name, value of supTypeSymbols)

      behaviors = {}

      for symbolName, symbol of results.program.getSourceFile(ownScriptName).locals
        continue if (symbol.flags & ts.SymbolFlags.Class) != ts.SymbolFlags.Class

        baseTypeNode = ts.getClassBaseTypeNode(symbol.valueDeclaration)
        continue if ! baseTypeNode?

        typeSymbol = results.typeChecker.getSymbolAtLocation baseTypeNode.typeName
        loop
          break if typeSymbol == supTypeSymbols["Sup.Behavior"]
          baseTypeNode = ts.getClassBaseTypeNode(typeSymbol.valueDeclaration)
          break if ! baseTypeNode?
          typeSymbol = results.typeChecker.getSymbolAtLocation baseTypeNode.typeName

        continue if typeSymbol != supTypeSymbols["Sup.Behavior"]

        properties = behaviors[symbolName] = []

        for memberName, member of symbol.members
          # Skip non-properties
          continue if (member.flags & ts.SymbolFlags.Property) != ts.SymbolFlags.Property

          # Skip static, private and protected members
          modifierFlags = member.valueDeclaration.modifiers?.flags
          continue if modifierFlags? and (modifierFlags & (ts.NodeFlags.Private | ts.NodeFlags.Protected | ts.NodeFlags.Static)) != 0

          # TODO: skip members annotated as "non-customizable"

          type = results.typeChecker.getTypeAtLocation(member.valueDeclaration)
          typeName = null # "unknown"
          symbol = type.getSymbol()
          if symbol in supTypeSymbolsList
            # TODO: Get full name
            # Until then, we only support intrinsic types
            # typeName = symbol.getName()
          else if type.intrinsicName?
            typeName = type.intrinsicName

          if typeName?
            properties.push { name: memberName, type: typeName }

      @serverData.resources.acquire 'behaviorProperties', null, (err, behaviorProperties) =>
        behaviorProperties.setScriptBehaviors @id, behaviors
        @serverData.resources.release 'behaviorProperties', null
        finish []; return
      return

    remainingAssetsToLoad = Object.keys(@serverData.entries.byId).length
    assetsLoading = 0
    @serverData.entries.walk (entry) =>
      remainingAssetsToLoad--
      if entry.type != "script"
        compile() if remainingAssetsToLoad == 0 and assetsLoading == 0
        return

      name = "#{@serverData.entries.getPathFromId(entry.id)}.ts"
      scriptNames.push name
      assetsLoading++
      @serverData.assets.acquire entry.id, null, (err, asset) =>
        scripts[name] = asset.pub.text
        ownScriptName = name if asset == @

        @serverData.assets.release entry.id
        assetsLoading--

        compile() if remainingAssetsToLoad == 0 and assetsLoading == 0
        return
      return
    return

  client_saveText: ->
    @pub.text = @pub.draft
    return
