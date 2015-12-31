/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "socketio", {
  defs: fs.readFileSync(`${__dirname}/../typings/socket.io-client/socket.io-client.d.ts`, { encoding: "utf8" }),
  code: "",
});
