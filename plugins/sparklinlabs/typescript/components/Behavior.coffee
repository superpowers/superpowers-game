module.exports = class Behavior extends SupEngine.ActorComponent

  constructor: (actor, @funcs) ->
    super actor, 'Behavior'

  awake: -> @funcs.awake?(); return
  start: -> @funcs.start?(); return
  update: -> @funcs.update?(); return

  _destroy: ->
    @funcs.destroy?()
    @funcs = null
    super()
    return
