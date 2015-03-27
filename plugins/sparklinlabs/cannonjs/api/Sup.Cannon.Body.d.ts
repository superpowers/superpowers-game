declare module Sup {
  module Cannon {
    var World: CANNON.World;
    function getWorldAutoUpdate(): boolean;
    function setWorldAutoUpdate(autoUpdate: boolean);

    class Body extends ActorComponent {
      body: CANNON.Body;

      constructor( actor: Sup.Actor, options?: any );
    }
  }
}
