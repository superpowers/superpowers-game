/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Model", {
  code: "namespace Sup { export class Model extends Asset {} }",
  defs: "declare namespace Sup { class Model extends Asset { dummyModelMember; } }"
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "ModelRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: "modelRenderer: Sup.ModelRenderer;"
});
