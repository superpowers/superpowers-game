exports.typescript = """
module Sup {
  export class TileMapRenderer extends Sup.ActorComponent {
    constructor(actor, asset) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.TileMapRenderer(this.actor.__inner);
      if (asset) { this.setTileMap(asset, true); }
      this.__inner.__outer = this;
      this.actor.tileMapRenderer = this;
    }
    getTileMap() { return this.__inner.tileMap.__outer }
    setTileMap(tileMap, replaceTileSet) {
      this.__inner.setTileMap(tileMap.__inner);
      replaceTileSet = (replaceTileSet) ? replaceTileSet : true;
      if (replaceTileSet) { this.__inner.setTileSet( player.getOuterAsset(tileMap.__inner.data.tileSetId).__inner ); }
      return this
    }
    getTileSet() { return this.__inner.tileSet.__outer }
    setTileSet(tileSet) { this.__inner.setTileSet(tileSet.__inner); return this }
    getLayerOpacity(layer) { return this.__inner.layerMeshes[layer].material.opacity }
    setLayerOpacity(layer, opacity) { this.__inner.layerMeshes[layer].material.opacity = opacity; return this }
  }
}
"""

exports.typescriptDefs = """
declare module Sup {
  class TileMapRenderer extends ActorComponent {
    constructor(actor: Actor, asset?: TileMap);
    getTileMap(): TileMap;
    setTileMap(tileMap: TileMap, replaceTileSet?: boolean); TileMapRenderer;
    getTileSet(): TileSet;
    setTileSet(tileSet: TileSet): TileMapRenderer;
    getLayerOpacity(layer: number): number
    setLayerOpacity(layer: number, opacity: number): TileMapRenderer;
  }
}
"""

exports.script =
  """
  namespace Sup
    blueprint TileMapRenderer extends ActorComponent
      transcendental construct(Actor actor, TileMap tileMap)
      transcendental action setTileMap(TileMap tileMap, boolean? replaceTileSet)
      transcendental action getTileMap(): TileMap
      transcendental action setTileSet(TileSet tileSet)
      transcendental action getTileSet(): TileSet
      transcendental action setLayerOpacity(number layer, number opacity)
      transcendental action getLayerOpacity(number layer): number
  """

#TileMapRenderer = SupEngine.componentPlugins.TileMapRenderer
exports.js = (player) ->
  'Sup':
    'TileMapRenderer':
      'construct': (actor, tileMap) ->
        tileSet = player.getOuterAsset tileMap?.__inner.data.tileSetId
        @__inner = new TileMapRenderer @actor.__inner, tileMap?.__inner, tileSet?.__inner
        @actor.tileMapRenderer = @
        @__inner.__outer = @
        return

      'prototype':
        'setTileMap': (tileMap, replaceTileSet=true) ->
          @__inner.setTileMap tileMap.__inner
          if replaceTileSet
            tileSet = player.getOuterAsset tileMap.__inner.data.tileSetId
            @__inner.setTileSet tileSet.__inner

          return
        'getTileMap': -> @__inner.tileMap.__outer

        'setTileSet': (tileSet) -> @__inner.setTileSet tileSet.__inner; return
        'getTileSet': -> @__inner.tileSet.__outer

        'setLayerOpacity': (layer, opacity) -> @__inner.layerMeshes[layer].material.opacity = opacity; return
        'getLayerOpacity': (layer) -> @__inner.layerMeshes[layer].material.opacity

exports.setupComponent = (player, component, config) ->
  if config.tileMapAssetId?
    tileMap = player.getOuterAsset config.tileMapAssetId
    component.setTileMap tileMap.__inner

  tileSetId = config.tileSetAssetId ? tileMap.__inner.data.tileSetId
  tileSet = player.getOuterAsset tileSetId
  component.setTileSet tileSet.__inner
  return
