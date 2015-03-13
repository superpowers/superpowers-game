if window.nwDispatcher?
  gui = window.nwDispatcher.requireNwGui()

  document.querySelector('.sidebar .links').addEventListener 'click', (event) ->
    return if event.target.tagName != 'A'

    event.preventDefault()
    gui.Shell.openExternal event.target.href
    return
