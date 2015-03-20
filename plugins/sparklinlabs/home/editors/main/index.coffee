require './links'

qs = require('querystring').parse window.location.search.slice(1)
info = { projectId: qs.project }
data = null
ui = {}
socket = null

start = ->
  socket = SupClient.connect info.projectId
  socket.on 'connect', onConnected
  socket.on 'disconnect', SupClient.onDisconnected
  socket.on 'edit:rooms', onRoomEdited
  SupClient.setupHotkeys()

  # Chat
  document.querySelector('.chat-input textarea').addEventListener 'keydown', onChatInputKeyDown

  ui.chatHistoryContainer = document.querySelector('.chat')
  ui.chatHistory = document.querySelector('.chat ol')

  ui.roomUsers = document.querySelector('.members ul')
  return

onConnected = ->
  data = {}
  # TODO: Subscribe to home chat and get latest messages
  socket.emit 'sub', 'rooms', 'home', onRoomReceived

onRoomReceived = (err, room) ->
  data.room = new SupCore.data.Room room

  appendRoomUser roomUser for roomUser in data.room.pub.users

  appendHistoryEntry entry for entry in data.room.pub.history
  scrollToBottom()
  return

onRoomEdited = (id, command, args...) ->
  data.room.__proto__["client_#{command}"].apply data.room, args
  onRoomCommands[command]?.apply data.room, args
  return

scrollToBottom = ->
  setTimeout ( -> ui.chatHistoryContainer.scrollTop = ui.chatHistoryContainer.scrollHeight ), 0
  return

onRoomCommands = {}

appendDaySeparator = (date) ->
  separatorElt = document.createElement('li')
  separatorElt.className = 'day-separator'

  separatorElt.appendChild document.createElement('hr')

  dateDiv = document.createElement('div')
  separatorElt.appendChild dateDiv

  dateInnerDiv = document.createElement('div')
  dateInnerDiv.textContent = date.toDateString()
  dateDiv.appendChild dateInnerDiv

  ui.chatHistory.appendChild separatorElt
  return

previousDay = null
appendHistoryEntry = (entry) ->
  date = new Date(entry.timestamp)
  day = date.toDateString()
  if previousDay != day
    appendDaySeparator date
    previousDay = day

  entryElt = document.createElement('li')

  timestampSpan = document.createElement('span')
  timestampSpan.className = 'timestamp'
  time = "00#{date.getHours()}".slice(-2) + ":" + "00#{date.getMinutes()}".slice(-2)
  timestampSpan.textContent = time
  entryElt.appendChild timestampSpan

  authorSpan = document.createElement('span')
  authorSpan.className = 'author'
  authorSpan.textContent = entry.author
  entryElt.appendChild authorSpan

  textSpan = document.createElement('span')
  textSpan.className = 'text'
  textSpan.textContent = ": #{entry.text}"
  entryElt.appendChild textSpan

  ui.chatHistory.appendChild entryElt
  return

onRoomCommands.appendMessage = (entry) ->
  window.parent?.postMessage { type: "chat", content: "#{entry.author}: #{entry.text}" }, window.location.origin
  appendHistoryEntry entry
  scrollToBottom(); return

appendRoomUser = (roomUser) ->
  roomUserElt = document.createElement('li')
  roomUserElt.dataset.userId = roomUser.id
  roomUserElt.textContent = roomUser.id
  ui.roomUsers.appendChild roomUserElt
  return

onRoomCommands.join = (roomUser) ->
  if roomUser.connectionCount == 1 then appendRoomUser roomUser
  return

onRoomCommands.leave = (roomUserId) ->
  if ! data.room.users.byId[roomUserId]?
    roomUserElt = ui.roomUsers.querySelector("li[data-user-id=#{roomUserId}]")
    roomUserElt.parentElement.removeChild roomUserElt
  return

onChatInputKeyDown = (event) ->
  return if event.keyCode != 13 or event.shiftKey
  event.preventDefault()
  return if ! socket.connected

  socket.emit 'edit:rooms', 'home', 'appendMessage', this.value, (err) =>
    if err? then alert err
    return

  this.value = ''
  return

start()
