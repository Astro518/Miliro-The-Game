/**
 * MILIRO ENEMY AI ARCHITECTURE
 * Handles multiple enemy types, finite-state AI, patrol/chase nodes, attack triggers, and death outcomes.
 */

import * as THREE from 'three';
import { audio } from '../core/AudioManager.js';

export class Enemy {
  constructor(scene, physics, type, position, waypoints) {
    this.scene = scene;
    this.physics = physics;
    this.type = type; // 'skeleton', 'heavy', 'boss'
    
    // Position/Rotation
    this.position = new THREE.Vector3().copy(position);
    this.direction = Math.random() * Math.PI * 2;
    this.velocity = new THREE.Vector3();

    // Stats based on type
    this.setupStats();

    // AI State Machine: patrol, chase, attack, hit, dead
    this.state = 'patrol';
    this.stateTimer = 0;
    this.patrolIndex = 0;
    this.waypoints = waypoints || [this.position.clone()];

    // Combat tracking
    this.attackCooldown = 0;
    this.attackDuration = 0.5;
    this.damageApplied = false;

    // Create unique procedural 3D model
    this.createEnemyMesh();

    // Add to scene
    this.scene.add(this.meshGroup);
  }

  setupStats() {
    if (this.type === 'skeleton') {
      this.name = "Skeletal Guard";
      this.maxHealth = 40;
      this.health = this.maxHealth;
      this.damage = 10;
      this.speed = 3.2;
      this.detectRange = 12.0;
      this.attackRange = 2.0;
      this.xpValue = 25;
      this.soulsValue = 30;
      this.scale = 1.0;
    } else if (this.type === 'heavy') {
      this.name = "Ash Sentinel";
      this.maxHealth = 80;
      this.health = this.maxHealth;
      this.damage = 16;
      this.speed = 2.2;
      this.detectRange = 14.0;
      this.attackRange = 2.4;
      this.xpValue = 50;
      this.soulsValue = 75;
      this.scale = 1.25;
    } else if (this.type === 'boss') {
      this.name = "Malakor, The Ash Knight";
      this.maxHealth = 300;
      this.health = this.maxHealth;
      this.damage = 25;
      this.speed = 3.8;
      this.detectRange = 28.0;
      this.attackRange = 4.0;
      this.xpValue = 300;
      this.soulsValue = 500;
      this.scale = 2.2;
    }
  }

  // Create customized procedural meshes representing enemies (not generic boxes)
  createEnemyMesh() {
    this.meshGroup = new THREE.Group();
    this.meshGroup.position.copy(this.position);

    // Color systems
    const boneColor = this.type === 'boss' ? 0x2d3436 : 0x7f8c8d; // Boss is dark obsidian
    const eyeColor = this.type === 'boss' ? 0xff7675 : 0x00d2d3; // Boss glows volcanic red, skeletons glow cyan
    const armorColor = this.type === 'boss' ? 0x1e272e : 0x57606f;

    const boneMat = new THREE.MeshStandardMaterial({
      color: boneColor,
      roughness: 0.8,
      metalness: 0.1
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: armorColor,
      roughness: 0.4,
      metalness: 0.8
    });

    const glowMat = new THREE.MeshBasicMaterial({
      color: eyeColor
    });

    // Torso/Ribcage
    const torsoGeo = new THREE.CylinderGeometry(0.3 * this.scale, 0.15 * this.scale, 0.9 * this.scale, 6);
    const torso = new THREE.Mesh(torsoGeo, boneMat);
    torso.position.y = 0.85 * this.scale;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.meshGroup.add(torso);

    if (this.type === 'heavy' || this.type === 'boss') {
      // Add breastplate
      const chestGeo = new THREE.CylinderGeometry(0.35 * this.scale, 0.3 * this.scale, 0.5 * this.scale, 6);
      const chest = new THREE.Mesh(chestGeo, armorMat);
      chest.position.y = 1.0 * this.scale;
      chest.castShadow = true;
      this.meshGroup.add(chest);
    }

    // Helmet / Skull
    const skullGroup = new THREE.Group();
    skullGroup.position.y = 1.5 * this.scale;
    
    const skullGeo = new THREE.SphereGeometry(0.26 * this.scale, 8, 8);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.castShadow = true;
    skullGroup.add(skull);

    // Glowing Eyes
    const eyeGeo = new THREE.BoxGeometry(0.06 * this.scale, 0.04 * this.scale, 0.08 * this.scale);
    const eyeL = new THREE.Mesh(eyeGeo, glowMat);
    eyeL.position.set(-0.1 * this.scale, 0.05 * this.scale, 0.22 * this.scale);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1 * this.scale;
    
    skullGroup.add(eyeL);
    skullGroup.add(eyeR);

    this.meshGroup.add(skullGroup);
    this.skull = skullGroup;

    // Right Arm / Weapon
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.4 * this.scale, 1.1 * this.scale, 0);
    
