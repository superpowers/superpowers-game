import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Sup.Model", {
  code: "module Sup { export class Model extends Asset {} }",
  defs: "declare module Sup { class Model extends Asset { dummyModelMember; } }"
});

SupAPI.registerPlugin("typescript", "ModelRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ModelRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "modelRenderer", className: "Sup.ModelRenderer" }
});
