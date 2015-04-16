qs = require("querystring").parse(window.location.search.slice(1))
info = { projectId: qs.project, assetId: qs.asset }
data = null
ui = {}
socket = null

start = =>
  socket = SupClient.connect(info.projectId)
  socket.on("connect", onConnected)
  socket.on("disconnect", SupClient.onDisconnected)
  SupClient.setupHotkeys()

  ui["pixelsPerUnit"] = document.querySelector("input.pixelsPerUnit");
  ui["pixelsPerUnit"].addEventListener "change", (event) =>
    socket.emit "edit:resources", "tileMapSettings", "setProperty", "pixelsPerUnit", parseInt(event.target.value), (err) =>
      if err != null then alert(err)
      return
    return
  ui["width"] = document.querySelector("input.width");
  ui["width"].addEventListener "change", (event) =>
    socket.emit "edit:resources", "tileMapSettings", "setProperty", "width", parseInt(event.target.value), (err) =>
      if err != null then alert(err)
      return
    return
  ui["height"] = document.querySelector("input.height");
  ui["height"].addEventListener "change", (event) =>
    socket.emit "edit:resources", "tileMapSettings", "setProperty", "height", parseInt(event.target.value), (err) =>
      if err != null then alert(err)
      return
    return
  ui["layerDepthOffset"] = document.querySelector("input.layerDepthOffset");
  ui["layerDepthOffset"].addEventListener "change", (event) =>
    socket.emit "edit:resources", "tileMapSettings", "setProperty", "layerDepthOffset", parseFloat(event.target.value), (err) =>
      if err != null then alert(err)
      return
    return
  ui["gridSize"] = document.querySelector("input.gridSize");
  ui["gridSize"].addEventListener "change", (event) =>
    socket.emit "edit:resources", "tileMapSettings", "setProperty", "gridSize", parseInt(event.target.value), (err) =>
      if err != null then alert(err)
      return
    return

# Network callbacks
onConnected = =>
  data = {}
  data.projectClient = new SupClient.ProjectClient(socket)
  data.projectClient.subResource("tileMapSettings", resourceSubscriver)
  return

resourceSubscriver = {
  onResourceReceived: (resourceId, resource) =>
    data.resource = resource
    ui["#{setting}"].value = resource.pub[setting] for setting of resource.pub
    return

  onResourceEdited: (resourceId, command, propertyName) =>
    ui["#{propertyName}"].value = data.resource.pub[propertyName]
    return
}

start()
