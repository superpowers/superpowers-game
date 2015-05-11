import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Sup.Font", {
  code: fs.readFileSync(`${__dirname}/Sup.Font.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Font.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "TextRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.TextRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TextRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "textRenderer", className: "Sup.TextRenderer" }
});
