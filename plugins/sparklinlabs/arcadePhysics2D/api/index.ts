/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.ArcadePhysics2D", {
  code: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "ArcadeBody2D", {
  code: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.Body.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.ArcadePhysics2D.Body.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "arcadeBody2D", className: "Sup.ArcadePhysics2D.Body" },
});
