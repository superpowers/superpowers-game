exports.Player = require './Player'
exports.plugins = {}

exports.registerPlugin = (name, plugin) ->
  if exports.plugins[name]?
    console.error "SupRuntime.register: Tried to register two or more plugins named \"#{name}\""
    return

  exports.plugins[name] = plugin
  return
