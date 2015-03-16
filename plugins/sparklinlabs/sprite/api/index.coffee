fs = require 'fs'

SupAPI.addPlugin 'typescript', 'Sup.Sprite', {
  code: "module Sup { export class Sprite extends Asset {} }"
  defs: "declare module Sup { class Sprite extends Asset { dummySpriteMember; } }"
}

SupAPI.addPlugin 'typescript', 'SpriteRenderer', {
  code: fs.readFileSync(__dirname + '/SpriteRenderer.ts', encoding: 'utf8')
  defs: fs.readFileSync(__dirname + '/SpriteRenderer.d.ts', encoding: 'utf8')
  exposeActorComponent: { propertyName: "spriteRenderer", className: "Sup.SpriteRenderer" }
}
