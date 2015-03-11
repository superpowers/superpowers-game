exports.mode = 'text'

exports.import = (files, callback) ->
  if files.length > 1
    callback new Error "OBJ importer can only accept one file at a time"
    return

  reader = new FileReader
  reader.onload = (event) -> callback null, parse(event.target.result); return
  reader.readAsText files[0]
  return

parse = (text) ->
  arrays = position: [], uv: [], normal: []

  positionsByIndex = []
  uvsByIndex = []
  normalsByIndex = []

  for line in text.split '\n'
    # Ignore empty lines and comments
    continue if line.length == 0 or line[0] == '#'

    command = line.substring(0, line.indexOf(' '))
    values = line.substring(line.indexOf(' ') + 1).split ' '

    switch command
      when 'v'
        if values.length != 3 then throw new Error "Invalid v command: found #{values.length} values, expected 3"
        positionsByIndex.push ( +value for value in values )

      when 'vt'
        if values.length != 2 then throw new Error "Invalid vt command: found #{values.length} values, expected 2"
        uvsByIndex.push ( +value for value in values )

      when 'vn'
        if values.length != 3 then throw new Error "Invalid vn command: found #{values.length} values, expected 3"
        normalsByIndex.push ( +value for value in values )

      when 'f'
        if values.length not in [ 3, 4 ]
          console.warn "Ignoring unsupported face with #{indices.length} vertices, only 3 or 4 are supported"
          return

        positions = []
        uvs = []
        normals = []

        for value in values
          [ posIndex, uvIndex, normalIndex ] = value.split('/')

          posIndex |= 0
          pos =
            if posIndex >= 0 then positionsByIndex[posIndex - 1]
            else positionsByIndex[positionsByIndex.length + posIndex]
          positions.push pos

          if uvIndex? and uvIndex.length > 0
            uvIndex |= 0
            uv =
              if uvIndex >= 0 then uvsByIndex[uvIndex - 1]
              else uvsByIndex[uvsByIndex.length + uvIndex]
            uvs.push uv

          if normalIndex?
            normalIndex |= 0
            normal =
              if normalIndex >= 0 then normalsByIndex[normalIndex - 1]
              else normalsByIndex[normalsByIndex.length + normalIndex]
            normals.push normal

        if values.length == 3
          arrays.position.push positions[0][0], positions[0][1], positions[0][2]
          arrays.position.push positions[1][0], positions[1][1], positions[1][2]
          arrays.position.push positions[2][0], positions[2][1], positions[2][2]

          if uvs.length > 0
            arrays.uv.push uvs[0][0], uvs[0][1]
            arrays.uv.push uvs[1][0], uvs[1][1]
            arrays.uv.push uvs[2][0], uvs[2][1]

          if normals.length > 0
            arrays.normal.push normals[0][0], normals[0][1], normals[0][2]
            arrays.normal.push normals[1][0], normals[1][1], normals[1][2]
            arrays.normal.push normals[2][0], normals[2][1], normals[2][2]
        else
          arrays.position.push positions[0][0], positions[0][1], positions[0][2]
          arrays.position.push positions[1][0], positions[1][1], positions[1][2]
          arrays.position.push positions[2][0], positions[2][1], positions[2][2]

          arrays.position.push positions[0][0], positions[0][1], positions[0][2]
          arrays.position.push positions[2][0], positions[2][1], positions[2][2]
          arrays.position.push positions[3][0], positions[3][1], positions[3][2]

          if uvs.length > 0
            arrays.uv.push uvs[0][0], uvs[0][1]
            arrays.uv.push uvs[1][0], uvs[1][1]
            arrays.uv.push uvs[2][0], uvs[2][1]

            arrays.uv.push uvs[0][0], uvs[0][1]
            arrays.uv.push uvs[2][0], uvs[2][1]
            arrays.uv.push uvs[3][0], uvs[3][1]

          if normals.length > 0
            arrays.normal.push normals[0][0], normals[0][1], normals[0][2]
            arrays.normal.push normals[1][0], normals[1][1], normals[1][2]
            arrays.normal.push normals[2][0], normals[2][1], normals[2][2]

            arrays.normal.push normals[0][0], normals[0][1], normals[0][2]
            arrays.normal.push normals[2][0], normals[2][1], normals[2][2]
            arrays.normal.push normals[3][0], normals[3][1], normals[3][2]

      else
        console.warn "Ignoring unsupported OBJ command: #{command}"

  buffers =
    position: new Float32Array(arrays.position).buffer
  
  if arrays.uv.length > 0 then buffers.uv = new Float32Array(arrays.uv).buffer
  if arrays.normal.length > 0 then buffers.normal = new Float32Array(arrays.normal).buffer

  { attributes: buffers }
