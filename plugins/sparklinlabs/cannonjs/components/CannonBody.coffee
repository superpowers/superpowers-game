module.exports = class CannonBody extends SupEngine.ActorComponent
  constructor: (actor, config={}) ->
    super actor, 'CannonBody'

    @body = new window.CANNON.Body()
    @setup config

  setup: (config) ->
    @mass = config.mass ? 0
    @fixedRotation = config.fixedRotation ? true
    @halfWidth = config.halfWidth ? 0.5
    @halfHeight = config.halfHeight ? 0.5
    @halfDepth = config.halfDepth ? 0.5
    @offsetX = config.offsetX ? 0
    @offsetY = config.offsetY ? 0
    @offsetZ = config.offsetZ ? 0

    @actorPosition = @actor.getGlobalPosition()

    @body.mass = @mass
    @body.type =
      if @mass == 0 then window.CANNON.Body.STATIC
      else window.CANNON.Body.DYNAMIC

    @body.fixedRotation = true
    @body.addShape(new window.CANNON.Box(new window.CANNON.Vec3(@halfWidth, @halfHeight, @halfDepth)))
    @body.position.set @actorPosition.x + @offsetX, @actorPosition.y + @offsetY, @actorPosition.z + @offsetZ
    @body.updateMassProperties()
    return

  update: ->
    @actorPosition.x = @body.position.x - @offsetX
    @actorPosition.y = @body.position.y - @offsetY
    @actorPosition.z = @body.position.z - @offsetZ
    @actor.setGlobalPosition @actorPosition
    return

  _destroy: ->
    @body = null
    super()
    return