    const armRGeo = new THREE.CylinderGeometry(0.07 * this.scale, 0.05 * this.scale, 0.6 * this.scale, 6);
    const armR = new THREE.Mesh(armRGeo, boneMat);
    armR.position.y = -0.3 * this.scale;
    armR.castShadow = true;
    this.rightArm.add(armR);

    // Weapon
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0, -0.5 * this.scale, 0.1 * this.scale);
    weaponGroup.rotation.x = -Math.PI / 2;

    const swordLength = this.type === 'boss' ? 2.4 : 1.3;
    const bladeGeo = new THREE.BoxGeometry(0.05 * this.scale, swordLength * this.scale, 0.02 * this.scale);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: this.type === 'boss' ? 0xff5252 : 0x7f8c8d, // Boss has fire sword
      emissive: this.type === 'boss' ? 0xb71515 : 0x000000,
      metalness: 0.9,
      roughness: 0.3
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = (swordLength / 2) * this.scale;
    blade.castShadow = true;
    weaponGroup.add(blade);

    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.3 * this.scale, 0.05 * this.scale, 0.05 * this.scale);
    const guard = new THREE.Mesh(guardGeo, boneMat);
    weaponGroup.add(guard);

    this.rightArm.add(weaponGroup);
    this.weapon = weaponGroup;
    this.meshGroup.add(this.rightArm);

    // Left Arm (with shield for heavy/boss)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.4 * this.scale, 1.1 * this.scale, 0);
    const armL = new THREE.Mesh(armRGeo, boneMat);
    armL.position.y = -0.3 * this.scale;
    this.leftArm.add(armL);

    if (this.type === 'heavy' || this.type === 'boss') {
      const shieldGeo = new THREE.BoxGeometry(0.6 * this.scale, 0.8 * this.scale, 0.05 * this.scale);
      const shield = new THREE.Mesh(shieldGeo, armorMat);
      shield.position.set(-0.1 * this.scale, -0.3 * this.scale, 0.1 * this.scale);
      shield.rotation.y = Math.PI / 12;
      shield.castShadow = true;
      this.leftArm.add(shield);
    }
    this.meshGroup.add(this.leftArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.08 * this.scale, 0.06 * this.scale, 0.7 * this.scale, 6);
    this.legL = new THREE.Mesh(legGeo, boneMat);
    this.legL.position.set(-0.16 * this.scale, 0.35 * this.scale, 0);
    this.legL.castShadow = true;
    this.meshGroup.add(this.legL);

    this.legR = new THREE.Mesh(legGeo, boneMat);
    this.legR.position.set(0.16 * this.scale, 0.35 * this.scale, 0);
    this.legR.castShadow = true;
    this.meshGroup.add(this.legR);
  }

  takeDamage(amount) {
    if (this.state === 'dead') return;

    this.health -= amount;
    
    // Play impact
    audio.playHitSound();

    if (this.health <= 0) {
      this.health = 0;
      this.die();
      return;
    }

    // Play hit stagger animation
    this.state = 'hit';
    this.stateTimer = 0.25;
  }

  die() {
    this.state = 'dead';
    this.stateTimer = 1.5; // duration of death fall/dissolve
    
    // Turn eye glows black
    this.skull.children.forEach(c => {
      if (c.material && c.material.color) {
        c.material.color.setHex(0x000000);
      }
    });

    // Emit sound
    audio.playDeathSound();
  }

  update(deltaTime, player, ui) {
    // 1. If Dead: collapse and fade away
    if (this.state === 'dead') {
      this.stateTimer -= deltaTime;
      
      // Fall down flat
      this.meshGroup.rotation.z = Math.PI / 2;
      this.meshGroup.position.y = THREE.MathUtils.lerp(this.meshGroup.position.y, this.physics.getTerrainHeight(this.position.x, this.position.z) + 0.1, 5.0 * deltaTime);
      
      if (this.stateTimer <= 0) {
        // Remove from scene
        this.scene.remove(this.meshGroup);
        // Grant rewards
        ui.state.gainXP(this.xpValue);
        ui.state.gainSouls(this.soulsValue);
        ui.state.updateQuestProgress(this.type);
        
        if (this.type === 'boss') {
          ui.hideBossHealth();
          ui.showVictory();
          audio.stopBossMusic();
        }
        return true; // remove from manager
      }
      return false;
    }

    // 2. Action states timers
    if (this.stateTimer > 0) {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        this.state = 'patrol';
      }
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Run AI Behavior
    this.handleAI(deltaTime, player, ui);

    // Procedural Mesh Motion
    this.animateEnemy(deltaTime);

    return false;
  }

  handleAI(deltaTime, player, ui) {
    if (this.state === 'hit') {
      // Recoil slightly
      const backVec = new THREE.Vector3().copy(this.position).sub(player.position).normalize();
      this.position.addScaledVector(backVec, 1.5 * deltaTime);
      this.physics.resolveCollisions(this.position, 0.45 * this.scale);
      this.meshGroup.position.copy(this.position);
      return;
    }

    if (this.state === 'attack') {
      // Attack state: execute swing hit frame
      const elapsed = this.attackDuration - this.stateTimer;
      
      // Hit frame (roughly 60% through swing duration)
      if (elapsed > this.attackDuration * 0.5 && !this.damageApplied) {
        this.damageApplied = true;
        const dist = this.position.distanceTo(player.position);
        if (dist <= this.attackRange * 1.1) {
          player.takeDamage(this.damage);
          
          // Show damage indicator on viewport
          const screenPos = this.projectToScreen(player.meshGroup.position);
          ui.showDamageNumber(screenPos.x, screenPos.y, `-${this.damage}`, 'damage-player');
        }
      }
      return;
    }

    const distToPlayer = this.position.distanceTo(player.position);

    // Update Boss health bar UI if Player is in range
    if (this.type === 'boss') {
      if (distToPlayer < this.detectRange) {
        ui.showBossHealth(this.name, this.health / this.maxHealth);
        audio.transitionToBossMusic();
      } else {
        ui.hideBossHealth();
        audio.stopBossMusic();
      }
    }

    // Finite State Logic
    if (distToPlayer <= this.attackRange && this.attackCooldown <= 0 && player.state !== 'dead') {
      // Attack Player
      this.state = 'attack';
      this.stateTimer = this.attackDuration;
      this.attackCooldown = 1.8 + Math.random() * 0.8;
      this.damageApplied = false;
      audio.playSwingSound();
    } else if (distToPlayer <= this.detectRange && player.state !== 'dead') {
      // Chase Player
      this.state = 'chase';
      
      // Move toward player
      const dir = new THREE.Vector3().copy(player.position).sub(this.position);
      dir.y = 0; // lock height
      dir.normalize();

      this.direction = Math.atan2(dir.x, dir.z);
      this.position.addScaledVector(dir, this.speed * deltaTime);
    } else {
      // Patrol waypoint route
      this.state = 'patrol';
      
      const targetWaypoint = this.waypoints[this.patrolIndex];
      const distToWaypoint = this.position.distanceTo(targetWaypoint);

      if (distToWaypoint < 1.0) {
        // Next waypoint
        this.patrolIndex = (this.patrolIndex + 1) % this.waypoints.length;
      } else {
        const dir = new THREE.Vector3().copy(targetWaypoint).sub(this.position);
        dir.y = 0;
        dir.normalize();

        this.direction = Math.atan2(dir.x, dir.z);
        this.position.addScaledVector(dir, (this.speed * 0.6) * deltaTime); // patrol slower
      }
    }

    // Orient mesh
    this.meshGroup.rotation.y = this.direction;

    // Apply ground collisions
    this.physics.resolveCollisions(this.position, 0.45 * this.scale);
    this.meshGroup.position.copy(this.position);
  }

  animateEnemy(deltaTime) {
    const time = Date.now() * 0.005;

    if (this.state === 'patrol' || this.state === 'chase') {
      const mult = this.state === 'chase' ? 1.4 : 0.8;
      const angle = Math.sin(time * 2.2) * 0.5 * mult;

      this.legL.rotation.x = angle;
      this.legR.rotation.x = -angle;

      this.rightArm.rotation.x = angle * 0.3 + Math.PI / 8;
      this.leftArm.rotation.x = -angle * 0.3;
      this.weapon.rotation.set(-Math.PI / 2, 0, 0);
    } else if (this.state === 'attack') {
      // Swing arc animation
      const pct = (this.attackDuration - this.stateTimer) / this.attackDuration;
      
      // Horizontal overhead chop
      this.rightArm.rotation.set(Math.PI/2 - pct * Math.PI, 0, 0);
      this.weapon.rotation.set(-Math.PI/4, 0, 0);
    } else if (this.state === 'hit') {
      // Stagger
      this.rightArm.rotation.set(Math.PI/2, 0, Math.PI/6);
    }
  }

  // Projects a 3D Vector to Screen Coordinates for Floating Text
  projectToScreen(worldPos) {
    const tempV = new THREE.Vector3().copy(worldPos);
    tempV.y += 1.5 * this.scale; // project near entity head
    
    // Project using scene camera (provided dynamically in main loop)
    const glCanvas = this.scene.userData.canvas;
    const glCam = this.scene.userData.camera;
    
    if (!glCam) return { x: 0, y: 0 };

    tempV.project(glCam);
    
    const x = (tempV.x *  .5 + .5) * glCanvas.clientWidth;
    const y = (tempV.y * -.5 + .5) * glCanvas.clientHeight;
    
    return { x, y };
  }
}
