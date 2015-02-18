module.exports = class SpriteAnimations extends SupCore.api.base.ListById

  @schema =
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
    startFrameIndex: { type: 'number', min: 0, mutable: true }
    endFrameIndex: { type: 'number', min: 0, mutable: true }

  constructor: (pub) ->
    super pub, @constructor.schema
