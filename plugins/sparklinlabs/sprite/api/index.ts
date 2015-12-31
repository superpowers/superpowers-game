/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Sprite", {
  code: fs.readFileSync(`${__dirname}/Sup.Sprite.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Sprite.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "SpriteRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.SpriteRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.SpriteRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "spriteRenderer", className: "Sup.SpriteRenderer" }
});
