import * as async from "async";
import * as querystring from "querystring";

// In NW.js, open links in a browser window
let nwDispatcher = (<any>window).nwDispatcher;
let gui: any;
if (nwDispatcher != null) {
  gui = nwDispatcher.requireNwGui();

  document.body.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;
    event.preventDefault();
    gui.Shell.openExternal(event.target.href);
  });
}

let progressBar = <HTMLProgressElement>document.querySelector("progress");
let loadingElt = document.getElementById("loading");
let canvas = <HTMLCanvasElement>document.querySelector("canvas");

let qs = querystring.parse(window.location.search.slice(1));
if (qs.debug != null && gui != null) gui.Window.get().showDevTools();

let player: SupRuntime.Player;

let onLoadProgress = (value: number, max: number) => {
  progressBar.value = value;
  progressBar.max = max;
}
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
      return
    }, (qs.project == null) ? 500 : 0);
  }, (qs.project == null) ? 500 : 0);
}

// Load plugins
let pluginsXHR = new XMLHttpRequest();
pluginsXHR.open("GET", "../plugins.json", false); // Synchronous
pluginsXHR.send(null);

if (pluginsXHR.status !== 200) throw new Error("Could not get plugins list");

let pluginPaths = JSON.parse(pluginsXHR.responseText);

async.each(pluginPaths.all, (pluginName, pluginCallback) => {
  async.series([

    (cb) => {
      let apiScript = document.createElement("script");
      apiScript.src = `../plugins/${pluginName}/api.js`;
      apiScript.addEventListener("load", () => cb(null, null));
      apiScript.addEventListener("error", (err) => cb(null, null));
      document.body.appendChild(apiScript);
    },

    (cb) => {
      let componentsScript = document.createElement("script");
      componentsScript.src = `../plugins/${pluginName}/components.js`;
      componentsScript.addEventListener("load", () => cb(null, null));
      componentsScript.addEventListener("error", () => cb(null, null));
      document.body.appendChild(componentsScript);
    },

    (cb) => {
      let runtimeScript = document.createElement("script");
      runtimeScript.src = `../plugins/${pluginName}/runtime.js`;
      runtimeScript.addEventListener("load", () => cb(null, null));
      runtimeScript.addEventListener("error", () => cb(null, null));
      document.body.appendChild(runtimeScript);
    }

  ], pluginCallback);
}, (err) => {
  if (err != null) console.log(err);
  // Load game
  let buildPath = (qs.project != null) ? `/builds/${qs.project}/${qs.build}/` : "../";
  player = new SupRuntime.Player(canvas, buildPath, { debug: qs.debug != null });
  player.load(onLoadProgress, onLoaded);
});

loadingElt.classList.add("start");
