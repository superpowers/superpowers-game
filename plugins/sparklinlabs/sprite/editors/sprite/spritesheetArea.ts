import ui from "./ui";
import { data } from "./network";

import SpriteRenderer from "../../components/SpriteRenderer";

let spritesheetArea: {
  gameInstance?: SupEngine.GameInstance;
  spriteRenderer?: SpriteRenderer;
} = {};
export default spritesheetArea;

spritesheetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.spritesheet-canvas"));
spritesheetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(5);
new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
  zoomSpeed: 1.5,
  zoomMin: 1,
  zoomMax: 60
});

let spriteActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Sprite");
spritesheetArea.spriteRenderer = new SpriteRenderer(spriteActor);

//spritesheetArea.image = new Image();
//spritesheetArea.ctx = (<HTMLCanvasElement>document.querySelector("canvas.spritesheet-canvas")).getContext("2d");

export function handleSpritesheetArea() {
  spritesheetArea.gameInstance.update();
  spritesheetArea.gameInstance.draw();
  /*
  if (spritesheetArea.image.width === 0) return;

  spritesheetArea.ctx.clearRect(0, 0, spritesheetArea.ctx.canvas.width, spritesheetArea.ctx.canvas.height);

  spritesheetArea.ctx.canvas.width = spritesheetArea.ctx.canvas.clientWidth;
  spritesheetArea.ctx.canvas.height = spritesheetArea.ctx.canvas.clientHeight;

  spritesheetArea.ctx.fillStyle = "#bbbbbb";
  spritesheetArea.ctx.fillRect(0, 0, spritesheetArea.ctx.canvas.width, spritesheetArea.ctx.canvas.height);

  spritesheetArea.ctx.save();
  let scaleRatio = Math.max(spritesheetArea.image.width / spritesheetArea.ctx.canvas.width, spritesheetArea.image.height / spritesheetArea.ctx.canvas.height);
  spritesheetArea.ctx.translate((spritesheetArea.ctx.canvas.width - spritesheetArea.image.width / scaleRatio) / 2, 0);
  spritesheetArea.ctx.scale(1 / scaleRatio, 1 / scaleRatio);

  //spritesheetArea.ctx.fillStyle = "#bbbbbb"
  //spritesheetArea.ctx.fillRect(0, 0, spritesheetArea.image.width, spritesheetArea.image.height);

  let patternCanvas = document.createElement("canvas");
  let size = Math.max(1, spritesheetArea.image.width / 50);
  patternCanvas.height = patternCanvas.width = size * 2;
  let patternCanvasCtx = <CanvasRenderingContext2D>patternCanvas.getContext("2d");
  patternCanvasCtx.fillStyle = "#888888";
  patternCanvasCtx.fillRect(0, 0, size, size);
  patternCanvasCtx.fillRect(size, size, size, size);
  patternCanvasCtx.fillStyle = "#FFFFFF";
  patternCanvasCtx.fillRect(size, 0, size, size);
  patternCanvasCtx.fillRect(0, size, size, size);

  let pattern = spritesheetArea.ctx.createPattern(patternCanvas, "repeat");
  spritesheetArea.ctx.rect(0, 0, spritesheetArea.image.width, spritesheetArea.image.height);
  spritesheetArea.ctx.fillStyle = pattern;
  spritesheetArea.ctx.fill();

  spritesheetArea.ctx.drawImage(spritesheetArea.image, 0, 0);

  if (ui.selectedAnimationId != null) {
    let asset = data.spriteUpdater.spriteAsset;

    let selectedAnimation = asset.animations.byId[ui.selectedAnimationId]
    let width = asset.pub.grid.width
    let height = asset.pub.grid.height

    let framesPerRow = Math.floor(spritesheetArea.image.width / width);
    spritesheetArea.ctx.strokeStyle = "#900090";
    spritesheetArea.ctx.setLineDash([10, 10]);
    spritesheetArea.ctx.lineWidth = 2;
    spritesheetArea.ctx.beginPath();
    for (let frameIndex = selectedAnimation.startFrameIndex; frameIndex <= selectedAnimation.endFrameIndex; frameIndex ++) {
      let frameX = frameIndex % framesPerRow;
      let frameY = Math.floor(frameIndex / framesPerRow);

      spritesheetArea.ctx.moveTo( frameX * width, frameY * height );
      spritesheetArea.ctx.lineTo( (frameX+1) * width - 1, frameY * height );
      spritesheetArea.ctx.lineTo( (frameX+1) * width - 1, (frameY+1) * height - 1 );
      spritesheetArea.ctx.lineTo( frameX * width, (frameY+1) * height - 1 );
      spritesheetArea.ctx.lineTo( frameX * width, frameY * height );
    }
    spritesheetArea.ctx.stroke();
  }

  spritesheetArea.ctx.restore();*/
}
