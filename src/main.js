/**
 * MILIRO ACTION RPG - MAIN GAME LOOP & ARCHITECTURE
 * Instantiates subsystems, controls entities updates, runs combat hit scans, and interacts with bonfires.
 */

import * as THREE from 'three';
import { GameState } from './core/GameState.js';
import { UI } from './ui/UI.js';
import { Input } from './core/Input.js';
import { GameCamera } from './core/Camera.js';
import { Physics } from './core/Physics.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { audio } from './core/AudioManager.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.enemies = [];
    this.lastTime = 0;
    this.gameStarted = false;
    this.paused = false;

    // 1. Initial WebGL Scene setup
    this.initThree();

    // 2. Initialize Core Subsystems
    this.physics = new Physics();
    this.gameState = new GameState();
    this.input = new Input(this.canvas);
    
    // Bind UI controls
    this.ui = new UI(
      this.gameState,
      (loadSave) => this.startGame(loadSave),
      () => this.gameState.saveGame(),
      () => this.respawnAtBonfire(),
      () => { this.paused = false; } // Resume
    );

    this.cameraController = new GameCamera(this.camera, this.input);
    this.world = new World(this.scene, this.physics);

    // Save camera & canvas inside scene data for projecting screen coords
    this.scene.userData.canvas = this.canvas;
    this.scene.userData.camera = this.camera;

    // 3. Bind Keyboard One-Shot Triggers
    this.setupInputBinds();

    // 4. Handle window resizing
    window.addEventListener('resize', () => this.onResize());

    // 5. Start Game Loop (runs in background but updates only when gameStarted is true)
    requestAnimationFrame((t) => this.loop(t));
  }

  initThree() {
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize performance on high-dpi displays
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  setupInputBinds() {
    // Attack
    this.input.onAttack = () => {
      if (!this.gameStarted || this.paused || this.gameState.health <= 0) return;
      this.player.attack();
    };

    // Dodge Roll
    this.input.onDodge = () => {
      if (!this.gameStarted || this.paused || this.gameState.health <= 0) return;
      this.player.dodge();
    };

    // Lock-on Target
    this.input.onLockToggle = () => {
      if (!this.gameStarted || this.paused || this.gameState.health <= 0) return;
      
      if (this.cameraController.lockedTarget) {
        // Unlock
        this.cameraController.unlock();
        audio.playLockOnSound();
      } else {
        // Try lock to nearest target
        const target = this.findClosestEnemy(18.0);
        if (target) {
          this.cameraController.lockOn(target);
          audio.playLockOnSound();
        }
      }
    };

    // Restore Potion
    this.input.onPotion = () => {
      if (!this.gameStarted || this.paused || this.gameState.health <= 0) return;
      this.ui.triggerHeal();
    };

    // Pause menu toggle
    this.input.onPause = () => {
      if (!this.gameStarted || this.gameState.health <= 0) return;
      
      this.paused = !this.paused;
      if (this.paused) {
        this.ui.openPauseMenu();
        document.exitPointerLock();
      } else {
        this.ui.closePauseMenu();
        this.canvas.requestPointerLock();
      }
    };

    // Inventory Menu
    this.input.onInventory = () => {
      if (!this.gameStarted || this.paused || this.gameState.health <= 0) return;
      
      this.paused = true;
      this.ui.openInventory();
      document.exitPointerLock();
    };
  }

  startGame(loadSave) {
    // Initialize Web Audio
    audio.init();

    if (loadSave) {
      this.gameState.loadGame();
    } else {
      this.gameState.resetState();
    }

    // Instantiation Player
    this.player = new Player(this.scene, this.physics, this.input, this.ui);
    this.player.respawn(new THREE.Vector3(0, 1, 0));

    // Spawn Enemy NPC units
    this.spawnEnemies();

    this.gameStarted = true;
    this.paused = false;
    this.lastTime = performance.now();
    
    // Clear and update HUD elements
    this.ui.updateHUD();
    
    // Request pointer lock
    this.canvas.requestPointerLock();
  }

  spawnEnemies() {
    // Clean up existing
    this.enemies.forEach(e => {
      this.scene.remove(e.meshGroup);
    });
    this.enemies = [];

    // Patrol waypoints lists
    const skeletonPath1 = [
      new THREE.Vector3(-10, 0, -12),
      new THREE.Vector3(-20, 0, -15),
      new THREE.Vector3(-15, 0, -25)
    ];

    const skeletonPath2 = [
      new THREE.Vector3(15, 0, -8),
      new THREE.Vector3(25, 0, -12),
      new THREE.Vector3(20, 0, -5)
    ];

    const skeletonPath3 = [
      new THREE.Vector3(-20, 0, 10),
      new THREE.Vector3(-30, 0, 15),
      new THREE.Vector3(-25, 0, 5)
    ];

    const sentinelPath = [
      new THREE.Vector3(0, 0, -18),
      new THREE.Vector3(-8, 0, -18),
      new THREE.Vector3(8, 0, -18)
    ];

    // Align waypoints to terrain height automatically
    const alignPath = (path) => {
      path.forEach(pt => {
        pt.y = this.physics.getTerrainHeight(pt.x, pt.z);
      });
      return path;
    };

    // 1. Regular Skeletal guards
    this.enemies.push(new Enemy(this.scene, this.physics, 'skeleton', new THREE.Vector3(-10, 0, -12), alignPath(skeletonPath1)));
    this.enemies.push(new Enemy(this.scene, this.physics, 'skeleton', new THREE.Vector3(15, 0, -8), alignPath(skeletonPath2)));
    this.enemies.push(new Enemy(this.scene, this.physics, 'skeleton', new THREE.Vector3(-20, 0, 10), alignPath(skeletonPath3)));

    // 2. Heavy Sentinel
    this.enemies.push(new Enemy(this.scene, this.physics, 'heavy', new THREE.Vector3(0, 0, -18), alignPath(sentinelPath)));

    // 3. Keep Boss (Malakor) at center keep
    // Spawn only if not defeated in loaded save
    if (!this.gameState.bossDefeated) {
      const bossPos = new THREE.Vector3(0, 0, -40);
      bossPos.y = this.physics.getTerrainHeight(bossPos.x, bossPos.z);
      this.enemies.push(new Enemy(this.scene, this.physics, 'boss', bossPos, [bossPos]));
    }
  }

  respawnAtBonfire() {
    this.player.respawn(new THREE.Vector3(0, 1, 0));
    this.cameraController.unlock();
    
    // Reset regular enemies on death
    this.spawnEnemies();
    this.paused = false;
    this.ui.updateHUD();
    this.canvas.requestPointerLock();
  }

  findClosestEnemy(maxRange) {
    let closest = null;
    let minDist = maxRange;

    this.enemies.forEach(enemy => {
      if (enemy.state === 'dead') return;
      const d = this.player.position.distanceTo(enemy.position);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    });

    return closest;
  }

  // Combat collision sweep checks
  checkCombatCollisions() {
    if (this.player.state !== 'attacking' || this.player.damageApplied) return;

    // Player sword sweep hitbox sphere center (offset forward relative to character)
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.direction);
    const hitSphereCenter = new THREE.Vector3().copy(this.player.position).addScaledVector(forward, 1.6);
    
    // Increase hitbox radius depending on combo step
    const hitRadius = this.player.comboStep === 2 ? 2.5 : 1.8;

    this.enemies.forEach(enemy => {
      if (enemy.state === 'dead' || enemy.state === 'hit') return;

      const dist = hitSphereCenter.distanceTo(enemy.position);
      if (dist <= hitRadius + 0.6) {
        // Calculate dynamic damage base
        let baseDamage = 10 + Math.floor(this.gameState.stats.str * 1.5);
        let textType = 'damage-enemy';

        // Combo multipliers
        if (this.player.comboStep === 1) {
          baseDamage = Math.floor(baseDamage * 1.25);
        } else if (this.player.comboStep === 2) {
          baseDamage = Math.floor(baseDamage * 1.6);
          textType = 'damage-crit';
        }

        // Apply Damage
        enemy.takeDamage(baseDamage);
        
        // Show Floating Damage Text
        const screenCoords = enemy.projectToScreen(enemy.position);
        this.ui.showDamageNumber(screenCoords.x, screenCoords.y, baseDamage, textType);
        
        this.player.damageApplied = true;
      }
    });
  }

  // Handle rest at central bonfire (heals, restores potions, resets/respawns enemies, saves game)
  checkBonfireRest() {
    if (this.gameState.health <= 0) return;

    const spawnBonfire = this.world.bonfires[0];
    const dist = this.player.position.distanceTo(spawnBonfire.position);
    
    // Display rest tooltip when in range
    const restHintId = 'bonfire-rest-hint';
    let restHintEl = document.getElementById(restHintId);

    if (dist < 3.2) {
      if (!restHintEl) {
        restHintEl = document.createElement('div');
        restHintEl.id = restHintId;
        restHintEl.style.position = 'absolute';
        restHintEl.style.bottom = '110px';
        restHintEl.style.left = '50%';
        restHintEl.style.transform = 'translateX(-50%)';
        restHintEl.style.fontFamily = 'Cinzel, serif';
        restHintEl.style.fontSize = '12px';
        restHintEl.style.color = '#debe87';
        restHintEl.style.textShadow = '0 2px 4px #000';
        restHintEl.style.letterSpacing = '1px';
        restHintEl.style.pointerEvents = 'none';
        restHintEl.style.zIndex = '12';
        restHintEl.textContent = 'PRESS [E] TO REST AT BONFIRE';
        document.body.appendChild(restHintEl);
      }

      // Check key press
      if (this.input.keys['KeyE']) {
        // Trigger Rest
        this.gameState.replenishPotions();
        this.spawnEnemies(); // respawn skeleton guards
        this.gameState.saveGame();
        
        audio.playLevelUpSound(); // play bells/chimes

        this.ui.updateHUD();
        this.ui.showDamageNumber(window.innerWidth / 2, window.innerHeight / 2 - 50, "BONFIRE LIT - FLAME REPLENISHED", "damage-enemy");
        
        // Brief lock keys to prevent rapid fires
        this.input.keys['KeyE'] = false;
      }
    } else {
      if (restHintEl) {
        restHintEl.remove();
      }
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));

    const deltaTime = Math.min((timestamp - this.lastTime) * 0.001, 0.1); // cap physics step to 10fps minimum
    this.lastTime = timestamp;

    if (!this.gameStarted || this.paused) {
      // Just keep rendering background scene static
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Update Subsystems
    this.player.update(deltaTime, this.cameraController);
    this.cameraController.update(this.player.position, deltaTime);
    this.world.update(deltaTime);

    // 2. Update and clean up enemies list
    this.enemies = this.enemies.filter(enemy => {
      const removed = enemy.update(deltaTime, this.player, this.ui);
      // Remove lock-on target if it dies
      if (removed && this.cameraController.lockedTarget === enemy) {
        this.cameraController.unlock();
      }
      return !removed;
    });

    // 3. Combat sweeps & hit registration
    this.checkCombatCollisions();

    // 4. Bonfire vicinity scan
    this.checkBonfireRest();

    // 5. Project lock-on target reticle to HUD
    if (this.cameraController.lockedTarget && this.cameraController.lockedTarget.state !== 'dead') {
      const screenPos = this.cameraController.lockedTarget.projectToScreen(this.cameraController.lockedTarget.position);
      this.ui.updateReticlePosition(screenPos, true);
    } else {
      this.ui.updateReticlePosition(null, false);
    }

    // 6. Clear frames deltas
    this.input.update();

    // 7. Render frames
    this.renderer.render(this.scene, this.camera);
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
