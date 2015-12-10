import SceneUpdater from "./SceneUpdater";

export default class SceneComponent extends SupEngine.ActorComponent {

  static Updater = SceneUpdater;

  constructor(actor: SupEngine.Actor) {
    super(actor, "Scene");
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }
}
