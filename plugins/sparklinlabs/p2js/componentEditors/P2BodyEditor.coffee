module.exports = class P2BodyEditor

  constructor: (@SupUI, @tbody, config, @projectClient, @editConfig) ->
    @fields = {}
    @shapeRows = []

    massRow = @SupUI.component.createSetting @tbody, 'Mass'
    @fields["mass"] = @SupUI.component.createNumberField massRow.valueElt, config.mass, 0
    @fields["mass"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'mass', parseFloat(event.target.value)
      return

    fixedRotationRow = @SupUI.component.createSetting @tbody, 'Fixed rotation'
    @fields["fixedRotation"] = @SupUI.component.createBooleanField fixedRotationRow.valueElt, config.fixedRotation
    @fields["fixedRotation"].addEventListener "click", (event) =>
      @editConfig 'setProperty', 'fixedRotation', event.target.checked
      return

    offsetX = @SupUI.component.createSetting @tbody, 'Offset X'
    @fields["offsetX"] = @SupUI.component.createNumberField offsetX.valueElt, config.offsetX
    @fields["offsetX"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetX', parseFloat(event.target.value)
      return

    offsetY = @SupUI.component.createSetting @tbody, 'Offset Y'
    @fields["offsetY"] = @SupUI.component.createNumberField offsetY.valueElt, config.offsetY
    @fields["offsetY"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetY', parseFloat(event.target.value)
      return

    shapeRow = @SupUI.component.createSetting @tbody, 'Shape'
    @fields["shape"] = @SupUI.component.createSelectBox shapeRow.valueElt, {
      "rectangle": "Rectangle"
      "circle": "Circle"
    }
    @fields["shape"].value = config.shape
    @fields["shape"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'shape', event.target.value
      return

    # Rectangle
    @widthRow = @SupUI.component.createSetting @tbody, 'Width'
    @shapeRows.push @widthRow.rowElt
    @fields["width"] = @SupUI.component.createNumberField @widthRow.valueElt, config.width, 0
    @fields["width"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'width', parseFloat(event.target.value)
      return

    @heightRow = @SupUI.component.createSetting @tbody, 'Height'
    @shapeRows.push @heightRow.rowElt
    @fields["height"] = @SupUI.component.createNumberField @heightRow.valueElt, config.height, 0
    @fields["height"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'height', parseFloat(event.target.value)
      return

    # Circle
    @radiusRow = @SupUI.component.createSetting @tbody, 'Radius'
    @shapeRows.push @radiusRow.rowElt
    @fields["radius"] = @SupUI.component.createNumberField @radiusRow.valueElt, config.radius, 0
    @fields["radius"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'radius', parseFloat(event.target.value)
      return

    @updateShapeInput config.shape

  updateShapeInput: (shape) ->
    for rowElt in @shapeRows
      @tbody.removeChild rowElt
    @shapeRows.length = 0

    switch shape
      when 'rectangle'
        @tbody.appendChild @widthRow.rowElt
        @shapeRows.push @widthRow.rowElt
        @tbody.appendChild @heightRow.rowElt
        @shapeRows.push @heightRow.rowElt

      when 'circle'
        @tbody.appendChild @radiusRow.rowElt
        @shapeRows.push @radiusRow.rowElt
    return


  destroy: ->
  config_setProperty: (path, value) ->
    if path == "fixedRotation" then @fields["fixedRotation"].checked = value
    else @fields[path].value = value

    if path == 'shape' then @updateShapeInput value
    return
