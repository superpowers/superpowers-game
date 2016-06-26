/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "socketio", {
  code: "",
  defs: fs.readFileSync(`${__dirname}/socket.io-client.d.ts.txt`, { encoding: "utf8" })
});
