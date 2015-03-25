SupEngine = require './'
THREE = SupEngine.THREE
{ EventEmitter } = require 'events'

module.exports = class GameInstance extends EventEmitter
  @framesPerSecond: 60

  constructor: (canvas, options={}) ->
    super()

    @debug = options.debug == true

    @tree = new SupEngine.ActorTree
    @cachedActors = []
    @renderComponents = []
    @componentsToBeStarted = []
    @componentsToBeDestroyed = []
    @actorsToBeDestroyed = []
    @skipRendering = false

    @input = new SupEngine.Input canvas
    @audio = new SupEngine.Audio

    @threeRenderer = new THREE.WebGLRenderer {
      canvas, precision: 'mediump',
      alpha: false, antialias: false, stencil: false
    }
    @threeRenderer.setSize canvas.clientWidth, canvas.clientHeight, false
    @threeRenderer.autoClearColor = false
    # @threeRenderer.setFaceCulling THREE.CullFaceNone
    # @threeRenderer.setBlending THREE.CustomBlending, THREE.AddEquation, THREE.OneFactor, THREE.OneMinusSrcAlphaFactor

    @threeScene = new THREE.Scene()
    @threeScene.autoUpdate = false

  ###init: (callback) ->
    callback()###

  update: ->
    @input.update()

    # Build cached actors list
    @cachedActors.length = 0
    @tree.walkTopDown (actor) => @cachedActors.push actor; return

    # Start newly-added components
    index = 0
    while index < @componentsToBeStarted.length
      component = @componentsToBeStarted[index]

      # If the component to be started is part of an actor
      # which will not be updated, skip it until next loop
      if @cachedActors.indexOf(component.actor) == -1
        index++
        continue

      component.start()
      @componentsToBeStarted.splice index, 1

    earlyUpdate() for pluginName, earlyUpdate of SupEngine.earlyUpdateFunctions

    # Update all actors
    actor.update() for actor in @cachedActors

    # Apply pending component / actor destructions
    @_doComponentDestruction component for component in @componentsToBeDestroyed
    @componentsToBeDestroyed.length = 0

    @_doActorDestruction actor for actor in @actorsToBeDestroyed
    @actorsToBeDestroyed.length = 0

    if @exited then @threeRenderer.clear(); return
    if @skipRendering then @skipRendering = false; @update(); return
    return

  draw: ->
    width = @threeRenderer.domElement.clientWidth
    height = @threeRenderer.domElement.clientHeight
    if @threeRenderer.domElement.width != width or @threeRenderer.domElement.height != height
      @threeRenderer.setSize width, height, false
      @emit 'resize', { width, height }

    @threeRenderer.clear()
    @renderComponents.sort( (a, b) => @cachedActors.indexOf(a.actor) - @cachedActors.indexOf(b.actor) )
    renderComponent.render() for renderComponent in @renderComponents
    return

  clear: ->
    @threeRenderer.clear()
    return

  destroyComponent: (component) ->
    return if @componentsToBeDestroyed.indexOf(component) != -1

    @componentsToBeDestroyed.push component

    index = @componentsToBeStarted.indexOf(component)
    @componentsToBeStarted.splice index, 1 if index != -1
    return

  destroyActor: (actor) ->
    return if actor.pendingForDestruction

    @actorsToBeDestroyed.push actor
    actor._markDestructionPending()
    return

  destroyAllActors: ->
    @tree.walkTopDown (actor) => @destroyActor actor; return
    @skipRendering = true
    return

  _doComponentDestruction: (component) -> component._destroy(); return

  _doActorDestruction: (actor) ->
    @_doActorDestruction actor.children[0] while actor.children.length > 0

    cachedIndex = @cachedActors.indexOf(actor)
    @cachedActors.splice cachedIndex, 1 if cachedIndex != -1

    actor._destroy()
    return
