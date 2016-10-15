/// <reference path="../../../../typings/tsd.d.ts" />
/// <reference path="../SupRuntime.d.ts" />
/// <reference path="../../../../SupCore/SupCore.d.ts" />
/// <reference path="../../../../SupClient/typings/SupApp.d.ts" />

import * as async from "async";
import * as querystring from "querystring";
import supFetch from "../../../../SupClient/src/fetch";
import Player from "./Player";

// Any export here will be exposed as SupRuntime.* by browserify
// (see ../gulpfile.js)
export { Player };

export const plugins: { [name: string]: SupRuntime.RuntimePlugin } = {};
export const resourcePlugins: { [name: string]: SupRuntime.RuntimeResourcePlugin } = {};

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

SupCore.system = new SupCore.System("", "");

// Setup SupApp
if ((global as any).SupApp == null) {
  (global as any).SupApp = null;
  try {
    (global as any).SupApp = ((top as any).SupApp != null) ? (top as any).SupApp : null;
  } catch (err) {
    /* Ignore */
  }
}

// In app, open links in a browser window
let playerWindow: Electron.BrowserWindow;
let electron: any;

if (SupApp != null) {
  playerWindow = SupApp.getCurrentWindow();
} else {
  const nodeRequire = require;
  try { electron = nodeRequire("electron"); } catch (e) { /* Ignore */ }
  if (electron != null) playerWindow = electron.remote.getCurrentWindow();
}

if (playerWindow != null) {
  document.body.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).tagName !== "A") return;
    event.preventDefault();

    const url = (event.target as HTMLAnchorElement).href;
    if (SupApp != null) SupApp.openLink(url);
    else electron.shell.openExternal(url);
  });

  if (SupApp != null) SupApp.onMessage("force-quit", () => { playerWindow.close(); });
}
const qs = querystring.parse(window.location.search.slice(1));

document.body.addEventListener("keydown", (event) => {
  if (event.keyCode === (<any>window)["KeyEvent"].DOM_VK_F12) {
    if (qs.project != null && playerWindow != null) playerWindow.webContents.toggleDevTools();
  }
});

const progressBar = <HTMLProgressElement>document.querySelector("progress");
const loadingElt = document.getElementById("loading");
const canvas = <HTMLCanvasElement>document.querySelector("canvas");

// Prevent keypress events from leaking out to a parent window
// They might trigger scrolling for instance
canvas.addEventListener("keypress", (event) => { event.preventDefault(); });

// Make sure the focus is always on the game canvas wherever we click on the game window
document.addEventListener("click", () => canvas.focus() );

if (qs.debug != null && playerWindow != null) playerWindow.webContents.openDevTools();

let player: Player;

const onLoadProgress = (value: number, max: number) => {
  progressBar.value = value;
  progressBar.max = max;
};
const onLoaded = (err: Error) => {
  if (err != null) {
    console.error(err);

    const aElt = <HTMLAnchorElement>loadingElt.querySelector("a");
    aElt.parentElement.removeChild(aElt);

    const errorElt = document.createElement("div");
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
const pluginBundleNames = [ "components", "runtime", "typescriptAPI" ];

supFetch("plugins.json", "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
  if (err != null) {
    console.log(err);
    onLoaded(new Error("Could not load plugins list."));
    return;
  }

  async.each(pluginsInfo.list, (pluginName, cb) => {
    async.each(pluginBundleNames, (bundle, cb) => {
      const script = document.createElement("script");
      script.src = `plugins/${pluginName}/bundles/${bundle}.js`;
      script.addEventListener("load", () => cb(null));
      script.addEventListener("error", (err) => cb(null));
      document.body.appendChild(script);
    }, cb);
  }, (err) => {
    if (err != null) console.log(err);
    // Load game
    const buildPath = (qs.project != null) ? `/builds/${qs.project}/${qs.build}/` : "./";
    player = new Player(canvas, buildPath, { debug: qs.debug != null });
    player.load(onLoadProgress, onLoaded);
  });
});

loadingElt.classList.add("start");
