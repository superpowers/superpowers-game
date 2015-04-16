module.exports = class TileMapSettingsResource extends SupCore.data.base.Resource

  @schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true },
    width: { type: "integer", min: 1, mutable: true },
    height: { type: "integer", min: 1, mutable: true },
    layerDepthOffset: { type: "number", min: 0, mutable: true },

    gridSize: { type: "integer", min: 1, mutable: true }
  }

  constructor: (pub, serverData) ->
    super(pub, @constructor.schema, serverData);

  setup: ->

  init: (callback) ->
    @pub = {
      pixelsPerUnit: 100,
      width: 30,
      height: 20,
      layerDepthOffset: 1,

      gridSize: 40
    }

    super(callback);
