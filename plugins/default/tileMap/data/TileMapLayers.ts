export interface TileMapLayerPub {
  id: string;
  name: string;
  data: ((number|boolean)[]|number)[];
}

export default class TileMapLayers extends SupCore.Data.Base.ListById {

  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    data: { type: "array" }
  };

  pub: TileMapLayerPub[];
  byId: { [id: string]: TileMapLayerPub };

  constructor(pub: TileMapLayerPub[]) {
    super(pub, TileMapLayers.schema);
  }
}
