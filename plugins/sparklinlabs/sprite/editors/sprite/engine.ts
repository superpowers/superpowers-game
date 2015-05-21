import { handleSpritesheetArea } from "./spritesheetArea";
import { handleAnimationArea } from "./animationArea";

function draw() {
  requestAnimationFrame(draw);

  handleSpritesheetArea();
  handleAnimationArea();
}

requestAnimationFrame(draw);
