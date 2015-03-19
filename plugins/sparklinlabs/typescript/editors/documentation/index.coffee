async = require 'async'

async.each SupClient.pluginPaths.all, (pluginName, pluginCallback) ->
  async.series [
    (cb) ->
      apiScript = document.createElement('script')
      apiScript.src = "/plugins/#{pluginName}/api.js"
      apiScript.addEventListener 'load', -> cb()
      apiScript.addEventListener 'error', -> cb()
      document.body.appendChild apiScript

  ], pluginCallback
, (err) ->

  navListElt = document.querySelector('nav ul')
  mainElt = document.querySelector('main')

  allDefs = {}

  actorComponentAccessors = []
  for pluginName, plugin of SupAPI.contexts["typescript"].plugins
    name = pluginName

    if plugin.exposeActorComponent?
      name = plugin.exposeActorComponent.className
      actorComponentAccessors.push "#{plugin.exposeActorComponent.propertyName}: #{plugin.exposeActorComponent.className};"

    allDefs[name] = plugin.defs if plugin.defs?

  allDefs["Sup.Actor"] = allDefs["Sup.Actor"].replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join('\n    ')

  sortedDefNames = Object.keys(allDefs)
  sortedDefNames.sort (a, b) -> if a.toLowerCase() < b.toLowerCase() then -1 else 1
  sortedDefNames.unshift sortedDefNames.splice(sortedDefNames.indexOf('lib'), 1)[0]

  for name in sortedDefNames
    defs = allDefs[name]
    if name == 'lib' then name = 'Built-ins'

    liElt = document.createElement('li')
    anchorElt = document.createElement('a')
    anchorElt.href = "##{name}"
    anchorElt.textContent = name
    liElt.appendChild anchorElt
    navListElt.appendChild liElt

    sectionElt = document.createElement('section')
    sectionElt.id = "doc-#{name}"
    mainElt.appendChild sectionElt

    headerElt = document.createElement('header')
    headerElt.textContent = name
    sectionElt.appendChild headerElt

    preElt = document.createElement('pre')
    preElt.textContent = defs
    sectionElt.appendChild preElt

  navListElt.addEventListener 'click', (event) ->
    return if event.target.tagName != 'A'

    navListElt.querySelector('li a.active').classList.remove 'active'
    mainElt.querySelector('section.active').classList.remove 'active'
    event.target.classList.add 'active'
    document.getElementById("doc-#{event.target.textContent}").classList.add 'active'
    return

  navListElt.querySelector('li a').classList.add 'active'
  mainElt.querySelector('section').classList.add 'active'

