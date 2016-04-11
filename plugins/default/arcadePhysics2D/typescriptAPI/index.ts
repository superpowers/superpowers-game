/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.ArcadePhysics2D", {
  code: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "ArcadeBody2D", {
  code: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.Body.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.Body.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "arcadeBody2D", className: "Sup.ArcadePhysics2D.Body" },
});
