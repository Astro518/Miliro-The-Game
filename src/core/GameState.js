/**
 * MILIRO GAME STATE MANAGER
 * Manages stats, inventory, levels, saving/loading, and quests.
 */

export class GameState {
  constructor() {
    this.saveKey = 'miliro_save_data';
    this.resetState();
  }

  resetState() {
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.souls = 0;
    
    // Stats
    this.stats = {
      str: 12, // Strength: modifies damage
      dex: 10, // Dexterity: modifies speed/dodge cost
      vit: 11  // Vitality: modifies max health
    };

    this.maxHealth = this.calculateMaxHealth();
    this.health = this.maxHealth;

    this.maxStamina = 100;
    this.stamina = this.maxStamina;

    // Inventory
    this.potions = 5;
    this.maxPotions = 5;
    
    // Quest
    this.quest = {
      id: 'ruin_cleansing',
      description: 'Explore the ruins and defeat the skeletal guards',
      targetCount: 3,
      currentCount: 0,
      completed: false
    };

    // Game stats
    this.enemiesDefeated = 0;
    this.bossDefeated = false;
    this.checkpointReached = false;
  }

  calculateMaxHealth() {
    // Each Vitality point adds 10 HP
    return 70 + (this.stats.vit * 10);
  }

  calculateLevelCost() {
    // exponential level scaling cost (standard RPG)
    return Math.floor(50 * Math.pow(1.3, this.level - 1));
  }

  gainXP(amount) {
    if (this.bossDefeated && this.quest.completed) {
      // Free exploration post-game
    }
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.4);
      // Give stat bonuses automatically or let them allocate? We allow manual allocation in Inventory, 
      // but let's increase base Vitality by 1 to raise max health and fully heal player.
      this.stats.vit += 1;
      this.maxHealth = this.calculateMaxHealth();
      this.health = this.maxHealth;
      leveledUp = true;
    }
    this.saveGame();
    return leveledUp;
  }

  gainSouls(amount) {
    this.souls += amount;
    this.saveGame();
  }

  spendSouls(amount) {
    if (this.souls >= amount) {
      this.souls -= amount;
      this.saveGame();
      return true;
    }
    return false;
  }

  levelUpStat(statName) {
    const cost = this.calculateLevelCost();
    if (this.spendSouls(cost)) {
      this.stats[statName]++;
      if (statName === 'vit') {
        const prevMax = this.maxHealth;
        this.maxHealth = this.calculateMaxHealth();
        // Heal for the amount of max health gained
        this.health += (this.maxHealth - prevMax);
      }
      this.saveGame();
      return true;
    }
    return false;
  }

  usePotion() {
    if (this.potions > 0 && this.health < this.maxHealth) {
      this.potions--;
      // Heal 45% of max health
      const healAmount = Math.floor(this.maxHealth * 0.45);
      this.health = Math.min(this.maxHealth, this.health + healAmount);
      this.saveGame();
      return healAmount;
    }
    return 0;
  }

  replenishPotions() {
    this.potions = this.maxPotions;
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
  }

  updateQuestProgress(enemyType) {
    if (this.quest.completed) return false;

    if (enemyType === 'skeleton') {
      this.quest.currentCount++;
      if (this.quest.currentCount >= this.quest.targetCount) {
        this.quest.currentCount = this.quest.targetCount;
        this.quest.completed = true;
        this.gainSouls(200);
        this.gainXP(150);
        
        // Progress to boss quest
        this.quest = {
          id: 'slay_boss',
          description: 'Enter the keeps core and defeat Malakor, The Ash Knight',
          targetCount: 1,
          currentCount: 0,
          completed: false
        };
      }
      this.saveGame();
      return true;
    } else if (enemyType === 'boss') {
      this.quest.currentCount = 1;
      this.quest.completed = true;
      this.bossDefeated = true;
      this.gainSouls(1000);
      this.gainXP(500);
      this.saveGame();
      return true;
    }
    return false;
  }

  saveGame() {
    const data = {
      level: this.level,
      xp: this.xp,
      xpToNextLevel: this.xpToNextLevel,
      souls: this.souls,
      stats: this.stats,
      health: this.health,
      maxHealth: this.maxHealth,
      potions: this.potions,
      quest: this.quest,
      enemiesDefeated: this.enemiesDefeated,
      bossDefeated: this.bossDefeated,
      checkpointReached: this.checkpointReached
    };
    try {
      localStorage.setItem(this.saveKey, JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage: ", e);
    }
  }

  loadGame() {
    try {
      const dataStr = localStorage.getItem(this.saveKey);
      if (dataStr) {
        const data = JSON.parse(dataStr);
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.xpToNextLevel = data.xpToNextLevel || 100;
        this.souls = data.souls || 0;
        this.stats = data.stats || { str: 12, dex: 10, vit: 11 };
        this.maxHealth = this.calculateMaxHealth();
        this.health = Math.min(this.maxHealth, data.health || this.maxHealth);
        this.potions = data.potions !== undefined ? data.potions : 5;
        this.quest = data.quest || this.quest;
        this.enemiesDefeated = data.enemiesDefeated || 0;
        this.bossDefeated = data.bossDefeated || false;
        this.checkpointReached = data.checkpointReached || false;
        return true;
      }
    } catch (e) {
      console.warn("Could not load from localStorage: ", e);
    }
    return false;
  }

  clearSave() {
    try {
      localStorage.removeItem(this.saveKey);
      this.resetState();
    } catch (e) {
      console.warn(e);
    }
  }
}
