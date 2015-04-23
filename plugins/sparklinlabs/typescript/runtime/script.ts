import * as async from "async"
import * as convert from "convert-source-map"
// No definition file for combine-source-map module
let combine: any = require("combine-source-map");
import compileTypeScript = require("./compileTypeScript");
import * as fs from "fs"

let globalNames: string[] = [];
let globals: {[name: string]: string} = {};
let globalDefs: {[name: string]: string} = {};

let scriptNames: string[] = [];
let scripts: {[name: string]: string} = {};

let actorComponentTypesByName: {[name: string]: any} = {};
let actorComponentAccessors: string[] = [];

export function init(player: any, callback: Function) {
  player.behaviorClasses = {}

  player.createActor = (name: string, parentActor: any) => { return new (<any>window).Sup.Actor(name, parentActor); };

  player.createComponent = (type: string, actor: any, config: any) => {
    if (type == "Behavior") {
      let behaviorClass = player.behaviorClasses[config.behaviorName];
      if (behaviorClass == null) {
        throw new Error(`Could not find a behavior class named "${config.behaviorName}" for actor "${actor.getName()}". Make sure you're using the class name, not the script's name and that the class is declared before the behavior component is created (or before the scene is loaded).`);
      }
      return new behaviorClass(actor.__inner);
    } else {
      if (actorComponentTypesByName[type] == null) {
        actorComponentTypesByName[type] = window;
        let parts = SupAPI.contexts["typescript"].plugins[type].exposeActorComponent.className.split(".");
        for (let part of parts) actorComponentTypesByName[type] = actorComponentTypesByName[type][part];
      }
      return new actorComponentTypesByName[type](actor);
    }
  }

  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    if (plugin.code != null) {
      globalNames.push(`${pluginName}.ts`);
      globals[`${pluginName}.ts`] = plugin.code;
    }

    if (plugin.defs != null) globalDefs[`${pluginName}.d.ts`] = plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
  }
  callback();
}

export function start(player: SupRuntime.Player, callback: Function) {
  console.log("Compiling scripts...");

  // Plug component accessors exposed by plugins into Sup.Actor class
  let joinedActorComponentAccessors = actorComponentAccessors.join("\n    ");
  globals["Sup.Actor.ts"] = globals["Sup.Actor.ts"].replace("// INSERT_COMPONENT_ACCESSORS", joinedActorComponentAccessors);
  globalDefs["Sup.Actor.d.ts"] = globalDefs["Sup.Actor.d.ts"].replace("// INSERT_COMPONENT_ACCESSORS", joinedActorComponentAccessors);

  // Make sure the Sup namespace is compiled before everything else
  globalNames.unshift(globalNames.splice(globalNames.indexOf("Sup.ts"), 1)[0]);

  // Compile plugin globals
  let jsGlobals = compileTypeScript(globalNames, globals, `${globalDefs["lib.d.ts"]}\ndeclare var console, window, localStorage, player, SupEngine, SupRuntime;`, {sourceMap: false});
  if (jsGlobals.errors.length > 0) {
    for (let error of jsGlobals.errors) console.log(`${error.file}(${error.position.line}): ${error.message}`);
    callback();
    return;
  }

  // Compile game scripts
  let concatenatedGlobalDefs = "";
  for (let name in globalDefs) concatenatedGlobalDefs += globalDefs[name];
  let results = compileTypeScript(scriptNames, scripts, concatenatedGlobalDefs, {sourceMap: true});
  if (results.errors.length > 0) {
    for (let error of results.errors) console.log(`${error.file}(${error.position.line}): ${error.message}`);
    callback();
    return;
  }

  console.log("Compilation successful!");

  // Prepare source maps
  let getLineCounts = (text: string) => {
    let count = 1, index = -1;
    while (true) {
      index = text.indexOf("\n", index + 1);
      if (index === -1) break;
      count++;
    }
    return count;
  }

  let line = getLineCounts(jsGlobals.script);
  let combinedSourceMap = combine.create("bundle.js");
  for (let file of results.files) {
    let comment = convert.fromObject( results.sourceMaps[file.name] ).toComment();
    combinedSourceMap.addFile( { sourceFile: file.name, source: file.text + `\n${comment}` }, {line} );
    line += ( getLineCounts( file.text ) );
  }

  let convertedSourceMap = convert.fromBase64(combinedSourceMap.base64()).toObject();
  let url = URL.createObjectURL(new Blob([ JSON.stringify(convertedSourceMap) ]));
  let code = jsGlobals.script + results.script + `\n//# sourceMappingURL=${url}`;

  // Execute the generated code
  let scriptFunction = new Function("player", code);
  scriptFunction(player);

  callback()
}

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: string, asset?: any) => any) {
  scriptNames.push(`${entry.name}.ts`);
  player.getAssetData(`assets/${entry.id}/script.txt`, "text", (err, script) => {
    scripts[`${entry.name}.ts`] = `${script}\n`
    callback(null, script);
  });
}
