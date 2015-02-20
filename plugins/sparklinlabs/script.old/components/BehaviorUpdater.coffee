module.exports = class BehaviorUpdater

  constructor: (@client, @behavior, @config) ->

  onConfigEdited: (path, value) ->
