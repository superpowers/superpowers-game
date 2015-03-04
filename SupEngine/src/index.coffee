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

exports.editorComponents =
  Camera2DControls: require './components/Camera2DControls'
  Camera3DControls: require './components/Camera3DControls'
  FlatColorRenderer: require './components/FlatColorRenderer'
  GridRenderer: require './components/GridRenderer'

exports.addEditorComponent = (name, component) ->
  if exports.editorComponents[name]?
    console.error "SupEngine.addEditorComponent: Tried to load two or more components named \"#{name}\""
    return

  exports.editorComponents[name] = component
  return

exports.componentPlugins =
  # Built-ins
  Camera: require './components/Camera'

exports.addComponentPlugin = (name, plugin) ->
  if exports.componentPlugins[name]?
    console.error "SupEngine.addComponentPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.componentPlugins[name] = plugin
  return

exports.componentEditorPlugins = {}

exports.addComponentEditorPlugin = (name, plugin) ->
  if exports.componentEditorPlugins[name]?
    console.error "SupEngine.addComponentEditorPlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.componentEditorPlugins[name] = plugin
  return

exports.earlyUpdatePlugins = {}

exports.addEarlyUpdatePlugin = (name, callback) ->
  if exports.earlyUpdatePlugins[name]?
    console.error "SupEngine.addEarlyUpdatePlugin: Tried to load two or more plugins named \"#{name}\""
    return

  exports.earlyUpdatePlugins[name] = callback
  return
