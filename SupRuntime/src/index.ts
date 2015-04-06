export import Player = require("./Player")

export var plugins = {}
export function registerPlugin(name: string, plugin: any) {
  if (plugins[name] != null) {
    console.error(`SupRuntime.register: Tried to register two or more plugins named "${name}"`);
    return;
  }

  plugins[name] = plugin;
}

export var resourcePlugins = {}
export function registerResource(name: string, plugin: any) {
  if (plugins[name] != null) {
    console.error(`SupRuntime.registerResource: Tried to register two or more resources named "${name}"`);
    return;
  }

  resourcePlugins[name] = plugin;
}
