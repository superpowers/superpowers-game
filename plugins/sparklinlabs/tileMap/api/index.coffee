fs = require 'fs'

SupAPI.addPlugin 'typescript', 'tileMap', {
  code: fs.readFileSync __dirname + '/tileMap.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/tileMap.d.ts', { encoding: 'utf8' }
}

SupAPI.addPlugin 'typescript', 'tileSet', {
  code: fs.readFileSync __dirname + '/tileSet.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/tileSet.d.ts', { encoding: 'utf8' }
}

SupAPI.addPlugin 'typescript', 'TileMapRenderer', {
  code: fs.readFileSync __dirname + '/TileMapRenderer.ts', { encoding: 'utf8' }
  defs: fs.readFileSync __dirname + '/TileMapRenderer.d.ts', { encoding: 'utf8' }
  exposeActorComponent: { propertyName: "tileMapRenderer", className: "Sup.TileMapRenderer" }
}
