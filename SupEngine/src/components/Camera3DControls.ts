import THREE = require("three");
import ActorComponent = require("../ActorComponent");
import Actor = require("../Actor");
import Camera = require("./Camera");

var tmpMovement = new THREE.Vector3();
var tmpQuaternion = new THREE.Quaternion();
var forwardVector = new THREE.Vector3(0, 1, 0);

class Camera3DControls extends ActorComponent {
  camera: Camera;
  rotation: THREE.Euler;

  constructor(actor: Actor, camera: Camera) {
    super(actor, "Camera3DControls");

    this.camera = camera;
    this.rotation = actor.getLocalEulerAngles();
  }

  update() {
    var movementSpeed = 0.1;

    var keyButtons = this.actor.gameInstance.input.keyboardButtons;
    var keyEvent = (<any>window).KeyEvent; // Workaround for unknown KeyEvent property on window object

    tmpMovement.setX(
      (keyButtons[keyEvent.DOM_VK_A].isDown || keyButtons[keyEvent.DOM_VK_Q].isDown) ? -movementSpeed :
      ((keyButtons[keyEvent.DOM_VK_D].isDown) ? movementSpeed :
      0));

    tmpMovement.setZ(
      (keyButtons[keyEvent.DOM_VK_W].isDown || keyButtons[keyEvent.DOM_VK_Z].isDown) ? -movementSpeed :
      ((keyButtons[keyEvent.DOM_VK_S].isDown) ? movementSpeed :
      0 ));

    tmpMovement.setY(
      (keyButtons[keyEvent.DOM_VK_SPACE].isDown) ? movementSpeed :
      ((keyButtons[keyEvent.DOM_VK_SHIFT].isDown) ? -movementSpeed :
      0 ));

    tmpMovement.applyQuaternion(tmpQuaternion.setFromAxisAngle(forwardVector, this.rotation.y));
    this.actor.moveLocal(tmpMovement);

    // Camera rotation
    if (this.actor.gameInstance.input.mouseButtons[1].isDown ||
    (this.actor.gameInstance.input.mouseButtons[0].isDown && keyButtons[keyEvent.DOM_VK_ALT].isDown)) {
      this.rotation.x -= this.actor.gameInstance.input.mouseDelta.y / 250
      this.rotation.y -= this.actor.gameInstance.input.mouseDelta.x / 250
      this.actor.setLocalEulerAngles(this.rotation);
    }
  }
}

export = Camera3DControls;
