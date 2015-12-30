import BehaviorUpdater from "./BehaviorUpdater";

export default class BehaviorMarker extends SupEngine.ActorComponent {
  static Updater = BehaviorUpdater;

  constructor(actor: SupEngine.Actor) {
    super(actor, "BehaviorMarker");
  }

  setIsLayerActive(active: boolean) {}
}
