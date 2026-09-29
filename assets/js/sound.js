/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Web Audio API Synthesizer
 * 100% Autarkic sound synthesis without external audio files
 * ============================================================
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('portfolio_audio_muted') === 'true';
    this.masterGain = null;
    this.initialized = false;

    // Attach unlock on first interaction
    const unlockAudio = () => {
      this.init();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.56, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('portfolio_audio_muted', this.isMuted ? 'true' : 'false');
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.56, this.ctx.currentTime);
    }
    window.dispatchEvent(new CustomEvent('sound:mute-changed', { detail: { isMuted: this.isMuted } }));
    return this.isMuted;
  }

  ensureReady() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx && !this.isMuted;
  }

  // Realistic key-click impulse with pitch & volume jitter
  playKeyClick() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch jitter: between 440Hz and 560Hz
      const freq = 460 + (Math.random() * 80 - 40);
      // Volume jitter
      const vol = 0.08 + Math.random() * 0.04;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.025);
      setTimeout(() => osc.disconnect(), 40);
    } catch (e) {}
  }

  // Futuristic window open chime
  playWindowOpen() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 783.99].forEach((freq, i) => { // C5, G5
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.15);
        setTimeout(() => osc.disconnect(), 250);
      });
    } catch (e) {}
  }

  // Reverse frequency sweep for window close
  playWindowClose() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
      setTimeout(() => osc.disconnect(), 150);
    } catch (e) {}
  }

  // Warning beep
  playWarningBeep() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.08);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
      setTimeout(() => osc.disconnect(), 200);
    } catch (e) {}
  }

  // Access denied error sound (sawtooth buzz)
  playAccessDenied() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
      setTimeout(() => osc.disconnect(), 300);
    } catch (e) {}
  }

  // Root access granted fanfare (triad chord)
  playAccessGranted() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, idx) => { // A4, C#5, E5, A5
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
        setTimeout(() => osc.disconnect(), 500);
      });
    } catch (e) {}
  }

  // Futuristic cyber communication transmission chirp
  playMessageSent() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      [880, 1320, 1760].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.045);

        gain.gain.setValueAtTime(0.14, now + idx * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + idx * 0.045);
        osc.stop(now + idx * 0.045 + 0.12);
        setTimeout(() => osc.disconnect(), 250);
      });
    } catch (e) {}
  }

  // Low warning clack tone for countdowns
  playCountdownBeep() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
      setTimeout(() => osc.disconnect(), 120);
    } catch (e) {}
  }

  // Wire transfer / rapid electronic coin chatter
  playWireTransfer() {
    if (!this.ensureReady()) return;
    try {
      const notes = [800, 1000, 1200, 1500, 1800, 2200];
      for (let i = 0; i < 18; i++) {
        const time = this.ctx.currentTime + i * 0.045;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(notes[i % notes.length] + Math.random() * 80, time);

        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.04);
        setTimeout(() => osc.disconnect(), 1000);
      }
    } catch (e) {}
  }

  // Self-destruct alarm loop (siren)
  playAlarmSweep() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.4);
      osc.frequency.linearRampToValueAtTime(600, now + 0.8);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.8);
      setTimeout(() => osc.disconnect(), 900);
    } catch (e) {}
  }

  // Continuous pulsating emergency siren for self-destruct countdown
  startSiren() {
    if (!this.ensureReady()) return () => {};
    let active = true;
    let timer = null;

    const pulse = () => {
      if (!active || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Rising and falling emergency siren sweep
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.45);
        osc.frequency.linearRampToValueAtTime(420, now + 0.95);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.22, now + 0.12);
        gain.gain.setValueAtTime(0.22, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.96);
        setTimeout(() => osc.disconnect(), 1050);
      } catch (e) {}
    };

    pulse();
    timer = setInterval(pulse, 1000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }

  // Violent glitch static noise & electrical distortion burst
  playGlitchDistortion() {
    if (!this.ensureReady()) return;
    try {
      const now = this.ctx.currentTime;
      const duration = 1.7;

      // 1. Harsh White Noise Buffer
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + duration);
      filter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.28, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);

      // 2. Detuned Square Oscillators (digital tearing)
      [75, 115, 260].forEach((baseFreq) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 2.8, now + 0.35);
        osc.frequency.setValueAtTime(baseFreq * 0.4, now + 0.9);
        osc.frequency.exponentialRampToValueAtTime(25, now + duration);

        oscGain.gain.setValueAtTime(0.14, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
        setTimeout(() => osc.disconnect(), 1800);
      });
    } catch (e) {}
  }
}

export const sound = new SoundEngine();
