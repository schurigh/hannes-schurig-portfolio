/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Tactical Radar HUD Canvas
 * 360-degree sweeping radar with skill coordinates & lifecycle
 * ============================================================
 */

export class RadarHUD {
  constructor(canvasElement, skills = []) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.skills = skills;
    this.angle = 0;
    this.animId = null;
    this.running = false;
    this.lastTime = 0;
    this.fps = 30;
    this.interval = 1000 / this.fps;

    this.handleVisibility = () => {
      if (document.hidden) {
        this.stop();
      } else if (this.running) {
        this.start();
      }
    };
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  setSkills(skills) {
    this.skills = skills || [];
  }

  start() {
    if (this.animId) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  destroy() {
    this.stop();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  loop(currentTime) {
    if (!this.running) return;
    this.animId = requestAnimationFrame((t) => this.loop(t));

    const delta = currentTime - this.lastTime;
    if (delta < this.interval) return;
    this.lastTime = currentTime - (delta % this.interval);

    this.draw();
    this.angle = (this.angle + 0.035) % (Math.PI * 2);
  }

  draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 24;

    this.ctx.clearRect(0, 0, width, height);

    // Background circle
    this.ctx.fillStyle = 'rgba(4, 18, 36, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Concentric range rings
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    this.ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach((ratio) => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * ratio, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Crosshairs
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(cx - radius, cy);
    this.ctx.lineTo(cx + radius, cy);
    this.ctx.moveTo(cx, cy - radius);
    this.ctx.lineTo(cx, cy + radius);
    this.ctx.stroke();

    // Angle degree markings
    this.ctx.font = "9px 'Oxanium', monospace";
    this.ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    this.ctx.fillText("000°", cx - 10, cy - radius + 12);
    this.ctx.fillText("090°", cx + radius - 24, cy + 3);
    this.ctx.fillText("180°", cx - 10, cy + radius - 4);
    this.ctx.fillText("270°", cx - radius + 2, cy + 3);

    // Sweeping beam
    const sweepGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    sweepGradient.addColorStop(0, 'rgba(0, 229, 255, 0.35)');
    sweepGradient.addColorStop(1, 'rgba(0, 229, 255, 0.02)');

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, radius, this.angle - 0.45, this.angle);
    this.ctx.closePath();
    this.ctx.fillStyle = sweepGradient;
    this.ctx.fill();

    // Sweep leading line
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + Math.cos(this.angle) * radius, cy + Math.sin(this.angle) * radius);
    this.ctx.stroke();
    this.ctx.restore();

    // Draw Skill Target Blips
    this.skills.forEach((skill) => {
      const rad = (skill.angle * Math.PI) / 180;
      const dist = skill.level * radius;
      const bx = cx + Math.cos(rad) * dist;
      const by = cy + Math.sin(rad) * dist;

      // Distance to sweep beam for illumination
      let angleDiff = Math.abs(this.angle - rad);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const isLit = angleDiff < 0.5;

      this.ctx.save();
      this.ctx.fillStyle = isLit ? '#ffffff' : '#00e5ff';
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = isLit ? 10 : 3;

      // Blip circle
      this.ctx.beginPath();
      this.ctx.arc(bx, by, isLit ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Blip ring
      if (isLit) {
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.8)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(bx, by, 7, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Label
      this.ctx.fillStyle = isLit ? '#ffffff' : 'rgba(226, 232, 240, 0.75)';
      this.ctx.font = "10px 'Oxanium', monospace";
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(`${skill.name} (${Math.round(skill.level * 100)}%)`, bx + 8, by + 3);
      this.ctx.restore();
    });
  }
}
