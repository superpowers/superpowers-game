import * as THREE from "three";
let euler: any = THREE.Euler;
euler.DefaultOrder = "YXZ";

import GameInstance from "./GameInstance";
import ActorTree from "./ActorTree";
import Actor from "./Actor";
import ActorComponent from "./ActorComponent";

import Input from "./Input";
import Audio from "./Audio";
import SoundInstance from "./SoundInstance";

export {
  THREE,
  GameInstance, ActorTree, Actor, ActorComponent,
  Input, Audio, SoundInstance
};

import Camera2DControls from "./components/Camera2DControls";
import Camera3DControls from "./components/Camera3DControls";
import FlatColorRenderer from "./components/FlatColorRenderer";
import GridRenderer from "./components/GridRenderer";

export let editorComponentClasses: { [name: string]: new(...args: any[]) => ActorComponent } = {
  Camera2DControls, Camera3DControls, FlatColorRenderer, GridRenderer
};

export function registerEditorComponentClass(name: string, componentClass: new(...args: any[]) => ActorComponent) {
  if (editorComponentClasses[name] != null) {
    console.error(`SupEngine.registerEditorComponent: Tried to register two or more classes named "${name}"`);
    return;
  }

  editorComponentClasses[name] = componentClass;
};

import Camera from "./components/Camera";

export let componentClasses: { [name: string]: new(...args: any[]) => ActorComponent } = {
  /* Built-ins */ Camera
};

export function registerComponentClass(name: string, plugin: new(...args: any[]) => ActorComponent) {
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
export let componentEditorClasses: {[name: string]: ComponentEditorClass} = {};
export function registerComponentEditorClass(name: string, plugin: ComponentEditorClass) {
  if (componentEditorClasses[name] != null) {
    console.error(`SupEngine.registerComponentEditorClass: Tried to register two or more classes named "${name}"`);
    return;
  }

  componentEditorClasses[name] = plugin;
};

export let earlyUpdateFunctions: {[name: string]: Function} = {};
export function registerEarlyUpdateFunction(name: string, callback: Function) {
  if (earlyUpdateFunctions[name] != null) {
    console.error(`SupEngine.registerEarlyUpdateFunction: Tried to register two or more functions named "${name}"`);
    return;
  }

  earlyUpdateFunctions[name] = callback;
};
