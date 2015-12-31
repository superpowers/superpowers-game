/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "CANNON", {
  code: "",
  defs: fs.readFileSync(`${__dirname}/CANNON.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "CannonBody", {
  code: fs.readFileSync(`${__dirname}/Sup.Cannon.Body.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Cannon.Body.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "cannonBody", className: "Sup.Cannon.Body" }
});
