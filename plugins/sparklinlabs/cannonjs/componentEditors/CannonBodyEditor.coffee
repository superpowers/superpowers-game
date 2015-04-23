module.exports = class CannonBodyEditor

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

    offsetZ = SupClient.component.createSetting @tbody, 'Offset Z'
    @fields["offsetZ"] = SupClient.component.createNumberField offsetZ.valueElt, config.offsetZ
    @fields["offsetZ"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'offsetZ', parseFloat(event.target.value)
      return

    shapeRow = SupClient.component.createSetting @tbody, 'Shape'
    @fields["shape"] = SupClient.component.createSelectBox shapeRow.valueElt, {
      "box": "Box"
      "sphere": "Sphere"
      "cylinder": "Cylinder"
    }
    @fields["shape"].value = config.shape
    @fields["shape"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'shape', event.target.value
      return

    # Box
    @halfWidthRow = SupClient.component.createSetting @tbody, 'Half width'
    @shapeRows.push @halfWidthRow.rowElt
    @fields["halfWidth"] = SupClient.component.createNumberField @halfWidthRow.valueElt, config.halfWidth, 0
    @fields["halfWidth"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'halfWidth', parseFloat(event.target.value)
      return

    @halfHeightRow = SupClient.component.createSetting @tbody, 'Half height'
    @shapeRows.push @halfHeightRow.rowElt
    @fields["halfHeight"] = SupClient.component.createNumberField @halfHeightRow.valueElt, config.halfHeight, 0
    @fields["halfHeight"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'halfHeight', parseFloat(event.target.value)
      return

    @halfDepthRow = SupClient.component.createSetting @tbody, 'Half depth'
    @shapeRows.push @halfDepthRow.rowElt
    @fields["halfDepth"] = SupClient.component.createNumberField @halfDepthRow.valueElt, config.halfDepth, 0
    @fields["halfDepth"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'halfDepth', parseFloat(event.target.value)
      return

    # Sphere/Cylinder
    @radiusRow = SupClient.component.createSetting @tbody, 'Radius'
    @shapeRows.push @radiusRow.rowElt
    @fields["radius"] = SupClient.component.createNumberField @radiusRow.valueElt, config.radius, 0
    @fields["radius"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'radius', parseFloat(event.target.value)
      return

    @heightRow = SupClient.component.createSetting @tbody, 'Height'
    @shapeRows.push @heightRow.rowElt
    @fields["height"] = SupClient.component.createNumberField @heightRow.valueElt, config.height, 0
    @fields["height"].addEventListener "change", (event) =>
      @editConfig 'setProperty', 'height', parseFloat(event.target.value)
      return

    @updateShapeInput config.shape

  updateShapeInput: (shape) ->
    for rowElt in @shapeRows
      @tbody.removeChild rowElt
    @shapeRows.length = 0

    switch shape
      when 'box'
        @tbody.appendChild @halfWidthRow.rowElt
        @shapeRows.push @halfWidthRow.rowElt
        @tbody.appendChild @halfHeightRow.rowElt
        @shapeRows.push @halfHeightRow.rowElt
        @tbody.appendChild @halfDepthRow.rowElt
        @shapeRows.push @halfDepthRow.rowElt

      when 'sphere'
        @tbody.appendChild @radiusRow.rowElt
        @shapeRows.push @radiusRow.rowElt

      when 'cylinder'
        @tbody.appendChild @radiusRow.rowElt
        @shapeRows.push @radiusRow.rowElt
        @tbody.appendChild @heightRow.rowElt
        @shapeRows.push @heightRow.rowElt

    return


  destroy: ->
  config_setProperty: (path, value) ->
    if path == "fixedRotation" then @fields["fixedRotation"].checked = value
    else @fields[path].value = value

    if path == 'shape' then @updateShapeInput value
    return
