import "./info";
import ui, { start as uiStart } from "./ui";
import engine, { start as engineStart} from "./engine";
import { start as networkStart } from "./network";

import * as async from "async"

// Load plugins
async.each(SupClient.pluginPaths.all, (pluginName, pluginCallback) => {
  if (pluginName === "sparklinlabs/scene") { pluginCallback(); return; }

  async.series([

    (cb) => {
      let dataScript = document.createElement("script");
      dataScript.src = `/plugins/${pluginName}/data.js`;
      dataScript.addEventListener("load", () => { cb(null, null); } );
      dataScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(dataScript);
    },

    (cb) => {
      let componentsScript = document.createElement("script");
      componentsScript.src = `/plugins/${pluginName}/components.js`;
      componentsScript.addEventListener("load", () => { cb(null, null); } );
      componentsScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(componentsScript);
    },

    (cb) => {
      let componentEditorsScript = document.createElement("script");
      componentEditorsScript.src = `/plugins/${pluginName}/componentEditors.js`;
      componentEditorsScript.addEventListener("load", () => { cb(null, null); } );
      componentEditorsScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(componentEditorsScript);
    },

  ], pluginCallback);
}, (err) => {
  // Start
  engineStart();
  uiStart();
  networkStart();
});
