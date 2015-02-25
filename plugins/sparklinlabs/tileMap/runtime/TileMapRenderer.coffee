exports.setupComponent = (player, component, config) ->
  if config.tileMapAssetId?
    tileMap = player.getOuterAsset config.tileMapAssetId
    component.setTileMap tileMap.__inner

  tileSetId = config.tileSetAssetId ? tileMap.__inner.data.tileSetId
  tileSet = player.getOuterAsset tileSetId
  component.setTileSet tileSet.__inner
  return

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

