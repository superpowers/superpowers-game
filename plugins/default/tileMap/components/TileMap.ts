import { EventEmitter } from "events";
import { TileMapAssetPub } from "../data/TileMapAsset";

export default class TileMap extends EventEmitter {
  private data: TileMapAssetPub;

  constructor(data: TileMapAssetPub) {
    super();
    this.data = data;
  }

  getWidth() { return this.data.width; }
  getHeight() { return this.data.height; }
  getPixelsPerUnit() { return this.data.pixelsPerUnit; }
  getLayersDepthOffset() { return this.data.layerDepthOffset; }
  getLayersCount() { return this.data.layers.length; }
  getLayerId(index: number) { return this.data.layers[index].id; }

  setTileAt(layer: number, x: number, y: number, value: (number|boolean)[]) {
    if (x < 0 || y < 0 || x >= this.data.width || y >= this.data.height) return;

    const index = y * this.data.width + x;
    this.data.layers[layer].data[index] = (value != null) ? value : 0;

    this.emit("setTileAt", layer, x, y);
  }

  getTileAt(layer: number, x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.data.width || y >= this.data.height) return 0;

    const index = y * this.data.width + x;
    return this.data.layers[layer].data[index];
  }
}
