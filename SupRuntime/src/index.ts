/// <reference path="../../../../typings/tsd.d.ts" />
/// <reference path="../SupRuntime.d.ts" />
/// <reference path="../../../../SupCore/SupCore.d.ts" />

import * as async from "async";
import * as querystring from "querystring";
import supFetch from "../../../../SupClient/src/fetch";
import Player from "./Player";

// Any export here will be exposed as SupRuntime.* by browserify
// (see ../gulpfile.js)
export { Player };

export let plugins: { [name: string]: SupRuntime.RuntimePlugin } = {};
export let resourcePlugins: { [name: string]: SupRuntime.RuntimeResourcePlugin } = {};

export function registerPlugin(name: string, plugin: SupRuntime.RuntimePlugin) {
  if (plugins[name] != null) {
    console.error(`SupRuntime.registerPlugin: Tried to register two or more plugins named "${name}"`);
    return;
  }

  plugins[name] = plugin;
}

export function registerResource(name: string, plugin: SupRuntime.RuntimeResourcePlugin) {
  if (resourcePlugins[name] != null) {
    console.error(`SupRuntime.registerResource: Tried to register two or more resources named "${name}"`);
    return;
  }

  resourcePlugins[name] = plugin;
}


SupCore.system = new SupCore.System("");

// In app, open links in a browser window
let playerWindow: GitHubElectron.BrowserWindow;
if (window.navigator.userAgent.indexOf("Electron") !== -1) {
  let nodeRequire = require;
  let electron = nodeRequire("electron");
  playerWindow = electron.remote.getCurrentWindow();

  document.body.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).tagName !== "A") return;
    event.preventDefault();
    electron.shell.openExternal((event.target as HTMLAnchorElement).href);
  });
}
let qs = querystring.parse(window.location.search.slice(1));

document.body.addEventListener("keydown", (event) => {
  if (event.keyCode === (<any>window)["KeyEvent"].DOM_VK_F12) {
    if (qs.project != null && playerWindow != null) playerWindow.webContents.toggleDevTools();
  }
});

// Prevent keypress events from leaking out to a parent window
// They might trigger scrolling for instance
document.body.addEventListener("keypress", (event) => { event.preventDefault(); });

let progressBar = <HTMLProgressElement>document.querySelector("progress");
let loadingElt = document.getElementById("loading");
let canvas = <HTMLCanvasElement>document.querySelector("canvas");

if (qs.debug != null && playerWindow != null) playerWindow.webContents.openDevTools();

let player: Player;

let onLoadProgress = (value: number, max: number) => {
  progressBar.value = value;
  progressBar.max = max;
};
let onLoaded = (err: Error) => {
  if (err != null) {
    console.error(err);

    let aElt = <HTMLAnchorElement>loadingElt.querySelector("a");
    aElt.parentElement.removeChild(aElt);

    let errorElt = document.createElement("div");
    errorElt.className = "error";
    errorElt.textContent = err.message;
    loadingElt.appendChild(errorElt);
    return;
  }

  setTimeout(() => {
    loadingElt.classList.remove("start");
    loadingElt.classList.add("end");

    setTimeout(() => {
      loadingElt.parentElement.removeChild(loadingElt);

      player.run();
      return;
    }, (qs.project == null) ? 500 : 0);
  }, (qs.project == null) ? 500 : 0);
};

// Load plugins
supFetch("plugins.json", "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
  if (err != null) {
    console.log(err);
    onLoaded(new Error("Could not load plugins list."));
    return;
  }

  async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
    async.series([

      (cb) => {
        let apiScript = document.createElement("script");
        apiScript.src = `plugins/${pluginName}/api.js`;
        apiScript.addEventListener("load", () => cb(null, null));
        apiScript.addEventListener("error", (err) => cb(null, null));
        document.body.appendChild(apiScript);
      },

      (cb) => {
        let componentsScript = document.createElement("script");
        componentsScript.src = `plugins/${pluginName}/components.js`;
        componentsScript.addEventListener("load", () => cb(null, null));
        componentsScript.addEventListener("error", () => cb(null, null));
        document.body.appendChild(componentsScript);
      },

      (cb) => {
        let runtimeScript = document.createElement("script");
        runtimeScript.src = `plugins/${pluginName}/runtime.js`;
        runtimeScript.addEventListener("load", () => cb(null, null));
        runtimeScript.addEventListener("error", () => cb(null, null));
        document.body.appendChild(runtimeScript);
      }

    ], pluginCallback);
  }, (err) => {
    if (err != null) console.log(err);
    // Load game
    let buildPath = (qs.project != null) ? `/builds/${qs.project}/${qs.build}/` : "./";
    player = new Player(canvas, buildPath, { debug: qs.debug != null });
    player.load(onLoadProgress, onLoaded);
  });
});

loadingElt.classList.add("start");
