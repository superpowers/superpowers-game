exports.Player = require './Player'
exports.plugins = {}

exports.addPlugin = (name, plugin) ->
  if exports.plugins[name]?
    console.log "SupRuntime.addPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.plugins[name] = plugin
  return
