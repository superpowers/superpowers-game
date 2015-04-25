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

export var editorComponentClasses: {[name: string]: ActorComponent} = {
  Camera2DControls: require('./components/Camera2DControls'),
  Camera3DControls: require('./components/Camera3DControls'),
  FlatColorRenderer: require('./components/FlatColorRenderer'),
  GridRenderer: require('./components/GridRenderer')
};
export function registerEditorComponentClass(name: string, component: ActorComponent) {
  if (editorComponentClasses[name] != null) {
    console.error(`SupEngine.registerEditorComponent: Tried to register two or more classes named "${name}"`);
    return;
  }

  editorComponentClasses[name] = component;
};

export var componentClasses: {[name: string]: ActorComponent} = {
  // Built-ins
  Camera: require("./components/Camera")
};
export function registerComponentClass(name: string, plugin: ActorComponent) {
  if (componentClasses[name] != null) {
    console.error(`SupEngine.registerComponentClass: Tried to register two or more classes named "${name}"`);
    return;
  }

  componentClasses[name] = plugin;
};

interface ComponentEditorClass {
  new (tbody: HTMLDivElement, config: any, projectClient: any, editConfig: any): {
    destroy(): void;
    config_setProperty(path: string, value: any): void;
  }
}
export var componentEditorClasses: {[name: string]: ComponentEditorClass} = {};
export function registerComponentEditorClass(name: string, plugin: ComponentEditorClass) {
  if (componentEditorClasses[name] != null) {
    console.error(`SupEngine.registerComponentEditorClass: Tried to register two or more classes named "${name}"`);
    return;
  }

  componentEditorClasses[name] = plugin;
};

export var earlyUpdateFunctions: {[name: string]: Function} = {};
export function registerEarlyUpdateFunction(name: string, callback: Function) {
  if (earlyUpdateFunctions[name] != null) {
    console.error(`SupEngine.registerEarlyUpdateFunction: Tried to register two or more functions named "${name}"`);
    return;
  }

  earlyUpdateFunctions[name] = callback;
};
