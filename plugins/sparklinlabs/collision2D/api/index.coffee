fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Sup.Collision2D', {
  code: fs.readFileSync(__dirname + '/Collision2D.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Collision2D.d.ts', encoding: 'utf8')
}

SupAPI.addPlugin 'typescript', 'Body2D', {
  code: fs.readFileSync(__dirname + '/Body2D.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Body2D.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "body2D", className: "Sup.Collision2D.Body" }
}
