import mapArea, { handleMapArea } from "./mapArea";
import tileSetArea, { handleTileSetArea } from "./tileSetArea";

let isTabActive = true;
let animationFrame: number;

window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";
    onChangeActive();
  }
});

function onChangeActive() {
  const stopRendering = !isTabActive;

  if (stopRendering) {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else if (animationFrame == null) {
    animationFrame = requestAnimationFrame(tick);
  }
}

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = mapArea.gameInstance.tick(accumulatedTime, handleMapArea);
  accumulatedTime = timeLeft;

  if (updates > 0) {
    for (let i = 0; i < updates; i++) {
      tileSetArea.gameInstance.update();
      handleTileSetArea();
    }

    mapArea.gameInstance.draw();
    tileSetArea.gameInstance.draw();
  }
  animationFrame = requestAnimationFrame(tick);
}
animationFrame = requestAnimationFrame(tick);
