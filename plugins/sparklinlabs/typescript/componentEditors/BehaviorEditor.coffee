behaviorEditorDataListIndex = 0

module.exports = class BehaviorEditor

  constructor: (@SupUI, @tbody, @config, @projectClient, @setProperty) ->
    @behaviorName = @config.behaviorName

    @behaviorNamesDataListElt = document.createElement('datalist')
    @behaviorNamesDataListElt.id = "behavior-editor-datalist-#{behaviorEditorDataListIndex++}"
    @tbody.appendChild @behaviorNamesDataListElt

    behaviorNameRow = @SupUI.component.createSetting @tbody, 'Class'
    @behaviorNameField = @SupUI.component.createTextField behaviorNameRow.valueElt, @config.behaviorName
    @behaviorNameField.setAttribute 'list', @behaviorNamesDataListElt.id
    @behaviorNameField.addEventListener 'input', @_onChangeBehaviorName

    @behaviorPropertiesHeaderRow = document.createElement('tr')
    headerTh = document.createElement('th')
    headerTh.textContent = 'Customizable properties'
    headerTh.colSpan = 2
    @behaviorPropertiesHeaderRow.appendChild headerTh
    @tbody.appendChild @behaviorPropertiesHeaderRow

    @propertyRows = []

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

    # Clear old property rows
    propertyRow.parentElement.removeChild propertyRow for propertyRow in @propertyRows
    @propertyRows.length = 0

    behavior = @behaviorPropertiesResource.pub.behaviors[@config.behaviorName]
    if behavior?
      for property in behavior.properties
        propertySetting = @SupUI.component.createSetting @tbody, property.name
        @propertyRows.push propertySetting.rowElt
        propertyField = @SupUI.component.createTextField propertySetting.valueElt, @config.propertyValues[property.name] ? ""

    return

  onConfigEdited: (path, value) ->
    switch path
      when 'behaviorName'
        @behaviorNameField.value = value
        @_buildBehaviorPropertiesUI()
    return

  _onChangeBehaviorName: (event) => @setProperty 'behaviorName', event.target.value; return
