fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'p2', {
  code: ""
  defs: fs.readFileSync(__dirname + '/p2.d.ts', encoding: 'utf8')
}

SupAPI.registerPlugin 'typescript', 'P2Body', {
  code: fs.readFileSync(__dirname + '/Sup.P2.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Sup.P2.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "p2Body", className: "Sup.P2.Body" }
}
