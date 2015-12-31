/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.Model", {
  code: "namespace Sup { export class Model extends Asset {} }",
  defs: "declare namespace Sup { class Model extends Asset { dummyModelMember; } }"
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "ModelRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "modelRenderer", className: "Sup.ModelRenderer" }
});
