module.exports = """
transcendental machine log(blackbox val)

namespace Math
  transcendental machine random(number min, number max) : number
  
  transcendental machine cos(number degrees) : number
  transcendental machine sin(number degrees) : number
  transcendental machine atan2(number y, number x) : number
  transcendental machine deg(number radians) : number
  transcendental machine rad(number degrees) : number
  number pi

  transcendental machine abs(number x): number
  transcendental machine sign(number x): number
  transcendental machine round(number x): number
  transcendental machine floor(number x): number
  transcendental machine ceil(number x): number

  transcendental machine sqrt(number x) : number
  transcendental machine pow(number x, number p) : number

  transcendental machine lerp(number a, number b, number v) : number
  
  transcendental machine max(number a, number b) : number
  transcendental machine min(number a, number b) : number
  transcendental machine clamp(number v, number min, number max) : number

  blueprint Vector3
    # 3-dimensional vector

    properties
      number x
      number y
      number z

    construct(number x, number y, number z)
      self.x <- x
      self.y <- y
      self.z <- z

    action set(number x, number y, number z) : Vector3
      # Sets the vector's components
      self.x <- x
      self.y <- y
      self.z <- z
      return self

    action copy(Vector3 v) : Vector3
      # Copy v's components
      self.x <- v.x
      self.y <- v.y
      self.z <- v.z
      return self

    action add(Vector3 v) : Vector3
      # Adds v to the vector
      self.x += v.x
      self.y += v.y
      self.z += v.z
      return self

    action subtract(Vector3 v) : Vector3
      # Subtracts v from the vector
      self.x -= v.x
      self.y -= v.y
      self.z -= v.z
      return self
    
    action multiplyScalar(number m) : Vector3
      self.x *= m
      self.y *= m
      self.z *= m
      return self

    action addVectors(Vector3 a, Vector3 b) : Vector3
      # Sets the vector to a + b
      self.x <- a.x + b.x
      self.y <- a.y + b.y
      self.z <- a.z + b.z
      return self

    action length() : number
      return Math.sqrt(self.x * self.x + self.y * self.y + self.z * self.z)

    action normalize(): Vector3
      box length <- self.length()
      self.x /= length
      self.y /= length
      self.z /= length
      return self

    action distanceTo(Vector3 v) : Vector3
      box subVector <- new Vector3(v.x, v.y, v.z)
      subVector.subtract(self)
      return subVector.length()

    machine lerp(Vector3 a, Vector3 b, number v) : Vector3
      box out <- new Vector3(0, 0, 0)
      out.x <- a.x * (1 - v) + b.x * v
      out.y <- a.y * (1 - v) + b.y * v
      out.z <- a.z * (1 - v) + b.z * v
      return out

    action clone() : Vector3
      return new Vector3(self.x, self.y, self.z)

  blueprint Quaternion
    # 4-dimensional vector for orientations or rotations

    properties
      number x
      number y
      number z
      number w

    construct(number x, number y, number z, number w)
      self.x <- x
      self.y <- y
      self.z <- z
      self.w <- w

    action setFromYawPitchRoll(number yaw, number pitch, number roll): Quaternion
      box c1 <- Math.cos(pitch / 2)
      box c2 <- Math.cos(yaw / 2)
      box c3 <- Math.cos(roll / 2)
      box s1 <- Math.sin(pitch / 2)
      box s2 <- Math.sin(yaw / 2)
      box s3 <- Math.sin(roll / 2)

      self.x <- s1 * c2 * c3 + c1 * s2 * s3
      self.y <- c1 * s2 * c3 - s1 * c2 * s3
      self.z <- c1 * c2 * s3 - s1 * s2 * c3
      self.w <- c1 * c2 * c3 + s1 * s2 * s3

      return self

    action multiplyQuaternions(Quaternion a, Quaternion b) : Quaternion
      box qax <- a.x
      box qay <- a.y
      box qaz <- a.z
      box qaw <- a.w

      box qbx <- b.x
      box qby <- b.y
      box qbz <- b.z
      box qbw <- b.w

      self.x <- qax * qbw + qaw * qbx + qay * qbz - qaz * qby
      self.y <- qay * qbw + qaw * qby + qaz * qbx - qax * qbz
      self.z <- qaz * qbw + qaw * qbz + qax * qby - qay * qbx
      self.w <- qaw * qbw - qax * qbx - qay * qby - qaz * qbz

      return self

    action multiply(Quaternion q) : Quaternion
      return self.multiplyQuaternions(self, q)

namespace Sup
  transcendental machine destroyAllActors()
  transcendental machine get(string path): blackbox
  transcendental machine getActor(string name): Actor

  blueprint Actor
    transcendental construct(string name, Actor? parentActor)
    transcendental action destroy

    transcendental action getName : string
    transcendental action setName(string name)

    transcendental action getVisible : boolean
    transcendental action setVisible(boolean visible)

    transcendental action getParent : Actor?
    transcendental action setParent(Actor? actor)

    transcendental action getChild(string name): Actor
    transcendental action getChildren : List

    transcendental action getPosition : Math.Vector3
    transcendental action setPosition(Math.Vector3 value)

    transcendental action getLocalPosition : Math.Vector3
    transcendental action setLocalPosition(Math.Vector3 value)

    transcendental action move(Math.Vector3 offset)
    transcendental action moveLocal(Math.Vector3 offset)

    transcendental action getOrientation : Math.Quaternion
    transcendental action setOrientation(Math.Quaternion value)

    transcendental action getLocalOrientation : Math.Quaternion
    transcendental action setLocalOrientation(Math.Quaternion value)

    transcendental action getEulerAngles : Math.Vector3
    transcendental action setEulerAngles(Math.Vector3 value)

    transcendental action getLocalEulerAngles : Math.Vector3
    transcendental action setLocalEulerAngles(Math.Vector3 value)

    transcendental action rotate(Math.Quaternion offset)
    transcendental action rotateLocal(Math.Quaternion offset)

    transcendental action lookAt(Math.Vector3 target)
    transcendental action lookTowards(Math.Vector3 direction)

    transcendental action getLocalScale : Math.Vector3
    transcendental action setLocalScale(Math.Vector3 scale)

    transcendental action addBehavior(blackbox behaviorBlueprint): Behavior

  abstract blueprint ActorComponent
    properties
      readonly Actor actor

    transcendental construct(Actor actor)
    transcendental action destroy

  blueprint Camera extends ActorComponent
    transcendental construct(Actor actor)

    transcendental action setOrthographicMode(boolean enabled)
    transcendental action setOrthographicScale(number scale)
    transcendental action getOrthographicScale() : number

  abstract blueprint Behavior extends ActorComponent
    transcendental construct(Actor actor)
    abstract action update

namespace Input
  transcendental machine getScreenSize : Dictionary
  transcendental machine getMousePosition : Dictionary
  transcendental machine getMouseDelta : Dictionary
  transcendental machine isMouseButtonDown(number button) : boolean
  transcendental machine wasMouseButtonJustPressed(number button) : boolean
  transcendental machine wasMouseButtonJustReleased(number button) : boolean

  transcendental machine getTouchPosition(number index): Dictionary
  transcendental machine isTouchDown(number index) : boolean
  transcendental machine wasTouchStarted(number index) : boolean
  transcendental machine wasTouchEnded(number index) : boolean
  transcendental machine vibrate(blackbox pattern)

  transcendental machine isKeyDown(string key) : boolean
  transcendental machine wasKeyJustPressed(string key) : boolean
  transcendental machine wasKeyJustReleased(string key) : boolean
  
  transcendental machine isGamepadButtonDown(number gamepad, string key) : boolean
  transcendental machine wasGamepadButtonJustPressed(number gamepad, string key) : boolean
  transcendental machine wasGamepadButtonJustReleased(number gamepad, string key) : boolean
  transcendental machine getGamepadAxisValue(number gamepad, number axis) : number

namespace Storage
  transcendental machine set(string key, blackbox value)
  transcendental machine get(string key) : blackbox
  transcendental machine remove(string key)
  transcendental machine clear()
"""
