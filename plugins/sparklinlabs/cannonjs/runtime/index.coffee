window.CANNON = require 'cannon'

SupEngine.CannonWorld = new window.CANNON.World()
SupEngine.CannonWorld.autoUpdate = true

SupEngine.registerEarlyUpdateFunction "Cannonjs", (player) =>
  return if ! SupEngine.CannonWorld.autoUpdate
  SupEngine.CannonWorld.step(1/60);
  return

SupRuntime.registerPlugin 'CannonBody', require './CannonBody'
