/**
 * MILIRO THIRD-PERSON CAMERA
 * Handles Orbit-like rotation, smooth player tracking, and target lock-on tracking.
 */

import * as THREE from 'three';

export class GameCamera {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    
    // Position/rotation offsets
    this.theta = 0; // Horizontal angle (radians)
    this.phi = Math.PI / 6; // Vertical angle (radians)

    // Sensitivity
    this.sensitivityX = 0.0025;
    this.sensitivityY = 0.0025;

    // Radius (distance from player)
    this.radius = 6.0;
    this.minRadius = 3.0;
    this.maxRadius = 10.0;

    // Clamps for look angles
    this.minPhi = 0.02;
    this.maxPhi = Math.PI / 2.3; // Avoid going under terrain

    // Target tracking
    this.lockedTarget = null;
    this.idealOffset = new THREE.Vector3(0, 2.0, 0); // focus offset on player

    // Temp vectors for calculations
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();
  }

  update(playerPos, deltaTime) {
    // 1. If we have a locked target, steer camera to face the target and player
    if (this.lockedTarget) {
      const playerToTarget = new THREE.Vector3()
        .copy(this.lockedTarget.position)
        .sub(playerPos);
      
      // Calculate target horizontal angle
      const targetTheta = Math.atan2(-playerToTarget.x, -playerToTarget.z);
      
      // Smoothly interpolate camera horizontal angle towards target line
      this.theta = this.lerpAngle(this.theta, targetTheta, 8.0 * deltaTime);
      
      // Force phi (vertical angle) to look slightly downward towards player/target midpoint
      const dist = playerToTarget.length();
      const idealPhi = Math.max(0.1, Math.min(Math.PI / 3, 0.45 - (dist * 0.01)));
      this.phi = THREE.MathUtils.lerp(this.phi, idealPhi, 5.0 * deltaTime);
    } else {
      // Manual mouse orbital look
      this.theta -= this.input.mouse.dx * this.sensitivityX;
      this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + this.input.mouse.dy * this.sensitivityY));
    }

    // 2. Spherical coordinates layout around player
    const offset = new THREE.Vector3(
      Math.sin(this.theta) * Math.cos(this.phi),
      Math.sin(this.phi),
      Math.cos(this.theta) * Math.cos(this.phi)
    ).multiplyScalar(this.radius);

    // Camera target point (slightly above player's center)
    const targetPoint = new THREE.Vector3().copy(playerPos).add(this.idealOffset);

    // Calculate ideal camera position
    const idealCamPos = new THREE.Vector3().copy(targetPoint).add(offset);

    // 3. Simple terrain collision: prevent camera from clipping under ground (y < 0.5)
    if (idealCamPos.y < 0.5) {
      idealCamPos.y = 0.5;
    }

    // 4. Smooth camera translation
    this.camera.position.lerp(idealCamPos, 15.0 * deltaTime);

    // 5. Camera LookAt target point
    if (this.lockedTarget) {
      // Look at midpoint between player and target
      const midpoint = new THREE.Vector3()
        .copy(playerPos)
        .add(this.lockedTarget.position)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, 1.2, 0));
      this.camera.lookAt(midpoint);
    } else {
      this.camera.lookAt(targetPoint);
    }
  }

  // Smooth angle interpolation handling wrap-arounds
  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }

  lockOn(target) {
    this.lockedTarget = target;
  }

  unlock() {
    this.lockedTarget = null;
  }

  // Get current direction vectors for player movement direction
  getForwardVector() {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.theta);
    return forward.normalize();
  }

  getRightVector() {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.theta);
    return right.normalize();
  }
}
