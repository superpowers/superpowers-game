module.exports = class Body2D extends SupEngine.ActorComponent
  @Updater: require './Body2DUpdater'

  constructor: (actor, options) ->
    super actor, 'Body2D'

    options ?= {}
    @movable = options.movable ? true
    @width = options.width ? 1
    @height = options.height ? 1
    @bounceX = options.bounceX ? 0
    @bounceY = options.bounceY ? 0

    @position = @actor.getGlobalPosition()
    @previousPosition = @position.clone()
    @velocity = new SupEngine.THREE.Vector3 0, 0, 0
    @velocityMin = new SupEngine.THREE.Vector3 -0.5, -0.5, 0
    @velocityMax = new SupEngine.THREE.Vector3 0.5, 0.5, 0
    @velocityMultiplier = new SupEngine.THREE.Vector3 0, 0, 0

    @touches = { top: false, bottom: false, right: false, left: false }

  earlyUpdate: ->
    return if not @movable

    @previousPosition.copy @position

    @velocity.add SupEngine.Collision2D.gravity.clone().multiplyScalar( 1 / SupEngine.GameInstance.framesPerSecond )
    @velocity.x *= 1 + @velocityMultiplier.x / 100;
    @velocity.y *= 1 + @velocityMultiplier.y / 100;
    if @velocity.length() != 0
      @velocity.x = Math.min( Math.max( @velocity.x, @velocityMin.x ), @velocityMax.x )
      @velocity.y = Math.min( Math.max( @velocity.y, @velocityMin.y ), @velocityMax.y )

      @position.add @velocity
      @actor.setGlobalPosition @position
    return

  _destroy: ->
    SupEngine.Collision2D.allBodies.splice( SupEngine.all2DBodies.indexOf( @.__outer ), 1 );
    return

  right: -> @position.x + @width / 2
  left: -> @position.x - @width / 2
  top: -> @position.y + @height / 2
  bottom: -> @position.y - @height / 2
  deltaX: -> @position.x - @previousPosition.x
  deltaY: -> @position.y - @previousPosition.y