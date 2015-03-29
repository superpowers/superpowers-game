path = require 'path'
fs = require 'fs'

module.exports = class BehaviorPropertiesResource extends SupCore.data.base.Resource

  @schema:
    behaviors:
      type: 'hash'
      keys: { minLength: 1 }
      values:
        type: 'hash'
        properties:
          scriptId: { type: 'integer' }
          properties:
            type: 'array'
            items:
              type: 'hash'
              properties:
                name: { type: 'string' }
                type: { type: 'string' }

  constructor: (pub, serverData) ->
    super pub, @constructor.schema, serverData

  setup: ->
    @behaviorNamesByScriptId = {}

    for behaviorName, behavior of @pub.behaviors
      behaviorNames = @behaviorNamesByScriptId[behavior.scriptId] ?= []
      behaviorNames.push behaviorName
    return

  init: (callback) ->
    @pub = behaviors: {}
    super callback; return

  setScriptBehaviors: (scriptId, behaviorProperties) ->
    @client_setScriptBehaviors scriptId, behaviorProperties
    @emit 'command', 'setScriptBehaviors', scriptId, behaviorProperties
    @emit 'change'; return

  client_setScriptBehaviors: (scriptId, behaviorProperties) ->
    oldBehaviorNames = @behaviorNamesByScriptId[scriptId] ? []
    newBehaviorNames = @behaviorNamesByScriptId[scriptId] = []

    for name, properties of behaviorProperties
      @pub.behaviors[name] = { scriptId, properties }
      newBehaviorNames.push name

    for oldBehaviorName in oldBehaviorNames
      continue if newBehaviorNames.indexOf(oldBehaviorName) != -1
      delete @pub.behaviors[oldBehaviorName]

    return

  clearScriptBehaviors: (scriptId) ->
    @client_clearScriptBehaviors scriptId
    @emit 'command', 'clearScriptBehaviors', scriptId
    @emit 'change'; return

  client_clearScriptBehaviors: (scriptId, behaviorProperties) ->
    oldBehaviorNames = @behaviorNamesByScriptId[scriptId]
    return if ! oldBehaviorNames?

    for oldBehaviorName in oldBehaviorNames
      delete @pub.behaviors[oldBehaviorName]

    delete @behaviorNamesByScriptId[scriptId]
    return
