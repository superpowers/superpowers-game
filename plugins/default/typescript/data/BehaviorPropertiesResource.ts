export interface BehaviorProperty {
  name: string;
  type: string;
}

export interface BehaviorPropertiesResourcePub {
  behaviors: {
    [behaviorName: string]: {
      scriptId: string;
      line: number;
      parentBehavior: string;
      properties: BehaviorProperty[];
    }
  };
}

export default class BehaviorPropertiesResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Base.Schema = {
    behaviors: {
      type: "hash",
      keys: { minLength: 1 },
      values: {
        type: "hash",
        properties: {
          scriptId: { type: "string" },
          parentBehavior: { type: "string" },
          properties: {
            type: "array",
            items: {
              type: "hash",
              properties: {
                name: { type: "string" },
                type: { type: "string" }
              }
            }
          }
        }
      }
    }
  };

  pub: BehaviorPropertiesResourcePub;

  behaviorNamesByScriptId: { [scriptId: string]: string[]; };
  propertiesByNameByBehavior: { [behaviorName: string]: { [propertyName: string]: BehaviorProperty; } };

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, BehaviorPropertiesResource.schema, server);
  }

  setup() {
    this.behaviorNamesByScriptId = {};
    this.propertiesByNameByBehavior = {};

    for (let behaviorName in this.pub.behaviors) {
      let behavior = this.pub.behaviors[behaviorName];
      if (this.behaviorNamesByScriptId[behavior.scriptId] == null) this.behaviorNamesByScriptId[behavior.scriptId] = [];
      this.behaviorNamesByScriptId[behavior.scriptId].push(behaviorName);

      this.propertiesByNameByBehavior[behaviorName] = {};
      for (let property of behavior.properties) this.propertiesByNameByBehavior[behaviorName][property.name] = property;
    }
  }

  init(callback: Function) {
    this.pub = { behaviors: {} };
    super.init(callback);
  }

  setScriptBehaviors(scriptId: string, behaviors: {[behaviorName: string]: { line: number; properties: BehaviorProperty[]; parentBehavior: string }}) {
    this.client_setScriptBehaviors(scriptId, behaviors);
    this.emit("command", "setScriptBehaviors", scriptId, behaviors);
    this.emit("change");
  }

  client_setScriptBehaviors(scriptId: string, behaviors: {[behaviorName: string]: { line: number; properties: BehaviorProperty[]; parentBehavior: string }}) {
    let oldBehaviorNames = (this.behaviorNamesByScriptId[scriptId] != null) ? this.behaviorNamesByScriptId[scriptId] : [];
    let newBehaviorNames: string[] = this.behaviorNamesByScriptId[scriptId] = [];

    for (let name in behaviors) {
      let behavior = behaviors[name];
      this.pub.behaviors[name] = { scriptId, line: behavior.line, parentBehavior: behavior.parentBehavior, properties: behavior.properties };
      let propertiesByName: {[propertyName: string]: BehaviorProperty} = this.propertiesByNameByBehavior[name] = {};
      for (let property of behavior.properties) propertiesByName[property.name] = property;
      newBehaviorNames.push(name);
    }

    for (let oldBehaviorName of oldBehaviorNames) {
      if (newBehaviorNames.indexOf(oldBehaviorName) !== -1) continue;
      delete this.propertiesByNameByBehavior[oldBehaviorName];
      delete this.pub.behaviors[oldBehaviorName];
    }
  }

  clearScriptBehaviors(scriptId: string) {
    this.client_clearScriptBehaviors(scriptId);
    this.emit("command", "clearScriptBehaviors", scriptId);
    this.emit("change");
  }

  client_clearScriptBehaviors(scriptId: string) {
    let oldBehaviorNames = this.behaviorNamesByScriptId[scriptId];
    if (oldBehaviorNames == null) return;

    for (let oldBehaviorName of oldBehaviorNames) {
      delete this.pub.behaviors[oldBehaviorName];
      delete this.propertiesByNameByBehavior[oldBehaviorName];
    }

    delete this.behaviorNamesByScriptId[scriptId];
  }
}
