//FIX ME
//import  cannon from "cannon"


let cannon:any = require("cannon");

import * as CannonBody from "./CannonBody";
(<any>window).CANNON = cannon;

(<any>SupEngine).Cannon = {
  World: new (<any>window).CANNON.World(),
  autoUpdate: true
};

SupEngine.registerEarlyUpdateFunction("Cannonjs", (player:SupRuntime.Player) => {
  if (!(<any>SupEngine).Cannon.autoUpdate) return;
  (<any>SupEngine).Cannon.World.step(1 / 60);
});

SupRuntime.registerPlugin("CannonBody", CannonBody);
