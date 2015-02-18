module.exports = class ActorTree

  constructor: ->
    @root = []

  _walkRecurseTopDown: (node, parentNode, callback) =>
    callback node, parentNode
    @_walkRecurseTopDown child, node, callback for child in node.children
    return

  walkTopDown: (callback) ->
    @_walkRecurseTopDown node, null, callback for node in @root
    return

  walkDown: (rootNode, callback) ->
    @_walkRecurseTopDown node, rootNode, callback for node in rootNode.children
    return

  ###
  _walkRecurseBottomUp: (node, parentNode, callback) =>
    @_walkRecurseBottomUp child, node, callback for child in node.children
    callback node, parentNode
    return

  walkBottomUp: (callback) ->
    @_walkRecurseBottomUp node, null, callback for node in @root
    return
  ###
