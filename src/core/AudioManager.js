/**
 * MILIRO PROCEDURAL AUDIO MANAGER
 * Uses HTML5 Web Audio API to synthesize dark fantasy music and combat sound effects on the fly.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicNode = null;
    this.ambientOscillators = [];
    this.isPlayingMusic = false;
    this.isBossTheme = false;
  }

  // Initialize Web Audio Context on first interaction
  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.startAmbientMusic();
  }

  // Synthesize a sweeping, low-pass synth pad drone (Dark Souls style ambient)
  startAmbientMusic() {
    if (!this.ctx || this.isPlayingMusic) return;
    this.isPlayingMusic = true;

    // Create deep master bass drone
    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    droneGain.connect(this.ctx.destination);

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    
    // Minor-chord root notes (D minor/C minor progression)
    osc1.frequency.setValueAtTime(55.0, this.ctx.currentTime); // A1
    osc2.frequency.setValueAtTime(65.4, this.ctx.currentTime); // C2

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(4, this.ctx.currentTime);
    filter.frequency.setValueAtTime(150, this.ctx.currentTime);

    // Patch: osc -> filter -> gain
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(droneGain);

    osc1.start();
    osc2.start();

    this.ambientOscillators.push(osc1, osc2);

    // Procedural ambient sweeps
    this.musicInterval = setInterval(() => {
      if (!this.ctx || this.isBossTheme) return;
      
      // Sweep lowpass filter for atmospheric movement
      const now = this.ctx.currentTime;
      filter.frequency.exponentialRampToValueAtTime(120 + Math.random() * 250, now + 8.0);
      
      // Randomly change notes in a dark minor chord sequence
      const notes = [
        [55.0, 65.4],  // A1, C2
        [48.9, 58.2],  // G1, A#1
        [41.2, 55.0],  // E1, A1
        [36.7, 43.6]   // D1, F1
      ];
      const selected = notes[Math.floor(Math.random() * notes.length)];
      osc1.frequency.exponentialRampToValueAtTime(selected[0], now + 5.0);
      osc2.frequency.exponentialRampToValueAtTime(selected[1], now + 6.0);
    }, 9000);
  }

  // Transition music to a faster, chaotic battle theme for the Boss
  transitionToBossMusic() {
    if (!this.ctx || this.isBossTheme) return;
    this.isBossTheme = true;

    // Clear ambient loops
    this.ambientOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.ambientOscillators = [];
    if (this.musicInterval) clearInterval(this.musicInterval);

    // Create chaotic choir/brass synth
    const bossGain = this.ctx.createGain();
    bossGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    bossGain.connect(this.ctx.destination);

    const playBossBeat = () => {
      if (!this.ctx || !this.isBossTheme) return;
      const now = this.ctx.currentTime;

      // Heavy low impact
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(80, now);
      kick.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
      kickGain.gain.setValueAtTime(0.3, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      kick.connect(kickGain);
      kickGain.connect(this.ctx.destination);
      kick.start();
      kick.stop(now + 0.5);

      // Chilling brass chords (Tritone progression)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      const baseNotes = [110, 116.5, 98, 104]; // Dark diminished chords
      const noteIdx = Math.floor(now / 2) % baseNotes.length;
      const f1 = baseNotes[noteIdx];
      const f2 = f1 * 1.5; // Perfect 5th

      osc1.frequency.setValueAtTime(f1, now);
      osc2.frequency.setValueAtTime(f2, now);

      bGain.gain.setValueAtTime(0.0, now);
      bGain.gain.linearRampToValueAtTime(0.05, now + 0.1);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(400, now);

      osc1.connect(lp);
      osc2.connect(lp);
      lp.connect(bGain);
      bGain.connect(bossGain);

      osc1.start();
      osc2.start();
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    };

    // Play loop
    this.bossMusicInterval = setInterval(playBossBeat, 1000);
  }

  stopBossMusic() {
    this.isBossTheme = false;
    if (this.bossMusicInterval) clearInterval(this.bossMusicInterval);
    this.startAmbientMusic();
  }

  // --- SOUND EFFECTS SYNTHESIS ---

  playSwingSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Swoosh (white noise filtered)
    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }

  playHitSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Deep heavy impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.2);

    // Crack metallic layer
    const metal = this.ctx.createOscillator();
    const mGain = this.ctx.createGain();
    metal.type = 'sawtooth';
    metal.frequency.setValueAtTime(600, now);
    mGain.gain.setValueAtTime(0.1, now);
    mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    metal.connect(mGain);
    mGain.connect(this.ctx.destination);
    metal.start();
    metal.stop(now + 0.1);
  }

  playDodgeSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.4);
  }

  playDrinkSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Bubbling sounds
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400 + Math.random() * 300, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  playLevelUpSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Rising arpeggio (C major major-seventh chord)
    const notes = [261.6, 329.6, 392.0, 493.9, 523.3]; // C4, E4, G4, B4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      
      gain.gain.setValueAtTime(0.0, now + idx * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.7);
    });
  }

  playLockOnSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.05);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.08);
  }

  playDeathSound() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Distorted deep drop-out roar/gasp
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(20, now + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 1.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(now + 1.5);
  }
}
export const audio = new AudioManager();
