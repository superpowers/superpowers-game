import * as fs from "fs";

SupCore.system.api.registerPlugin("typescript", "Sup.Font", {
  code: fs.readFileSync(`${__dirname}/Sup.Font.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Font.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.api.registerPlugin("typescript", "TextRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.TextRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TextRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "textRenderer", className: "Sup.TextRenderer" }
});
