fs = require 'fs'

SupAPI.addPlugin 'typescript', 'lib', {
  defs: fs.readFileSync "#{__dirname}/lib.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup', {
  code: fs.readFileSync "#{__dirname}/Sup.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Actor', {
  code: fs.readFileSync "#{__dirname}/Sup.Actor.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.Actor.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Math', {
  code: fs.readFileSync "#{__dirname}/Sup.Math.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.Math.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Input', {
  code: fs.readFileSync "#{__dirname}/Sup.Input.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.Input.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Storage', {
  code: fs.readFileSync "#{__dirname}/Sup.Storage.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.Storage.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Camera', {
  code: fs.readFileSync "#{__dirname}/Sup.Camera.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.Camera.d.ts", encoding: 'utf8'
  exposeActorComponent: { propertyName: "camera", className: "Sup.Camera" }
}
