/// <reference path="../typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import compileTypescript from "./compileTypeScript";
import * as uglify from "uglify-js";
import * as convert from "convert-source-map";

// No definition file for combine-source-map module
/* tslint:disable-next-line */
const combine: any = require("combine-source-map");

export default function compileGame(gameName: string, system: SupCore.System, minimizeSize: boolean,
scriptNames: string[], scripts: { [name: string]: string }, callback: (err: string, code: string) => void) {

  const globalNames: string[] = [];
  const globals: {[name: string]: string} = {};
  const globalDefs: {[name: string]: string} = {};

  const actorComponentAccessors: string[] = [];

  const plugins = system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");
  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    if (plugin.code != null) {
      globalNames.push(`${pluginName}.ts`);
      globals[`${pluginName}.ts`] = plugin.code;
    }

    if (plugin.defs != null) globalDefs[`${pluginName}.d.ts`] = plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(plugin.exposeActorComponent);
  }

  // Plug component accessors exposed by plugins into Sup.Actor class
  const joinedActorComponentAccessors = actorComponentAccessors.join("\n    ");
  globals["Sup.Actor.ts"] = globals["Sup.Actor.ts"].replace("// INSERT_COMPONENT_ACCESSORS", joinedActorComponentAccessors);
  globalDefs["Sup.Actor.d.ts"] = globalDefs["Sup.Actor.d.ts"].replace("// INSERT_COMPONENT_ACCESSORS", joinedActorComponentAccessors);

  // Make sure the Sup namespace, Sup.Actor and Sup.ActorComponent are compiled before everything else
  globalNames.unshift(globalNames.splice(globalNames.indexOf("Sup.Actor.ts"), 1)[0]);
  globalNames.unshift(globalNames.splice(globalNames.indexOf("Sup.ts"), 1)[0]);

  // Compile plugin globals
  const libSource = `${globalDefs["lib.d.ts"]}\ndeclare var console, window, localStorage, player, SupEngine, SupRuntime, require;`;
  const jsGlobals = compileTypescript(globalNames, globals, libSource, { sourceMap: false });
  if (jsGlobals.errors.length > 0) {
    for (const error of jsGlobals.errors) console.log(`${error.file}(${error.position.line}): ${error.message}`);
    callback("Compilation failed. Check the devtools (F12) for errors.", null);
    return;
  }

  jsGlobals.script = `(function() {
var player = _player; _player = undefined;
${jsGlobals.script}
})();
`;

  // Compile game scripts
  let concatenatedGlobalDefs = "";
  for (const name in globalDefs) concatenatedGlobalDefs += globalDefs[name];
  const jsScripts = compileTypescript(scriptNames, scripts, concatenatedGlobalDefs, { sourceMap: true });
  if (jsScripts.errors.length > 0) {
    for (const error of jsScripts.errors) console.log(`${error.file}(${error.position.line}): ${error.message}`);
    callback("Compilation failed. Check the devtools (F12) for errors.", null);
    return;
  }

  let code: string;

  if (minimizeSize) {
    code = uglify.minify(`${jsGlobals.script}${jsScripts.script}`, { fromString: true, mangle: false }).code;
  } else {
    // Prepare source maps
    const getLineCounts = (text: string) => {
      let count = 1, index = -1;
      while (true) {
        index = text.indexOf("\n", index + 1);
        if (index === -1) break;
        count++;
      }
      return count;
    };

    let line = getLineCounts(jsGlobals.script) + 2;
    const combinedSourceMap = combine.create("bundle.js");
    for (const file of jsScripts.files) {
      const comment = convert.fromObject(jsScripts.sourceMaps[file.name]).toComment();
      combinedSourceMap.addFile({ sourceFile: `${gameName}/${file.name}`, source: file.text + `\n${comment}` }, { line });
      line += getLineCounts(file.text);
    }

    code = `${jsGlobals.script}${jsScripts.script}//# sourceMappingURL=data:application/json;charset=utf-8;base64,${combinedSourceMap.base64()}`;
  }

  callback(null, code);
}
