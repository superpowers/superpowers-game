window.CANNON = require 'cannon'

SupEngine.Cannon =
  World: new window.CANNON.World()
  autoUpdate: true

SupEngine.registerEarlyUpdateFunction "Cannonjs", (player) =>
  return if ! SupEngine.Cannon.autoUpdate
  SupEngine.Cannon.World.step(1/60);
  return

SupRuntime.registerPlugin 'CannonBody', require './CannonBody'
