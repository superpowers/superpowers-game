/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "EventEmitter", {
  code: null,
  defs: fs.readFileSync(`${__dirname}/EventEmitter.d.ts.txt`, { encoding: "utf8" })
});
