/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "EventEmitter", {
  code: null,
  defs: fs.readFileSync(`${__dirname}/EventEmitter.d.ts.txt`, { encoding: "utf8" })
});
