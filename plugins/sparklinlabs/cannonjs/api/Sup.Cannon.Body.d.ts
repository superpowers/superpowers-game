declare module Sup {
  module Cannon {
    var World: CANNON.World;

    class Body extends ActorComponent {
      body: CANNON.Body;

      constructor( actor: Sup.Actor, options?: any );
    }
  }
}
