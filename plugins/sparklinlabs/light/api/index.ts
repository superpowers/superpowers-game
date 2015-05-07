import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Light", {
  code: fs.readFileSync(`${__dirname}/Sup.Light.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Light.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "light", className: "Sup.Light" }
});
