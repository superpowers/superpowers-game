exports.Player = require './Player'
exports.plugins = {}
exports.resourcePlugins = {}

exports.registerPlugin = (name, plugin) ->
  if exports.plugins[name]?
    console.error "SupRuntime.register: Tried to register two or more plugins named \"#{name}\""
    return

  exports.plugins[name] = plugin
  return

exports.registerResource = (name, plugin) ->
  if exports.plugins[name]?
    console.error "SupRuntime.registerResource: Tried to register two or more resources named \"#{name}\""
    return

  exports.resourcePlugins[name] = plugin
  return
