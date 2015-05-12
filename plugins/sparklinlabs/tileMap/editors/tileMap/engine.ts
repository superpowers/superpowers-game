import mapArea, { handleMapArea } from "./mapArea";
import tileSetArea, { handleTileSetArea } from "./tileSetArea";

function draw() {
  requestAnimationFrame(draw);

  mapArea.gameInstance.update();
  handleMapArea();
  mapArea.gameInstance.draw();

  tileSetArea.gameInstance.update();
  handleTileSetArea();
  tileSetArea.gameInstance.draw();
}
requestAnimationFrame(draw);
