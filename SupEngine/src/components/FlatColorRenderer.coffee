SupEngine = require '../'

module.exports = class FlatColorRenderer extends SupEngine.ActorComponent

  constructor: (actor, color, scaleRatio, width, height) ->
    super actor, 'GridRenderer'

    @setup color, scaleRatio, width, height

  setup: (color, scaleRatio, width, height) ->
    return if ! color? or ! scaleRatio? or ! width?
    @_clearMesh() if @mesh?

    @width = width
    @height ?= @width

    canvas = document.createElement 'canvas'
    canvas.width = @width
    canvas.height = @height
    ctx = canvas.getContext '2d'
    ctx.fillStyle = color
    ctx.fillRect 0, 0, @width, @height

    texture = new SupEngine.THREE.Texture canvas
    texture.needsUpdate = true

    geometry = new SupEngine.THREE.PlaneBufferGeometry @width, @height
    material = new SupEngine.THREE.MeshBasicMaterial
      map: texture
      alphaTest: 0.1
      side: SupEngine.THREE.DoubleSide
      transparent: true
      opacity: 0.5

    @mesh = new SupEngine.THREE.Mesh geometry, material
    @actor.threeObject.add @mesh
    @refreshScale scaleRatio
    return

  refreshScale: (scaleRatio) ->
    @mesh.scale.set scaleRatio, scaleRatio, scaleRatio
    @mesh.position.set @width / 2 * scaleRatio, @height / 2 * scaleRatio, -0.01
    @mesh.updateMatrixWorld()
    return

  _clearMesh: ->
    @mesh.traverse (obj) -> obj.dispose?(); return
    @actor.threeObject.remove @mesh
    @mesh = null
    return

  _destroy: ->
    @_clearMesh()
    super()
    return
