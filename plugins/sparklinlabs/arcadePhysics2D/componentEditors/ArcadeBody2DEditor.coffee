module.exports = class ArcadeBody2DEditor

  constructor: (@SupUI, tbody, config, @projectClient, @editConfig) ->
    @fields = {}

    movableRow = @SupUI.component.createSetting tbody, 'Movable'
    @fields["movable"] = @SupUI.component.createCheckBox movableRow.valueElt, config.movable
    @fields["movable"].addEventListener "click", (event) =>
      @editConfig 'setProperty', 'movable', event.target.checked
      return

    widthRow = @SupUI.component.createSetting tbody, 'Width'
    @fields["width"] = @SupUI.component.createNumberField widthRow.valueElt, config.width, 0
    @fields["width"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'width', parseFloat(event.target.value)
      return

    heightRow = @SupUI.component.createSetting tbody, 'Height'
    @fields["height"] = @SupUI.component.createNumberField heightRow.valueElt, config.height, 0
    @fields["height"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'height', parseFloat(event.target.value)
      return

    offsetX = @SupUI.component.createSetting tbody, 'Offset X'
    @fields["offsetX"] = @SupUI.component.createNumberField offsetX.valueElt, config.offsetX, 0
    @fields["offsetX"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetX', parseFloat(event.target.value)
      return

    offsetY = @SupUI.component.createSetting tbody, 'Offset Y'
    @fields["offsetY"] = @SupUI.component.createNumberField offsetY.valueElt, config.offsetY, 0
    @fields["offsetY"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetY', parseFloat(event.target.value)
      return

  destroy: ->
  config_setProperty: (path, value) ->
    if path == "movable" then @fields["movable"].checked = value
    else @fields[path].value = value
    return
