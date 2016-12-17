/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

const actorComponentTypesByName: {[name: string]: any} = {};

export function init(player: any, callback: Function) {
  player.behaviorClasses = {};

  player.createActor = (name: string, parentActor: any, options?: { visible?: boolean; layer?: number }) => {
    return new (<any>window).Sup.Actor(name, parentActor, options);
  };

  const plugins = SupCore.system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");

  player.createComponent = (type: string, actor: any, config: any) => {
    if (type === "Behavior") {
      const behaviorClass = player.behaviorClasses[config.behaviorName];
      if (behaviorClass == null) {
        throw new Error(`Could not find a behavior class named "${config.behaviorName}" for actor "${actor.getName()}". ` +
        "Make sure you're using the class name, not the script's name and that the class is declared " +
        "before the behavior component is created (or before the scene is loaded).");
      }
      return new behaviorClass(actor.__inner);
    } else {
      if (actorComponentTypesByName[type] == null) {
        actorComponentTypesByName[type] = window;
        const parts = plugins[type].exposeActorComponent.className.split(".");
        for (const part of parts) actorComponentTypesByName[type] = actorComponentTypesByName[type][part];
      }
      return new actorComponentTypesByName[type](actor);
    }
  };
  callback();
}

export function start(player: SupRuntime.Player, callback: Function) {
  player.getAssetData(`script.js`, "text", (err, script) => {
    const scriptFunction = new Function("_player", script);
    scriptFunction(player);

    callback();
  });
}
