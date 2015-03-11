modelImporters =
  obj: require './obj'
  gltf: require './gltf'

module.exports = (files, callback) ->
  modelImporter = null

  for file in files
    filename = file.name
    extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase()
    modelImporter = modelImporters[extension]
    break if modelImporter?

  if ! modelImporter? then callback "No compatible importer found"; return

  modelImporter.import files, callback
  return
