OT = require 'operational-transform'
fs = require 'fs'
path = require 'path'

if ! window?
  serverRequire = require
  TsCompiler = serverRequire '../runtime/tsCompiler'
  tsLibDefs = fs.readFileSync(__dirname + '/../runtime/lib.d.ts', encoding: 'utf8')
  tsSupDefs = fs.readFileSync(__dirname + '/../runtime/Sup.d.ts', encoding: 'utf8')

  actorComponentAccessors = ""
  for pluginName, plugin of SupAPI.contexts["typescript"].plugins
    tsSupDefs += plugin.defs if plugin.defs?
    if plugin.exposeActorComponent?
      actorComponentAccessors += "#{plugin.exposeActorComponent.propertyName}: #{plugin.exposeActorComponent.className}; "

  tsSupDefs = tsSupDefs.replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors

module.exports = class ScriptAsset extends SupCore.data.base.Asset

  @schema:
    text: { type: 'string' }
    draft: { type: 'string' }
    revisionId: { type: 'integer' }

  constructor: (pub, serverData) ->
    @document = new OT.Document
    super pub, @constructor.schema, serverData

  init: ->
    @pub = text: """
class MyBehavior extends Sup.Behavior {
  awake() {
    
  }
  update() {
    
  }
}
Sup.registerBehavior(MyBehavior);

"""
    @pub.draft = @pub.text
    @pub.revisionId = 0
    super(); return

  setup: ->
    @document.text = @pub.draft
    @document.operations.push 0 for i in [0...@pub.revisionId] by 1

    @hasDraft = @pub.text != @pub.draft
    return

  restore: ->
    if @hasDraft then @emit 'setDiagnostic', 'draft', 'info'
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
    return

  server_saveText: (client, callback) ->
    @pub.text = @pub.draft

    scriptNames = []
    scripts = {}
    ownName = ""

    compile = =>
      results = TsCompiler scriptNames, scripts, "#{tsLibDefs}#{tsSupDefs}", sourceMap: false
      ownErrors = []
      for error in results.errors
        continue if error.file != ownName
        ownErrors.push error

      callback null, ownErrors
      if @hasDraft
        @hasDraft = false
        @emit 'clearDiagnostic', 'draft'

      @emit 'change'
      return

    remainingAssetsToLoad = Object.keys( @serverData.entries.byId ).length
    assetsLoading = 0
    @serverData.entries.walk (entry) =>
      remainingAssetsToLoad -= 1
      if entry.type != "script"
        compile() if remainingAssetsToLoad == 0 and assetsLoading == 0
        return

      name = "#{@serverData.entries.getPathFromId(entry.id)}.ts"
      scriptNames.push name
      assetsLoading += 1
      @serverData.assets.acquire entry.id, null, (err, asset) =>
        assetsLoading -= 1
        @serverData.assets.release entry.id

        scripts[name] = "#{asset.pub.text}"
        ownName = name if asset == @

        compile() if remainingAssetsToLoad == 0 and assetsLoading == 0
        return
      return
    return

  client_saveText: ->
    @pub.text = @pub.draft
    return
