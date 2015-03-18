declare module Sup {
  function loadScene(sceneAsset: Scene): void;
  function appendScene(sceneAsset: Scene): Array<Actor>;

  class Scene extends Asset {
    dummySceneMember;
  }
}
