import mapArea, { handleMapArea } from "./mapArea";
import tileSetArea, { handleTileSetArea } from "./tileSetArea";

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = mapArea.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) {
    handleMapArea();
    mapArea.gameInstance.draw();

    for (let i = 0; i < updates; i++) tileSetArea.gameInstance.update();
    handleTileSetArea();
    tileSetArea.gameInstance.draw();
  }
}
requestAnimationFrame(tick);
