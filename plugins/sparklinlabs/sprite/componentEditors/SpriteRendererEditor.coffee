module.exports = class SpriteRendererEditor

  constructor: (@SupUI, tbody, config, @projectClient, @setProperty) ->
    @spriteAssetId = config.spriteAssetId
    @animationId = config.animationId

    spriteRow = @SupUI.component.createSetting tbody, 'Sprite'
    @spriteTextField = @SupUI.component.createTextField spriteRow.valueElt, ''
    @spriteTextField.disabled = true

    animationRow = @SupUI.component.createSetting tbody, 'Animation'
    @animationSelectBox = @SupUI.component.createSelectBox animationRow.valueElt, { "": "(None)" }
    @animationSelectBox.disabled = true

    @spriteTextField.addEventListener 'input', @_onChangeSpriteAsset
    @animationSelectBox.addEventListener 'change', @_onChangeSpriteAnimation

    @projectClient.subEntries @

  destroy: ->
    @projectClient.unsubEntries @

    if @spriteAssetId?
      @projectClient.unsub @spriteAssetId, @
    return

  onConfigEdited: (path, value) ->
    return if ! @projectClient.entries?

    switch path
      when 'spriteAssetId'
        @projectClient.unsub @spriteAssetId, @ if @spriteAssetId?
        @spriteAssetId = value
        @animationSelectBox.disabled = true

        @projectClient.sub @spriteAssetId, 'sprite', @

        @spriteTextField.value = @projectClient.entries.getPathFromId @spriteAssetId

      when 'animationId'
        if ! @animationSelectBox.disabled
          @animationSelectBox.value = value ? ""

        @animationId = value
    return

  # Network callbacks
  onEntriesReceived: (entries) =>
    @spriteTextField.disabled = false

    if entries.byId[@spriteAssetId]?
      @spriteTextField.value = entries.getPathFromId @spriteAssetId
      @projectClient.sub @spriteAssetId, 'sprite', @

    return

  onEntryAdded: (entry, parentId, index) => return
  onEntryMoved: (id, parentId, index) =>
    return if id != @spriteAssetId
    @spriteTextField.value = @projectClient.entries.getPathFromId @spriteAssetId
    return
  onSetEntryProperty: (id, key, value) =>
    return if id != @spriteAssetId
    @spriteTextField.value = @projectClient.entries.getPathFromId @spriteAssetId
    return
  onEntryTrashed: (id) => return

  onAssetReceived: (assetId, asset) =>
    return if assetId != @spriteAssetId
    @asset = asset

    loop
      child = @animationSelectBox.children[1]
      break if ! child?
      @animationSelectBox.removeChild child

    for animation in @asset.pub.animations
      @SupUI.component.createSelectOption @animationSelectBox, animation.id, animation.name

    @animationSelectBox.value = @animationId ? ""
    @animationSelectBox.disabled = false
    return

  onAssetEdited: (assetId, command, args...) =>
    return if parseInt(assetId) != @spriteAssetId

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
      @setProperty 'animationId', ""
    return

  onAssetTrashed: =>
    loop
      child = @animationSelectBox.children[1]
      break if ! child?
      @animationSelectBox.removeChild child

    @spriteTextField.value = ""
    @animationSelectBox.value = ""
    @animationSelectBox.disabled = true
    return

  # User interface
  _onChangeSpriteAsset: (event) =>
    entry = @SupUI.findEntryByPath @projectClient.entries.pub, event.target.value
    if entry?.type == 'sprite' then @setProperty 'spriteAssetId', entry.id
    return

  _onChangeSpriteAnimation: (event) =>
    animationId =
      if event.target.value == '' then null
      else parseInt(event.target.value)

    @setProperty 'animationId', animationId
    return
