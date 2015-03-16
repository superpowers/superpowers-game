module.exports = class BehaviorEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->

    @behaviorName = config.behaviorName

    behaviorNameRow = @SupUI.component.createSetting tbody, 'Class'
    @behaviorNameField = @SupUI.component.createTextField behaviorNameRow.valueElt, config.behaviorName

    @behaviorNameField.addEventListener 'input', @_onChangeBehaviorName

  destroy: ->

  onConfigEdited: (path, value) ->
    switch path
      when 'behaviorName' then @behaviorNameField.value = value
    return

  _onChangeBehaviorName: (event) => @setProperty 'behaviorName', event.target.value; return
