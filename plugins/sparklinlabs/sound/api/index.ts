import fs = require("fs");

SupAPI.registerPlugin("typescript", "Sup.Sound", {
  code: "module Sup { export class Sound extends Asset {} }",
  defs: "declare module Sup { class Sound extends Asset { dummySoundMember; } }"
});

SupAPI.registerPlugin("typescript", "Sup.Audio", {
  code: fs.readFileSync(__dirname + "/Sup.Audio.ts.txt", { encoding: "utf8" }),
  defs: fs.readFileSync(__dirname + "/Sup.Audio.d.ts.txt", { encoding: "utf8" })
});

SupAPI.registerPlugin("typescript", "Sup.Audio.SoundInstance", {
  code: fs.readFileSync(__dirname + "/Sup.Audio.SoundInstance.ts.txt", { encoding: "utf8" }),
  defs: fs.readFileSync(__dirname + "/Sup.Audio.SoundInstance.d.ts.txt", { encoding: "utf8" })
});
