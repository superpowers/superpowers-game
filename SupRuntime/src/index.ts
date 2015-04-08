export import Player = require("./Player")

interface RuntimePlugin {
  loadAsset(player: Player, entry: any, callback: (err: Error, asset?: any) => any): void;
  createOuterAsset(player: Player, asset: any): any;
  init?(player: Player, callback: Function): void;
  start?(player: Player, callback: Function): void;
}
export var plugins: {[name: string]: RuntimePlugin} = {}
export function registerPlugin(name: string, plugin: RuntimePlugin) {
  if (plugins[name] != null) {
    console.error(`SupRuntime.register: Tried to register two or more plugins named "${name}"`);
    return;
  }

  plugins[name] = plugin;
}

interface RuntimeResourcePlugin {
  loadResource(player: Player, resourceName: string, callback: (err: Error, resource?: any) => any): void;
}
export var resourcePlugins: {[name: string]: RuntimeResourcePlugin} = {}
export function registerResource(name: string, plugin: RuntimeResourcePlugin) {
  if (plugins[name] != null) {
    console.error(`SupRuntime.registerResource: Tried to register two or more resources named "${name}"`);
    return;
  }

  resourcePlugins[name] = plugin;
}
