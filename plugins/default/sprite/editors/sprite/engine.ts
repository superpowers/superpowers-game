import spritesheetArea from "./spritesheetArea";
import animationArea, { handleAnimationArea } from "./animationArea";

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
  let { updates, timeLeft } = spritesheetArea.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) {
    for (let i = 0; i < updates; i++) {
      animationArea.gameInstance.update();
      handleAnimationArea();
    }

    spritesheetArea.gameInstance.draw();
    animationArea.gameInstance.draw();
  }
  animationFrame = requestAnimationFrame(tick);
}
animationFrame = requestAnimationFrame(tick);
