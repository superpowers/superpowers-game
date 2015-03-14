var jsMath = Math;
var tmpVector3 = new SupEngine.THREE.Vector3();
var tmpQuaternion = new SupEngine.THREE.Quaternion();
var tmpEuler = new SupEngine.THREE.Euler();
var degToRad = jsMath.PI / 180;
var radToDeg = 180 / jsMath.PI;

module Sup {
  export function log(x) { console.log(x); }

  export module Math {
    export function lerp(a, b, v) { return a + (b - a) * v }
    export function clamp(v, min, max) { return jsMath.max( min, jsMath.min(max, v) ) }

    export module Random {
      export function integer(min, max) { return jsMath.floor( jsMath.random() * (max + 1 - min) ) + min }
    }

    export function toRadians(degrees) { return degrees * degToRad; }
    export function toDegrees(radians) { return radians * radToDeg; }

    export class Vector3 {
      static lerp(a, b, v) {
        var x = a.x * (1 - v) + b.x * v;
        var y = a.y * (1 - v) + b.y * v;
        var z = a.z * (1 - v) + b.z * v;
        return new Vector3(x, y, z)
      }

      x: number;
      y: number;
      z: number;

      constructor(x, y, z) {
        this.x = (x) ? x : 0;
        this.y = (y) ? y : 0;
        this.z = (z) ? z : 0;
      }
      set(x, y, z) {
        this.x = x; this.y = y; this.z = z;
        return this
      }
      copy(v) {
        this.x = v.x; this.y = v.y; this.z = v.z;
        return this
      }
      add(v) {
        this.x += v.x; this.y += v.y; this.z += v.z;
        return this
      }
      subtract(v) {
        this.x -= v.x; this.y -= v.y; this.z -= v.z;
        return this
      }
      multiplyScalar(m) {
        this.x *= m; this.y *= m; this.z *= m;
        return this
      }
      normalize() {
        var length = this.length()
        this.x /= length; this.y /= length; this.z /= length;
        return this
      }
      rotate(q) {
        var qx = q.x;
        var qy = q.y;
        var qz = q.z;
        var qw = q.w;

        var ix =  qw * this.x + qy * this.z - qz * this.y;
        var iy =  qw * this.y + qz * this.x - qx * this.z;
        var iz =  qw * this.z + qx * this.y - qy * this.x;
        var iw = - qx * this.x - qy * this.y - qz * this.z;

        this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
        this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
        this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
        return this
      }
      length() { return jsMath.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) }
      distanceTo(v) { return v.clone().subtract(this).length() }
      clone() { return new Vector3(this.x, this.y, this.z) }
    }

    export class Quaternion {
      x: number;
      y: number;
      z: number;
      w: number;

