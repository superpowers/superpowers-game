module.exports = class ModelAnimations extends SupCore.data.base.ListById

  @schema =
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
    duration: { type: 'number' } # seconds
    keyFrames:
      type: 'hash'
      keys: { minLength: 1, maxLength: 80 }
      values:
        type: 'hash'
        properties:
          translation:
            type: 'array?'
            items:
              type: 'hash'
              properties:
                time: { type: 'number', minValue: 0 }
                value: { type: 'array', items: { type: 'number', length: 3 } }
          rotation:
            type: 'array?'
            items:
              type: 'hash'
              properties:
                time: { type: 'number', minValue: 0 }
                value: { type: 'array', items: { type: 'number', length: 4 } }
          scale:
            type: 'array?'
            items:
              type: 'hash'
              properties:
                time: { type: 'number', minValue: 0 }
                value: { type: 'array', items: { type: 'number', length: 3 } }

  constructor: (pub) ->
    super pub, @constructor.schema
