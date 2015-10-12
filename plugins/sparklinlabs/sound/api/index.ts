import * as fs from "fs";

SupAPI.registerPlugin("typescript", "Sup.Sound", {
  code: "namespace Sup { export class Sound extends Asset {} }",
  defs: "declare namespace Sup { class Sound extends Asset { dummySoundMember; } }"
});

SupAPI.registerPlugin("typescript", "Sup.Audio", {
  code: fs.readFileSync(`${__dirname}/Sup.Audio.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Audio.d.ts.txt`, { encoding: "utf8" })
});

SupAPI.registerPlugin("typescript", "Sup.Audio.SoundPlayer", {
  code: fs.readFileSync(`${__dirname}/Sup.Audio.SoundPlayer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Audio.SoundPlayer.d.ts.txt`, { encoding: "utf8" })
});
