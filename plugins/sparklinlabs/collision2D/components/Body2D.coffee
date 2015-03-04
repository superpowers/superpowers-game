module.exports = class Body2D extends SupEngine.ActorComponent
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
    @minVelocity = new SupEngine.THREE.Vector3 -0.5, -0.5, 0
    @maxVelocity = new SupEngine.THREE.Vector3 0.5, 0.5, 0

    @touches = { top: false, bottom: false, right: false, left: false }

  update: ->
    return if not @movable

    @previousPosition.copy @position

    @velocity.sub SupEngine.Collision2D.gravity.clone().multiplyScalar( 1 / SupEngine.GameInstance.framesPerSecond )
    @velocity.x = Math.min( Math.max( @velocity.x, @minVelocity.x ), @maxVelocity.x )
    @velocity.y = Math.min( Math.max( @velocity.y, @minVelocity.y ), @maxVelocity.y )

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