fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Sup.ArcadePhysics2D', {
  code: fs.readFileSync(__dirname + '/ArcadePhysics2D.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/ArcadePhysics2D.d.ts', encoding: 'utf8')
}

SupAPI.addPlugin 'typescript', 'ArcadeBody2D', {
  code: fs.readFileSync(__dirname + '/ArcadeBody2D.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/ArcadeBody2D.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "arcadeBody2D", className: "Sup.ArcadePhysics2D.Body" }
}
