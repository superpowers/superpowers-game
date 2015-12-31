/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.CubicModel", {
  code: fs.readFileSync(`${__dirname}/Sup.CubicModel.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.CubicModel.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "CubicModelRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.CubicModelRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.CubicModelRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "cubicModelRenderer", className: "Sup.CubicModelRenderer" }
});
