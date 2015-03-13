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
  onEntryMoved: (id, parentId, index) => return
  onSetEntryProperty: (id, key, value) =>
    # TODO: Update name
    return
  onEntryTrashed: (id) => return

  onAssetReceived: (assetId, asset) =>
    return if assetId != @modelAssetId

    loop
      child = @animationSelectBox.children[1]
      break if ! child?
      @animationSelectBox.removeChild child

    for animation in asset.pub.animations
      @SupUI.component.createSelectOption @animationSelectBox, animation.id, animation.name

    @animationSelectBox.value = @animationId ? ""
    @animationSelectBox.disabled = false
    return

  _onChangeModelAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'model' then @setProperty 'modelAssetId', entry.id
    return

  _onChangeModelAnimation: (event) =>
    animationId =
      if event.target.value == '' then null
      else parseInt(event.target.value)

    @setProperty 'animationId', animationId
    return
