/**
 * MILIRO GAME INPUT HANDLER
 * Manages keyboard state, mouse pointer lock, look angles, attacks, and dodge triggers.
 */

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Key state map
    this.keys = {};
    
    // Mouse tracking
    this.mouse = {
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      leftClicked: false,
      rightClicked: false,
      rKeyPressed: false
    };

    // Callback triggers (one-shot actions)
    this.onAttack = null;      // Left Click
    this.onLockToggle = null;  // Right Click or R Key
    this.onDodge = null;       // Space
    this.onPotion = null;      // Q Key
    this.onInventory = null;   // I Key
    this.onPause = null;       // Escape Key

    this.isPointerLocked = false;

    // Bind event listeners
    this.setupListeners();
  }

  setupListeners() {
    // Keyboard key down
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys[code] = true;

      // Single triggers
      if (code === 'Space') {
        e.preventDefault();
        if (this.onDodge) this.onDodge();
      }
      if (code === 'KeyQ') {
        if (this.onPotion) this.onPotion();
      }
      if (code === 'KeyI') {
        if (this.onInventory) this.onInventory();
      }
      if (code === 'Escape') {
        if (this.onPause) this.onPause();
      }
      if (code === 'KeyR') {
        if (this.onLockToggle) this.onLockToggle();
      }
    });

    // Keyboard key up
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Pointer Lock events
    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.canvas);
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouse.dx = e.movementX;
        this.mouse.dy = e.movementY;
      }
    });

    // Mouse click
    document.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      
      if (e.button === 0) { // Left click
        this.mouse.leftClicked = true;
        if (this.onAttack) this.onAttack();
      }
      if (e.button === 2) { // Right click
        e.preventDefault();
        this.mouse.rightClicked = true;
        if (this.onLockToggle) this.onLockToggle();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.leftClicked = false;
      if (e.button === 2) this.mouse.rightClicked = false;
    });

    // Disable right click context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Clear frame-based mouse deltas
  update() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }

  // Helper check for movement keys
  getMovementVector() {
    const vector = { x: 0, z: 0 };
    if (this.keys['KeyW'] || this.keys['ArrowUp']) vector.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) vector.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) vector.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) vector.x += 1;
    return vector;
  }

  isSprinting() {
    return !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];
  }
}
