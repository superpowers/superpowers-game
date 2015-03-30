module.exports = class P2Body extends SupEngine.ActorComponent
  constructor: (actor, config={}) ->
    super actor, 'P2Body'

    @body = new window.p2.Body()
    SupEngine.P2.World.addBody @body
    return if ! config.shape?

    @setup config

  setup: (config) ->
    @mass = config.mass ? 0
    @fixedRotation = config.fixedRotation ? false
    @offsetX = config.offsetX ? 0
    @offsetY = config.offsetY ? 0

    @actorPosition = @actor.getGlobalPosition()
    @actorAngles = @actor.getGlobalEulerAngles()

    @body.mass = @mass
    @body.type =
      if @mass == 0 then window.p2.Body.STATIC
      else window.p2.Body.DYNAMIC
    @body.material = SupEngine.P2.World.defaultMaterial
    @body.fixedRotation = @fixedRotation
    @body.updateMassProperties()

    @shape = config.shape
    switch @shape
      when "rectangle"
        @width = config.width ? 0.5
        @height = config.height ? 0.5
        @body.addShape(new window.p2.Rectangle(@width, @height))
      when "circle"
        @radius = config.radius ? 1
        @body.addShape(new window.p2.Circle(@radius))
      when "line"
        @length = config.length ? 1
        @body.addShape(new window.p2.Line(@length))

    @body.position = [@actorPosition.x, @actorPosition.y]
    @body.shapeOffsets[0] = [@offsetX, @offsetY]
    @body.angle = @actorAngles.z
    return

  update: ->
    @actorPosition.x = @body.position[0]
    @actorPosition.y = @body.position[1]
    @actor.setGlobalPosition @actorPosition

    @actorAngles.z = @body.angle
    @actor.setGlobalEulerAngles @actorAngles
    return

  _destroy: ->
    SupEngine.P2.World.remove @body
    @body = null
    super()
    return
