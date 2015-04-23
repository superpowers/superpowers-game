module.exports = class P2BodyEditor

  constructor: (@tbody, config, @projectClient, @editConfig) ->
    @fields = {}
    @shapeRows = []

    massRow = SupClient.component.createSetting @tbody, 'Mass'
    @fields["mass"] = SupClient.component.createNumberField massRow.valueElt, config.mass, 0
    @fields["mass"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'mass', parseFloat(event.target.value)
      return

    fixedRotationRow = SupClient.component.createSetting @tbody, 'Fixed rotation'
    @fields["fixedRotation"] = SupClient.component.createBooleanField fixedRotationRow.valueElt, config.fixedRotation
    @fields["fixedRotation"].addEventListener "click", (event) =>
      @editConfig 'setProperty', 'fixedRotation', event.target.checked
      return

    offsetX = SupClient.component.createSetting @tbody, 'Offset X'
    @fields["offsetX"] = SupClient.component.createNumberField offsetX.valueElt, config.offsetX
    @fields["offsetX"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetX', parseFloat(event.target.value)
      return

    offsetY = SupClient.component.createSetting @tbody, 'Offset Y'
    @fields["offsetY"] = SupClient.component.createNumberField offsetY.valueElt, config.offsetY
    @fields["offsetY"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetY', parseFloat(event.target.value)
      return

    shapeRow = SupClient.component.createSetting @tbody, 'Shape'
    @fields["shape"] = SupClient.component.createSelectBox shapeRow.valueElt, {
      "rectangle": "Rectangle"
      "circle": "Circle"
    }
    @fields["shape"].value = config.shape
    @fields["shape"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'shape', event.target.value
      return

    # Rectangle
    @widthRow = SupClient.component.createSetting @tbody, 'Width'
    @shapeRows.push @widthRow.rowElt
    @fields["width"] = SupClient.component.createNumberField @widthRow.valueElt, config.width, 0
    @fields["width"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'width', parseFloat(event.target.value)
      return

    @heightRow = SupClient.component.createSetting @tbody, 'Height'
    @shapeRows.push @heightRow.rowElt
    @fields["height"] = SupClient.component.createNumberField @heightRow.valueElt, config.height, 0
    @fields["height"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'height', parseFloat(event.target.value)
      return

    # Circle
    @radiusRow = SupClient.component.createSetting @tbody, 'Radius'
    @shapeRows.push @radiusRow.rowElt
    @fields["radius"] = SupClient.component.createNumberField @radiusRow.valueElt, config.radius, 0
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
