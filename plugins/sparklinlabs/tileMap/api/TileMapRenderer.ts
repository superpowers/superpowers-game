module Sup {
  export class TileMapRenderer extends Sup.ActorComponent {
    constructor(actor, asset) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.TileMapRenderer(this.actor.__inner);
      if (asset) { this.setTileMap(asset, true); }
      this.__inner.__outer = this;
      this.actor.tileMapRenderer = this;
    }
    destroy() {
      this.actor.tileMapRenderer = null;
      super.destroy();
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
