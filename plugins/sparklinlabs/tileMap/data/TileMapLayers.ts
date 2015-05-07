export interface TileMapLayerPub {
  id: string;
  name: string;
  data: (number|boolean)[][];
}

export default class TileMapLayers extends SupCore.data.base.ListById {

  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    data: { type: "array" }
  };

  pub: TileMapLayerPub[];
  byId: { [id: string]: TileMapLayerPub };

  constructor(pub: TileMapLayerPub[]) {
    super(pub, TileMapLayers.schema);
  }
}
