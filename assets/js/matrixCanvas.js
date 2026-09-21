/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Matrix Rain Background Canvas
 * High-performance digital rain stream with currency drop mode
 * ============================================================
 */

class MatrixRain {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.columns = 0;
    this.drops = [];
    this.fontSize = 14;
    this.animId = null;
    this.enabled = true;
    this.isCurrencyMode = false;
    this.lastFrameTime = 0;
    this.targetFps = 33; // ~30 FPS for battery and CPU efficiency
    this.frameInterval = 1000 / this.targetFps;

    // Glyphs
    this.normalChars = '0123456789ABCDEFSEC//OPXZΨΩλπ010101日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
    this.currencyChars = '€$¥£₹₿Ξ%0123456789';
  }

  init(canvasElement) {
    if (!canvasElement) return;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else if (this.enabled) {
        this.resume();
      }
    });

    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.floor(Math.random() * -50);
    }
  }

  setCurrencyMode(enable) {
    this.isCurrencyMode = enable;
  }

  toggleEffects(enabled) {
    this.enabled = enabled;
    if (this.enabled) {
      this.resume();
    } else {
      this.pause();
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  start() {
    if (!this.animId && this.enabled) {
      this.lastFrameTime = performance.now();
      this.render(this.lastFrameTime);
    }
  }

  pause() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  resume() {
    if (!this.animId && this.enabled) {
      this.lastFrameTime = performance.now();
      this.animId = requestAnimationFrame((t) => this.render(t));
    }
  }

  render(currentTime) {
    if (!this.enabled) return;

    this.animId = requestAnimationFrame((t) => this.render(t));

    const delta = currentTime - this.lastFrameTime;
    if (delta < this.frameInterval) return;
    this.lastFrameTime = currentTime - (delta % this.frameInterval);

    // Fade the canvas cleanly to deep cyber background
    this.ctx.fillStyle = 'rgba(2, 7, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = `${this.fontSize}px 'Oxanium', monospace`;

    const charPool = this.isCurrencyMode ? this.currencyChars : this.normalChars;
    const isGold = this.isCurrencyMode;

    for (let i = 0; i < this.drops.length; i++) {
      const char = charPool[Math.floor(Math.random() * charPool.length)];
      const x = i * this.fontSize;
      const y = this.drops[i] * this.fontSize;

      if (y > 0) {
        if (isGold) {
          // Gold drop mode for add-money
          this.ctx.fillStyle = Math.random() > 0.85 ? '#ffffff' : '#ffd700';
        } else {
          // Standard Electric Cyan & Matrix Blue with clean tonal hierarchy
          const r = Math.random();
          if (r > 0.95) {
            this.ctx.fillStyle = '#ffffff'; // White glowing lead glyph
          } else if (r > 0.65) {
            this.ctx.fillStyle = '#00e5ff'; // Primary electric cyan
          } else {
            this.ctx.fillStyle = '#007799'; // Deep cyan trail (cleanly blends into background)
          }
        }

        this.ctx.fillText(char, x, y);
      }

      if (y > this.canvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
      this.drops[i]++;
    }
  }
}

export const matrixRain = new MatrixRain();
