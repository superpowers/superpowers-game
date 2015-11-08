import * as fs from "fs";

SupCore.system.api.registerPlugin("typescript", "EventEmitter", {
  code: null,
  defs: fs.readFileSync(__dirname + "/EventEmitter.d.ts.txt", { encoding: "utf8" })
});
