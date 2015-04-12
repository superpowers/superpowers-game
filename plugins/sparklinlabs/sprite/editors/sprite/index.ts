import SpriteRenderer = require("../../components/SpriteRenderer");
import SpriteRendererUpdater = require("../../components/SpriteRendererUpdater");

var TreeView = require("dnd-tree-view");

import SpriteOriginMarker = require("./SpriteOriginMarker");

var qs = require("querystring").parse(window.location.search.slice(1));
var info = { projectId: qs.project, assetId: qs.asset };
var data: {projectClient?: SupClient.ProjectClient; spriteUpdater?: SpriteRendererUpdater};
var ui: any = {};
var socket: SocketIOClient.Socket;

var start = () => {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  // Drawing
  ui.image = new Image();

  ui.spritesheetCanvasCtx = (<HTMLCanvasElement>document.querySelector("canvas.spritesheet-canvas")).getContext("2d");

  ui.animationArea = {};
  ui.animationArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.animation-canvas"));
  ui.animationArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
  ui.animationArea.gameInstance.update();
  ui.animationArea.gameInstance.draw();

  var cameraActor = new SupEngine.Actor(ui.animationArea.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
  var cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  cameraComponent.setOrthographicMode(true);
  cameraComponent.setOrthographicScale(5);
  ui.animationArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
    zoomSpeed: 1.5,
    zoomMin: 1,
    zoomMax: 60
  });

  var originActor = new SupEngine.Actor(ui.animationArea.gameInstance, "Origin");
  ui.originMakerComponent = new SpriteOriginMarker(originActor);

  ui.animationArea.animationPlay = document.querySelector("button.animation-play");
  ui.animationArea.animationPlay.addEventListener("click", onPlayAnimation);

  ui.animationArea.animationSlider = document.querySelector("input.animation-slider");
  ui.animationArea.animationSlider.addEventListener("input", onChangeAnimationTime);

  // Sidebar
  var fileSelect = <HTMLSelectElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  document.querySelector("button.download").addEventListener("click", onDownloadSpritesheet);

  ui.allSettings = ["filtering", "pixelsPerUnit", "framesPerSecond", "alphaTest", "grid.width", "grid.height", "origin.x", "origin.y"]
  ui.settings = {};
  ui.allSettings.forEach((setting: string) => {
    var parts = setting.split(".");

    var obj = ui.settings;
    var queryName = ".property-";

    parts.slice(0, parts.length - 1).forEach((part) => {
      if (obj[part] == null) obj[part] = {};
      obj = obj[part];
      queryName += `${part}-`;
    });

    queryName += parts[parts.length - 1];
    var settingObj = obj[parts[parts.length - 1]] = document.querySelector(queryName);

    var setupSetting = (setting: string) => {
      if (setting === "filtering") {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, event.target.value, (err: string) => { if (err != null) alert(err); });
        });
      }
      else if (setting.indexOf("origin") !== -1) {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, event.target.value / 100, (err: string) => { if (err != null) alert(err); });
        });
      }
      else if (setting === "alphaTest") {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, parseFloat(event.target.value), (err: string) => { if (err != null) alert(err); });
        });
      }
      else {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
        });
      }
    }
    setupSetting(setting);
  });
  document.querySelector("button.set-grid-width").addEventListener("click", onSetGridWidth);
  document.querySelector("button.set-grid-height").addEventListener("click", onSetGridHeight);

  // Animations
  ui.animationsTreeView = new TreeView(document.querySelector(".animations-tree-view"), onAnimationDrop);
  ui.animationsTreeView.on("selectionChange", updateSelectedAnimation);

  document.querySelector("button.new-animation").addEventListener("click", onNewAnimationClick);
  document.querySelector("button.rename-animation").addEventListener("click", onRenameAnimationClick);
  document.querySelector("button.delete-animation").addEventListener("click", onDeleteAnimationClick);

  requestAnimationFrame(draw);
}

// Network callbacks
var onEditCommands: any =  {};
var onConnected = () => {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  var spriteActor = new SupEngine.Actor(ui.animationArea.gameInstance, "Sprite");
  var spriteRenderer = new SpriteRenderer(spriteActor);
  var config = { spriteAssetId: info.assetId };
  var receiveCallbacks = { sprite: onAssetReceived };
  var editCallbacks = { sprite: onEditCommands };

  data.spriteUpdater = new SpriteRendererUpdater(data.projectClient, spriteRenderer, config, receiveCallbacks, editCallbacks)
}

