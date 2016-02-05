// FIXME: import * cannon from "cannon";
/* tslint:disable */
const cannon: any = require("cannon");
/* tslint:enable */

import * as CannonBody from "./CannonBody";
(<any>window).CANNON = cannon;

(<any>SupEngine).Cannon = {
  World: new (<any>window).CANNON.World(),
  autoUpdate: true
};

SupEngine.registerEarlyUpdateFunction("Cannonjs", (gameInstance) => {
  if (!(<any>SupEngine).Cannon.autoUpdate) return;
  (<any>SupEngine).Cannon.World.step(1 / gameInstance.framesPerSecond);
});

SupRuntime.registerPlugin("CannonBody", CannonBody);
