/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "socketio", {
  defs: fs.readFileSync(`${__dirname}/../typings/socket.io-client/socket.io-client.d.ts`, { encoding: "utf8" }),
  code: "",
});
