export import THREE = require('three');
var euler: any = THREE.Euler;
euler.DefaultOrder = 'YXZ';

export import GameInstance = require("./GameInstance");
export import ActorTree = require("./ActorTree");
export import Actor = require("./Actor");
export import ActorComponent = require("./ActorComponent");

export import Input = require("./Input");
export import Audio = require("./Audio");
export import SoundInstance = require("./SoundInstance");

export var editorComponentClasses = {
  Camera2DControls: require('./components/Camera2DControls'),
  Camera3DControls: require('./components/Camera3DControls'),
  FlatColorRenderer: require('./components/FlatColorRenderer'),
  GridRenderer: require('./components/GridRenderer')
};
export function registerEditorComponentClass(name: string, component: any) {
  if (editorComponentClasses[name] != null) {
    console.error(`SupEngine.registerEditorComponent: Tried to register two or more classes named "${name}"`);
    return;
  }

  editorComponentClasses[name] = component;
};

export var componentClasses = {
  // Built-ins
  Camera: require("./components/Camera")
};
export function registerComponentClass(name: string, plugin: any) {
  if (componentClasses[name] != null) {
    console.error(`SupEngine.registerComponentClass: Tried to register two or more classes named "${name}"`);
    return;
  }

  componentClasses[name] = plugin;
};

export var componentEditorClasses = {};
export function registerComponentEditorClass(name: string, plugin: any) {
  if (componentEditorClasses[name] != null) {
    console.error(`SupEngine.registerComponentEditorClass: Tried to register two or more classes named "${name}"`);
    return;
  }

  componentEditorClasses[name] = plugin;
};

export var earlyUpdateFunctions = {};
export function registerEarlyUpdateFunction(name: string, callback) {
  if (earlyUpdateFunctions[name] != null) {
    console.error(`SupEngine.registerEarlyUpdateFunction: Tried to register two or more functions named "${name}"`);
    return;
  }

  earlyUpdateFunctions[name] = callback;
};
