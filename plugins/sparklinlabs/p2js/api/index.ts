import * as fs from "fs";

SupCore.system.api.registerPlugin("typescript", "p2", {
  code: "",
  defs: fs.readFileSync(`${__dirname}/p2.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.api.registerPlugin("typescript", "P2Body", {
  code: fs.readFileSync(`${__dirname}/Sup.P2.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.P2.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "p2Body", className: "Sup.P2.Body" }
});
