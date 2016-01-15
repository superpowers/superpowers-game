import mapArea, { handleMapArea } from "./mapArea";
import tileSetArea, { handleTileSetArea } from "./tileSetArea";

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
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
