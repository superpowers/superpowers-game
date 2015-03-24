module.exports = class ArcadeBody2D extends SupEngine.ActorComponent
  constructor: (actor, config={}) ->
    super actor, 'ArcadeBody2D'

    @setup config

  setup: (config) ->
    @movable = config.movable ? true
    @width = config.width ? 1
    @height = config.height ? 1
    @offsetX = config.offsetX ? 0
    @offsetY = config.offsetY ? 0
    @bounceX = config.bounceX ? 0
    @bounceY = config.bounceY ? 0

    @actorPosition = @actor.getGlobalPosition()
    @position = @actorPosition.clone()
    @position.x += @offsetX
    @position.y += @offsetY
    @previousPosition = @position.clone()

    @velocity = new SupEngine.THREE.Vector3 0, 0, 0
    @velocityMin = new SupEngine.THREE.Vector3 -0.5, -0.5, 0
    @velocityMax = new SupEngine.THREE.Vector3 0.5, 0.5, 0
    @velocityMultiplier = new SupEngine.THREE.Vector3 0, 0, 0

    @touches = { top: false, bottom: false, right: false, left: false }
    return

  earlyUpdate: ->
    return if not @movable

    @previousPosition.copy @position

    @velocity.x += SupEngine.ArcadePhysics2D.gravity.x * 1 / SupEngine.GameInstance.framesPerSecond
    @velocity.x *= 1 + @velocityMultiplier.x / 100;

    @velocity.y += SupEngine.ArcadePhysics2D.gravity.y * 1 / SupEngine.GameInstance.framesPerSecond
    @velocity.y *= 1 + @velocityMultiplier.y / 100;
    if @velocity.length() != 0
      @velocity.x = Math.min( Math.max( @velocity.x, @velocityMin.x ), @velocityMax.x )
      @velocity.y = Math.min( Math.max( @velocity.y, @velocityMin.y ), @velocityMax.y )
      @position.add @velocity
      @refreshActorPosition()
    return

  refreshActorPosition: ->
    @actorPosition.x = @position.x - @offsetX
    @actorPosition.y = @position.y - @offsetY
    @actor.setGlobalPosition @actorPosition
    return

  _destroy: ->
    SupEngine.ArcadePhysics2D.allBodies.splice( SupEngine.ArcadePhysics2D.allBodies.indexOf( @.__outer ), 1 );
    super()
    return

  right: -> @position.x + @width / 2
  left: -> @position.x - @width / 2
  top: -> @position.y + @height / 2
  bottom: -> @position.y - @height / 2
  deltaX: -> @position.x - @previousPosition.x
  deltaY: -> @position.y - @previousPosition.y
