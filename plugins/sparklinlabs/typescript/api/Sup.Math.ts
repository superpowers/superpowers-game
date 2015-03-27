module Sup {

  var degToRad = window.Math.PI / 180;
  var radToDeg = 180 / window.Math.PI;

  export module Math {

    export function clamp(v, min, max) { return window.Math.max( min, window.Math.min(max, v) ) }

    export function lerp(a, b, v) { return a + (b - a) * v; }

    export function lerpAngle(a, b, v) {
      a = wrapAngle(a);
      b = wrapAngle(b);
      return a + wrapAngle(b - a) * v;
    }

    export function wrapAngle(a) {
      a %= (window.Math.PI * 2);
      if (a < -window.Math.PI) a += window.Math.PI * 2;
      else if (a > window.Math.PI) a -= window.Math.PI * 2;
      return a;
    }

    export module Random {
      export function integer(min, max) { return window.Math.floor( window.Math.random() * (max + 1 - min) ) + min }
      export function sample(collection) { return collection[integer(0, collection.length - 1)]; }
    }

    export function toRadians(degrees) { return degrees * degToRad; }
    export function toDegrees(radians) { return radians * radToDeg; }

    export class Vector3 {
      static forward() { return new Vector3( 0,  0,  1); }
      static back()    { return new Vector3( 0,  0, -1); }
      static right()   { return new Vector3( 1,  0,  0); }
      static left()    { return new Vector3(-1,  0,  0); }
      static up()      { return new Vector3( 0,  1,  0); }
      static down()    { return new Vector3( 0, -1,  0); }
      static one()     { return new Vector3( 1,  1,  1); }

      x: number;
      y: number;
      z: number;

      constructor(x, y, z) {
        this.x = (x) ? x : 0;
        this.y = (y) ? y : 0;
        this.z = (z) ? z : 0;
      }

      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
      copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
      clone() { return new Vector3(this.x, this.y, this.z); }

      add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
      subtract(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
      multiplyScalar(m) { this.x *= m; this.y *= m; this.z *= m; return this; }

      cross(v) {
        var x = this.x;
        var y = this.y;
        var z = this.z;

        this.x = y * v.z - z * v.y;
        this.y = z * v.x - x * v.z;
        this.z = x * v.y - y * v.x;
        return this;
      }

      dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }

      normalize() {
        var length = this.length()
        this.x /= length; this.y /= length; this.z /= length;
        return this;
      }

      lerp(v, t) {
        this.x = this.x * (1 - t) + v.x * t;
        this.y = this.y * (1 - t) + v.y * t;
        this.z = this.z * (1 - t) + v.z * t;
        return this;
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
        return this;
      }

      length() { return window.Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
      distanceTo(v) { return v.clone().subtract(this).length(); }
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

      set(x, y, z, w) { this.x = x; this.y = y; this.z = z; this.w = w; return this; }
      copy(q) { this.x = q.x; this.y = q.y; this.z = q.z; this.w = q.w; return this; }
      clone() { return new Quaternion(this.x, this.y, this.z, this.w); }

      setFromAxisAngle(axis, angle) {
        var s = window.Math.sin(angle / 2);

    		this.x = axis.x * s;
    		this.y = axis.y * s;
    		this.z = axis.z * s;
    		this.w = window.Math.cos(angle / 2);
        return this
      }

      setFromYawPitchRoll(yaw, pitch, roll) {
        var c1 = window.Math.cos(pitch / 2);
        var c2 = window.Math.cos(yaw / 2);
        var c3 = window.Math.cos(roll / 2);
        var s1 = window.Math.sin(pitch / 2);
        var s2 = window.Math.sin(yaw / 2);
        var s3 = window.Math.sin(roll / 2);

        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
        return this;
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

        this.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        this.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        this.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        this.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return this;
      }

      multiply(q) { return this.multiplyQuaternions(this, q); }

      slerp(q, t) {
        // Adapted from Three.js
        if (t === 0) return this;
        if (t === 1) return this.copy(q);

        var x = this.x;
        var y = this.y;
        var z = this.z;
        var w = this.w;

        var cosHalfTheta = w * q.w + x * q.x + y * q.y + z * q.z;

        if (cosHalfTheta < 0) {
          this.w = -q.w;
          this.x = -q.x;
          this.y = -q.y;
          this.z = -q.z;
          cosHalfTheta = -cosHalfTheta;
        } else {
          this.copy(q);
        }

        if (cosHalfTheta >= 1.0) {
          this.w = w;
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        }

        var halfTheta = window.Math.acos(cosHalfTheta);
        var sinHalfTheta = window.Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (window.Math.abs(sinHalfTheta) < 0.001) {
          this.w = 0.5 * (w + this.w);
          this.x = 0.5 * (x + this.x);
          this.y = 0.5 * (y + this.y);
          this.z = 0.5 * (z + this.z);
          return this;
        }

        var ratioA = window.Math.sin((1 - t) * halfTheta) / sinHalfTheta,
        ratioB = window.Math.sin(t * halfTheta) / sinHalfTheta;

        this.w = (w * ratioA + this.w * ratioB);
        this.x = (x * ratioA + this.x * ratioB);
        this.y = (y * ratioA + this.y * ratioB);
        this.z = (z * ratioA + this.z * ratioB);
        return this;
      }
    }
  }
}
