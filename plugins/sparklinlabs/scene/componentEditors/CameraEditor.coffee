module.exports = class CameraEditor

  constructor: (@SupUI, tbody, config, @projectClient, @editConfig) ->

    @mode = config.mode
    @fov = config.fov
    @orthographicScale = config.orthographicScale
    @viewport =
      x: config.viewport.x, y: config.viewport.y
      width: config.viewport.width, height: config.viewport.height

    modeRow = @SupUI.component.createSetting tbody, 'Mode'
    @modeSelectBox = @SupUI.component.createSelectBox modeRow.valueElt,
      { perspective: "Perspective", orthographic: "Orthographic" }, config.mode

    @fovRow = @SupUI.component.createSetting tbody, 'Field of view'
    @fovField = @SupUI.component.createNumberField @fovRow.valueElt, config.fov, 0.1, 179.9

    @orthographicScaleRow = @SupUI.component.createSetting tbody, 'Orthographic scale'
    @orthographicScaleField = @SupUI.component.createNumberField @orthographicScaleRow.valueElt, config.orthographicScale, 0.1

    @modeSelectBox.addEventListener 'change', @_onChangeMode
    @fovField.addEventListener 'change', @_onChangeFOV
    @orthographicScaleField.addEventListener 'change', @_onChangeOrthographicScale

  destroy: ->

  config_setProperty: (path, value) ->
    switch path
      when 'mode' then @modeSelectBox.value = value
      when 'fov' then @fovField.value = value
      when 'orthographicScale' then @orthographicScaleField.value = value
    return

  _onChangeMode: (event) => @editConfig 'setProperty', 'mode', event.target.value; return
  _onChangeFOV: (event) => @editConfig 'setProperty', 'fov', parseFloat(event.target.value); return
  _onChangeOrthographicScale: (event) => @editConfig 'setProperty', 'orthographicScale', parseFloat(event.target.value); return