      constructor(x, y, z, w) {
        this.x = (x) ? x : 0;
        this.y = (y) ? y : 0;
        this.z = (z) ? z : 0;
        this.w = (w) ? w : 1;
      }
      set(x, y, z, w) {
        this.x = x; this.y = y; this.z = z; this.w = w;
        return this
      }
      setFromAxisAngle(axis, angle) {
        var s = jsMath.sin(angle / 2);

    		this.x = axis.x * s;
    		this.y = axis.y * s;
    		this.z = axis.z * s;
    		this.w = jsMath.cos(angle / 2);
        return this
      }
      setFromYawPitchRoll(yaw, pitch, roll) {
        var c1 = jsMath.cos(pitch / 2);
        var c2 = jsMath.cos(yaw / 2);
        var c3 = jsMath.cos(roll / 2);
        var s1 = jsMath.sin(pitch / 2);
        var s2 = jsMath.sin(yaw / 2);
        var s3 = jsMath.sin(roll / 2);

        this.x = s1 * c2 * c3 + c1 * s2 * s3
        this.y = c1 * s2 * c3 - s1 * c2 * s3
        this.z = c1 * c2 * s3 - s1 * s2 * c3
        this.w = c1 * c2 * c3 + s1 * s2 * s3
        return this
      }
      multiplyQuaternions(a, b) {
        var qax = a.x;
        var qay = a.y;
        var qaz = a.z;
        var qaw = a.w;

        var qbx = b.x;
        var qby = b.y;
        var qbz = b.z;
        var qbw = b.w;

        this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby
        this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz
        this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx
        this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz

        return this
      }
      multiply(q) { return this.multiplyQuaternions(this, q) }
      clone() { return new Quaternion(this.x, this.y, this.z, this.w) }
    }
  }

  export class Asset {
    type: string;
    children: Array<string>;
    __inner: any;
    constructor(inner) {
      this.__inner = inner;
      this.__inner.__outer = this;
    }
  }
  export class Folder extends Asset {}
  export function get(path, arg1, arg2) {
    var type = arg1;
    var options = (arg2 !== undefined) ? arg2 : { ignoreMissing: false };

    if (arg1 != null && Object.getPrototypeOf(arg1) == Object.prototype) {
      type = null;
      options = arg1;
    }

    var entry = player.entriesByPath[path];

    if (entry) { var outerAsset = player.getOuterAsset(entry.id); }
    else if(!options.ignoreMissing) { throw new Error("Invalid asset path") }

    if (type != null && outerAsset !=null) {
      var typeName = type.name.charAt(0).toLowerCase() + type.name.slice(1);
      if (typeName != outerAsset.type) { throw new Error("Invalid asset type") }
    }

    return (outerAsset) ? outerAsset : null
  }
  export function getActor(name) {
    var foundActor = null;
    player.gameInstance.tree.walkTopDown( (actor) => { if ( actor.name == name && ! actor.pendingForDestruction ) { foundActor = (foundActor) ? foundActor: actor.__outer; } } )
    return foundActor
  }
  export function destroyAllActors() {
    player.gameInstance.destroyAllActors();
    player.gameInstance.tree.walkTopDown( (actor) => { actor.__outer.__inner = null; actor.__outer = null; } )
  }

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
      this.__inner.__outer = null;
      this.__inner = null;
    }

    getName() { return this.__inner.name }
    setName(name) { this.__inner.name = name; return this }
    getVisible() { return this.__inner.threeObject.visible; return this }
    setVisible(visible: boolean) { this.__inner.threeObject.visible = visible }
    getParent() { return (this.__inner.parent) ? this. __inner.parent.__outer : null; }
    setParent(parent) { var innerParent = (parent) ? parent.__inner : null; this.__inner.setParent(innerParent); return this }

    getChild(name) {
      var foundActor = null;
      player.gameInstance.tree.walkDown( this.__inner, (actor) => {
        if ( actor.name == name ) { foundActor = (foundActor) ? foundActor: actor.__outer; } } )
      return foundActor
    }
    getChildren() {
      var children = []
      this.__inner.children.forEach( (child) => { if (child.__outer) { children.push(child.__outer); } } )
      return children
    }

    getPosition() {
      var position = this.__inner.getGlobalPosition();
      return new Math.Vector3(position.x, position.y, position.z)
    }
    setPosition(position) {
      this.__inner.setGlobalPosition( tmpVector3.set(position.x, position.y, position.z) );
      return this
    }
    getLocalPosition() {
      var position = this.__inner.getLocalPosition();
      return new Math.Vector3(position.x, position.y, position.z)
    }
    setLocalPosition(position) {
      this.__inner.setLocalPosition( tmpVector3.set(position.x, position.y, position.z) );
      return this
    }
    move(offset) {
      this.__inner.moveGlobal( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this
    }
    moveLocal(offset) {
      this.__inner.moveLocal( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this
    }
    moveOriented(offset) {
      this.__inner.moveOriented( tmpVector3.set(offset.x, offset.y, offset.z) )
      return this
    }

    getOrientation() {
      var orientation = this.__inner.getGlobalOrientation();
      return new Math.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w)
    }
    setOrientation(quaternion) {
      this.__inner.setGlobalOrientation( tmpQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w) )
      return this
    }
    getLocalOrientation() {
      var orientation = this.__inner.getLocalOrientation();
      return new Math.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w)
    }
    setLocalOrientation(quaternion) {
      this.__inner.setLocalOrientation( tmpQuaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w) )
      return this
    }
    rotate(offset) {
      this.__inner.rotateGlobal( tmpQuaternion.set(offset.x, offset.y, offset.z, offset.w) )
      return this
    }
    rotateLocal(offset) {
      this.__inner.rotateLocal( tmpQuaternion.set(offset.x, offset.y, offset.z, offset.w) )
      return this
    }

    getEulerAngles() {
      var eulerAngles = this.__inner.getGlobalEulerAngles();
      var x = eulerAngles.x;
      var y = eulerAngles.y;
      var z = eulerAngles.z;
      return new Math.Vector3( parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3)), parseFloat(z.toFixed(3)) )
    }
    setEulerAngles(eulerAngles) {
      this.__inner.setGlobalEulerAngles( tmpEuler.set(eulerAngles.x, eulerAngles.y, eulerAngles.z) )
      return this
    }
    getLocalEulerAngles() {
      var eulerAngles = this.__inner.getLocalEulerAngles();
      var x = eulerAngles.x;
      var y = eulerAngles.y;
      var z = eulerAngles.z;
      return new Math.Vector3( parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3)), parseFloat(z.toFixed(3)) )
    }
    setLocalEulerAngles(eulerAngles) {
      this.__inner.setLocalEulerAngles( tmpEuler.set(eulerAngles.x, eulerAngles.y, eulerAngles.z) );
      return this;
    }
    rotateEulerAngles(offset) {
      this.__inner.rotateEulerAngles( tmpEuler.set(offset.x, offset.y, offset.z) );
      return this;
    }
    rotateLocalEulerAngles(offset) {
      this.__inner.rotateLocalEulerAngles( tmpEuler.set(offset.x, offset.y, offset.z) );
      return this;
    }
    lookAt(target) {
      this.__inner.lookAt( tmpVector3.set(target.x, target.y, target.z) );
      return this
    }
    lookTowards(direction) {
      this.__inner.lookTowards( tmpVector3.set(direction.x, direction.y, direction.z) );
      return this
    }

    getLocalScale() {
      var scale = this.__inner.getLocalScale();
      return new Math.Vector3( scale.x, scale.y, scale.z )
    }
    setLocalScale(scale) {
      this.__inner.setLocalScale( tmpVector3.set(scale.x, scale.y, scale.z) );
      return this
    }

    addBehavior(behaviorClass, properties) {
      if (behaviorClass == null) {
        throw new Error("The behavior class passed to Actor.addBehavior was null. Make sure the class is declared before Actor.addBehavior is called.");
      }

      var behavior = new behaviorClass(this.__inner);
      if (properties != null) { for (var propertyName in properties) { behavior[propertyName] = properties[propertyName]; } }
      behavior.__inner.awake();
      return behavior
    }
    getBehavior(type) { return this.__behaviors[type["name"]] }
  }

  export class ActorComponent {
    actor: Actor;
    __inner: any;

    constructor(actor) {
      this.actor = actor;
    }
    destroy() {
      player.gameInstance.destroyComponent(this.__inner);
    }
  }

  export class Behavior extends ActorComponent {
    awake: Function;
    start: Function;
    update: Function;
    onDestroy: Function;

    constructor(actor) {
      if (actor.__outer == null) { throw new Error("Use actor.addBehavior to create a behavior"); }

      super(actor.__outer);

      var funcs = {};
      funcs["awake"]  = (this.awake)  ? this.awake.bind(this) : null;
      funcs["start"]  = (this.start)  ? this.start.bind(this) : null;
      funcs["update"] = (this.update) ? this.update.bind(this) : null;
      funcs["destroy"] = (this.onDestroy) ? this.onDestroy.bind(this) : null;
      this.__inner = new SupEngine.componentPlugins.Behavior(actor, funcs);

      this.__inner.__outer = this;
      this.actor.__behaviors[this.constructor["name"]] = this;
    }
  }
  export function registerBehavior(behavior) { player.behaviorClasses[behavior["name"]] = behavior; }

  export module Input {
    export function getScreenSize() { return { "x": player.canvas.clientWidth, "y": player.canvas.clientHeight } }
    export function getMouseVisible() { return player.canvas.style.cursor != "none" }
    export function setMouseVisible(visible) {
      if (visible) { player.canvas.style.cursor = "auto"; }
      else         { player.canvas.style.cursor = "none"; }
    }

    export function getMousePosition() {
      var mousePos = player.gameInstance.input.mousePosition;
      return { x: mousePos.x / player.canvas.clientWidth * 2 - 1, y: (mousePos.y / player.canvas.clientHeight * 2 - 1) * -1 };
    }
    export function getMouseDelta() { return { x: player.gameInstance.input.mouseDelta.x, y: -player.gameInstance.input.mouseDelta.y }; }
    export function isMouseButtonDown(button) { return player.gameInstance.input.mouseButtons[button].isDown }
    export function wasMouseButtonJustPressed(button) { return player.gameInstance.input.mouseButtons[button].wasJustPressed }
    export function wasMouseButtonJustReleased(button) { return player.gameInstance.input.mouseButtons[button].wasJustReleased }

    export function getTouchPosition(index) {
      var position = player.gameInstance.input.touches[index].position;
      return { x: position.x / player.canvas.clientWidth * 2 - 1, y: (position.y / player.canvas.clientHeight * 2 - 1) * -1 };
    }
    export function isTouchDown(index) { return player.gameInstance.input.touches[index].isDown }
    export function wasTouchStarted(index) { return player.gameInstance.input.touches[index].wasStarted }
    export function wasTouchEnded(index) { return player.gameInstance.input.touches[index].wasReleased }
    export function vibrate(pattern) { window.navigator.vibrate(pattern) }

    export function isKeyDown(keyName) { return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].isDown }
    export function wasKeyJustPressed(keyName) { return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].wasJustPressed }
    export function wasKeyJustReleased(keyName) { return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].wasJustReleased }

    export function isGamepadButtonDown(gamepad, key) { return player.gameInstance.input.gamepadsButtons[gamepad][key].isDown }
    export function wasGamepadButtonJustPressed(gamepad, key) { return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustPressed }
    export function wasGamepadButtonJustReleased(gamepad, key) { return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustReleased }
    export function getGamepadAxisValue(gamepad, axis) { return player.gameInstance.input.gamepadsAxes[gamepad][axis] }
  }

  export module Storage {
    export function set(key, value) { localStorage.setItem(key, value); }
    export function get(key) { return localStorage.getItem(key) }
    export function remove(key) { localStorage.removeItem(key) }
    export function clear() { localStorage.clear(); }
  }
}
window.Sup = Sup;
