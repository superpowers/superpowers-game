import * as fs from "fs";

SupAPI.registerPlugin("typescript", "lib", {
  defs: fs.readFileSync(`${__dirname}/lib.d.ts.txt`, { encoding: "utf8" }),
  code: "",
});

SupAPI.registerPlugin("typescript", "Sup", {
  code: fs.readFileSync(`${__dirname}/Sup.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "Sup.Actor", {
  code: fs.readFileSync(`${__dirname}/Sup.Actor.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Actor.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "Sup.Math", {
  code: fs.readFileSync(`${__dirname}/Sup.Math.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Math.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "Sup.Input", {
  code: fs.readFileSync(`${__dirname}/Sup.Input.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Input.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "Sup.Storage", {
  code: fs.readFileSync(`${__dirname}/Sup.Storage.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Storage.d.ts.txt`, { encoding: "utf8" }),
});

SupAPI.registerPlugin("typescript", "Camera", {
  code: fs.readFileSync(`${__dirname}/Sup.Camera.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Camera.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "camera", className: "Sup.Camera" }
});
