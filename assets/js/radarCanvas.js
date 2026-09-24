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
    // Keep radius proportional, leaving generous lateral margins for badges
    const radius = Math.min(cx, cy) - 125;

    this.ctx.clearRect(0, 0, width, height);

    // Background circle
    this.ctx.fillStyle = 'rgba(4, 18, 36, 0.45)';
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
    this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)';
    this.ctx.beginPath();
    this.ctx.moveTo(cx - radius - 10, cy);
    this.ctx.lineTo(cx + radius + 10, cy);
    this.ctx.moveTo(cx, cy - radius - 10);
    this.ctx.lineTo(cx, cy + radius + 10);
    this.ctx.stroke();

    // Angle degree markings
    this.ctx.font = "10px 'Oxanium', monospace";
    this.ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText("000°", cx, cy - radius - 5);
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.fillText("090°", cx + radius + 6, cy);
    this.ctx.textBaseline = 'top';
    this.ctx.textAlign = 'center';
    this.ctx.fillText("180°", cx, cy + radius + 5);
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'right';
    this.ctx.fillText("270°", cx - radius - 6, cy);

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
    this.ctx.lineWidth = 1.6;
    this.ctx.shadowColor = '#00e5ff';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + Math.cos(this.angle) * radius, cy + Math.sin(this.angle) * radius);
    this.ctx.stroke();
    this.ctx.restore();

    // Prepare badge layout items
    const padX = 7;
    const padY = 4;
    const badgeH = 15 + padY * 2;
    this.ctx.font = "bold 11px 'Oxanium', monospace";

    const items = this.skills.map((skill) => {
      const rad = (skill.angle * Math.PI) / 180;
      const dist = skill.level * radius;
      const bx = cx + Math.cos(rad) * dist;
      const by = cy + Math.sin(rad) * dist;

      let angleDiff = Math.abs(this.angle - rad);
      if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
      const isLit = angleDiff < 0.45;

      const percentStr = `${Math.round(skill.level * 100)}%`;
      this.ctx.font = "bold 11px 'Oxanium', monospace";
      const nameMetrics = this.ctx.measureText(skill.name);
      const percentMetrics = this.ctx.measureText(` [${percentStr}]`);
      const totalTextW = nameMetrics.width + percentMetrics.width;
      const badgeW = totalTextW + padX * 2;

      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      let badgeX = bx;
      let badgeY = by - badgeH / 2;
      let side = 'right';

      if (sinA < -0.88) {
        // Polar Top
        side = 'top';
        badgeX = bx - badgeW / 2;
        badgeY = by - badgeH - 12;
      } else if (sinA > 0.88) {
        // Polar Bottom
        side = 'bottom';
        badgeX = bx - badgeW / 2;
        badgeY = by + 12;
      } else if (cosA >= 0) {
        // Right side - project outward to the right
        side = 'right';
        badgeX = bx + 16;
        badgeY = by - badgeH / 2;
      } else {
        // Left side - project outward to the left
        side = 'left';
        badgeX = bx - badgeW - 16;
        badgeY = by - badgeH / 2;
      }

      return {
        skill,
        bx,
        by,
        rad,
        isLit,
        percentStr,
        nameW: nameMetrics.width,
        badgeW,
        badgeH,
        badgeX,
        badgeY,
        side
      };
    });

    // Collision Separation Pass: Ensure badges on the same side do not overlap vertically
    ['left', 'right'].forEach((side) => {
      const sideItems = items.filter((it) => it.side === side);
      if (sideItems.length <= 1) return;

      sideItems.sort((a, b) => a.badgeY - b.badgeY);

      const minGap = 8;
      for (let i = 1; i < sideItems.length; i++) {
        const prev = sideItems[i - 1];
        const curr = sideItems[i];
        const overlap = (prev.badgeY + prev.badgeH + minGap) - curr.badgeY;
        if (overlap > 0) {
          curr.badgeY += overlap;
        }
      }
    });

    // Clamp within canvas boundaries
    items.forEach((item) => {
      item.badgeX = Math.max(8, Math.min(width - item.badgeW - 8, item.badgeX));
      item.badgeY = Math.max(8, Math.min(height - item.badgeH - 8, item.badgeY));
    });

    // Render Blips, Lines, and Badges
    items.forEach((item) => {
      const { skill, bx, by, isLit, percentStr, nameW, badgeW, badgeH, badgeX, badgeY } = item;

      this.ctx.save();

      // Blip glow & dot
      this.ctx.fillStyle = isLit ? '#ffffff' : '#00e5ff';
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = isLit ? 14 : 5;

      this.ctx.beginPath();
      this.ctx.arc(bx, by, isLit ? 5 : 3.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Expanding pulse ring when swept
      if (isLit) {
        this.ctx.strokeStyle = 'rgba(0, 229, 255, 0.9)';
        this.ctx.lineWidth = 1.4;
        this.ctx.beginPath();
        this.ctx.arc(bx, by, 9, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Leader line with dog-leg / elbow
      this.ctx.shadowBlur = 0;
      this.ctx.strokeStyle = isLit ? 'rgba(0, 229, 255, 0.8)' : 'rgba(0, 229, 255, 0.35)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(bx, by);

      const connectX = (badgeX + badgeW / 2 > bx) ? badgeX : badgeX + badgeW;
      const connectY = badgeY + badgeH / 2;
      this.ctx.lineTo(connectX, connectY);
      this.ctx.stroke();

      // Badge Background
      this.ctx.fillStyle = isLit ? 'rgba(4, 20, 42, 0.95)' : 'rgba(2, 6, 23, 0.9)';
      this.ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

      // Badge Border with cyan glow
      this.ctx.strokeStyle = isLit ? '#00e5ff' : 'rgba(0, 229, 255, 0.45)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

      // Skill Name
      this.ctx.font = "11px 'Oxanium', monospace";
      this.ctx.textBaseline = 'middle';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = isLit ? '#ffffff' : '#f1f5f9';
      this.ctx.fillText(skill.name, badgeX + padX, badgeY + badgeH / 2);

      // Percentage in neon cyan
      this.ctx.font = "bold 11px 'Oxanium', monospace";
      this.ctx.fillStyle = isLit ? '#38bdf8' : '#00e5ff';
      this.ctx.fillText(` [${percentStr}]`, badgeX + padX + nameW, badgeY + badgeH / 2);

      this.ctx.restore();
    });
  }
}
