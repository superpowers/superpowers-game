module.exports = class TileMapLayers extends SupCore.api.base.ListById

  constructor: (pub) ->
    super pub, {
      name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
      data: { type: 'list' }
    }
