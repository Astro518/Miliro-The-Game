/**
 * MILIRO HUD & MENUS CONTROLLER
 * Links GameState data to HTML DOM elements.
 */

export class UI {
  constructor(gameState, onStartGame, onSaveGame, onRespawn, onResume) {
    this.state = gameState;
    this.onStart = onStartGame;
    this.onSave = onSaveGame;
    this.onRespawn = onRespawn;
    this.onResume = onResume;

    // DOM Elements Cache
    this.hud = document.getElementById('hud');
    this.mainMenu = document.getElementById('main-menu');
    this.pauseMenu = document.getElementById('pause-menu');
    this.inventoryMenu = document.getElementById('inventory-menu');
    this.tutorialModal = document.getElementById('tutorial-modal');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.victoryScreen = document.getElementById('victory-screen');

    // HUD Bars
    this.healthBar = document.getElementById('hud-health-bar');
    this.staminaBar = document.getElementById('hud-stamina-bar');
    this.xpBar = document.getElementById('hud-xp-bar');
    this.levelIndicator = document.getElementById('hud-level');
    
    this.healthVal = document.getElementById('hud-health-val');
    this.healthMax = document.getElementById('hud-health-max');
    this.staminaVal = document.getElementById('hud-stamina-val');
    this.staminaMax = document.getElementById('hud-stamina-max');
    this.xpVal = document.getElementById('hud-xp-val');
    this.xpMax = document.getElementById('hud-xp-max');

    // Boss HUD
    this.bossHud = document.getElementById('boss-hud');
    this.bossHealthBar = document.getElementById('boss-health-bar');
    this.bossName = document.getElementById('boss-name');

    // Stats & Inventory
    this.soulsCounter = document.getElementById('hud-souls');
    this.statSouls = document.getElementById('stat-souls');
    this.statLevel = document.getElementById('stat-level');
    this.statHpCurrent = document.getElementById('stat-hp-current');
    this.statHpMax = document.getElementById('stat-hp-max');
    this.statStCurrent = document.getElementById('stat-st-current');
    this.statStMax = document.getElementById('stat-st-max');
    
    this.statStr = document.getElementById('stat-str');
    this.statDex = document.getElementById('stat-dex');
    this.statVit = document.getElementById('stat-vit');
    this.levelCost = document.getElementById('level-cost');
    this.inventoryGrid = document.getElementById('inventory-grid');
    this.potionCount = document.getElementById('potion-count');

    // Quest
    this.questDesc = document.getElementById('quest-desc');

    // Reticle
    this.reticle = document.getElementById('lockon-reticle');
    this.damageNumbersContainer = document.getElementById('damage-numbers-container');

    // Setup Event Listeners
    this.setupListeners();
  }

