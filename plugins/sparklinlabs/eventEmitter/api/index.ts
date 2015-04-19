import fs = require("fs");

SupAPI.registerPlugin("typescript", "EventEmitter", {
  code: null,
  defs: fs.readFileSync(__dirname + "/EventEmitter.d.ts.txt", { encoding: "utf8" })
});
