module.exports = class SpriteRendererEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @fields = {}

    widthRow = @SupUI.component.createSetting tbody, 'Width'
    @fields["width"] = @SupUI.component.createNumberField widthRow.valueElt, config.width, 0
    @fields["width"].addEventListener "input", (event) =>
      @setProperty 'width', parseFloat(event.target.value)
      return

    heightRow = @SupUI.component.createSetting tbody, 'Height'
    @fields["height"] = @SupUI.component.createNumberField heightRow.valueElt, config.height, 0
    @fields["height"].addEventListener "input", (event) =>
      @setProperty 'height', parseFloat(event.target.value)
      return

    movableRow = @SupUI.component.createSetting tbody, 'Movable'
    @fields["movable"] = @SupUI.component.createCheckBox movableRow.valueElt, config.movable
    @fields["movable"].addEventListener "click", (event) =>
      @setProperty 'movable', event.target.checked
      return

  destroy: ->
  onConfigEdited: (path, value) ->
    if path == "movable" then @fields["movable"].checked = value
    else @fields[path].value = value
    return