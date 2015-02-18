SupEngine = require '../'

module.exports = class GridRenderer extends SupEngine.ActorComponent

  constructor: (actor, data) ->
    super actor, 'GridRenderer'

    @setGrid data if data?

  setGrid: (data) ->
    @_clearMesh()

    @width = data.width
    @height = data.height
    @direction = data.direction ? 1
    @orthographicScale = data.orthographicScale
    @ratio = data.ratio

    @_createMesh()
    return

  resize: (@width, @height) ->
    @_clearMesh()
    @_createMesh()
    return

  setOrthgraphicScale: (@orthographicScale) ->
    @_clearMesh()
    @_createMesh()
    return

  setRatio: (@ratio) ->
    @_clearMesh()
    @_createMesh()
    return

  _createMesh:  ->
    return if ! @width? or ! @height? or ! @orthographicScale? or ! @ratio?

    geometry = new SupEngine.THREE.Geometry

    # Vertical lines
    x = 0
    loop
      break if x > @width
      geometry.vertices.push new SupEngine.THREE.Vector3 x / @ratio, 0, 0
      geometry.vertices.push new SupEngine.THREE.Vector3 x / @ratio, @direction * @height / @ratio, 0
      x += 1

    # Horizontal lines
    y = 0
    loop
      break if y > @height
      geometry.vertices.push new SupEngine.THREE.Vector3 0, @direction * y / @ratio, 0
      geometry.vertices.push new SupEngine.THREE.Vector3 @width / @ratio, @direction * y / @ratio, 0
      y += 1

    geometry.computeLineDistances()

    material = new SupEngine.THREE.LineDashedMaterial color: 0x000000, dashSize: 5/1000, gapSize: 5/1000, scale: 1 / @orthographicScale
    material.transparent = true
    material.opacity = 0.4

    @mesh = new SupEngine.THREE.Line geometry, material, SupEngine.THREE.LinePieces
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  _clearMesh: ->
    return if ! @mesh?

    @mesh.traverse (obj) -> obj.dispose?(); return
    @actor.threeObject.remove @mesh
    @mesh = null
    return

  _destroy: ->
    @_clearMesh()
    super()
    return
