/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Cyber Window Manager
 * Pointer drag, 8-axis resize, viewport clamping & mobile sheet mode
 * ============================================================
 */

import { sound } from './sound.js';

class WindowManager {
  constructor() {
    this.windows = new Map();
    this.highestZIndex = 100;
    this.desktopArea = null;
    this.isMobile = window.innerWidth < 768;
    this.themeIndex = 0;
    this.themes = ['cyan', 'amber', 'red', 'green', 'purple', 'white'];
    this.isOverclocked = false;
    this.isUndervolted = false;

    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < 768;
      this.clampAllWindows();
    });
  }

  init(desktopAreaElement) {
    this.desktopArea = desktopAreaElement;
  }

  createWindow({
    id,
    title = 'SYSTEM WINDOW',
    contentHtml = '',
    width = 620,
    height = 420,
    x = null,
    y = null,
    icon = '',
    theme = 'cyan',
    onClose = null
  }) {
    // If window already exists, restore and focus it
    if (this.windows.has(id)) {
      this.restoreWindow(id);
      this.focusWindow(id);
      return this.windows.get(id);
    }

    const winEl = document.createElement('div');
    winEl.id = `win-${id}`;
    winEl.className = `cyber-window theme-${theme}`;

    // Calculate initial position if not provided
    if (!icon) {
      if (id === 'terminal') {
        icon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
      } else if (id.startsWith('proj-') || id === 'projects-explorer') {
        icon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`;
      } else if (id === 'about-profile') {
        icon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
      } else if (id === 'telemetry-radar') {
        icon = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9.5" stroke-width="1.8" /><circle cx="12" cy="12" r="4.8" stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="1.5 1.5" /><path d="M12 12 L20.2 8.2 A 9.5 9.5 0 0 0 17.5 4.8 Z" fill="currentColor" fill-opacity="0.3" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><line x1="12" y1="12" x2="17.5" y2="4.8" stroke-width="1.8" stroke-linecap="round" /></svg>`;
      } else if (id === 'contact-modal') {
        icon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
      } else {
        icon = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
      }
    }

    const deskRect = this.desktopArea ? this.desktopArea.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight - 60 };
    const winWidth = Math.min(width, deskRect.width - 24);
    const winHeight = Math.min(height, deskRect.height - 24);

    let posX = x !== null ? x : (deskRect.width - winWidth) / 2 + (this.windows.size * 20);
    let posY = y !== null ? y : (deskRect.height - winHeight) / 2 + (this.windows.size * 20);

    // Keep within bounds
    posX = Math.max(10, Math.min(posX, deskRect.width - winWidth - 10));
    posY = Math.max(10, Math.min(posY, deskRect.height - winHeight - 10));

    winEl.style.width = `${winWidth}px`;
    winEl.style.height = `${winHeight}px`;
    winEl.style.left = `${posX}px`;
    winEl.style.top = `${posY}px`;
    winEl.style.zIndex = ++this.highestZIndex;

    // Window Shell HTML with Corner Brackets & Controls
    winEl.innerHTML = `
      <div class="bracket bracket-tl"></div>
      <div class="bracket bracket-tr"></div>
      <div class="bracket bracket-bl"></div>
      <div class="bracket bracket-br"></div>

      <div class="cyber-window-header" data-drag-handle="true">
        <div class="cyber-window-title">
          <span class="text-xs text-opacity-80">${icon}</span>
          <span class="win-title-text">${title}</span>
        </div>
        <div class="cyber-window-controls">
          <button class="cyber-win-btn minimize-btn" title="Minimieren">_</button>
          <button class="cyber-win-btn maximize-btn" title="Maximieren">□</button>
          <button class="cyber-win-btn close-btn" title="Schließen">✕</button>
        </div>
      </div>

      <div class="cyber-window-body">
        ${contentHtml}
      </div>

      <!-- 8-Direction Resize Handles -->
      <div class="resize-handle resize-n" data-resize="n"></div>
      <div class="resize-handle resize-s" data-resize="s"></div>
      <div class="resize-handle resize-e" data-resize="e"></div>
      <div class="resize-handle resize-w" data-resize="w"></div>
      <div class="resize-handle resize-nw" data-resize="nw"></div>
      <div class="resize-handle resize-ne" data-resize="ne"></div>
      <div class="resize-handle resize-sw" data-resize="sw"></div>
      <div class="resize-handle resize-se" data-resize="se"></div>
    `;

    this.desktopArea.appendChild(winEl);

    const winData = {
      id,
      element: winEl,
      title,
      icon,
      isMinimized: false,
      isMaximized: false,
      prevBounds: { x: posX, y: posY, w: winWidth, h: winHeight },
      onClose
    };

    this.windows.set(id, winData);

    this.setupInteractions(winData);
    this.focusWindow(id);
    sound.playWindowOpen();

    window.dispatchEvent(new CustomEvent('window:opened', { detail: { id, title, icon } }));
    return winData;
  }

  setupInteractions(winData) {
    const el = winData.element;
    const header = el.querySelector('.cyber-window-header');
    const minBtn = el.querySelector('.minimize-btn');
    const maxBtn = el.querySelector('.maximize-btn');
    const closeBtn = el.querySelector('.close-btn');

    // Focus on click
    el.addEventListener('pointerdown', () => {
      this.focusWindow(winData.id);
    });

    // Window controls
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimizeWindow(winData.id);
    });

    maxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMaximize(winData.id);
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeWindow(winData.id);
    });

    // Pointer-based Drag & Drop
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    header.addEventListener('pointerdown', (e) => {
      if (this.isMobile || winData.isMaximized) return;
      if (e.target.closest('.cyber-win-btn')) return;

      isDragging = true;
      header.setPointerCapture(e.pointerId);
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialLeft = parseFloat(el.style.left) || 0;
      initialTop = parseFloat(el.style.top) || 0;
      this.focusWindow(winData.id);
      e.preventDefault();
    });

    header.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const deskRect = this.desktopArea.getBoundingClientRect();
      const winRect = el.getBoundingClientRect();

      let newLeft = initialLeft + (e.clientX - dragStartX);
      let newTop = initialTop + (e.clientY - dragStartY);

      // Strict Clamping: Window header cannot leave the screen
      newLeft = Math.max(0, Math.min(newLeft, deskRect.width - winRect.width));
      newTop = Math.max(0, Math.min(newTop, deskRect.height - 40));

      el.style.left = `${newLeft}px`;
      el.style.top = `${newTop}px`;
    });

    const stopDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        try { header.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };
    header.addEventListener('pointerup', stopDrag);
    header.addEventListener('pointercancel', stopDrag);

    // 8-Axis Resize Handling
    const resizeHandles = el.querySelectorAll('.resize-handle');
    resizeHandles.forEach((handle) => {
      let isResizing = false;
      let dir = handle.dataset.resize;
      let startX, startY, startW, startH, startL, startT;

      handle.addEventListener('pointerdown', (e) => {
        if (this.isMobile || winData.isMaximized) return;
        isResizing = true;
        handle.setPointerCapture(e.pointerId);
        startX = e.clientX;
        startY = e.clientY;
        startW = el.offsetWidth;
        startH = el.offsetHeight;
        startL = parseFloat(el.style.left) || 0;
        startT = parseFloat(el.style.top) || 0;
        this.focusWindow(winData.id);
        e.stopPropagation();
        e.preventDefault();
      });

      handle.addEventListener('pointermove', (e) => {
        if (!isResizing) return;
        const deskRect = this.desktopArea.getBoundingClientRect();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newW = startW;
        let newH = startH;
        let newL = startL;
        let newT = startT;

        const minW = 280;
        const minH = 180;

        if (dir.includes('e')) {
          newW = Math.max(minW, Math.min(startW + dx, deskRect.width - startL));
        }
        if (dir.includes('s')) {
          newH = Math.max(minH, Math.min(startH + dy, deskRect.height - startT));
        }
        if (dir.includes('w')) {
          const maxLeftShift = startW - minW;
          const shiftX = Math.min(Math.max(-startL, dx), maxLeftShift);
          newW = startW - shiftX;
          newL = startL + shiftX;
        }
        if (dir.includes('n')) {
          const maxTopShift = startH - minH;
          const shiftY = Math.min(Math.max(-startT, dy), maxTopShift);
          newH = startH - shiftY;
          newT = startT + shiftY;
        }

        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
        el.style.left = `${newL}px`;
        el.style.top = `${newT}px`;
      });

      const stopResize = (e) => {
        if (isResizing) {
          isResizing = false;
          try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
        }
      };
      handle.addEventListener('pointerup', stopResize);
      handle.addEventListener('pointercancel', stopResize);
    });
  }

  focusWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    this.windows.forEach((w) => {
      w.element.classList.remove('is-focused');
    });

    winData.element.classList.add('is-focused');
    winData.element.style.zIndex = ++this.highestZIndex;
    winData.element.style.display = 'flex';
    winData.isMinimized = false;

    window.dispatchEvent(new CustomEvent('window:focused', { detail: { id } }));
  }

  minimizeWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    winData.element.style.display = 'none';
    winData.isMinimized = true;
    winData.element.classList.remove('is-focused');
    sound.playKeyClick();
    window.dispatchEvent(new CustomEvent('window:minimized', { detail: { id } }));
  }

  restoreWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    winData.element.style.display = 'flex';
    winData.isMinimized = false;
    this.focusWindow(id);
    window.dispatchEvent(new CustomEvent('window:restored', { detail: { id } }));
  }

  toggleMaximize(id) {
    const winData = this.windows.get(id);
    if (!winData || this.isMobile) return;

    const el = winData.element;
    const deskRect = this.desktopArea.getBoundingClientRect();

    if (!winData.isMaximized) {
      // Save current bounds
      winData.prevBounds = {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top),
        w: el.offsetWidth,
        h: el.offsetHeight
      };

      el.style.left = '0px';
      el.style.top = '0px';
      el.style.width = `${deskRect.width}px`;
      el.style.height = `${deskRect.height}px`;
      winData.isMaximized = true;
      el.querySelector('.maximize-btn').textContent = '❐';
    } else {
      el.style.left = `${winData.prevBounds.x}px`;
      el.style.top = `${winData.prevBounds.y}px`;
      el.style.width = `${winData.prevBounds.w}px`;
      el.style.height = `${winData.prevBounds.h}px`;
      winData.isMaximized = false;
      el.querySelector('.maximize-btn').textContent = '□';
    }
    sound.playKeyClick();
  }

  closeWindow(id) {
    const winData = this.windows.get(id);
    if (!winData) return;

    if (typeof winData.onClose === 'function') {
      winData.onClose();
    }

    winData.element.remove();
    this.windows.delete(id);
    sound.playWindowClose();

    window.dispatchEvent(new CustomEvent('window:closed', { detail: { id } }));
  }

  closeAllWindowsExcept(exceptId) {
    this.windows.forEach((winData, id) => {
      if (id !== exceptId) {
        this.closeWindow(id);
      }
    });
  }

  cascadeWindows() {
    if (!this.windows || this.windows.size === 0) return;

    // 1. Unminimize and unmaximize all windows
    this.windows.forEach((winData) => {
      if (winData.isMinimized) this.restoreWindow(winData.id);
      if (winData.isMaximized) this.toggleMaximize(winData.id);
    });

    // 2. Collect and calculate sizes (area = width * height)
    const winList = Array.from(this.windows.values());
    const getArea = (w) => {
      const width = w.element.offsetWidth || parseFloat(w.element.style.width) || 400;
      const height = w.element.offsetHeight || parseFloat(w.element.style.height) || 300;
      return width * height;
    };

    // Sort descending by size: largest windows first (index 0), smallest last (index N-1)
    winList.sort((a, b) => getArea(b) - getArea(a));

    // 3. Viewport-based proportional diagonal offset
    const deskRect = this.desktopArea ? this.desktopArea.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight - 60 };
    const vW = deskRect.width || window.innerWidth;
    const vH = deskRect.height || window.innerHeight;

    // Proportional diagonal step (~4.5% width, ~6.0% height)
    let stepX = Math.round(vW * 0.045);
    let stepY = Math.round(vH * 0.06);

    const count = winList.length;
    // Scale step if there are many windows so they stay within desktop bounds
    if (count > 1) {
      const maxSpanX = vW * 0.50;
      const maxSpanY = vH * 0.50;
      if ((count - 1) * stepX > maxSpanX) {
        stepX = Math.floor(maxSpanX / (count - 1));
      }
      if ((count - 1) * stepY > maxSpanY) {
        stepY = Math.floor(maxSpanY / (count - 1));
      }
    }
    stepX = Math.max(28, stepX);
    stepY = Math.max(32, stepY);

    const startX = Math.max(24, Math.round(vW * 0.04));
    const startY = Math.max(20, Math.round(vH * 0.035));

    // 4. Position each window: largest in back (lowest z-index), smallest in front (highest z-index)
    winList.forEach((winData, idx) => {
      // Increasing z-index: index 0 (largest) gets the lowest, index N-1 (smallest) gets the highest
      winData.element.style.zIndex = ++this.highestZIndex;

      let posX = startX + idx * stepX;
      let posY = startY + idx * stepY;

      // Keep within bounds
      const winW = winData.element.offsetWidth || parseFloat(winData.element.style.width) || 400;
      const winH = winData.element.offsetHeight || parseFloat(winData.element.style.height) || 300;
      posX = Math.max(10, Math.min(posX, vW - winW - 10));
      posY = Math.max(10, Math.min(posY, vH - winH - 10));

      winData.element.style.left = `${posX}px`;
      winData.element.style.top = `${posY}px`;
    });

    // 5. Focus the smallest window (the frontmost window)
    if (winList.length > 0) {
      const topWin = winList[winList.length - 1];
      this.windows.forEach((w) => w.element.classList.remove('is-focused'));
      topWin.element.classList.add('is-focused');
      window.dispatchEvent(new CustomEvent('window:focused', { detail: { id: topWin.id } }));
    }

    sound.playWindowOpen();
  }

  clampAllWindows() {
    if (!this.desktopArea) return;
    const deskRect = this.desktopArea.getBoundingClientRect();

    this.windows.forEach((winData) => {
      if (this.isMobile) return;
      const el = winData.element;
      let left = parseFloat(el.style.left) || 0;
      let top = parseFloat(el.style.top) || 0;
      let width = el.offsetWidth;
      let height = el.offsetHeight;

      if (width > deskRect.width) el.style.width = `${deskRect.width - 20}px`;
      if (height > deskRect.height) el.style.height = `${deskRect.height - 20}px`;

      left = Math.max(0, Math.min(left, deskRect.width - 80));
      top = Math.max(0, Math.min(top, deskRect.height - 40));

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    });
  }

  setTheme(windowId, themeName) {
    const winData = this.windows.get(windowId);
    if (!winData) return;
    winData.element.className = winData.element.className.replace(/theme-[a-z]+/g, '').trim();
    winData.element.classList.add(`theme-${themeName}`);
  }

  setGlobalTheme(themeName) {
    const targetTheme = (themeName || '').trim().toLowerCase();
    if (!this.themes.includes(targetTheme)) {
      return { error: `INVALID THEME COLOR: '${themeName}'. AVAILABLE: ${this.themes.map((t) => t.toUpperCase()).join(', ')}` };
    }
    this.themeIndex = this.themes.indexOf(targetTheme);
    this.windows.forEach((winData) => {
      this.setTheme(winData.id, targetTheme);
    });
    document.documentElement.className = document.documentElement.className.replace(/theme-[a-z]+/g, '').trim();
    document.documentElement.classList.add(`theme-${targetTheme}`);
    sound.playWindowOpen();
    return { success: true, theme: targetTheme };
  }

  cycleGlobalTheme() {
    this.themeIndex = (this.themeIndex + 1) % this.themes.length;
    const nextTheme = this.themes[this.themeIndex];
    this.setGlobalTheme(nextTheme);
    return nextTheme;
  }

  resetPowerAndTheme() {
    this.isOverclocked = false;
    this.isUndervolted = false;
    document.body.classList.remove('mode-overclock', 'mode-undervolt');
    this.setGlobalTheme('cyan');
    return { success: true };
  }

  setOverclock(enabled) {
    if (enabled && this.isOverclocked) return { error: 'SYSTEM OVERCLOCKED: Already operating at maximum voltage.' };
    this.isOverclocked = enabled;
    this.isUndervolted = false;
    document.body.classList.remove('mode-undervolt');
    if (enabled) {
      document.body.classList.add('mode-overclock');
    } else {
      document.body.classList.remove('mode-overclock');
    }
    return { success: true };
  }

  setUndervolt(enabled) {
    if (enabled && this.isUndervolted) return { error: 'SYSTEM UNDERVOLTED: Operating in low-power state.' };
    this.isUndervolted = enabled;
    this.isOverclocked = false;
    document.body.classList.remove('mode-overclock');
    if (enabled) {
      document.body.classList.add('mode-undervolt');
    } else {
      document.body.classList.remove('mode-undervolt');
    }
    return { success: true };
  }

  getWindow(id) {
    return this.windows.get(id);
  }

  getAllWindows() {
    return Array.from(this.windows.values());
  }
}

export const windowManager = new WindowManager();
