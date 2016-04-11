import SceneUpdater from "./SceneUpdater";

export default class SceneComponent extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = SceneUpdater;
  /* tslint:enable:variable-name */

  constructor(actor: SupEngine.Actor) {
    super(actor, "Scene");
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }
}
