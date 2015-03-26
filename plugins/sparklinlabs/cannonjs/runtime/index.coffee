window.CANNON = require 'cannon'

SupEngine.CannonWorld = new window.CANNON.World()

SupEngine.registerEarlyUpdateFunction "Cannonjs", (player) =>
  SupEngine.CannonWorld.step(1/60);
  return

SupRuntime.registerPlugin 'CannonBody', require './CannonBody'
