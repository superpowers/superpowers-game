fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Sup.Model', {
  code: "module Sup { export class Model extends Asset {} }"
  defs: "declare module Sup { class Model extends Asset { dummyModelMember; } }"
}

SupAPI.addPlugin 'typescript', 'ModelRenderer', {
  code: fs.readFileSync(__dirname + '/ModelRenderer.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/ModelRenderer.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "modelRenderer", className: "Sup.ModelRenderer" }
}
