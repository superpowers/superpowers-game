behaviorEditorDataListIndex = 0

module.exports = class BehaviorEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @behaviorName = config.behaviorName

    @behaviorNamesDataListElt = document.createElement('datalist')
    @behaviorNamesDataListElt.id = "behavior-editor-datalist-#{behaviorEditorDataListIndex++}"
    tbody.appendChild @behaviorNamesDataListElt

    behaviorNameRow = @SupUI.component.createSetting tbody, 'Class'
    @behaviorNameField = @SupUI.component.createTextField behaviorNameRow.valueElt, config.behaviorName
    @behaviorNameField.setAttribute 'list', @behaviorNamesDataListElt.id
    @behaviorNameField.addEventListener 'input', @_onChangeBehaviorName

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
    @behaviorNamesDataListElt.innerHTML = ''

    for behaviorName of @behaviorPropertiesResource.pub.behaviors
      option = document.createElement('option')
      option.value = behaviorName
      @behaviorNamesDataListElt.appendChild option

    return

  onConfigEdited: (path, value) ->
    switch path
      when 'behaviorName' then @behaviorNameField.value = value
    return

  _onChangeBehaviorName: (event) => @setProperty 'behaviorName', event.target.value; return
