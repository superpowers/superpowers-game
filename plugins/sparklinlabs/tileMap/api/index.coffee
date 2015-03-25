fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'Sup.TileMap', {
  code: fs.readFileSync __dirname + '/Sup.TileMap.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/Sup.TileMap.d.ts', { encoding: 'utf8' }
}

SupAPI.registerPlugin 'typescript', 'Sup.TileSet', {
  code: fs.readFileSync __dirname + '/Sup.TileSet.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/Sup.TileSet.d.ts', { encoding: 'utf8' }
}

SupAPI.registerPlugin 'typescript', 'TileMapRenderer', {
  code: fs.readFileSync __dirname + '/Sup.TileMapRenderer.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/Sup.TileMapRenderer.d.ts', { encoding: 'utf8' }
  exposeActorComponent: { propertyName: "tileMapRenderer", className: "Sup.TileMapRenderer" }
}
