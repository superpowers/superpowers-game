fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Sup.Sound', {
  code: "module Sup { export class Sound extends Asset {} }"
  defs: "declare module Sup { class Sound extends Asset { dummySoundMember; } }"
}

SupAPI.addPlugin 'typescript', 'Sup.Audio', {
  code: fs.readFileSync(__dirname + '/Sup.Audio.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Sup.Audio.d.ts', encoding: 'utf8')
}

SupAPI.addPlugin 'typescript', 'Sup.Audio.SoundInstance', {
  code: fs.readFileSync(__dirname + '/SoundInstance.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/SoundInstance.d.ts', encoding: 'utf8')
}
