module.exports = class ModelRendererEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @modelAssetId = config.modelAssetId
    @animationId = config.animationId

    modelRow = @SupUI.component.createSetting tbody, 'Model'
    @modelTextField = @SupUI.component.createTextField modelRow.valueElt, ''
    @modelTextField.disabled = true

    animationRow = @SupUI.component.createSetting tbody, 'Animation'
    @animationSelectBox = @SupUI.component.createSelectBox animationRow.valueElt, { "": "(None)" }
    @animationSelectBox.disabled = true

    @modelTextField.addEventListener 'input', @_onChangeModelAsset
    @animationSelectBox.addEventListener 'change', @_onChangeModelAnimation

    @projectClient.subEntries @

  destroy: ->
    @projectClient.unsubEntries @

    if @modelAssetId?
      @projectClient.unsub @modelAssetId, @
    return

  onConfigEdited: (path, value) ->
    return if ! @projectClient.entries?

    switch path
      when 'modelAssetId'
        @projectClient.unsub @modelAssetId, @ if @modelAssetId?
        @modelAssetId = value
        @animationSelectBox.disabled = true

        @projectClient.sub @modelAssetId, 'model', @

        @modelTextField.value = @projectClient.entries.getPathFromId @modelAssetId

      when 'animationId'
        if ! @animationSelectBox.disabled
          @animationSelectBox.value = value ? ""

        @animationId = value
    return

  onEntriesReceived: (entries) =>
    @modelTextField.disabled = false

    if entries.byId[@modelAssetId]?
      @modelTextField.value = entries.getPathFromId @modelAssetId
      @projectClient.sub @modelAssetId, 'model', @
    return

  onEntryAdded: (entry, parentId, index) => return
  onEntryMoved: (id, parentId, index) =>
    return if id != @modelAssetId
    @modelTextField.value = @projectClient.entries.getPathFromId @modelAssetId
    return
  onSetEntryProperty: (id, key, value) =>
    return if id != @modelAssetId
    @modelTextField.value = @projectClient.entries.getPathFromId @modelAssetId
    return
  onEntryTrashed: (id) => return

  onAssetReceived: (assetId, asset) =>
    return if assetId != @modelAssetId
    @asset = asset

    loop
      child = @animationSelectBox.children[1]
      break if ! child?
      @animationSelectBox.removeChild child

    for animation in asset.pub.animations
      @SupUI.component.createSelectOption @animationSelectBox, animation.id, animation.name

    @animationSelectBox.value = @animationId ? ""
    @animationSelectBox.disabled = false
    return

  onAssetEdited: (assetId, command, args...) =>
    return if parseInt(assetId) != @modelAssetId

    return if command.indexOf("Animation") == -1
    animationId = @animationSelectBox.value

    loop
      child = @animationSelectBox.children[1]
      break if ! child?
      @animationSelectBox.removeChild child

    for animation in @asset.pub.animations
      @SupUI.component.createSelectOption @animationSelectBox, animation.id, animation.name

    if animationId? and @asset.animations.byId[animationId]?
      @animationSelectBox.value = animationId
    else
      @setProperty 'animationId', null

    return

  onAssetTrashed: =>
    @modelTextField.value = ""
    @animationSelectBox.value = ""
    @animationSelectBox.disabled = true

  _onChangeModelAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'model'
      @setProperty 'modelAssetId', entry.id
      @setProperty 'animationId', null
    return

  _onChangeModelAnimation: (event) =>
    animationId =
      if event.target.value == '' then null
      else parseInt(event.target.value)

    @setProperty 'animationId', animationId
    return
