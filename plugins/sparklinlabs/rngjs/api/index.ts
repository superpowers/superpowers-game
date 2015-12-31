/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "rng", {
  defs: fs.readFileSync(`${__dirname}/rng.d.ts.txt`, { encoding: "utf8" }),
  code: ""
});
