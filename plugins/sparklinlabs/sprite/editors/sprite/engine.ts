import { handleSpritesheetArea } from "./spritesheetArea";
import { handleAnimationArea } from "./animationArea";

function tick(timestamp=0) {
  requestAnimationFrame(tick);

  handleSpritesheetArea(timestamp);
  handleAnimationArea(timestamp);
}

requestAnimationFrame(tick);
