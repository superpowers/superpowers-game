module.exports = class CannonBody extends SupEngine.ActorComponent
  constructor: (actor, config={}) ->
    super actor, 'CannonBody'

    @body = new window.CANNON.Body()
    @body.addShape(new window.CANNON.Box(new window.CANNON.Vec3(1, 1, 1)))
    @setup config

  setup: (config) ->
    @mass = config.mass ? 0
    @fixedRotation = config.fixedRotation ? false
    @halfWidth = config.halfWidth ? 0.5
    @halfHeight = config.halfHeight ? 0.5
    @halfDepth = config.halfDepth ? 0.5
    @offsetX = config.offsetX ? 0
    @offsetY = config.offsetY ? 0
    @offsetZ = config.offsetZ ? 0

    @actorPosition = @actor.getGlobalPosition()
    @actorOrientation = @actor.getGlobalOrientation()

    @body.mass = @mass
    @body.type =
      if @mass == 0 then window.CANNON.Body.STATIC
      else window.CANNON.Body.DYNAMIC

    @body.fixedRotation = @fixedRotation

    @body.shapes[0].halfExtents.set @halfWidth, @halfHeight, @halfDepth
    @body.shapes[0].updateBoundingSphereRadius()
    @body.shapes[0].updateConvexPolyhedronRepresentation()

    @body.position.set @actorPosition.x + @offsetX, @actorPosition.y + @offsetY, @actorPosition.z + @offsetZ
    @body.quaternion.set @actorOrientation.x, @actorOrientation.y, @actorOrientation.z, @actorOrientation.w

    @body.updateBoundingRadius()
    @body.updateMassProperties()
    @body.aabbNeedsUpdate = true
    return

  update: ->
    @actorPosition.x = @body.position.x - @offsetX
    @actorPosition.y = @body.position.y - @offsetY
    @actorPosition.z = @body.position.z - @offsetZ
    @actor.setGlobalPosition @actorPosition

    @actorOrientation.x = @body.quaternion.x
    @actorOrientation.y = @body.quaternion.y
    @actorOrientation.z = @body.quaternion.z
    @actorOrientation.w = @body.quaternion.w
    @actor.setGlobalOrientation @actorOrientation
    return

  _destroy: ->
    @body = null
    super()
    return
