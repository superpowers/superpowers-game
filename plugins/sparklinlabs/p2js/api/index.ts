/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "p2", {
  code: "",
  defs: fs.readFileSync(`${__dirname}/p2.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "P2Body", {
  code: fs.readFileSync(`${__dirname}/Sup.P2.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.P2.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "p2Body", className: "Sup.P2.Body" }
});
