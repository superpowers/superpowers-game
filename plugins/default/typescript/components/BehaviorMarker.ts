import BehaviorUpdater from "./BehaviorUpdater";

export default class BehaviorMarker extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = BehaviorUpdater;
  /* tslint:enable:variable-name */

  constructor(actor: SupEngine.Actor) {
    super(actor, "BehaviorMarker");
  }

  setIsLayerActive(active: boolean) { /* Ignore */ }
}
