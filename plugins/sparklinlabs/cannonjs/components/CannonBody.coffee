module.exports = class CannonBody extends SupEngine.ActorComponent
  constructor: (actor, config={}) ->
    super actor, 'CannonBody'

    @body = new window.CANNON.Body()
    SupEngine.CannonWorld.addBody @body
    return if ! config.shape?

    @setup config

  setup: (config) ->
    @mass = config.mass ? 0
    @fixedRotation = config.fixedRotation ? false
    @offsetX = config.offsetX ? 0
    @offsetY = config.offsetY ? 0
    @offsetZ = config.offsetZ ? 0

    @actorPosition = @actor.getGlobalPosition()
    @actorOrientation = @actor.getGlobalOrientation()

    @body.mass = @mass
    @body.type =
      if @mass == 0 then window.CANNON.Body.STATIC
      else window.CANNON.Body.DYNAMIC
    @body.material = SupEngine.CannonWorld.defaultMaterial
    @body.fixedRotation = @fixedRotation
    @body.updateMassProperties()

    @shape = config.shape
    switch @shape
      when "box"
        @halfWidth = config.halfWidth ? 0.5
        @halfHeight = config.halfHeight ? 0.5
        @halfDepth = config.halfDepth ? 0.5
        @body.addShape(new window.CANNON.Box(new window.CANNON.Vec3(@halfWidth, @halfHeight, @halfDepth)))
      when "sphere"
        @radius = config.radius ? 1
        @body.addShape(new window.CANNON.Sphere(@radius))
      when "cylinder"
        @radius = config.radius ? 1
        @height = config.height ? 1
        @body.addShape(new window.CANNON.Cylinder(@radius, @radius, @height, 20))

    @body.position.set @actorPosition.x, @actorPosition.y, @actorPosition.z
    @body.shapeOffsets[0].set @offsetX, @offsetY, @offsetZ
    @body.quaternion.set @actorOrientation.x, @actorOrientation.y, @actorOrientation.z, @actorOrientation.w
    return

  update: ->
    @actorPosition.set @body.position.x, @body.position.y, @body.position.z
    @actor.setGlobalPosition @actorPosition

    @actorOrientation.set @body.quaternion.x, @body.quaternion.y, @body.quaternion.z, @body.quaternion.w
    @actor.setGlobalOrientation @actorOrientation
    return

  _destroy: ->
    SupEngine.CannonWorld.remove @body
    @body = null
    super()
    return
