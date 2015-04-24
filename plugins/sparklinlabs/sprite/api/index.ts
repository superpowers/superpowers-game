import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Sup.Sprite", {
  code: fs.readFileSync(__dirname + "/Sup.Sprite.ts.txt", { encoding: "utf8" }),
  defs: fs.readFileSync(__dirname + "/Sup.Sprite.d.ts.txt", { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "SpriteRenderer", {
  code: fs.readFileSync(__dirname + "/Sup.SpriteRenderer.ts.txt", { encoding: "utf8" }),
  defs: fs.readFileSync(__dirname + "/Sup.SpriteRenderer.d.ts.txt", { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "spriteRenderer", className: "Sup.SpriteRenderer" }
});
