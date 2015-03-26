module.exports = class ArcadeBody2DEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @fields = {}

    massRow = @SupUI.component.createSetting tbody, 'Mass'
    @fields["mass"] = @SupUI.component.createNumberField massRow.valueElt, config.mass, 0
    @fields["mass"].addEventListener "change", (event) =>
      @setProperty 'mass', parseFloat(event.target.value)
      return

    fixedRotationRow = @SupUI.component.createSetting tbody, 'Fixed rotation'
    @fields["fixedRotation"] = @SupUI.component.createCheckBox fixedRotationRow.valueElt, config.fixedRotation
    @fields["fixedRotation"].addEventListener "click", (event) =>
      @setProperty 'fixedRotation', event.target.checked
      return

    halfWidthRow = @SupUI.component.createSetting tbody, 'Half width'
    @fields["halfWidth"] = @SupUI.component.createNumberField halfWidthRow.valueElt, config.halfWidth, 0
    @fields["halfWidth"].addEventListener "change", (event) =>
      @setProperty 'halfWidth', parseFloat(event.target.value)
      return

    halfHeightRow = @SupUI.component.createSetting tbody, 'Half height'
    @fields["halfHeight"] = @SupUI.component.createNumberField halfHeightRow.valueElt, config.halfHeight, 0
    @fields["halfHeight"].addEventListener "change", (event) =>
      @setProperty 'halfHeight', parseFloat(event.target.value)
      return

    halfDepthRow = @SupUI.component.createSetting tbody, 'Half depth'
    @fields["halfDepth"] = @SupUI.component.createNumberField halfDepthRow.valueElt, config.halfDepth, 0
    @fields["halfDepth"].addEventListener "change", (event) =>
      @setProperty 'halfDepth', parseFloat(event.target.value)
      return

    offsetX = @SupUI.component.createSetting tbody, 'Offset X'
    @fields["offsetX"] = @SupUI.component.createNumberField offsetX.valueElt, config.offsetX
    @fields["offsetX"].addEventListener "change", (event) =>
      @setProperty 'offsetX', parseFloat(event.target.value)
      return

    offsetY = @SupUI.component.createSetting tbody, 'Offset Y'
    @fields["offsetY"] = @SupUI.component.createNumberField offsetY.valueElt, config.offsetY
    @fields["offsetY"].addEventListener "change", (event) =>
      @setProperty 'offsetY', parseFloat(event.target.value)
      return

    offsetZ = @SupUI.component.createSetting tbody, 'Offset Z'
    @fields["offsetZ"] = @SupUI.component.createNumberField offsetZ.valueElt, config.offsetZ
    @fields["offsetZ"].addEventListener "change", (event) =>
      @setProperty 'offsetZ', parseFloat(event.target.value)
      return

  destroy: ->
  onConfigEdited: (path, value) ->
    if path == "fixedRotation" then @fields["fixedRotation"].checked = value
    else @fields[path].value = value
    return
