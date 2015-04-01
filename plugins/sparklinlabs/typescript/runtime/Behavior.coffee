exports.setupComponent = (player, component, config) ->
  return if ! config.propertyValues?

  behaviorInfo = player.resources.behaviorProperties[config.behaviorName]

  for name, valueInfo of config.propertyValues
    behaviorPropertyInfo = behaviorInfo.properties[name]
    if ! behaviorPropertyInfo?
      console.warn "Tried to set a property named #{name} on behavior class #{component.__outer.constructor.name} but no such property is declared. Skipping."
      continue

    if behaviorPropertyInfo.type != valueInfo.type
      console.warn "Tried to set a value of type #{valueInfo.type} for property #{component.__outer.constructor.name}.#{name} but property type is declared as #{behaviorPropertyInfo.type}. Skipping."
      continue

    # Convert value based on type
    component.__outer[propertyName] = switch behaviorPropertyInfo.type
      when "Vector3" then new window.Sup.Math.Vector3 valueInfo.value.x, valueInfo.value.y, valueInfo.value.z
      else valueInfo.value
