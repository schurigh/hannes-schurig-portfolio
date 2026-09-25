/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Matrix Rain Background Canvas
 * High-performance digital rain stream with crystal-clear
 * transparent clearing - perfectly uniform, non-blotchy background.
 * ============================================================
 */

class MatrixRain {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.columns = 0;
    this.rows = 0;
    this.drops = [];
    this.trailLengths = [];
    this.fontSize = 14;
    this.animId = null;
    this.enabled = true;
    this.isCurrencyMode = false;
    this.lastFrameTime = 0;
    this.targetFps = 30; // ~30 FPS for battery and CPU efficiency
    this.frameInterval = 1000 / this.targetFps;

    // Glyphs
    this.normalChars = '0123456789ABCDEFSEC//OPXZΨΩλπ010101日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
    this.currencyChars = '€$¥£₹₿Ξ%0123456789';

    // Character column cache to keep falling glyphs stable
    this.charMap = [];
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
    this.rows = Math.floor(this.canvas.height / this.fontSize) + 2;
    this.drops = [];
    this.trailLengths = [];
    this.charMap = [];

    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.floor(Math.random() * -Math.floor(this.rows * 0.5));
      this.trailLengths[i] = 25 + Math.floor(Math.random() * 16); // 25 - 40 glyphs (+20% more characters)
      this.charMap[i] = [];
      for (let r = 0; r < this.rows + 60; r++) {
        this.charMap[i][r] = this.getRandomChar();
      }
    }
  }

  getRandomChar() {
    const pool = this.isCurrencyMode ? this.currencyChars : this.normalChars;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  setCurrencyMode(enable) {
    this.isCurrencyMode = enable;
    if (this.charMap) {
      for (let i = 0; i < this.columns; i++) {
        if (this.charMap[i]) {
          for (let r = 0; r < this.charMap[i].length; r++) {
            if (Math.random() > 0.4) {
              this.charMap[i][r] = this.getRandomChar();
            }
          }
        }
      }
    }
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

    // Completely clear the canvas to 100% transparent.
    // The background color of document.body (#020712) shines through uniformly without any blotches or banding.
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = `${this.fontSize}px 'Oxanium', monospace`;

    const isGold = this.isCurrencyMode;

    for (let i = 0; i < this.columns; i++) {
      const headRow = this.drops[i];
      const trail = this.trailLengths[i] || 24;
      const x = i * this.fontSize;

      // Draw active trail characters
      for (let k = 0; k < trail; k++) {
        const row = headRow - k;
        if (row < 0) continue;
        const y = row * this.fontSize;
        if (y > this.canvas.height + this.fontSize) continue;

        // Occasional glyph mutation for authentic matrix flicker
        if (Math.random() < 0.04) {
          this.charMap[i][row % (this.rows + 50)] = this.getRandomChar();
        }
        const char = this.charMap[i][row % (this.rows + 50)] || '0';

        if (isGold) {
          if (k === 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
          } else if (k < 3) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.38)';
          } else {
            const alpha = Math.max(0, (1 - k / trail) * 0.38);
            this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha.toFixed(2)})`;
          }
        } else {
          if (k === 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.50)'; // Führungsglyph exakt 0.5 Deckkraft
          } else if (k < 3) {
            this.ctx.fillStyle = 'rgba(0, 229, 255, 0.38)'; // Übergangsglyphen bei 0.38
          } else {
            const alpha = Math.max(0, (1 - k / trail) * 0.38);
            this.ctx.fillStyle = `rgba(0, 229, 255, ${alpha.toFixed(2)})`; // Schweif von 0.38 bis 0
          }
        }

        this.ctx.fillText(char, x, y);
      }

      // Reset column drop with +20% higher density and longer streams
      if (headRow - trail > this.rows) {
        if (Math.random() > 0.91) {
          this.drops[i] = Math.floor(Math.random() * -6);
          this.trailLengths[i] = 25 + Math.floor(Math.random() * 16);
        }
      } else {
        this.drops[i]++;
      }
    }
  }
}

export const matrixRain = new MatrixRain();
