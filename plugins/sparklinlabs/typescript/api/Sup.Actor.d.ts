declare module Sup {

  class Actor {
    // INSERT_COMPONENT_ACCESSORS

    constructor(name: string, parent?: Actor);
    destroy(): void;

    getName(): string;
    setName(name: string): Actor;
    getVisible(): boolean;
    setVisible(visible: boolean): Actor;
    getParent(): Actor;
    setParent(parent: Actor, keepLocalTransform?: boolean): Actor;
    getChild(name: string): Actor;
    getChildren(): Array<Actor>;

    getPosition(): Math.Vector3;
    setPosition(position: Math.Vector3): Actor;
    getLocalPosition(): Math.Vector3;
    setLocalPosition(position: Math.Vector3): Actor;
    move(offset: Math.Vector3): Actor;
    moveLocal(offset: Math.Vector3): Actor;
    moveOriented(offset: Math.Vector3): Actor;

    getOrientation(): Math.Quaternion;
    setOrientation(orientation: Math.Quaternion): Actor;
    getLocalOrientation(): Math.Quaternion;
    setLocalOrientation(orientation: Math.Quaternion): Actor;
    rotate(offset: Math.Quaternion): Actor;
    rotateLocal(offset: Math.Quaternion): Actor;

    getEulerAngles(): Math.Vector3;
    setEulerAngles(angles: Math.Vector3): Actor;
    getLocalEulerAngles(): Math.Vector3;
    setLocalEulerAngles(angles: Math.Vector3): Actor;
    rotateEulerAngles(offset: Math.Vector3): Actor;
    rotateLocalEulerAngles(offset: Math.Vector3): Actor;
    lookAt(target: Math.Vector3 ): Actor;
    lookTowards(direction: Math.Vector3): void;

    getLocalScale(): Math.Vector3;
    setLocalScale(scale: Math.Vector3);

    addBehavior<T extends Behavior>(behaviorClass: new(actor: Actor, properties?: { [key: string]: any; }) => T, properties?: { [key: string]: any; }): T;
    getBehavior<T extends Behavior>(type: new(actor: Actor, properties?: { [key: string]: any; }) => T): T;
  }

}
