module.exports = class TileMapRendererEditor

  constructor: (@SupUI, tbody, config, @projectClient, @editConfig) ->
    @tileMapAssetId = config.tileMapAssetId
    @tileSetAssetId = config.tileSetAssetId

    tileMapRow = @SupUI.component.createSetting tbody, 'Map'
    @tileMapTextField = @SupUI.component.createTextField tileMapRow.valueElt, ''
    @tileMapTextField.disabled = true

    @tileMapTextField.addEventListener 'input', @_onChangeTileMapAsset
    # @tileSetTextField.addEventListener 'input', @_onChangeTileSetAsset

    @projectClient.subEntries @

  destroy: ->
    @projectClient.unsubEntries @

    if @tileMapAssetId?
      @projectClient.unsub @tileMapAssetId, @
    return

  config_setProperty: (path, value) ->
    return if ! @projectClient.entries?

    switch path
      when 'tileMapAssetId'
        # @projectClient.unsub @tileMapAssetId, @ if @tileMapAssetId?
        @tileMapAssetId = value

        # @projectClient.sub @tileMapAssetId, 'sprite', @

        @tileMapTextField.value = @projectClient.entries.getPathFromId @tileMapAssetId

    return

  onEntriesReceived: (entries) =>
    @tileMapTextField.disabled = false

    if entries.byId[@tileMapAssetId]?
      @tileMapTextField.value = entries.getPathFromId @tileMapAssetId
      # NOTE: We'll probably need to subscribe later
      # when we want to be kept up-to-date about tile set change
      # @projectClient.sub @tileMapAssetId, 'tileMap', @

    return

  onEntryAdded: (entry, parentId, index) => return
  onEntryMoved: (id, parentId, index) => return
  onSetEntryProperty: (id, key, value) =>
    # TODO: Update name
    return
  onEntryTrashed: (id) => return

  ###
  onAssetReceived: (assetId, asset) =>
    return if assetId != @tileMapAssetId
    return
  ###

  _onChangeTileMapAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'tileMap' then @editConfig 'setProperty', 'tileMapAssetId', entry.id
    return

  ###_onChangeTileSetAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'tileSet' then @editConfig 'setProperty', 'tileSetAssetId', entry.id
    return###
