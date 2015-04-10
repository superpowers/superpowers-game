behaviorEditorDataListIndex = 0

module.exports = class BehaviorEditor

  constructor: (@SupUI, @tbody, @config, @projectClient, @editConfig) ->
    @behaviorName = @config.behaviorName

    @behaviorNamesDataListElt = document.createElement('datalist')
    @behaviorNamesDataListElt.id = "behavior-editor-datalist-#{behaviorEditorDataListIndex++}"
    @tbody.appendChild @behaviorNamesDataListElt

    behaviorNameRow = @SupUI.component.createSetting @tbody, 'Class'
    @behaviorNameField = @SupUI.component.createTextField behaviorNameRow.valueElt, @config.behaviorName
    @behaviorNameField.setAttribute 'list', @behaviorNamesDataListElt.id
    @behaviorNameField.addEventListener 'change', @_onChangeBehaviorName

    @behaviorPropertiesHeaderRow = document.createElement('tr')
    headerTh = document.createElement('th')
    headerTh.textContent = 'Customizable properties'
    headerTh.colSpan = 2
    @behaviorPropertiesHeaderRow.appendChild headerTh
    @tbody.appendChild @behaviorPropertiesHeaderRow

    @propertySettingsByName = {}

    @projectClient.subResource 'behaviorProperties', @

  destroy: ->
    @projectClient.unsubResource 'behaviorProperties', @
    return

  onResourceReceived: (resourceId, resource) ->
    @behaviorPropertiesResource = resource
    @_buildBehaviorPropertiesUI()
    return

  onResourceEdited: (resourceId, command, args...) ->
    if command in [ 'setScriptBehaviors', 'clearScriptBehaviors' ]
      @_buildBehaviorPropertiesUI()

    return

  _buildBehaviorPropertiesUI: ->
    # Setup behavior list
    @behaviorNamesDataListElt.innerHTML = ''
    for behaviorName of @behaviorPropertiesResource.pub.behaviors
      option = document.createElement('option')
      option.value = behaviorName
      @behaviorNamesDataListElt.appendChild option

    # Clear old property settings
    for name, propertySetting of @propertySettingsByName
      propertySetting.rowElt.parentElement.removeChild propertySetting.rowElt

    @propertySettingsByName = {}

    # Setup new property settings
    behavior = @behaviorPropertiesResource.pub.behaviors[@config.behaviorName]
    return if ! behavior?

    @_createPropertySetting property for property in behavior.properties

    # TODO: Display and allow cleaning up left-over property values
    return

  _createPropertySetting: (property) ->
    propertySetting = @SupUI.component.createSetting @tbody, property.name, { checkbox: true, title: "#{property.name} (#{property.type})" }
    @propertySettingsByName[property.name] = propertySetting
    @_createPropertyField property.name

    propertySetting.checkboxElt.checked = @config.propertyValues[property.name]?
    propertySetting.checkboxElt.addEventListener 'change', (event) =>
      if ! event.target.checked
        @editConfig 'clearBehaviorPropertyValue', property.name
        return

      # defaultValue = property.value someday
      defaultValue = switch property.type
        when 'boolean' then false
        when 'number' then 0
        when 'string' then ''
        # TODO: Support more types
        else null

      @editConfig 'setBehaviorPropertyValue', property.name, property.type, defaultValue
      return
    return

  _createPropertyField: (propertyName) ->
    property = @behaviorPropertiesResource.propertiesByNameByBehavior[@config.behaviorName][propertyName]
    propertySetting = @propertySettingsByName[propertyName]
    propertySetting.valueElt.innerHTML = ''

    # TODO: We probably want to collect and display default values?
    # defaultPropertyValue = behaviorProperty?.value

    propertyValue = null
    uiType = property.type

    propertyValueInfo = @config.propertyValues[property.name]
    if propertyValueInfo?
      propertyValue = propertyValueInfo.value
      if propertyValueInfo.type != property.type then uiType = "incompatibleType"

    switch uiType
      when 'incompatibleType'
        propertyField = @SupUI.component.createTextField propertySetting.valueElt, "(Incompatible type: #{propertyValueInfo.type})"
        propertyField.disabled = true

      when 'boolean'
        propertyField = @SupUI.component.createBooleanField propertySetting.valueElt, propertyValue
        propertyField.disabled = ! propertyValueInfo?
        propertyField.addEventListener 'change', @_onChangePropertyValue

      when 'number'
        propertyField = @SupUI.component.createNumberField propertySetting.valueElt, propertyValue
        propertyField.disabled = ! propertyValueInfo?
        propertyField.addEventListener 'change', @_onChangePropertyValue

      when 'string'
        propertyField = @SupUI.component.createTextField propertySetting.valueElt, propertyValue
        propertyField.disabled = ! propertyValueInfo?
        propertyField.addEventListener 'change', @_onChangePropertyValue

      # TODO: Support more types
      else
        console.error "Unsupported property type: #{property.type}"
        return

    propertyField.dataset.behaviorPropertyName = property.name
    propertyField.dataset.behaviorPropertyType = property.type


  config_setProperty: (path, value) ->
    switch path
      when 'behaviorName'
        @behaviorNameField.value = value
        @_buildBehaviorPropertiesUI()
    return

  config_setBehaviorPropertyValue: (name, type, value) ->
    @propertySettingsByName[name].checkboxElt.checked = true
    @_createPropertyField name
    return

  config_clearBehaviorPropertyValue: (name) ->
    @propertySettingsByName[name].checkboxElt.checked = false
    @_createPropertyField name
    return

  _onChangeBehaviorName: (event) =>
    @editConfig 'setProperty', 'behaviorName', event.target.value; return

  # _onChangePropertySet: (event) =>

  _onChangePropertyValue: (event) =>
    propertyName = event.target.dataset.behaviorPropertyName
    propertyType = event.target.dataset.behaviorPropertyType
    propertyValue = null

    switch propertyType
      when 'boolean' then propertyValue = event.target.checked
      when 'number', then propertyValue = parseFloat(event.target.value)
      when 'string' then propertyValue = event.target.value
      else console.error "Unsupported property type: #{propertyType}"

    @editConfig 'setBehaviorPropertyValue', propertyName, propertyType, propertyValue, (err) =>
      if err? then alert err
      return
    return
