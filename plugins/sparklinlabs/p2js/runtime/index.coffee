window.p2 = require 'p2'

SupEngine.P2 =
  World: new window.p2.World()
  autoUpdate: true

SupEngine.registerEarlyUpdateFunction "P2js", (player) =>
  return if ! SupEngine.P2.autoUpdate
  SupEngine.P2.World.step(1/60);
  return

SupRuntime.registerPlugin 'P2Body', require './P2Body'