var onAssetReceived = (url: string) => {
  ui.image.src = url;

  ui.allSettings.forEach((setting: string) => {
    var parts = setting.split(".");
    var obj = data.spriteUpdater.spriteAsset.pub
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    setupProperty(setting, obj[parts[parts.length - 1]]);
  })

  data.spriteUpdater.spriteAsset.pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  })
}

onEditCommands.upload = (url: string) => {
  ui.image.src = url;
}

onEditCommands.setProperty = (path: string, value: any) => {
  setupProperty(path, value);
}

onEditCommands.newAnimation = (animation: any, index: number) => {
  setupAnimation(animation, index);
}

onEditCommands.deleteAnimation = (id: string) => {
  var animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.remove(animationElt);

  if (ui.selectedAnimationId === id) updateSelectedAnimation();
}

onEditCommands.moveAnimation = (id: string, index: number) => {
  var animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.insertAt(animationElt, "item", index);
}

onEditCommands.setAnimationProperty = (id: string, key: string, value: any) => {
  var animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name": { animationElt.querySelector(".name").textContent = value; break; }
    case "startFrameIndex": { animationElt.querySelector(".start-frame-index").value = value; break; }
    case "endFrameIndex": { animationElt.querySelector(".end-frame-index").value = value; break }
  }
}

// User interface
var onFileSelectChange = (event: any) => {
  if (event.target.files.length === 0) return;

  var reader = new FileReader();
  reader.onload = (event: any) => {
    socket.emit("edit:assets", info.assetId, "upload", event.target.result, (err: string) => {
      if (err != null) alert(err);
    });
  };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

var onDownloadSpritesheet = (event: any) => {
  SupClient.dialogs.prompt("Enter a name for the image.", null, "Image", "Download", (name) => {
    if (name == null) return;

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = data.spriteUpdater.url;

    (<any>a).download = name + ".png";
    a.click();
    document.body.removeChild(a);
  });
}

var onSetGridWidth = (event: any) => {
  if (ui.image.src === "") return;

  SupClient.dialogs.prompt("How many frames per row?", null, "1", "Set grid width", (framesPerRow) => {
    if (framesPerRow == null) return;

    var framesPerRowNum = parseInt(framesPerRow);
    if (isNaN(framesPerRowNum)) return;

    socket.emit("edit:assets", info.assetId, "setProperty", "grid.width", Math.floor(ui.image.width / framesPerRowNum), (err: string) => {
      if (err != null) alert(err);
    });
  });
}

var onSetGridHeight = (event: any) => {
  if (ui.image.src === "") return;

  SupClient.dialogs.prompt("How many frames per column?", null, "1", "Set grid height", (framesPerColumn) => {
    if (framesPerColumn == null) return;

    var framesPerColumnNum = parseInt(framesPerColumn);
    if (isNaN(framesPerColumnNum)) return;

    socket.emit("edit:assets", info.assetId, "setProperty", "grid.height", Math.floor(ui.image.height / framesPerColumnNum), (err: string) => {
      if (err != null) alert(err);
    });
  });
}

var onNewAnimationClick = () => {
  SupClient.dialogs.prompt("Enter a name for the animation.", null, "Animation", "Create", (name) => {
    if (name == null) return;

    socket.emit("edit:assets", info.assetId, "newAnimation", name, (err: string, animationId: string) => {
      if (err != null) { alert(err); return; }

      ui.animationsTreeView.clearSelection();
      ui.animationsTreeView.addToSelection(ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${animationId}']`));
      updateSelectedAnimation();
    });
  });
}

var onRenameAnimationClick = () => {
  if (ui.animationsTreeView.selectedNodes.length !== 1) return;

  var selectedNode = ui.animationsTreeView.selectedNodes[0];
  var animation = data.spriteUpdater.spriteAsset.animations.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the animation.", null, animation.name, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "name", newName, (err: string) => {
      if (err != null) alert(err);
    });
  });
}

