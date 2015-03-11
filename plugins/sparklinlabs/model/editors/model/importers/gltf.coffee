readFile = require './readFile'
async = require 'async'
THREE = SupEngine.THREE

gltfConst =
  UNSIGNED_SHORT: 5123
  FLOAT: 5126

convertAxisAngleToQuaternion = (rotations, count) ->
  q = new THREE.Quaternion
  axis = new THREE.Vector3
  euler = new THREE.Vector3

  for i in [0...count]
    axis.set(rotations[i * 4], rotations[i * 4 + 1], rotations[i * 4 + 2]).normalize()
    angle = rotations[i * 4 + 3]
    q.setFromAxisAngle axis, angle
    rotations[i * 4] = q.x
    rotations[i * 4 + 1] = q.y
    rotations[i * 4 + 2] = q.z
    rotations[i * 4 + 3] = q.w
  return

exports.import = (files, callback) ->
  gltfFile = null
  bufferFiles = {}
  imageFiles = {}
  buffers = {}
  bufferViews = {}

  for file in files
    filename = file.name
    extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()

    switch extension
      when 'gltf'
        if gltfFile? then callback new Error "Cannot import multiple GLTF files at once"; return
        gltfFile = file

      when 'bin' then bufferFiles[filename] = file
      when 'png', 'jpg' then imageFiles[filename] = file
      else callback new Error "Unsupported file type: #{filename}"; return

  readFile gltfFile, 'json', (err, gltf) ->
    if err? then callback new Error "Could not parse GLTF file as JSON"; return
    if Object.keys(gltf.meshes).length > 1 then callback new Error "Only a single mesh is supported"; return

    upAxisMatrix = new THREE.Matrix4()

    rootNode = gltf.nodes[ gltf.scenes[gltf.scene].nodes[0] ]

    # Check if the model has its up-axis pointing in the wrong direction
    if rootNode.name == 'Y_UP_Transform'
      upAxisMatrix.fromArray rootNode.matrix
      upAxisMatrix.getInverse(upAxisMatrix)

    meshName = null
    rootBoneNames = null
    skin = null

    for childName in rootNode.children
      node = gltf.nodes[childName]

      # FIXME: is it sometimes node.meshes?
      if node.instanceSkin?.meshes?.length > 0
        meshName = node.instanceSkin.meshes[0]
        rootBoneNames = node.instanceSkin.skeletons
        skin = gltf.skins[node.instanceSkin.skin]
        break

    if ! meshName? then callback new Error "Couldn't find a mesh"; return

    meshInfo = gltf.meshes[meshName]
    if meshInfo.primitives.length != 1 then callback new Error "Only a single primitive is supported"; return
    if meshInfo.primitives[0].primitive != 4 then callback new Error "Only triangles are supported"; return

    async.each Object.keys(gltf.buffers), (name, cb) ->
      bufferInfo = gltf.buffers[name]

      # Remove path info from the URI
      filename = bufferInfo.uri
      if filename.indexOf('/') != -1 then filename = filename.substring(filename.lastIndexOf('/') + 1)
      else if filename.indexOf('\\') != -1 then filename = filename.substring(filename.lastIndexOf('\\') + 1)

      bufferFile = bufferFiles[filename]
      if ! bufferFile? then cb new Error "Missing buffer file: #{filename}"; return

      readFile bufferFile, 'arraybuffer', (err, buffer) ->
        if err? then cb err; return
        buffers[name] = buffer
        cb(); return
      return

    , (err) ->
      if err? then callback err; return

      primitive = meshInfo.primitives[0]
      attributes = {}

      # Indices
      indexAccessor = gltf.accessors[primitive.indices]
      if indexAccessor.componentType != gltfConst.UNSIGNED_SHORT
        callback new Error "Unsupported component type for index accessor: #{indexAccessor.componentType}"; return

      indexBufferView = gltf.bufferViews[indexAccessor.bufferView]
      start = indexBufferView.byteOffset + indexAccessor.byteOffset
      attributes.index = buffers[indexBufferView.buffer].slice(start, start + indexAccessor.count * 2)

      # Position
      positionAccessor = gltf.accessors[primitive.attributes.POSITION]
      if positionAccessor.componentType != gltfConst.FLOAT
        callback new Error "Unsupported component type for position accessor: #{positionAccessor.componentType}"; return

      positionBufferView = gltf.bufferViews[positionAccessor.bufferView]
      start = positionBufferView.byteOffset + positionAccessor.byteOffset
      positionArray = new Float32Array buffers[positionBufferView.buffer], start, positionAccessor.count * 3

      for i in [0...positionAccessor.count]
        pos = new THREE.Vector3 positionArray[i * 3 + 0], positionArray[i * 3 + 1], positionArray[i * 3 + 2]
        pos.applyMatrix4 upAxisMatrix
        positionArray[i * 3 + 0] = pos.x
        positionArray[i * 3 + 1] = pos.y
        positionArray[i * 3 + 2] = pos.z

      attributes.position = buffers[positionBufferView.buffer].slice(start, start + positionAccessor.count * positionAccessor.byteStride)

      # Normal
      normalAccessor = gltf.accessors[primitive.attributes.NORMAL]
      if normalAccessor?
        if normalAccessor.componentType != gltfConst.FLOAT
          callback new Error "Unsupported component type for normal accessor: #{normalAccessor.componentType}"; return

        normalBufferView = gltf.bufferViews[normalAccessor.bufferView]
        start = normalBufferView.byteOffset + normalAccessor.byteOffset
        attributes.normal = buffers[normalBufferView.buffer].slice(start, start + normalAccessor.count * 4)

      # UV
      uvAccessor = gltf.accessors[primitive.attributes.TEXCOORD_0]
      if uvAccessor?
        if uvAccessor.componentType != gltfConst.FLOAT
          callback new Error "Unsupported component type for UV accessor: #{uvAccessor.componentType}"; return

        uvBufferView = gltf.bufferViews[uvAccessor.bufferView]
        start = uvBufferView.byteOffset + uvAccessor.byteOffset
        uvArray = new Float32Array buffers[uvBufferView.buffer], start, uvAccessor.count * 2

        for i in [0...uvAccessor.count]
          uvArray[i * 2 + 1] = 1 - uvArray[i * 2 + 1]

        attributes.uv = buffers[uvBufferView.buffer].slice(start, start + uvAccessor.count * uvAccessor.byteStride)

      # TODO: support more attributes

      # Skin indices
      skinIndexAccessor = gltf.accessors[primitive.attributes.JOINT]
      if skinIndexAccessor?
        if skinIndexAccessor.componentType != gltfConst.FLOAT
          callback new Error "Unsupported component type for skin index accessor: #{skinIndexAccessor.componentType}"; return

        skinIndexBufferView = gltf.bufferViews[skinIndexAccessor.bufferView]
        start = skinIndexBufferView.byteOffset + skinIndexAccessor.byteOffset
        attributes.skinIndex = buffers[skinIndexBufferView.buffer].slice(start, start + skinIndexAccessor.count * 4 * 4)

      # Skin weights
      skinWeightAccessor = gltf.accessors[primitive.attributes.WEIGHT]
      if skinWeightAccessor?
        if skinWeightAccessor.componentType != gltfConst.FLOAT
          callback new Error "Unsupported component type for skin weight accessor: #{skinWeightAccessor.componentType}"; return

        skinWeightBufferView = gltf.bufferViews[skinWeightAccessor.bufferView]
        start = skinWeightBufferView.byteOffset + skinWeightAccessor.byteOffset
        attributes.skinWeight = buffers[skinWeightBufferView.buffer].slice(start, start + skinWeightAccessor.count * 4 * 4)

      # Bones
      bones = null
      if skin?
        bones = []

        # skin.inverseBindMatrices
        for jointName, i in skin.jointNames
          boneNodeInfo = gltf.nodes[jointName]

          if ! boneNodeInfo.matrix?
            convertAxisAngleToQuaternion boneNodeInfo.rotation, 1

            boneNodeInfo.matrix = new THREE.Matrix4().compose(
              new THREE.Vector3( boneNodeInfo.translation[0], boneNodeInfo.translation[1], boneNodeInfo.translation[2] ),
              new THREE.Quaternion( boneNodeInfo.rotation[0], boneNodeInfo.rotation[1], boneNodeInfo.rotation[2], boneNodeInfo.rotation[3] ),
              new THREE.Vector3( boneNodeInfo.scale[0], boneNodeInfo.scale[1], boneNodeInfo.scale[2] )
            ).toArray()

          bone = { name: boneNodeInfo.jointName, matrix: boneNodeInfo.matrix }
          bones.push bone

        for jointName, i in skin.jointNames
          for childJointName in gltf.nodes[jointName].children
            bones[skin.jointNames.indexOf(childJointName)].parentIndex = i

        tmpMatrix = new THREE.Matrix4
        for jointName in rootBoneNames
          bone = bones[skin.jointNames.indexOf(jointName)]
          bone.matrix = tmpMatrix.fromArray(bone.matrix).multiplyMatrices(upAxisMatrix, tmpMatrix).toArray()

      # Animation
      animation = null
      if Object.keys(gltf.animations).length > 0
        animation = duration: 0, keyFrames: {}

        for gltfAnimName, gltfAnim of gltf.animations
          # gltfAnim.count = keyframe count

          # gltfAnim.channels gives bone name + path (scale, rotation, position)
          for gltfChannelName, gltfChannel of gltfAnim.channels
            jointName = gltfChannel.target.id
            # TODO: get skin.jointNames.indexOf(jointName) and work with IDs instead of jointName?

            boneAnim = animation.keyFrames[jointName] ?= {}
            boneTransformAnim = boneAnim[gltfChannel.target.path]
            if boneAnim[gltfChannel.target.path]?
              callback new Error "Found multiple animations for #{gltfChannel.target.path} of #{jointName} bone"; return

            boneTransformAnim = boneAnim[gltfChannel.target.path] = []

            inputParameterName = gltfAnim.samplers[gltfChannel.sampler].input
            timeAccessor = gltf.accessors[gltfAnim.parameters[inputParameterName]]
            if timeAccessor.componentType != gltfConst.FLOAT
              callback new Error "Unsupported component type for animation time accessor: #{timeAccessor.componentType}"; return

            timeBufferView = gltf.bufferViews[timeAccessor.bufferView]
            timeArray = new Float32Array buffers[timeBufferView.buffer], timeBufferView.byteOffset + timeAccessor.byteOffset, timeAccessor.count

            outputParameterName = gltfAnim.samplers[gltfChannel.sampler].output
            outputAccessor = gltf.accessors[gltfAnim.parameters[outputParameterName]]
            if outputAccessor.componentType != gltfConst.FLOAT
              callback new Error "Unsupported component type for animation output accessor: #{outputAccessor.componentType}"; return

            componentsCount = if outputAccessor.type == 'VEC3' then 3 else 4

            outputBufferView = gltf.bufferViews[outputAccessor.bufferView]
            outputArray = new Float32Array buffers[outputBufferView.buffer], outputBufferView.byteOffset + outputAccessor.byteOffset, outputAccessor.count * componentsCount

            if outputParameterName == 'rotation'
              convertAxisAngleToQuaternion outputArray, outputAccessor.count

            for time, i in timeArray
              value = ( outputArray[i * componentsCount + j] for j in [0...componentsCount] )
              boneTransformAnim.push { time, value }
              animation.duration = Math.max animation.duration, time

      # Maps
      maps = {}

      if Object.keys(imageFiles).length == 0
        callback null, { attributes, bones, maps, animation }; return

      readFile imageFiles[Object.keys(imageFiles)[0]], 'arraybuffer', (err, data) ->
        maps.diffuse = data
        callback null, { attributes, bones, maps, animation }
        return
      return
    return
  return
