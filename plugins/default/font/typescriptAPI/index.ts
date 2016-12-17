/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Font", {
  code: fs.readFileSync(`${__dirname}/Sup.Font.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Font.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "TextRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.TextRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TextRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: "textRenderer: Sup.TextRenderer;"
});
