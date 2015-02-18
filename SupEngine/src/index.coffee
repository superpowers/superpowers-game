THREE = require 'three'
THREE.Euler.DefaultOrder = 'YXZ'
exports.THREE = THREE

exports.Input = require './Input'
exports.Audio = require './Audio'
exports.SoundInstance = require './SoundInstance'

exports.ActorTree = require './ActorTree'
exports.GameInstance = require './GameInstance'
exports.Actor = require './Actor'
exports.ActorComponent = require './ActorComponent'

exports.componentPlugins =
  # Built-ins
  Camera: require './components/Camera'
  Camera2DControls: require './components/Camera2DControls'
  Camera3DControls: require './components/Camera3DControls'
  FlatColorRenderer: require './components/FlatColorRenderer'
  GridRenderer: require './components/GridRenderer'

exports.addComponentPlugin = (name, plugin) ->
  if exports.componentPlugins[name]?
    console.log "SupEngine.addComponentPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.componentPlugins[name] = plugin
  return

exports.componentEditorPlugins = {}

exports.addComponentEditorPlugin = (name, plugin) ->
  if exports.componentEditorPlugins[name]?
    console.log "SupEngine.addComponentEditorPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.componentEditorPlugins[name] = plugin
  return
