// FIXME: import * p2 from "p2";
/* tslint:disable */
const p2 = require("p2");
/* tslint:enable */

(<any>window).p2 = p2;

namespace P2 {
  "use strict";

  export const world = new p2.World();
  export const autoUpdate = true;
};
(<any>SupEngine).P2 = P2;

SupEngine.registerEarlyUpdateFunction("P2js", (gameInstance) => {
  if (!P2.autoUpdate) return;
  P2.world.step(1 / gameInstance.framesPerSecond);
});

import * as P2Body from "./P2Body";
SupRuntime.registerPlugin("P2Body", P2Body);
