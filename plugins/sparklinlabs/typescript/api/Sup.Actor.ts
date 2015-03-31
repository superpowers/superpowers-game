module Sup {

  var tmpVector3 = new SupEngine.THREE.Vector3();
  var tmpQuaternion = new SupEngine.THREE.Quaternion();
  var tmpEuler = new SupEngine.THREE.Euler();

  export class Actor {
    __inner: any;
    __behaviors: { [key: string]: any; };

    // INSERT_COMPONENT_ACCESSORS

    constructor(name, parent) {
      var innerParent = (parent) ? parent.__inner : null;
      var actor = new SupEngine.Actor(player.gameInstance, name, innerParent);
      this.__inner = actor;
      this.__behaviors = {};
      actor.__outer = this;
    }

    destroy() {
      player.gameInstance.destroyActor(this.__inner);
    }

    getName() { return this.__inner.name; }
    setName(name) { this.__inner.name = name; return this; }
    getVisible() { return this.__inner.threeObject.visible; return this; }
    setVisible(visible: boolean) { this.__inner.threeObject.visible = visible; }
    getParent() { return (this.__inner.parent) ? this. __inner.parent.__outer : null; }
    setParent(parent, options={ keepLocalTransform: false }) {
      var innerParent = (parent) ? parent.__inner : null;
      this.__inner.setParent(innerParent, options.keepLocalTransform == true);
      return this;
    }

    getChild(name) {
      var foundActor = null;
      player.gameInstance.tree.walkDown(this.__inner, (actor) => {
        if (actor.name == name) { foundActor = (foundActor) ? foundActor : actor.__outer; }
      });
      return foundActor;
    }

    getChildren() {
      var children = [];
      this.__inner.children.forEach( (child) => { children.push(child.__outer); } );
      return children;
    }

    getPosition() {
      var position = this.__inner.getGlobalPosition();
      return new Math.Vector3(position.x, position.y, position.z);
    }

    setPosition(position) {
      this.__inner.setGlobalPosition( tmpVector3.set(position.x, position.y, position.z) );
      return this;
    }

    getLocalPosition() {
      var position = this.__inner.getLocalPosition();
      return new Math.Vector3(position.x, position.y, position.z)
    }

    setLocalPosition(position) {
      this.__inner.setLocalPosition( tmpVector3.set(position.x, position.y, position.z) );
      return this;
    }

    move(offset) {
      this.__inner.moveGlobal( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this;
    }

    moveLocal(offset) {
      this.__inner.moveLocal( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this;
    }
    moveOriented(offset) {
      this.__inner.moveOriented( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this;
    }

    getOrientation() {
      var orientation = this.__inner.getGlobalOrientation();
      return new Math.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
    }

    setOrientation(quaternion) {
      this.__inner.setGlobalOrientation( tmpQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w) )
      return this;
    }

    getLocalOrientation() {
      var orientation = this.__inner.getLocalOrientation();
      return new Math.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w);
    }

    setLocalOrientation(quaternion) {
      this.__inner.setLocalOrientation( tmpQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w) )
      return this;
    }

    rotate(offset) {
      this.__inner.rotateGlobal( tmpQuaternion.set(offset.x, offset.y, offset.z, offset.w) );
      return this;
    }

    rotateLocal(offset) {
      this.__inner.rotateLocal( tmpQuaternion.set(offset.x, offset.y, offset.z, offset.w) );
      return this;
    }

    getEulerAngles() {
      var eulerAngles = this.__inner.getGlobalEulerAngles();
      var x = eulerAngles.x;
      var y = eulerAngles.y;
      var z = eulerAngles.z;
      return new Math.Vector3( x, y, z );
    }

    setEulerAngles(eulerAngles) {
      this.__inner.setGlobalEulerAngles( tmpEuler.set(eulerAngles.x, eulerAngles.y, eulerAngles.z) );
      return this;
    }

    getLocalEulerAngles() {
      var eulerAngles = this.__inner.getLocalEulerAngles();
      var x = eulerAngles.x;
      var y = eulerAngles.y;
      var z = eulerAngles.z;
      return new Math.Vector3( x, y, z );
    }

    setLocalEulerAngles(eulerAngles) {
      this.__inner.setLocalEulerAngles( tmpEuler.set(eulerAngles.x, eulerAngles.y, eulerAngles.z) );
      return this;
    }

    rotateEulerAngles(offset) {
      this.__inner.rotateGlobalEulerAngles( tmpEuler.set(offset.x, offset.y, offset.z) );
      return this;
    }

    rotateLocalEulerAngles(offset) {
      this.__inner.rotateLocalEulerAngles( tmpEuler.set(offset.x, offset.y, offset.z) );
      return this;
    }

    lookAt(target) {
      this.__inner.lookAt( tmpVector3.set(target.x, target.y, target.z) );
      return this;
    }

    lookTowards(direction) {
      this.__inner.lookTowards( tmpVector3.set(direction.x, direction.y, direction.z) );
      return this;
    }

    getLocalScale() {
      var scale = this.__inner.getLocalScale();
      return new Math.Vector3( scale.x, scale.y, scale.z );
    }

    setLocalScale(scale) {
      this.__inner.setLocalScale( tmpVector3.set(scale.x, scale.y, scale.z) );
      return this;
    }

    addBehavior(behaviorClass, properties) {
      if (behaviorClass == null) {
        throw new Error("The behavior class passed to Actor.addBehavior was null. Make sure the class is declared before Actor.addBehavior is called.");
      }

      var behavior = new behaviorClass(this.__inner);
      if (properties != null) { for (var propertyName in properties) { behavior[propertyName] = properties[propertyName]; } }
      behavior.__inner.awake();
      return behavior;
    }

    getBehavior(type) { return this.__behaviors[type["name"]]; }
  }

}