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

exports.editorComponentClasses =
  Camera2DControls: require './components/Camera2DControls'
  Camera3DControls: require './components/Camera3DControls'
  FlatColorRenderer: require './components/FlatColorRenderer'
  GridRenderer: require './components/GridRenderer'

exports.registerEditorComponentClass = (name, component) ->
  if exports.editorComponentClasses[name]?
    console.error "SupEngine.registerEditorComponent: Tried to register two or more classes named \"#{name}\""
    return

  exports.editorComponentClasses[name] = component
  return

exports.componentClasses =
  # Built-ins
  Camera: require './components/Camera'

exports.registerComponentClass = (name, plugin) ->
  if exports.componentClasses[name]?
    console.error "SupEngine.registerComponentClass: Tried to register two or more classes named \"#{name}\""
    return

  exports.componentClasses[name] = plugin
  return

exports.componentEditorClasses = {}

exports.registerComponentEditorClass = (name, plugin) ->
  if exports.componentEditorClasses[name]?
    console.error "SupEngine.registerComponentEditorClass: Tried to register two or more classes named \"#{name}\""
    return

  exports.componentEditorClasses[name] = plugin
  return

exports.earlyUpdateFunctions = {}

exports.registerEarlyUpdateFunction = (name, callback) ->
  if exports.earlyUpdateFunctions[name]?
    console.error "SupEngine.registerEarlyUpdateFunction: Tried to register two or more functions named \"#{name}\""
    return

  exports.earlyUpdateFunctions[name] = callback
  return
