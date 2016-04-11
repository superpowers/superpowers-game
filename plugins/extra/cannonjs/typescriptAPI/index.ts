/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "CANNON", {
  code: "",
  defs: fs.readFileSync(`${__dirname}/CANNON.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "CannonBody", {
  code: fs.readFileSync(`${__dirname}/Sup.Cannon.Body.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Cannon.Body.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "cannonBody", className: "Sup.Cannon.Body" }
});
