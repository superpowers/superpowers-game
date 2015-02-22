THREE = require 'three'

module.exports = class Actor

  constructor: (@gameInstance, @name, @parent) ->
    @threeObject = new THREE.Object3D

    if @parent?
      @parent.children.push @
      @parent.threeObject.add @threeObject
      @threeObject.updateMatrixWorld()
    else
      @gameInstance.tree.root.push @
      @gameInstance.threeScene.add @threeObject

    @children = []
    @components = []
    @pendingForDestruction = false

  # We have to duplicate the components list because a script could add more
  # components to the actor during the loop and they will be awoken automatically
  awake: -> component.awake() for component in @components.slice(); return

  # Same here, a script component could create additional components and they
  # should only be updated after being started during the next loop
  update: ->
    return if @pendingForDestruction
    component.update() for component in @components.slice()
    return

  # Transform
  getGlobalMatrix: -> @threeObject.matrixWorld.clone()
  getGlobalPosition: -> new THREE.Vector3().setFromMatrixPosition @threeObject.matrixWorld
  getLocalPosition: -> @threeObject.position.clone()
  getGlobalOrientation: -> new THREE.Quaternion().multiplyQuaternions @getParentGlobalOrientation(), @threeObject.quaternion
  getGlobalEulerAngles: -> new THREE.Euler().setFromQuaternion @getGlobalOrientation()
  getLocalOrientation: -> @threeObject.quaternion.clone()
  getLocalEulerAngles: -> new THREE.Euler().setFromQuaternion @threeObject.quaternion
  getLocalScale: -> @threeObject.scale.clone()

  getParentGlobalOrientation: ->
    ancestorOrientation = new THREE.Quaternion()
    ancestorActor = @threeObject
    while ancestorActor.parent?
      ancestorActor = ancestorActor.parent
      ancestorOrientation.multiplyQuaternions ancestorActor.quaternion, ancestorOrientation
    ancestorOrientation

  setGlobalMatrix: (matrix) ->
    matrix.multiplyMatrices new THREE.Matrix4().getInverse(@threeObject.parent.matrixWorld), matrix
    matrix.decompose @threeObject.position, @threeObject.quaternion, @threeObject.scale
    @threeObject.updateMatrixWorld()
    return

  setGlobalPosition: (pos) ->
    @threeObject.parent.worldToLocal pos
    @threeObject.position.set pos.x, pos.y, pos.z
    @threeObject.updateMatrixWorld()
    return

  setLocalPosition: (pos) ->
    @threeObject.position.copy pos
    @threeObject.updateMatrixWorld()
    return

  lookAt: (target) ->
    @lookTowards target.sub @getGlobalPosition()
    return

  lookTowards: (direction) ->
    angleY = Math.atan2 direction.x, direction.z

    planeDistance = Math.sqrt Math.pow(direction.x, 2) + Math.pow(direction.z, 2)
    angleX = -Math.atan2 direction.y, planeDistance

    @setGlobalOrientation new THREE.Quaternion().setFromEuler new THREE.Euler angleX, angleY, 0
    return

  setLocalOrientation: (quaternion) ->
    @threeObject.quaternion.copy quaternion
    @threeObject.updateMatrixWorld()
    return

  tmpMatrix = new THREE.Matrix4()

  setGlobalOrientation: (quaternion) ->
    inverseParentQuaternion = new THREE.Quaternion().setFromRotationMatrix(tmpMatrix.extractRotation(@threeObject.parent.matrixWorld)).inverse()
    quaternion.multiplyQuaternions inverseParentQuaternion, quaternion
    @threeObject.quaternion.copy quaternion
    @threeObject.updateMatrixWorld()
    return

  setLocalEulerAngles: (eulerAngles) ->
    @threeObject.quaternion.setFromEuler eulerAngles
    @threeObject.updateMatrixWorld()
    return

  setGlobalEulerAngles: (eulerAngles) ->
    globalQuaternion = new THREE.Quaternion().setFromEuler eulerAngles
    inverseParentQuaternion = new THREE.Quaternion().setFromRotationMatrix(tmpMatrix.extractRotation(@threeObject.parent.matrixWorld)).inverse()
    globalQuaternion.multiplyQuaternions inverseParentQuaternion, globalQuaternion
    @threeObject.quaternion.copy globalQuaternion
    @threeObject.updateMatrixWorld()
    return

  setLocalScale: (scale) ->
    @threeObject.scale.copy scale
    @threeObject.updateMatrixWorld()
    return

  setParent: (newParent, keepLocal = false) ->
    return if @pendingForDestruction or newParent?.pendingForDestruction

    globalMatrix = @getGlobalMatrix() if ! keepLocal

    oldSiblings = if @parent? then @parent.children else @gameInstance.tree.root
    oldSiblings.splice oldSiblings.indexOf(@), 1
    @threeObject.parent.remove @threeObject

    @parent = newParent

    siblings = if newParent? then newParent.children else @gameInstance.tree.root
    siblings.push @
    threeParent = if newParent? then newParent.threeObject else @gameInstance.threeScene
    threeParent.add @threeObject

    @setGlobalMatrix globalMatrix if ! keepLocal
    return

  rotateGlobal: (quaternion) ->
    globalOrientation = @getGlobalOrientation()
    globalOrientation.multiplyQuaternions quaternion, globalOrientation
    @setGlobalOrientation globalOrientation
    return

  rotateLocal: (quaternion) ->
    @threeObject.quaternion.multiplyQuaternions quaternion, @threeObject.quaternion
    @threeObject.updateMatrixWorld()
    return

  rotateGlobalEulerAngles: (eulerAngles) ->
    quaternion = new THREE.Quaternion().setFromEuler eulerAngles
    @rotateGlobal quaternion
    return

  rotateLocalEulerAngles: (eulerAngles) ->
    quaternion = new THREE.Quaternion().setFromEuler eulerAngles
    @threeObject.quaternion.multiplyQuaternions quaternion, @threeObject.quaternion
    @threeObject.updateMatrixWorld()
    return

  moveGlobal: (offset) ->
    offset.add @getGlobalPosition()
    @setGlobalPosition offset
    return

  moveLocal: (offset) ->
    @threeObject.position.add offset
    @threeObject.updateMatrixWorld()
    return

  moveOriented: (offset) ->
    offset.applyQuaternion @threeObject.quaternion
    @threeObject.position.add offset
    @threeObject.updateMatrixWorld()
    return

  _destroy: ->
    @components[0]._destroy() while @components.length > 0
    @components = null

    if @parent?
      @parent.threeObject.remove @threeObject
      @parent.children.splice @parent.children.indexOf(@), 1
      @parent = null
    else
      @gameInstance.tree.root.splice @gameInstance.tree.root.indexOf(@), 1
      @gameInstance.threeScene.remove @threeObject
    @threeObject = null

    @gameInstance = null
    return

  _markDestructionPending: ->
    @pendingForDestruction = true
    child._markDestructionPending() for child in @children
    return