  setupListeners() {
    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      this.mainMenu.classList.add('hidden');
      this.hud.classList.remove('hidden');
      this.onStart(false); // start fresh
    });

    const loadBtn = document.getElementById('btn-load');
    // Enable load button if save data exists
    if (localStorage.getItem(this.state.saveKey)) {
      loadBtn.removeAttribute('disabled');
      loadBtn.addEventListener('click', () => {
        this.mainMenu.classList.add('hidden');
        this.hud.classList.remove('hidden');
        this.onStart(true); // load save
      });
    }

    document.getElementById('btn-tutorial').addEventListener('click', () => {
      this.tutorialModal.classList.remove('hidden');
    });

    document.getElementById('btn-close-tutorial').addEventListener('click', () => {
      this.tutorialModal.classList.add('hidden');
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.closePauseMenu();
      this.onResume();
    });

    document.getElementById('btn-save').addEventListener('click', () => {
      this.onSave();
      alert("Game state saved to bonfire ashes.");
    });

    document.getElementById('btn-inventory-pause').addEventListener('click', () => {
      this.pauseMenu.classList.add('hidden');
      this.openInventory();
    });

    document.getElementById('btn-close-inventory').addEventListener('click', () => {
      this.closeInventory();
      this.openPauseMenu();
    });

    document.getElementById('btn-menu-exit').addEventListener('click', () => {
      if (confirm("Are you sure you want to abandon your journey? Unsaved progress will return to dust.")) {
        window.location.reload();
      }
    });

    document.getElementById('btn-respawn').addEventListener('click', () => {
      this.gameOverScreen.classList.add('hidden');
      this.onRespawn();
    });

    document.getElementById('btn-continue-victory').addEventListener('click', () => {
      this.victoryScreen.classList.add('hidden');
    });

    // Level up stat buttons
    document.querySelectorAll('.btn-level-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stat = e.target.getAttribute('data-stat');
        if (this.state.levelUpStat(stat)) {
          this.updateHUD();
          this.updateStatsPanel();
        } else {
          alert("Insufficient Souls. Defeat more enemies to harvest their souls.");
        }
      });
    });

    // Quick Slot Potion Click
    document.getElementById('quick-slot-potion').addEventListener('click', () => {
      this.triggerHeal();
    });
  }

  triggerHeal() {
    const healAmount = this.state.usePotion();
    if (healAmount > 0) {
      this.updateHUD();
      this.potionCount.textContent = this.state.potions;
      // Show floating positive number
      this.showDamageNumber(window.innerWidth / 2, window.innerHeight / 2 - 50, `+${healAmount}`, 'damage-enemy');
      return true;
    }
    return false;
  }

  updateHUD() {
    // HP
    const hpPct = Math.max(0, (this.state.health / this.state.maxHealth) * 100);
    this.healthBar.style.width = `${hpPct}%`;
    this.healthVal.textContent = Math.ceil(this.state.health);
    this.healthMax.textContent = this.state.maxHealth;

    // Stamina
    const stPct = Math.max(0, (this.state.stamina / this.state.maxStamina) * 100);
    this.staminaBar.style.width = `${stPct}%`;
    this.staminaVal.textContent = Math.ceil(this.state.stamina);
    this.staminaMax.textContent = this.state.maxStamina;

    // XP
    const xpPct = (this.state.xp / this.state.xpToNextLevel) * 100;
    this.xpBar.style.width = `${xpPct}%`;
    this.xpVal.textContent = this.state.xp;
    this.xpMax.textContent = this.state.xpToNextLevel;

    // Level & Souls
    this.levelIndicator.textContent = this.state.level;
    this.soulsCounter.textContent = this.state.souls;
    this.potionCount.textContent = this.state.potions;

    // Quest tracker
    this.questDesc.textContent = `${this.state.quest.description} (${this.state.quest.currentCount}/${this.state.quest.targetCount})`;
    if (this.state.quest.completed && this.state.quest.id === 'slay_boss') {
      this.questDesc.textContent = "Victory Achieved. Kingdom Redeemed.";
    }
  }

  openPauseMenu() {
    this.pauseMenu.classList.remove('hidden');
  }

  closePauseMenu() {
    this.pauseMenu.classList.add('hidden');
  }

  openInventory() {
    this.inventoryMenu.classList.remove('hidden');
    this.updateStatsPanel();
    this.renderInventoryItems();
  }

  closeInventory() {
    this.inventoryMenu.classList.add('hidden');
  }

  updateStatsPanel() {
    this.statSouls.textContent = this.state.souls;
    this.statLevel.textContent = this.state.level;
    this.statHpCurrent.textContent = Math.ceil(this.state.health);
    this.statHpMax.textContent = this.state.maxHealth;
    this.statStCurrent.textContent = Math.ceil(this.state.stamina);
    this.statStMax.textContent = this.state.maxStamina;
    
    this.statStr.textContent = this.state.stats.str;
    this.statDex.textContent = this.state.stats.dex;
    this.statVit.textContent = this.state.stats.vit;
    this.levelCost.textContent = this.state.calculateLevelCost();
  }

  renderInventoryItems() {
    this.inventoryGrid.innerHTML = '';
    
    // Equipped Sword Slot
    const swordSlot = document.createElement('div');
    swordSlot.className = 'inventory-item-slot';
    swordSlot.innerHTML = `
      <svg class="inventory-item-icon" viewBox="0 0 24 24"><path d="M21.92,2.08C21.66,1.82 21.28,1.82 21.03,2.08L14.73,8.38C14.53,8.58 14.47,8.87 14.58,9.13L15.34,10.9L9.22,17H6.5V19.5H4V22H6.5V19.5H9.22L15.34,13.38L17.1,14.14C17.36,14.25 17.65,14.19 17.85,13.99L21.92,9.92C22.41,9.43 22.41,8.64 21.92,8.15L21.92,2.08M17.25,9.66L15.75,8.16L20.25,3.66L21.75,5.16L17.25,9.66Z"/></svg>
      <span class="item-count-badge">E</span>
    `;
    this.inventoryGrid.appendChild(swordSlot);

    // Potions
    const potionSlot = document.createElement('div');
    potionSlot.className = 'inventory-item-slot';
    potionSlot.innerHTML = `
      <svg class="inventory-item-icon" viewBox="0 0 24 24"><path d="M12,2A3,3 0 0,0 9,5V6H7A2,2 0 0,0 5,8V18A4,4 0 0,0 9,22H15A4,4 0 0,0 19,18V8A2,2 0 0,0 17,6H15V5A3,3 0 0,0 12,2M12,4A1,1 0 0,1 13,5V6H11V5A1,1 0 0,1 12,4"/></svg>
      <span class="item-count-badge">${this.state.potions}</span>
    `;
    potionSlot.addEventListener('click', () => {
      if (this.triggerHeal()) {
        this.renderInventoryItems();
        this.updateStatsPanel();
      }
    });
    this.inventoryGrid.appendChild(potionSlot);

    // Empty grid spaces to look clean
    for (let i = 2; i < 16; i++) {
      const emptySlot = document.createElement('div');
      emptySlot.className = 'inventory-item-slot empty';
      this.inventoryGrid.appendChild(emptySlot);
    }
  }

  showBossHealth(name, hpPct) {
    this.bossHud.classList.remove('hidden');
    this.bossName.textContent = name;
    this.bossHealthBar.style.width = `${Math.max(0, hpPct * 100)}%`;
  }

  hideBossHealth() {
    this.bossHud.classList.add('hidden');
  }

  showDamageNumber(x, y, value, typeClass = 'damage-enemy') {
    const el = document.createElement('div');
    el.className = `damage-number ${typeClass}`;
    el.textContent = value;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    
    this.damageNumbersContainer.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 750);
  }

  showGameOver() {
    this.gameOverScreen.classList.remove('hidden');
  }

  showVictory() {
    this.victoryScreen.classList.remove('hidden');
  }

  updateReticlePosition(projPosition, visible) {
    if (!visible) {
      this.reticle.classList.add('hidden');
      return;
    }

    this.reticle.classList.remove('hidden');
    this.reticle.style.left = `${projPosition.x}px`;
    this.reticle.style.top = `${projPosition.y}px`;
  }
}
