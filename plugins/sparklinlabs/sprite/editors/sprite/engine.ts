import spritesheetArea from "./spritesheetArea";
import animationArea, { handleAnimationArea } from "./animationArea";

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
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
