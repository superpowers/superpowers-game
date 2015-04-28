import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Sup.Tween", {
  code: fs.readFileSync(`${__dirname}/Sup.Tween.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Tween.d.ts.txt`, { encoding: "utf8" })
});

SupAPI.registerPlugin("typescript", "TWEEN", {
  defs: fs.readFileSync(`${__dirname}/TWEEN.d.ts.txt`, { encoding: "utf8" }),
  code: ""
});