var onDeleteAnimationClick = () => {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected animations?", "Delete", (confirm) => {
    if (! confirm) return;

    ui.animationsTreeView.selectedNodes.forEach((selectedNode: any) => {
      socket.emit("edit:assets", info.assetId, "deleteAnimation", selectedNode.dataset.id, (err: string) => {
        if (err != null) alert(err);
      });
    });
  });
}

var onAnimationDrop = (dropInfo: any, orderedNodes: any) => {
  var animationIds: number[] = [];
  orderedNodes.forEach((animation: any) => { animationIds.push(animation.dataset.id); });

  var index = SupClient.getListViewDropIndex(dropInfo, data.spriteUpdater.spriteAsset.animations);

  animationIds.forEach((id, i) => {
    socket.emit("edit:assets", info.assetId, "moveAnimation", id, index + i, (err: string) => {
      if (err != null) alert(err);
    });
  })
  return false;
}

var updateSelectedAnimation = () => {
  var selectedAnimElt = ui.animationsTreeView.selectedNodes[0];
  if (selectedAnimElt != null) {
    ui.selectedAnimationId = selectedAnimElt.dataset.id;
    data.spriteUpdater.config_setProperty("animationId", ui.selectedAnimationId);
    ui.animationArea.animationPlay.disabled = false;
    ui.animationArea.animationSlider.disabled = false;
  }
  else {
    ui.selectedAnimationId = null
    data.spriteUpdater.config_setProperty("animationId", null);
    ui.animationArea.animationPlay.disabled = true;
    ui.animationArea.animationSlider.disabled = true;
    ui.animationArea.animationSlider.value = 0;
  }

  ui.animationArea.animationPlay.textContent = "Pause";

  var buttons = document.querySelectorAll(".animations-buttons button");
  for (var index = 0; index < buttons.length; index ++) {
    var button: any = buttons.item(index)
    button.disabled = ui.selectedAnimationId == null && button.className != "new-animation"
  }
}

var onPlayAnimation = () => {
  if (ui.animationArea.animationPlay.textContent === "Pause") {
    data.spriteUpdater.spriteRenderer.pauseAnimation();
    ui.animationArea.animationPlay.textContent = "Play";
  }
  else {
    data.spriteUpdater.spriteRenderer.playAnimation();
    ui.animationArea.animationPlay.textContent = "Pause";
  }
}

var onChangeAnimationTime = () => {
  if (data.spriteUpdater == null) return;
  var animationTime = ui.animationArea.animationSlider.value / 100 * data.spriteUpdater.spriteRenderer.getAnimationDuration();
  data.spriteUpdater.spriteRenderer.setAnimationTime(animationTime);
}

var setupProperty = (path: string, value: any) => {
  var parts = path.split(".");

  var obj = ui.settings;
  parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
  if (path.indexOf("origin") !== -1) value *= 100;
  obj[parts[parts.length - 1]].value = value;

  if (path === "pixelsPerUnit") {
    ui.animationArea.cameraControls.setMultiplier(value);
    ui.originMakerComponent.setScale(100 / value);
  }
}

var setupAnimation = (animation: any, index: number) => {
  var liElt = document.createElement("li");
  (<any>liElt.dataset).id = animation.id;

  var nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = animation.name;
  liElt.appendChild(nameSpan);

  var startFrameIndexInput = document.createElement("input");
  startFrameIndexInput.type = "number";
  startFrameIndexInput.className = "start-frame-index";
  startFrameIndexInput.value = animation.startFrameIndex;
  liElt.appendChild(startFrameIndexInput);

  startFrameIndexInput.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "startFrameIndex", parseInt(event.target.value), (err: string) => {
      if (err != null) alert(err);
    });
  });

  var endFrameIndexInput = document.createElement("input")
  endFrameIndexInput.type = "number"
  endFrameIndexInput.className = "end-frame-index"
  endFrameIndexInput.value = animation.endFrameIndex
  liElt.appendChild(endFrameIndexInput);

  endFrameIndexInput.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "endFrameIndex", parseInt(event.target.value), (err: string) => {
      if (err != null) alert(err);
    });
  });

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

// Drawing
var draw = () => {
  requestAnimationFrame(draw);

  if (ui.image.width !== 0) drawSpritesheet();
  drawCurrentAnimation();
}

