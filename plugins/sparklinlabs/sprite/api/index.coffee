fs = require 'fs'

SupAPI.registerPlugin 'typescript', 'Sup.Sprite', {
  code: "module Sup { export class Sprite extends Asset {} }"
  defs: "declare module Sup { class Sprite extends Asset { dummySpriteMember; } }"
}

SupAPI.registerPlugin 'typescript', 'SpriteRenderer', {
  code: fs.readFileSync(__dirname + '/Sup.SpriteRenderer.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/Sup.SpriteRenderer.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "spriteRenderer", className: "Sup.SpriteRenderer" }
}
