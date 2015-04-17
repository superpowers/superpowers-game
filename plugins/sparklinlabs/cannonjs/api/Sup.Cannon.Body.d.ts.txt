declare module Sup {
  module Cannon {
    function getWorld(): CANNON.World;
    function resetWorld();
    function getWorldAutoUpdate(): boolean;
    function setWorldAutoUpdate(autoUpdate: boolean);

    class Body extends ActorComponent {
      body: CANNON.Body;

      constructor( actor: Sup.Actor, options?: any );
    }
  }
}
