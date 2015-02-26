declare module Sup {
  class TileSet extends Asset {
    getTileProperties(tile: number): {[key:string]: string;}
  }
}
