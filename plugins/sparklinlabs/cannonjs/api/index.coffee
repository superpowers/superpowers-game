fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'CANNON', {
  code: ""
  defs: fs.readFileSync(__dirname + '/CANNON.d.ts', encoding: 'utf8')
}

SupAPI.registerPlugin 'typescript', 'CannonBody', {
  code: fs.readFileSync(__dirname + '/Sup.Cannon.Body.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Sup.Cannon.Body.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "cannonBody", className: "Sup.Cannon.Body" }
}
