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

  actorComponentAccessors = ""
  for pluginName, plugin of SupAPI.contexts["typescript"].plugins
    allDefs[pluginName] = plugin.defs if plugin.defs?
    if plugin.exposeActorComponent?
      actorComponentAccessors += "#{plugin.exposeActorComponent.propertyName}: #{plugin.exposeActorComponent.className}; "

  allDefs["Sup"] = allDefs["Sup"].replace "// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors

  for name, defs of allDefs
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

