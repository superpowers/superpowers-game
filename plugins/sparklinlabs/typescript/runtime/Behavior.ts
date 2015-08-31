export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.propertyValues == null) return;

  let behaviorInfo = player.resources.behaviorProperties.behaviors[config.behaviorName];

  for (let name in config.propertyValues) {
    let valueInfo = config.propertyValues[name];

    let ancestorBehaviorInfo = behaviorInfo;
    let behaviorPropertyInfo: any;

    while (ancestorBehaviorInfo != null) {
      behaviorPropertyInfo = ancestorBehaviorInfo.propertiesByName[name];
      if (behaviorPropertyInfo != null) break;

      ancestorBehaviorInfo = player.resources.behaviorProperties.behaviors[ancestorBehaviorInfo.parentBehavior];
    }

    if (behaviorPropertyInfo == null) {
      console.warn(`Tried to set a property named ${name} on behavior class ${component.__outer.constructor.name} but no such property is declared. Skipping.`);
      continue;
    }

    if (behaviorPropertyInfo.type !== valueInfo.type) {
      console.warn(`Tried to set a value of type ${valueInfo.type} for property ${component.__outer.constructor.name}.${name} but property type is declared as ${behaviorPropertyInfo.type}. Skipping.`);
      continue;
    }

    // Convert value based on type
    switch (behaviorPropertyInfo.type) {
      case "Sup.Math.Vector3": { component.__outer[name] = new (<any>window).Sup.Math.Vector3(valueInfo.value.x, valueInfo.value.y, valueInfo.value.z); break; }
      default: { component.__outer[name] = valueInfo.value; break; }
    }
  }
}
