/**
 * MILIRO MAIN HERO (PLAYER)
 * Procedural Knight mesh construction, combo attacks, dodge rolling, sprint mechanics, and health/stamina tracking.
 */

import * as THREE from 'three';
import { audio } from '../core/AudioManager.js';

export class Player {
  constructor(scene, physics, input, ui) {
    this.scene = scene;
    this.physics = physics;
    this.input = input;
    this.ui = ui;

    // Movement attributes
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();
    this.direction = 0; // Look angle
    
    // Combat states
    this.state = 'idle'; // idle, running, sprinting, dodge, attacking, hit, dead
    this.stateTimer = 0;
    this.dodgeDuration = 0.45;
    this.dodgeSpeed = 16.0;
    this.invulnerable = false;

    // Combo Attack Config
    this.comboStep = 0;
    this.comboTimer = 0;
    this.attackDuration = 0.4;
    this.damageApplied = false;

    // Stamina costs
    this.staminaRegenRate = 35; // units per second
    this.dodgeStaminaCost = 25;
    this.attackStaminaCost = 20;
    this.sprintStaminaCost = 22;

    // Initialize 3D Mesh
    this.createKnightMesh();
    
    // Add to Scene
    this.scene.add(this.meshGroup);
  }

  // Build a highly detailed, tall knight mesh with human head and realistic joint structures
  createKnightMesh() {
    this.meshGroup = new THREE.Group();

    // Knight Materials
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x5a6370, // Steel grey iron
      metalness: 0.85,
      roughness: 0.3,
      name: 'knight_iron'
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xe5c158, // Gold trim
      metalness: 0.85,
      roughness: 0.25
    });

    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x902020, // Crimson red fabric
      roughness: 0.85
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffe0bd, // Human skin tone
      roughness: 0.8,
      metalness: 0.0
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x4a3728, // Dark brown hair
      roughness: 0.9,
      metalness: 0.0
    });

    // 1. Torso/Breastplate (Flared cone) - TALLER & SLEEKER
    this.torso = new THREE.Group();
    this.torso.position.y = 1.15; // Raised high
    const torsoMeshGeo = new THREE.CylinderGeometry(0.36, 0.22, 1.15, 8);
    const torsoMesh = new THREE.Mesh(torsoMeshGeo, metalMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torso.add(torsoMesh);

    // Gold Breastplate details
    const chestPlateGeo = new THREE.SphereGeometry(0.35, 8, 8, 0, Math.PI*2, 0, Math.PI/2);
    const chestPlate = new THREE.Mesh(chestPlateGeo, trimMat);
    chestPlate.position.set(0, 0.2, 0.1);
    chestPlate.rotation.x = Math.PI / 3;
    chestPlate.scale.set(1.0, 1.0, 0.5);
    this.torso.add(chestPlate);

    // Belt
    const beltGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.12, 8);
    const belt = new THREE.Mesh(beltGeo, trimMat);
    belt.position.y = -0.55;
    this.torso.add(belt);

    // Red Skirt/Sash
    const skirtGeo = new THREE.CylinderGeometry(0.27, 0.35, 0.4, 8);
    const skirt = new THREE.Mesh(skirtGeo, clothMat);
    skirt.position.y = -0.7;
    this.torso.add(skirt);

    this.meshGroup.add(this.torso);

    // 2. Neck and Human Head inside Open Helmet
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.95; // Tall proportion head height

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.2, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = -0.15;
    this.headGroup.add(neck);

    // Human Head (Skin colored sphere)
    const faceGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.position.y = 0.05;
    this.headGroup.add(face);

    // Face details: Eyes
    const eyeGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x34495e });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.07, 0.08, 0.21);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;
    this.headGroup.add(eyeL);
    this.headGroup.add(eyeR);

    // Nose
    const noseGeo = new THREE.BoxGeometry(0.03, 0.08, 0.05);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 0.04, 0.23);
    this.headGroup.add(nose);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.1, -0.05);
    hair.scale.set(1.02, 1.0, 1.05);
    this.headGroup.add(hair);

    // Open Helmet (covers top and back of head, leaves face visible)
    const helmDomeGeo = new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI*2, 0, Math.PI/2);
    const helmDome = new THREE.Mesh(helmDomeGeo, metalMat);
    helmDome.position.y = 0.08;
    this.headGroup.add(helmDome);

    // Cheek Guards
    const guardLGeo = new THREE.BoxGeometry(0.06, 0.25, 0.18);
    const guardL = new THREE.Mesh(guardLGeo, metalMat);
    guardL.position.set(-0.25, -0.05, 0.1);
    guardL.rotation.y = Math.PI / 8;
    this.headGroup.add(guardL);

    const guardR = guardL.clone();
    guardR.position.x = 0.25;
    guardR.rotation.y = -Math.PI / 8;
    this.headGroup.add(guardR);

    // Helmet Crest (horn/plume detail)
    const crestGeo = new THREE.BoxGeometry(0.04, 0.2, 0.35);
    const crest = new THREE.Mesh(crestGeo, trimMat);
    crest.position.set(0, 0.35, -0.05);
    this.headGroup.add(crest);

    this.meshGroup.add(this.headGroup);

    // 3. Pauldrons
    const pauldronLGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const pauldronL = new THREE.Mesh(pauldronLGeo, trimMat);
    pauldronL.position.set(-0.55, 0.45, 0);
    this.torso.add(pauldronL);

    const pauldronRGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const pauldronR = new THREE.Mesh(pauldronRGeo, trimMat);
    pauldronR.position.set(0.55, 0.45, 0);
    this.torso.add(pauldronR);

    // 4. Arms
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.5, 0.4, 0);
    const armLGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.65, 8);
    const armL = new THREE.Mesh(armLGeo, metalMat);
    armL.position.y = -0.25;
    this.leftArm.add(armL);
    
    // Forearm
    const forearmLGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8);
    const forearmL = new THREE.Mesh(forearmLGeo, metalMat);
    forearmL.position.y = -0.7;
    this.leftArm.add(forearmL);
    
    // Shield
    const shieldGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.06, 4);
    const shield = new THREE.Mesh(shieldGeo, trimMat);
    shield.rotation.z = Math.PI / 2;
    shield.rotation.y = Math.PI / 6;
    shield.position.set(-0.15, -0.4, 0.1);
    shield.castShadow = true;
    this.leftArm.add(shield);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.5, 0.4, 0);
    const armR = new THREE.Mesh(armLGeo, metalMat);
    armR.position.y = -0.25;
    this.rightArm.add(armR);

    const forearmR = new THREE.Mesh(forearmLGeo, metalMat);
    forearmR.position.y = -0.7;
    this.rightArm.add(forearmR);

    // 5. Greatsword (Equipped in right hand)
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.95, 0.1); // handle position
    this.swordGroup.rotation.x = -Math.PI / 2;

    const bladeGeo = new THREE.BoxGeometry(0.06, 1.8, 0.02);
    const blade = new THREE.Mesh(bladeGeo, metalMat);
    blade.position.y = 0.9;
    blade.castShadow = true;
    this.swordGroup.add(blade);

    const guardGeo = new THREE.BoxGeometry(0.35, 0.05, 0.05);
    const guard = new THREE.Mesh(guardGeo, trimMat);
    guard.position.y = 0.05;
    this.swordGroup.add(guard);

    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
    const handle = new THREE.Mesh(handleGeo, clothMat);
    handle.position.y = -0.15;
    this.swordGroup.add(handle);

    this.rightArm.add(this.swordGroup);
    this.torso.add(this.rightArm);

    // 6. Double Jointed Legs (Thigh + Shin) for lifelike knee bending
    // Left Leg
    this.thighL = new THREE.Group();
    this.thighL.position.set(-0.2, -0.5, 0);
    
    const thighLMeshGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.65, 8);
    const thighLMesh = new THREE.Mesh(thighLMeshGeo, metalMat);
    thighLMesh.position.y = -0.25;
    thighLMesh.castShadow = true;
    this.thighL.add(thighLMesh);

    this.shinL = new THREE.Group();
    this.shinL.position.set(0, -0.55, 0);

    const shinLMeshGeo = new THREE.CylinderGeometry(0.11, 0.08, 0.65, 8);
    const shinLMesh = new THREE.Mesh(shinLMeshGeo, metalMat);
    shinLMesh.position.y = -0.25;
    shinLMesh.castShadow = true;
    this.shinL.add(shinLMesh);

    const footGeo = new THREE.BoxGeometry(0.13, 0.08, 0.24);
    const footL = new THREE.Mesh(footGeo, trimMat);
    footL.position.set(0, -0.58, 0.05);
    footL.castShadow = true;
    this.shinL.add(footL);
    this.thighL.add(this.shinL);
    
    this.meshGroup.add(this.thighL);

    // Right Leg
    this.thighR = new THREE.Group();
    this.thighR.position.set(0.2, -0.5, 0);
    
    const thighRMesh = new THREE.Mesh(thighLMeshGeo, metalMat);
    thighRMesh.position.y = -0.25;
    thighRMesh.castShadow = true;
    this.thighR.add(thighRMesh);

    this.shinR = new THREE.Group();
    this.shinR.position.set(0, -0.55, 0);

    const shinRMesh = new THREE.Mesh(shinLMeshGeo, metalMat);
    shinRMesh.position.y = -0.25;
    shinRMesh.castShadow = true;
    this.shinR.add(shinRMesh);

    const footR = new THREE.Mesh(footGeo, trimMat);
    footR.position.set(0, -0.58, 0.05);
    footR.castShadow = true;
    this.shinR.add(footR);
    this.thighR.add(this.shinR);

    this.meshGroup.add(this.thighR);

    // Overall Group Scale - Taller hero scale
    this.meshGroup.scale.set(0.95, 1.05, 0.95);
  }

  // Restores standard animation frames
  dodge() {
    if (this.state === 'dead' || this.state === 'hit' || this.state === 'dodge') return;
    
    // Check stamina
    if (this.ui.state.stamina < this.dodgeStaminaCost) return;
    
    this.ui.state.stamina -= this.dodgeStaminaCost;
    this.state = 'dodge';
    this.stateTimer = this.dodgeDuration;
    this.invulnerable = true;
    
    audio.playDodgeSound();

    // Determine dodge direction (based on input keys, or face forward if no input)
    const move = this.input.getMovementVector();
    if (move.x === 0 && move.z === 0) {
      // Dodge backward relative to player look
      this.dodgeVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.direction).normalize();
    } else {
      // Dodge in input direction
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.direction);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.direction);
      this.dodgeVector = new THREE.Vector3()
        .addScaledVector(forward, -move.z)
        .addScaledVector(right, move.x)
        .normalize();
    }
  }

  // Trigger combo melee sword attack
  attack() {
    if (this.state === 'dead' || this.state === 'hit' || this.state === 'dodge') return;
    
    // Check stamina
    if (this.ui.state.stamina < this.attackStaminaCost) return;

    // Trigger attacks
    if (this.state !== 'attacking') {
      this.ui.state.stamina -= this.attackStaminaCost;
      this.state = 'attacking';
      this.stateTimer = this.attackDuration;
      this.damageApplied = false;
      this.comboStep = 0;
      audio.playSwingSound();
    } else if (this.comboTimer > 0.1 && this.comboStep < 2) {
      // Buffer combo sequence
      this.ui.state.stamina -= this.attackStaminaCost;
      this.comboStep++;
      this.stateTimer = this.attackDuration;
      this.damageApplied = false;
      this.comboTimer = 0;
      audio.playSwingSound();
    }
  }

  // Hit reaction: player takes damage
  takeDamage(amount) {
    if (this.state === 'dead' || this.invulnerable) return;

    this.ui.state.health -= amount;
    this.ui.updateHUD();
    
    // Play sound
    audio.playHitSound();

    // Check death
    if (this.ui.state.health <= 0) {
      this.ui.state.health = 0;
      this.die();
      return;
    }

    // Play staggered animation
    this.state = 'hit';
    this.stateTimer = 0.3; // short stagger
  }

  die() {
    this.state = 'dead';
    audio.playDeathSound();
    this.ui.showGameOver();
  }

  respawn(bonfirePos) {
    this.position.copy(bonfirePos);
    this.meshGroup.position.copy(bonfirePos);
    this.meshGroup.rotation.set(0, 0, 0); // reset death rotation
    this.state = 'idle';
    this.ui.state.replenishPotions();
    this.ui.updateHUD();
  }

  update(deltaTime, camera) {
    if (this.state === 'dead') {
      // Collapse mesh on floor
      this.meshGroup.rotation.z = Math.PI / 2;
      this.meshGroup.position.y = THREE.MathUtils.lerp(this.meshGroup.position.y, this.physics.getTerrainHeight(this.position.x, this.position.z) + 0.1, 8.0 * deltaTime);
      return;
    }

    // Timer decreases
    if (this.stateTimer > 0) {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        // Reset state
        this.invulnerable = false;
        if (this.state === 'attacking') {
          this.comboTimer = 0.5; // combo buffer window starts
        }
        this.state = 'idle';
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.comboStep = 0; // reset combo chain
      }
    }

    // Stamina Regeneration / Consumption
    if (this.state !== 'sprinting' && this.state !== 'dodge' && this.state !== 'attacking') {
      this.ui.state.stamina = Math.min(this.ui.state.staminaMax, this.ui.state.stamina + this.staminaRegenRate * deltaTime);
    }

    // Update position and movement physics
    this.handleMovement(deltaTime, camera);
    
    // Animate weapon/armor rotations based on active action state
    this.animateMesh(deltaTime);

    // Update HUD
    this.ui.updateHUD();
  }

  handleMovement(deltaTime, camera) {
    if (this.state === 'hit') {
      // Staggered: push slightly backwards
      const backward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.direction);
      this.position.addScaledVector(backward, 3.0 * deltaTime);
      this.physics.resolveCollisions(this.position, 0.45);
      this.meshGroup.position.copy(this.position);
      return;
    }

    if (this.state === 'dodge') {
      // Dodge dash roll
      this.position.addScaledVector(this.dodgeVector, this.dodgeSpeed * deltaTime);
      this.physics.resolveCollisions(this.position, 0.45);
      this.meshGroup.position.copy(this.position);
      return;
    }

    // Get input vectors relative to camera looking angle
    const moveInput = this.input.getMovementVector();
    const isMoving = (moveInput.x !== 0 || moveInput.z !== 0);

    let speed = 4.8; // base walk
    
    if (isMoving && this.state !== 'attacking') {
      const isSprinting = this.input.isSprinting() && this.ui.state.stamina > 10;
      if (isSprinting) {
        speed = 8.5;
        this.state = 'sprinting';
        this.ui.state.stamina = Math.max(0, this.ui.state.stamina - this.sprintStaminaCost * deltaTime);
      } else {
        this.state = 'running';
      }

      // Convert local input keys into camera space direction vectors
      const camForward = camera.getForwardVector();
      const camRight = camera.getRightVector();
      
      const moveDir = new THREE.Vector3()
        .addScaledVector(camForward, -moveInput.z)
        .addScaledVector(camRight, moveInput.x)
        .normalize();

      // Smoothly rotate character toward movement vector
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.direction = this.lerpAngle(this.direction, targetAngle, 10.0 * deltaTime);

      // Translate character position
      this.position.addScaledVector(moveDir, speed * deltaTime);
    } else {
      if (this.state !== 'attacking' && this.state !== 'dodge') {
        this.state = 'idle';
      }
    }

    // Force turn toward lock-on target
    if (camera.lockedTarget) {
      const diff = new THREE.Vector3().copy(camera.lockedTarget.position).sub(this.position);
      this.direction = Math.atan2(diff.x, diff.z);
    }

    // Apply rotation
    this.meshGroup.rotation.y = this.direction;

    // Apply terrain height and boundaries
    this.physics.resolveCollisions(this.position, 0.45);
    this.meshGroup.position.copy(this.position);
  }

  // Procedural lifelike walks, runs, and combat swings animations
  animateMesh(deltaTime) {
    const time = Date.now() * 0.005;

    if (this.state === 'idle') {
      // Gentle breathing posture
      this.headGroup.position.y = 1.95 + Math.sin(time) * 0.015;
      this.torso.rotation.x = Math.sin(time) * 0.015;
      this.leftArm.rotation.set(0, 0, Math.sin(time) * 0.02);
      this.rightArm.rotation.set(Math.PI / 12, 0, -Math.sin(time) * 0.02);
      this.swordGroup.rotation.set(-Math.PI / 2, 0, 0);
      
      // Standard static leg curves
      this.thighL.rotation.set(0, 0, 0);
      this.shinL.rotation.set(0.05, 0, 0);
      this.thighR.rotation.set(0, 0, 0);
      this.shinR.rotation.set(0.05, 0, 0);
    } else if (this.state === 'running' || this.state === 'sprinting') {
      // Realistic walk stride with knee bending and body bobbing
      const multiplier = this.state === 'sprinting' ? 1.6 : 1.15;
      const swing = Math.sin(time * 2.2 * multiplier) * 0.42;

      // Hip thigh rotations
      this.thighL.rotation.x = swing;
      this.thighR.rotation.x = -swing;

      // Realistic Knee flex (Shin bends only when leg swings backward)
      this.shinL.rotation.x = swing < 0 ? -swing * 1.5 : 0.05;
      this.shinR.rotation.x = -swing < 0 ? swing * 1.5 : 0.05;

      // Opposing Arms swing
      this.leftArm.rotation.x = -swing * 0.65;
      this.rightArm.rotation.x = swing * 0.65 + Math.PI / 8; // holds weapon
      
      // Body Bobbing at twice leg swing frequency
      this.meshGroup.position.y = this.position.y + Math.cos(time * 4.4 * multiplier) * 0.06;
      
      // Spine/Torso forward lean & rotation sway
      this.torso.rotation.x = 0.12 + Math.abs(swing) * 0.05;
      this.torso.rotation.y = swing * 0.15;
      this.headGroup.rotation.y = -swing * 0.08;
      
      // Weapon sway
      this.swordGroup.rotation.set(-Math.PI / 2 + Math.sin(time * 2) * 0.1, 0, 0);
    } else if (this.state === 'dodge') {
      // Tucked ball rotation simulation
      this.meshGroup.rotation.x = -(this.stateTimer / this.dodgeDuration) * Math.PI * 2;
    } else if (this.state === 'attacking') {
      // Swing arc animation depending on combo index (0, 1, or 2)
      const pct = (this.attackDuration - this.stateTimer) / this.attackDuration;
      
      if (this.comboStep === 0) {
        // Horizontal sweep (Right to Left)
        this.rightArm.rotation.set(Math.PI/4, -Math.PI/3 + pct * Math.PI, 0);
        this.swordGroup.rotation.set(-Math.PI/3, 0, -Math.PI/6);
      } else if (this.comboStep === 1) {
        // Vertical overhead slam (Top down)
        this.rightArm.rotation.set(Math.PI/2 - pct * Math.PI, 0, 0);
        this.swordGroup.rotation.set(0, 0, 0);
      } else {
        // Heavy thrust stab (Back to front)
        this.rightArm.rotation.set(Math.PI/2, Math.PI/6 - pct * Math.PI/4, 0);
        this.swordGroup.rotation.set(-Math.PI/2, 0, 0);
      }
    } else if (this.state === 'hit') {
      // Recoil stagger tilt
      this.torso.rotation.x = -0.3;
      this.headGroup.rotation.x = -0.2;
      this.rightArm.rotation.set(Math.PI / 2, 0, Math.PI / 4);
      this.leftArm.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
    }
  }

  // Smooth angle wrap interpolation helper
  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }
}
