import * as fs from "fs";

SupAPI.registerPlugin("typescript", "rng", {
  defs: fs.readFileSync(`${__dirname}/rng.d.ts.txt`, { encoding: "utf8" }),
  code: ""
});
