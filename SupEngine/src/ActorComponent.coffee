module.exports = class ActorComponent

  constructor: (@actor, @typeName) ->
    @actor.components.push @
    @actor.gameInstance.componentsToBeStarted.push @

  _destroy: ->
    startIndex = @actor.gameInstance.componentsToBeStarted.indexOf @
    @actor.gameInstance.componentsToBeStarted.splice startIndex, 1 if startIndex != -1

    index = @actor.components.indexOf @
    @actor.components.splice index, 1 if index != -1
    @actor = null
    return

  awake: ->
  start: ->
  update: ->