var drawSpritesheet = () => {
  ui.spritesheetCanvasCtx.clearRect(0, 0, ui.spritesheetCanvasCtx.canvas.width, ui.spritesheetCanvasCtx.canvas.height);

  ui.spritesheetCanvasCtx.canvas.width = ui.spritesheetCanvasCtx.canvas.clientWidth;
  ui.spritesheetCanvasCtx.canvas.height = ui.spritesheetCanvasCtx.canvas.clientHeight;

  ui.spritesheetCanvasCtx.fillStyle = "#bbbbbb";
  ui.spritesheetCanvasCtx.fillRect(0, 0, ui.spritesheetCanvasCtx.canvas.width, ui.spritesheetCanvasCtx.canvas.height);

  ui.spritesheetCanvasCtx.save();
  var scaleRatio = Math.max(ui.image.width / ui.spritesheetCanvasCtx.canvas.width, ui.image.height / ui.spritesheetCanvasCtx.canvas.height);
  ui.spritesheetCanvasCtx.translate((ui.spritesheetCanvasCtx.canvas.width - ui.image.width / scaleRatio) / 2, 0);
  ui.spritesheetCanvasCtx.scale(1 / scaleRatio, 1 / scaleRatio);

  //ui.spritesheetCanvasCtx.fillStyle = "#bbbbbb"
  //ui.spritesheetCanvasCtx.fillRect(0, 0, ui.image.width, ui.image.height);

  var patternCanvas = document.createElement("canvas");
  var size = Math.max(1, ui.image.width / 50);
  patternCanvas.height = patternCanvas.width = size * 2;
  var patternCanvasCtx = patternCanvas.getContext("2d");
  patternCanvasCtx.fillStyle = "#888888";
  patternCanvasCtx.fillRect(0, 0, size, size);
  patternCanvasCtx.fillRect(size, size, size, size);
  patternCanvasCtx.fillStyle = "#FFFFFF";
  patternCanvasCtx.fillRect(size, 0, size, size);
  patternCanvasCtx.fillRect(0, size, size, size);

  var pattern = ui.spritesheetCanvasCtx.createPattern(patternCanvas, "repeat");
  ui.spritesheetCanvasCtx.rect(0, 0, ui.image.width, ui.image.height);
  ui.spritesheetCanvasCtx.fillStyle = pattern;
  ui.spritesheetCanvasCtx.fill();

  ui.spritesheetCanvasCtx.drawImage(ui.image, 0, 0);

  if (ui.selectedAnimationId != null) {
    var asset = data.spriteUpdater.spriteAsset;

    var selectedAnimation = asset.animations.byId[ui.selectedAnimationId]
    var width = asset.pub.grid.width
    var height = asset.pub.grid.height

    var framesPerRow = Math.floor(ui.image.width / width);
    ui.spritesheetCanvasCtx.strokeStyle = "#900090";
    ui.spritesheetCanvasCtx.setLineDash([10, 10]);
    ui.spritesheetCanvasCtx.lineWidth = 2;
    ui.spritesheetCanvasCtx.beginPath();
    for (var frameIndex = selectedAnimation.startFrameIndex; frameIndex <= selectedAnimation.endFrameIndex; frameIndex ++) {
      var frameX = frameIndex % framesPerRow;
      var frameY = Math.floor(frameIndex / framesPerRow);

      ui.spritesheetCanvasCtx.moveTo( frameX * width, frameY * height );
      ui.spritesheetCanvasCtx.lineTo( (frameX+1) * width - 1, frameY * height );
      ui.spritesheetCanvasCtx.lineTo( (frameX+1) * width - 1, (frameY+1) * height - 1 );
      ui.spritesheetCanvasCtx.lineTo( frameX * width, (frameY+1) * height - 1 );
      ui.spritesheetCanvasCtx.lineTo( frameX * width, frameY * height );
    }
    ui.spritesheetCanvasCtx.stroke();
  }

  ui.spritesheetCanvasCtx.restore();
}

var drawCurrentAnimation = () => {
  ui.animationArea.gameInstance.update();
  ui.animationArea.gameInstance.draw();

  if (data != null && ui.selectedAnimationId != null) {
    var animationTime = data.spriteUpdater.spriteRenderer.getAnimationTime() / data.spriteUpdater.spriteRenderer.getAnimationDuration();
    ui.animationArea.animationSlider.value = animationTime * 100;
  }
}

// Start
start()
