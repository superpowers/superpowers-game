fs = require 'fs'

SupAPI.addPlugin 'typescript', 'lib', {
  defs: fs.readFileSync "#{__dirname}/lib.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup', {
  code: fs.readFileSync "#{__dirname}/Sup.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Sup.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Math', {
  code: fs.readFileSync "#{__dirname}/Math.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Math.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Input', {
  code: fs.readFileSync "#{__dirname}/Input.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Input.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Sup.Storage', {
  code: fs.readFileSync "#{__dirname}/Storage.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Storage.d.ts", encoding: 'utf8'
}

SupAPI.addPlugin 'typescript', 'Camera', {
  code: fs.readFileSync "#{__dirname}/Camera.ts", encoding: 'utf8'
  defs: fs.readFileSync "#{__dirname}/Camera.d.ts", encoding: 'utf8'
  exposeActorComponent: { propertyName: "camera", className: "Sup.Camera" }
}
