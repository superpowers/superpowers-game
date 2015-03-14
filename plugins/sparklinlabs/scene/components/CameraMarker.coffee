THREE = SupEngine.THREE

module.exports = class CameraMarker extends SupEngine.ActorComponent

  @Updater: require './CameraUpdater'

  constructor: (actor, config) ->
    super actor, 'Marker'

    @viewport = { x: 0, y: 0, width: 1, height: 1 }

    @projectionNeedsUpdate = true
    @setConfig config if config?

    geometry = new THREE.Geometry
    geometry.vertices.push new THREE.Vector3(0,0,0) for i in [0...24]

    @line = new THREE.Line geometry, new THREE.LineBasicMaterial( color: 0xffffff, opacity: 0.5, transparent: true ), THREE.LinePieces
    @actor.threeObject.add @line
    @line.updateMatrixWorld()

  setConfig: (config) ->
    @setOrthographicMode config.mode == 'orthographic'
    @setFOV config.fov
    @setOrthographicScale config.orthographicScale
    @setViewport config.viewport.x, config.viewport.y, config.viewport.width, config.viewport.height
    return

  setOrthographicMode: (@isOrthographic) ->
    @projectionNeedsUpdate = true
    return

  setFOV: (@fov) ->
    if ! @isOrthographic then @projectionNeedsUpdate = true
    return

  setOrthographicScale: (@orthographicScale) ->
    if @isOrthographic then @projectionNeedsUpdate = true
    return

  setViewport: (x, y, width, height) ->
    @viewport.x = x
    @viewport.y = y
    @viewport.width = width
    @viewport.height = height
    @projectionNeedsUpdate = true
    return

  _resetGeometry: ->
    near = 0.1
    far = 500

    if @isOrthographic
      farTopRight = new THREE.Vector3 @orthographicScale / 2, @orthographicScale / 2, far
      nearTopRight = new THREE.Vector3 @orthographicScale / 2, @orthographicScale / 2, near
    else
      tan = Math.tan THREE.Math.degToRad(@fov / 2)
      farTopRight = new THREE.Vector3 far * tan, far * tan, far
      nearTopRight = farTopRight.clone().normalize().multiplyScalar(0.1)

    # Near plane
    @line.geometry.vertices[0].set -nearTopRight.x,  nearTopRight.y, -near
    @line.geometry.vertices[1].set  nearTopRight.x,  nearTopRight.y, -near
    @line.geometry.vertices[2].set  nearTopRight.x,  nearTopRight.y, -near
    @line.geometry.vertices[3].set  nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[4].set  nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[5].set -nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[6].set -nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[7].set -nearTopRight.x,  nearTopRight.y, -near

    # Far plane
    @line.geometry.vertices[8].set  -farTopRight.x,  farTopRight.y, -far
    @line.geometry.vertices[9].set   farTopRight.x,  farTopRight.y, -far
    @line.geometry.vertices[10].set  farTopRight.x,  farTopRight.y, -far
    @line.geometry.vertices[11].set  farTopRight.x, -farTopRight.y, -far
    @line.geometry.vertices[12].set  farTopRight.x, -farTopRight.y, -far
    @line.geometry.vertices[13].set -farTopRight.x, -farTopRight.y, -far
    @line.geometry.vertices[14].set -farTopRight.x, -farTopRight.y, -far
    @line.geometry.vertices[15].set -farTopRight.x,  farTopRight.y, -far

    # Lines
    @line.geometry.vertices[16].set -nearTopRight.x,  nearTopRight.y, -near
    @line.geometry.vertices[17].set  -farTopRight.x,   farTopRight.y, -far
    @line.geometry.vertices[18].set  nearTopRight.x,  nearTopRight.y, -near
    @line.geometry.vertices[19].set   farTopRight.x,   farTopRight.y, -far
    @line.geometry.vertices[20].set  nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[21].set   farTopRight.x,  -farTopRight.y, -far
    @line.geometry.vertices[22].set -nearTopRight.x, -nearTopRight.y, -near
    @line.geometry.vertices[23].set  -farTopRight.x,  -farTopRight.y, -far

    @line.geometry.verticesNeedUpdate = true
    return

  _destroy: ->
    @actor.threeObject.remove @line
    @line.geometry.dispose()
    @line.material.dispose()
    @line = null

    super()
    return

  update: ->
    if @projectionNeedsUpdate
      @projectionNeedsUpdate = false
      @_resetGeometry()

    return
