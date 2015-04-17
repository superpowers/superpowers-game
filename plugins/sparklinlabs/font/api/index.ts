import fs = require("fs");

SupAPI.registerPlugin("typescript", "Sup.Font", {
  code: "module Sup { export class Font extends Asset {} }",
  defs: "declare module Sup { class Font extends Asset { dummyFontMember; } }",
});

SupAPI.registerPlugin("typescript", "TextRenderer", {
  code: fs.readFileSync(__dirname + "/Sup.TextRenderer.ts.txt", {encoding: "utf8"}),
  defs: fs.readFileSync(__dirname + "/Sup.TextRenderer.d.ts.txt", {encoding: "utf8"}),
  exposeActorComponent: { propertyName: "textRenderer", className: "Sup.TextRenderer" }
});
