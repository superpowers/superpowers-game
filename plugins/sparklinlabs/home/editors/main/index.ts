require("./links");

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project };
let data: {room?: SupCore.data.Room;};
let ui: {chatHistoryContainer: HTMLDivElement; chatHistory: HTMLOListElement; roomUsers: HTMLUListElement;};
let socket: SocketIOClient.Socket;

let start = () => {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys()

  // Chat
  document.querySelector(".chat-input textarea").addEventListener("keydown", onChatInputKeyDown);

  ui = {
    chatHistoryContainer: <HTMLDivElement>document.querySelector(".chat"),
    chatHistory: <HTMLOListElement>document.querySelector(".chat ol"),

    roomUsers: <HTMLUListElement>document.querySelector(".members ul"),
  };
};

var onConnected = () => {
  data = {};
  // FIXME Add support in ProjectClient?
  socket.emit("sub", "rooms", "home", onRoomReceived);
  socket.on("edit:rooms", onRoomEdited);
};

var onRoomReceived = (err: string, room: any) => {
  data.room = new SupCore.data.Room(room);

  for (let roomUser of data.room.pub.users) appendRoomUser(roomUser);

  for (let entry of data.room.pub.history) appendHistoryEntry(entry);
  scrollToBottom();
};

let onRoomCommands: any = {};
var onRoomEdited = (id: string, command: string, ...args: any[]) => {
  (<any>data.room).__proto__[`client_${command}`].apply(data.room, args);
  if (onRoomCommands[command] != null) onRoomCommands[command].apply(data.room, args);
};

var scrollToBottom = () => {
  setTimeout( () => { ui.chatHistoryContainer.scrollTop = ui.chatHistoryContainer.scrollHeight; }, 0);
};

var appendDaySeparator = (date: Date) => {
  let separatorElt = document.createElement("li");
  separatorElt.className = "day-separator";

  separatorElt.appendChild(document.createElement("hr"));

  let dateDiv = document.createElement("div");
  separatorElt.appendChild(dateDiv);

  let dateInnerDiv = document.createElement("div");
  dateInnerDiv.textContent = date.toDateString();
  dateDiv.appendChild(dateInnerDiv);

  ui.chatHistory.appendChild(separatorElt);
};

let previousDay: string;
interface Entry {
  author: string;
  text: string;
  timestamp: number;
}

var appendHistoryEntry = (entry: Entry) => {
  let date = new Date(entry.timestamp);
  let day = date.toDateString();
  if (previousDay != day) {
    appendDaySeparator(date);
    previousDay = day;
  }

  let entryElt = document.createElement("li");

  let timestampSpan = document.createElement("span");
  timestampSpan.className = "timestamp";
  let time = `00${date.getHours()}`.slice(-2) + ":" + `00${date.getMinutes()}`.slice(-2);
  timestampSpan.textContent = time;
  entryElt.appendChild(timestampSpan);

  let authorSpan = document.createElement("span");
  authorSpan.className = "author";
  authorSpan.textContent = entry.author;
  entryElt.appendChild(authorSpan);

  let textSpan = document.createElement("span")
  textSpan.className = "text"
  textSpan.textContent = `: ${entry.text}`
  entryElt.appendChild(textSpan);

  ui.chatHistory.appendChild(entryElt);
};

onRoomCommands.appendMessage = (entry: Entry) => {
  if (window.parent != null) window.parent.postMessage({ type: "chat", content: `${entry.author}: ${entry.text}` }, (<any>window.location).origin);
  appendHistoryEntry(entry);
  scrollToBottom();
};

var appendRoomUser = (roomUser: {id: string, connectionCount: number;}) => {
  let roomUserElt = document.createElement("li");
  (<any>roomUserElt.dataset).userId = roomUser.id;
  roomUserElt.textContent = roomUser.id;
  ui.roomUsers.appendChild(roomUserElt);
};

onRoomCommands.join = (roomUser: {id: string, connectionCount: number;}) => {
  if (roomUser.connectionCount == 1) appendRoomUser(roomUser);
};

onRoomCommands.leave = (roomUserId: string) => {
  if (data.room.users.byId[roomUserId] == null) {
    let roomUserElt = <HTMLLIElement>ui.roomUsers.querySelector(`li[data-user-id=${roomUserId}]`);
    roomUserElt.parentElement.removeChild(roomUserElt);
  }
};

var onChatInputKeyDown = (event: any) => {
  if (event.keyCode != 13 || event.shiftKey) return;
  event.preventDefault();
  if (! socket.connected) return;

  socket.emit("edit:rooms", "home", "appendMessage", this.value, (err: string) => {
    if (err != null) alert(err);
  });

  this.value = "";
};

start();
