module.exports = class ModelRendererEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @modelAssetId = config.modelAssetId

    modelRow = @SupUI.component.createSetting tbody, 'Model'
    @modelTextField = @SupUI.component.createTextField modelRow.valueElt, ''
    @modelTextField.disabled = true

    @modelTextField.addEventListener 'input', @_onChangeModelAsset

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
        # @projectClient.unsub @modelAssetId, @ if @modelAssetId?
        @modelAssetId = value

        # @projectClient.sub @modelAssetId, 'model', @

        @modelTextField.value = @projectClient.entries.getPathFromId @modelAssetId
    return

  onEntriesReceived: (entries) =>
    @modelTextField.disabled = false

    if entries.byId[@modelAssetId]?
      @modelTextField.value = entries.getPathFromId @modelAssetId
      # NOTE: We'll probably need to subscribe later
      # when we want to be kept up-to-date about material changes and stuff like that
      # @projectClient.sub @modelAssetId, 'model', @

    return

  onEntryAdded: (entry, parentId, index) => return
  onEntryMoved: (id, parentId, index) => return
  onSetEntryProperty: (id, key, value) =>
    # TODO: Update name
    return
  onEntryTrashed: (id) => return

  ###
  onAssetReceived: (assetId, asset) =>
    return if assetId != @modelAssetId
    return
  ###

  _onChangeModelAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'model' then @setProperty 'modelAssetId', entry.id
    return
