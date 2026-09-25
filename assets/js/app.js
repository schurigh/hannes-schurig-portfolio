/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Master Application Orchestrator
 * Bootloader, Desktop GUI, Taskbar Dock, Context Menu & Windows
 * ============================================================
 */

import { sound } from './sound.js';
import { matrixRain } from './matrixCanvas.js';
import { dataLoader } from './dataLoader.js';
import { windowManager } from './windowManager.js';
import { TerminalShell } from './terminal.js';
import { RadarHUD } from './radarCanvas.js';
import { lightboxViewer } from './lightbox.js';

/**
 * Escape user-supplied strings before inserting into innerHTML to prevent XSS.
 * Only needed for data from external sources (JSON files, user input).
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class App {
  constructor() {
    this.bootScreen = null;
    this.bootLinesContainer = null;
    this.terminalInstance = null;
  }

  async init() {
    // 1. Initialize data
    await dataLoader.init();

    // 2. Initialize matrix canvas
    const matrixEl = document.getElementById('matrix-canvas');
    if (matrixEl) matrixRain.init(matrixEl);

    // 3. Initialize window manager
    const desktopArea = document.getElementById('desktop-area');
    windowManager.init(desktopArea);

    // 4. Setup dock & clock
    this.setupDock();
    this.setupClock();

    // 5. Setup context menu
    this.setupContextMenu();

    // 6. Setup custom event listeners
    this.setupEventListeners();

    // 7. Run or skip bootloader
    await this.runBootSequence();

    // 8. Setup desktop shortcuts
    this.renderDesktopShortcuts();

    // 9. Initial Cold Start Notice
    this.renderColdStartNotice();

    // 10. Handle Deep Links
    this.handleDeepLinks();
  }

  // BIOS / Kernel Bootloader Sequence (3-5s, skippable)
  async runBootSequence() {
    this.bootScreen = document.getElementById('boot-screen');
    this.bootLinesContainer = document.getElementById('boot-lines');

    const viewed = sessionStorage.getItem('boot_sequence_viewed');
    if (viewed === 'true' || !this.bootScreen) {
      if (this.bootScreen) this.bootScreen.style.display = 'none';
      return;
    }

    const bootLogs = [
      "SEC//OPS KERNEL v4.19-CYBERDECK (x86_64-secops-linux)",
      "MEMORY CHECK: 64TB NEURAL RAM .................... [OK]",
      "INITIALIZING CRYPTO SUBSYSTEM .................... [OK]",
      "PROBING QUANTUM BUS ADAPTERS .................... [OK]",
      "LOADING VIRTUAL VFS: /data/projects .......... [OK]",
      "SECURITY POLICY: ZERO-TRUST PROTOCOL ENFORCED ... [OK]",
      "FIREWALL DAEMON: ACTIVE [STEALTH MODE] .......... [OK]",
      "ESTABLISHING SECURE WEBSOCKET UPLINK ............ [OK]",
      "DEFAULT CLEARANCE: GUEST (LEVEL 1) .............. [GRANTED]",
      "LAUNCHING DESKTOP ENVIRONMENT [VIBECODE-OS] ..... [READY]"
    ];

    let isSkipped = false;
    const skipBoot = () => {
      if (isSkipped) return;
      isSkipped = true;
      sessionStorage.setItem('boot_sequence_viewed', 'true');
      if (this.bootScreen) {
        this.bootScreen.style.opacity = '0';
        this.bootScreen.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
          this.bootScreen.style.display = 'none';
        }, 400);
      }
    };

    // Skip triggers
    this.bootScreen.addEventListener('click', skipBoot);
    window.addEventListener('keydown', (e) => {
      if (['Escape', ' ', 'Enter'].includes(e.key)) skipBoot();
    }, { once: true });

    for (let i = 0; i < bootLogs.length; i++) {
      if (isSkipped) break;
      const line = document.createElement('div');
      line.textContent = bootLogs[i];
      if (bootLogs[i].includes('[OK]') || bootLogs[i].includes('[READY]')) {
        line.style.color = '#38bdf8';
      }
      this.bootLinesContainer.appendChild(line);
      sound.playKeyClick();
      await new Promise((res) => setTimeout(res, 280));
    }

    await new Promise((res) => setTimeout(res, 600));
    skipBoot();
  }

  // Initial Cold Start Onboarding Notice
  renderColdStartNotice() {
    windowManager.createWindow({
      id: 'onboarding-notice',
      title: 'SEC//SYS: SYSTEM START',
      contentHtml: `
        <div style="font-family:'Oxanium',monospace; padding: 12px 6px;">
          <div style="color: #00e5ff; font-weight: 700; font-size: 15px; margin-bottom: 8px; letter-spacing: 1px;">WILLKOMMEN IM CYBERDECK</div>
          <p style="color: #cbd5e1; line-height: 1.65; margin-bottom: 14px; font-size: 13px;">
            Du kannst mit diesem virtuellen Desktop frei interagieren. Starte Anwendungen über die Taskleiste unten, 
            die Desktop-Icons oder gib Befehle in die Terminal-Shell ein.
          </p>
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 18px;">
            HINWEIS: Klicke auf 'Terminal' oder drücke <code style="color:#00e5ff; background: rgba(0,229,255,0.1); padding: 2px 5px; border-radius: 2px;">>_</code> für die Kommandozeile.
          </div>
          <button id="btn-ack-notice" style="background: rgba(0, 229, 255, 0.2); border: 1px solid #00e5ff; color: #ffffff; padding: 8px 22px; border-radius: 2px; font-family: 'Oxanium', monospace; font-size: 12px; font-weight: 600; cursor: pointer; letter-spacing: 1px; transition: all 0.15s ease;">
            [ VERSTANDEN // ACK ]
          </button>
        </div>
      `,
      width: 460,
      height: 310,
      x: (window.innerWidth - 460) / 2,
      y: (window.innerHeight - 310) / 2
    });

    const ackBtn = document.getElementById('btn-ack-notice');
    if (ackBtn) {
      ackBtn.addEventListener('click', () => {
        windowManager.closeWindow('onboarding-notice');
      });
    }
  }

  // Render Desktop Icons
  renderDesktopShortcuts() {
    const container = document.getElementById('desktop-icons');
    if (!container) return;

    const shortcuts = [
      {
        id: 'terminal',
        title: 'Terminal.sh',
        action: () => this.openTerminal(),
        icon: `<svg class="w-full h-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`
      },
      {
        id: 'projects',
        title: 'Projekte',
        action: () => this.openProjectsExplorer(),
        icon: `<svg class="w-full h-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`
      },
      {
        id: 'about',
        title: 'Operator',
        action: () => this.openAboutProfile(),
        icon: `<svg class="w-full h-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`
      },
      {
        id: 'radar',
        title: 'Skill Radar',
        action: () => this.openRadarWindow(),
        icon: `<svg class="w-full h-full p-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <defs>
            <linearGradient id="radar-sweep-icon-grad" x1="12" y1="12" x2="20" y2="6" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="currentColor" stop-opacity="0.45" />
              <stop offset="100%" stop-color="currentColor" stop-opacity="0.05" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9.2" stroke-width="1.8" />
          <circle cx="12" cy="12" r="4.8" stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="1.5 1.5" />
          <path d="M12 12 L20.2 8.2 A 9.2 9.2 0 0 0 17.5 4.8 Z" fill="url(#radar-sweep-icon-grad)" stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <line x1="12" y1="12" x2="17.5" y2="4.8" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="15.8" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
        </svg>`
      },
      {
        id: 'contact',
        title: 'Kontakt',
        action: () => this.openContactModal(),
        icon: `<svg class="w-full h-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
      }
    ];

    container.innerHTML = '';
    shortcuts.forEach((sc) => {
      const el = document.createElement('div');
      el.className = 'desktop-shortcut';
      el.innerHTML = `
        <div class="icon-box">${sc.icon}</div>
        <div class="label">${sc.title}</div>
      `;
      el.addEventListener('click', () => {
        sound.playKeyClick();
        sc.action();
      });
      container.appendChild(el);
    });
  }

  // Setup Docking Bar & Windows-Style Taskbar
  setupDock() {
    const dockSound = document.getElementById('dock-btn-sound');

    if (dockSound) {
      const updateSoundIcon = (isMuted) => {
        dockSound.innerHTML = isMuted
          ? `<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>`
          : `<svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>`;
      };
      updateSoundIcon(sound.isMuted);

      dockSound.addEventListener('click', () => {
        const muted = sound.toggleMute();
        updateSoundIcon(muted);
      });
      window.addEventListener('sound:mute-changed', (e) => updateSoundIcon(e.detail.isMuted));
    }

    // Info Button & Popover Overlay
    const infoBtn = document.getElementById('dock-btn-info');
    const infoOverlay = document.getElementById('dock-info-overlay');
    const infoClose = document.getElementById('dock-info-close');

    if (infoBtn && infoOverlay) {
      const toggleInfo = (forceState) => {
        const isOpen = !infoOverlay.classList.contains('hidden');
        const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;

        if (shouldOpen) {
          infoOverlay.classList.remove('hidden');
          infoBtn.classList.add('active');
          infoBtn.setAttribute('aria-expanded', 'true');
          sound.playWindowOpen?.();
        } else {
          infoOverlay.classList.add('hidden');
          infoBtn.classList.remove('active');
          infoBtn.setAttribute('aria-expanded', 'false');
          sound.playKeyClick?.();
        }
      };

      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleInfo();
      });

      if (infoClose) {
        infoClose.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleInfo(false);
        });
      }

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!infoOverlay.classList.contains('hidden') && !infoOverlay.contains(e.target) && !infoBtn.contains(e.target)) {
          toggleInfo(false);
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !infoOverlay.classList.contains('hidden')) {
          toggleInfo(false);
        }
      });
    }

    // Initial render of open windows in taskbar
    this.updateTaskbar();

    // Synchronize taskbar on all window lifecycle events
    const winEvents = ['window:opened', 'window:closed', 'window:focused', 'window:minimized', 'window:restored'];
    winEvents.forEach((evt) => {
      window.addEventListener(evt, () => this.updateTaskbar());
    });

    window.addEventListener('resize', () => this.checkTaskbarOverflow());
  }

  // Windows-style dynamic taskbar rendering
  updateTaskbar() {
    const container = document.getElementById('dock-windows-container');
    if (!container) return;

    const windows = windowManager.getAllWindows();

    if (windows.length === 0) {
      container.innerHTML = '<div class="taskbar-empty-hint font-mono">[ SEC//OPS STANDBY ]</div>';
      container.classList.remove('compact-mode');
      return;
    }

    // Identify active/focused window
    const focusedWin = windows.find((w) => !w.isMinimized && w.element.classList.contains('is-focused'));

    container.innerHTML = '';

    windows.forEach((win) => {
      const btn = document.createElement('button');
      const isFocused = focusedWin && focusedWin.id === win.id;
      const isMin = win.isMinimized;

      let cls = 'taskbar-item';
      if (isFocused) cls += ' is-active';
      if (isMin) cls += ' is-minimized';
      btn.className = cls;
      btn.setAttribute('data-win-id', win.id);
      const displayTitle = (win.title || '').replace(/^SEC\/\/[A-Z]+:\s*/i, '').trim();
      btn.title = displayTitle;

      btn.innerHTML = `
        <span class="taskbar-item-icon">${win.icon || '▪'}</span>
        <span class="taskbar-item-title">${escapeHtml(displayTitle)}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playKeyClick();
        if (win.isMinimized) {
          windowManager.restoreWindow(win.id);
          windowManager.focusWindow(win.id);
        } else if (isFocused) {
          windowManager.minimizeWindow(win.id);
        } else {
          windowManager.focusWindow(win.id);
        }
      });

      container.appendChild(btn);
    });

    this.checkTaskbarOverflow();
  }

  // Auto-compact mode: collapse titles if taskbar exceeds available screen width
  checkTaskbarOverflow() {
    const taskbar = document.getElementById('taskbar');
    const container = document.getElementById('dock-windows-container');
    if (!taskbar || !container) return;

    const windows = windowManager.getAllWindows();
    if (windows.length === 0) {
      container.classList.remove('compact-mode');
      return;
    }

    // Temporarily remove compact mode to measure natural uncompacted width
    container.classList.remove('compact-mode');

    const tray = taskbar.querySelector('.dock-system-tray');
    const trayWidth = tray ? tray.offsetWidth + 24 : 135;
    const maxAvailableWidth = (window.innerWidth - 36) - trayWidth;

    if (container.scrollWidth > maxAvailableWidth || container.scrollWidth > container.clientWidth) {
      container.classList.add('compact-mode');
    }
  }

  // Setup System Clock
  setupClock() {
    const clockEl = document.getElementById('dock-clock');
    if (!clockEl) return;
    const tick = () => {
      const d = new Date();
      clockEl.textContent = d.toTimeString().split(' ')[0];
    };
    tick();
    setInterval(tick, 1000);
  }

  // Setup Desktop Context Menu (Right Click)
  setupContextMenu() {
    const menu = document.getElementById('cyber-context-menu');
    if (!menu) return;

    document.addEventListener('contextmenu', (e) => {
      // Only trigger when clicking empty desktop or background
      if (e.target.closest('.cyber-window') || e.target.closest('#taskbar')) {
        return;
      }
      e.preventDefault();
      menu.style.display = 'block';
      menu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
      menu.style.top = `${Math.min(e.clientY, window.innerHeight - 200)}px`;
      sound.playKeyClick();
    });

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });

    document.getElementById('ctx-new-terminal')?.addEventListener('click', () => this.openTerminal());
    document.getElementById('ctx-arrange-windows')?.addEventListener('click', () => windowManager.cascadeWindows());
    document.getElementById('ctx-toggle-sound')?.addEventListener('click', () => sound.toggleMute());
    document.getElementById('ctx-toggle-matrix')?.addEventListener('click', () => matrixRain.toggleEffects(!matrixRain.enabled));
    document.getElementById('ctx-reboot')?.addEventListener('click', () => {
      if (this.terminalInstance) this.terminalInstance.triggerRebootSequence();
    });
  }

  // Event Listeners for custom triggers
  setupEventListeners() {
    window.addEventListener('app:open-project', (e) => {
      this.openProjectDetail(e.detail.slug);
    });

    window.addEventListener('app:open-contact', (e) => {
      this.openContactModal(e.detail || {});
    });
  }

  // Open Terminal Window (with persistent & safe re-mounting)
  openTerminal() {
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    const win = windowManager.createWindow({
      id: 'terminal',
      title: isLocal ? 'SEC//WIN: TERMINAL [ROOT // ADMIN]' : 'SEC//WIN: TERMINAL [ACTIVE]',
      contentHtml: `<div id="terminal-mount" style="height: 100%; width: 100%; display: flex; flex-direction: column;"></div>`,
      width: 640,
      height: Math.min(800, Math.max(500, window.innerHeight - 100)),
      x: 60,
      y: 40,
      onClose: () => {
        this.terminalInstance = null;
      }
    });

    const mount = win.element.querySelector('#terminal-mount');
    if (mount && (!this.terminalInstance || this.terminalInstance.container !== mount || !mount.hasChildNodes())) {
      this.terminalInstance = new TerminalShell(mount, 'terminal');
    }
    if (this.terminalInstance) {
      setTimeout(() => this.terminalInstance.focus(), 50);
    }
  }

  // Open Projects Explorer Window (Design 4: Circuit Timeline Stream)
  openProjectsExplorer() {
    const existing = windowManager.getWindow('projects-explorer');
    if (existing) {
      windowManager.restoreWindow('projects-explorer');
      windowManager.focusWindow('projects-explorer');
      return;
    }

    const projects = dataLoader.getProjects();

    // Chronological order: 2025 at the top, going down to today (2026)
    const sortedProjects = [...projects].sort((a, b) => {
      const da = a.startDate || '0000-00';
      const db = b.startDate || '0000-00';
      return da.localeCompare(db);
    });

    // Group projects by year
    const projects2025 = sortedProjects.filter((p) => (p.startDate || '').startsWith('2025'));
    const projects2026 = sortedProjects.filter((p) => (p.startDate || '').startsWith('2026'));

    const renderCard = (p) => {
      const imgUrl = (p.media && p.media.length > 0)
        ? (p.media[0].thumb || p.media[0].url)
        : 'data/img/projects/placeholder.svg';

      const monthName = (p.dateDisplay || '').split(' ')[0] || '';

      return `
        <div class="timeline-item" data-slug="${p.slug}">
          <div class="timeline-connector">
            <div class="timeline-node-dot"></div>
            <div class="timeline-branch-line"></div>
            <span class="timeline-branch-month">${escapeHtml(monthName)}</span>
          </div>
          <div class="timeline-card">
            <div class="timeline-card-media">
              <img src="${imgUrl}" alt="${escapeHtml(p.title)}" class="timeline-card-img" loading="lazy" />
            </div>
            <div class="timeline-card-body">
              <div>
                <div class="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <h3 class="timeline-card-title">${escapeHtml(p.title)}</h3>
                  <span class="text-[10px] px-2.5 py-0.5 border border-cyan-400 text-cyan-300 rounded font-mono">${escapeHtml(p.status)}</span>
                </div>
                <p class="timeline-card-desc">${escapeHtml(p.highlight || '')}</p>
              </div>
              <div class="flex items-center justify-end text-[11px] text-cyan-400 font-mono pt-1">
                <span class="hover:underline flex items-center gap-1">[ PROJEKT ÖFFNEN ↗ ]</span>
              </div>
            </div>
          </div>
        </div>
      `;
    };

    const contentHtml = `
      <div class="flex flex-col h-full overflow-hidden">
        <!-- Top Toolbar / Anchor Navigation -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-cyan-500 border-opacity-25 bg-black bg-opacity-40 flex-shrink-0">
          <div class="flex items-center gap-2">
            <span class="text-xs text-cyan-400 font-bold font-mono tracking-wider">CIRCUIT TIMELINE STREAM</span>
            <span class="text-[10px] px-2 py-0.5 border border-cyan-500 border-opacity-30 text-cyan-300 rounded font-mono">${sortedProjects.length} PROJEKTE</span>
          </div>
          <div class="flex items-center gap-2 font-mono text-xs">
            <span class="text-gray-400 text-[10px]">SPRUNG:</span>
            <button class="year-jump-btn px-2 py-0.5 border border-cyan-400 text-cyan-300 bg-cyan-950 bg-opacity-40 hover:bg-opacity-80 rounded text-[11px] transition cursor-pointer" data-year="2025">2025 (${projects2025.length})</button>
            <button class="year-jump-btn px-2 py-0.5 border border-cyan-400 text-cyan-300 bg-cyan-950 bg-opacity-40 hover:bg-opacity-80 rounded text-[11px] transition cursor-pointer" data-year="2026">2026 (${projects2026.length})</button>
          </div>
        </div>

        <!-- Scrollable Timeline Area -->
        <div class="flex-1 overflow-y-auto timeline-scroll-area">
          <div class="timeline-stream-wrapper">
            <!-- Glowing vertical circuit bus line -->
            <div class="timeline-circuit-bus"></div>

            <!-- Milestone 2025 -->
            <div class="timeline-year-milestone" id="year-2025">
              <div class="timeline-year-badge">
                <span>⚡</span>
                <span>2025</span>
              </div>
              <div class="timeline-year-line"></div>
              <span class="text-[10px] text-cyan-400 font-mono tracking-wider hidden sm:inline">// PROTOCOL INITIALIZATION</span>
            </div>

            <!-- 2025 Projects -->
            ${projects2025.map((p) => renderCard(p)).join('')}

            <!-- Milestone 2026 -->
            <div class="timeline-year-milestone" id="year-2026">
              <div class="timeline-year-badge">
                <span>⚡</span>
                <span>2026</span>
              </div>
              <div class="timeline-year-line"></div>
              <span class="text-[10px] text-cyan-400 font-mono tracking-wider hidden sm:inline">// SYSTEM EXPANSION & HEUTE</span>
            </div>

            <!-- 2026 Projects -->
            ${projects2026.map((p) => renderCard(p)).join('')}
          </div>
        </div>
      </div>
    `;

    const startHeight = Math.max(600, Math.round(window.innerHeight * 0.8));
    const win = windowManager.createWindow({
      id: 'projects-explorer',
      title: 'SEC//WIN: PROJECTS_EXPLORER',
      contentHtml,
      width: 900,
      height: startHeight
    });

    // Attach click events on each timeline card to open project details
    const cards = win.element.querySelectorAll('.timeline-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const item = card.closest('.timeline-item');
        const slug = item?.dataset.slug;
        if (slug) {
          sound.playKeyClick();
          this.openProjectDetail(slug);
        }
      });
    });

    // Year Jump Buttons
    const jumpBtns = win.element.querySelectorAll('.year-jump-btn');
    jumpBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetYear = btn.dataset.year;
        const targetEl = win.element.querySelector(`#year-${targetYear}`);
        if (targetEl) {
          sound.playKeyClick();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Open Project Detail Window
  openProjectDetail(slug) {
    const project = dataLoader.getProjectBySlug(slug);
    if (!project) return;

    const parsedMarkdown = dataLoader.renderMarkdown(project.content);

    const contentHtml = `
      <div class="space-y-4">
        <!-- Media & Highlights Banner -->
        <div class="border border-cyan-500 border-opacity-30 p-3 rounded bg-black bg-opacity-40">
          <div class="flex flex-col sm:flex-row gap-4 items-start">
            ${project.media && project.media.length > 0 ? `
              <div class="w-full sm:w-64 flex-shrink-0">
                <div class="project-hero-thumb group relative rounded border border-cyan-500 border-opacity-30 hover:border-cyan-400 transition cursor-pointer overflow-hidden bg-black bg-opacity-50" data-media-idx="0">
                  <img src="${project.media[0].thumb || project.media[0].url}" alt="${escapeHtml(project.title)}" class="w-full h-auto object-cover group-hover:scale-105 transition duration-300" />
                  <div class="absolute inset-0 bg-cyan-950 bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                    <span class="opacity-0 group-hover:opacity-100 transition text-xs text-cyan-200 font-mono bg-black bg-opacity-80 px-2.5 py-1 rounded border border-cyan-400 flex items-center gap-1">
                      <span>🔍</span>
                      <span>Galerie öffnen (${project.media.length})</span>
                    </span>
                  </div>
                </div>
                <div class="text-[10px] text-gray-400 font-mono mt-1 text-center">${escapeHtml(project.media[0].caption || '')}</div>
              </div>
            ` : ''}
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2 flex-wrap">
                <h2 class="text-lg font-bold text-cyan-400">${project.title}</h2>
                ${project.dateDisplay ? `<span class="text-xs px-2 py-0.5 bg-cyan-950 text-cyan-200 border border-cyan-500 border-opacity-30 rounded font-mono">${project.dateDisplay}</span>` : ''}
                <span class="text-xs px-2 py-0.5 border border-cyan-400 text-cyan-300 rounded font-mono">${project.status}</span>
              </div>
              <p class="text-sm text-gray-200 mb-3 leading-relaxed">${project.highlight}</p>
              
              <div class="text-xs font-bold text-cyan-300 mb-1">FEATURES // HIGHLIGHTS:</div>
              <ul class="list-disc list-inside text-xs text-gray-300 space-y-1 mb-3">
                ${project.features.map((f) => `<li>${f}</li>`).join('')}
              </ul>

              <div class="flex flex-wrap gap-2 mt-2">
                ${project.links ? project.links.map((link) => `
                  <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="text-xs px-3 py-1 bg-cyan-500 bg-opacity-20 border border-cyan-400 hover:bg-opacity-40 text-white rounded font-mono transition flex items-center gap-1.5">
                    <span>↗</span>
                    <span>${link.label}</span>
                  </a>
                `).join('') : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Screenshots / Lightbox Gallery -->
        ${project.media && project.media.length > 1 ? `
          <div class="border border-cyan-500 border-opacity-30 p-3 rounded bg-black bg-opacity-40">
            <div class="flex items-center justify-between mb-2.5">
              <div class="text-xs text-cyan-400 font-bold font-mono tracking-wider flex items-center gap-2">
                <span>📸 SCREENSHOTS // GALERIE</span>
                <span class="text-[10px] text-cyan-300 font-mono px-1.5 py-0.2 border border-cyan-500 border-opacity-30 rounded">${project.media.length} BILDER</span>
              </div>
              <span class="text-[10px] text-gray-400 font-mono">[ KLICKEN ZUR GROßANSICHT ]</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              ${project.media.map((item, idx) => `
                <div class="project-thumb-card group relative border border-cyan-500 border-opacity-25 hover:border-cyan-400 rounded overflow-hidden cursor-pointer transition bg-black bg-opacity-60" data-media-idx="${idx}">
                  <div class="aspect-video w-full overflow-hidden flex items-center justify-center bg-gray-950">
                    <img src="${item.thumb || item.url}" alt="${escapeHtml(item.caption || project.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                  </div>
                  <div class="absolute inset-0 bg-cyan-950 bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center">
                    <span class="opacity-0 group-hover:opacity-100 transition text-[11px] text-cyan-200 font-mono bg-black bg-opacity-80 px-2 py-0.5 rounded border border-cyan-400">🔍 Großansicht</span>
                  </div>
                  ${item.caption ? `
                    <div class="p-1.5 text-[10px] text-gray-400 font-mono truncate" title="${escapeHtml(item.caption)}">${escapeHtml(item.caption)}</div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Markdown Body -->
        <div class="markdown-body border-t border-cyan-500 border-opacity-20 pt-3">
          ${parsedMarkdown}
        </div>
      </div>
    `;

    const win = windowManager.createWindow({
      id: `proj-${slug}`,
      title: `SEC//PROJ: ${project.title.toUpperCase()}`,
      contentHtml,
      width: 760,
      height: 520
    });

    // Attach click events to all gallery thumbnails to open Lightbox
    const allThumbTriggers = win.element.querySelectorAll('.project-hero-thumb, .project-thumb-card');
    allThumbTriggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const idx = parseInt(trigger.dataset.mediaIdx || '0', 10);
        lightboxViewer.open(project.media, idx, project.title);
      });
    });
  }

  // Open About Operator Profile (ASCII Portrait + Bio + Radar)
  async openAboutProfile() {
    const existing = windowManager.getWindow('about-profile');
    if (existing) {
      windowManager.restoreWindow('about-profile');
      windowManager.focusWindow('about-profile');
      return;
    }

    const profile = dataLoader.getProfile() || { operator: { name: 'Operator' } };
    const avatarPath = profile?.operator?.avatar || 'data/img/operator_hologram.webp';
    const rawCoords = profile?.operator?.coordinates || "52°23'N 13°03'E";
    const locDisplay = rawCoords.startsWith('LOC:') ? rawCoords : `LOC: ${rawCoords}`;

    const win = windowManager.createWindow({
      id: 'about-profile',
      title: 'SEC//WIN: OPERATOR_DOSSIER',
      contentHtml: `
        <div class="space-y-4">
          <div class="flex flex-col md:flex-row gap-4 items-start">
            <!-- Left: Cyber Overwatch Satellite Screen (Design 2: Cyber/Dither Hologram) -->
            <div class="w-full md:w-80 flex-shrink-0 flex flex-col border border-cyan-500 border-opacity-35 rounded bg-black bg-opacity-70 overflow-hidden shadow-[0_0_24px_rgba(0,229,255,0.18)] overwatch-screen group relative">
              <!-- Top Satellite Header (Stacked Vertically) -->
              <div class="flex flex-col px-3 py-1.5 bg-cyan-950 bg-opacity-70 border-b border-cyan-500 border-opacity-30 font-mono">
                <div class="flex items-center gap-2 text-cyan-300 font-bold tracking-wider text-[10px]">
                  <span class="cyber-pulse-dot" style="display:inline-block; width:7px; height:7px; min-width:7px; min-height:7px; border-radius:50%; background-color:#00e5ff; box-shadow:0 0 8px #00e5ff; vertical-align:middle;"></span>
                  <span>SAT//OVERWATCH</span>
                </div>
                <div class="text-cyan-400 text-[9px] tracking-widest mt-0.5">ORBIT: 420KM // CH: 0x8F</div>
              </div>

              <!-- Main Hologram Viewport Stage -->
              <div class="relative w-full aspect-square bg-[#020617] overflow-hidden flex items-center justify-center p-1">
                <!-- 3D Hologram Image -->
                <img 
                  id="hologram-avatar"
                  src="${avatarPath}" 
                  alt="${escapeHtml(profile.operator.name)}"
                  class="w-full h-full object-cover rounded filter contrast-110 brightness-105 transition-transform duration-200 select-none pointer-events-none" 
                  loading="eager"
                />

                <!-- Subtle Cyber Scanline Overlay -->
                <div class="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.5)_51%)] bg-[length:100%_4px] opacity-35"></div>

                <!-- Animated Satellite Radar Sweep Beam -->
                <div class="absolute inset-0 pointer-events-none opacity-25 bg-gradient-to-b from-cyan-400/25 via-transparent to-transparent animate-[pulse_4s_ease-in-out_infinite]"></div>

                <!-- Tactical Corner Brackets -->
                <div class="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none"></div>
                <div class="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none"></div>
                <div class="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none"></div>
                <div class="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none"></div>

                <!-- Centered Dark Coordinate Location at Bottom of Stage -->
                <div class="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none select-none z-10">
                  <span class="text-[9.5px] font-mono font-bold tracking-wider" style="color: #041d2c;">
                    ${escapeHtml(locDisplay)}
                  </span>
                </div>

                <!-- Central Targeting Reticle on Hover -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div class="w-16 h-16 border border-cyan-400 border-dashed rounded-full animate-spin [animation-duration:14s]"></div>
                  <div class="absolute w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#00e5ff]"></div>
                </div>
              </div>

              <!-- Bottom Satellite Telemetry Footer Bar -->
              <div class="px-3 py-1.5 bg-black bg-opacity-80 border-t border-cyan-500 border-opacity-25 flex items-center justify-between font-mono text-[9px] text-gray-400">
                <span class="text-cyan-300 tracking-wider">HOLO-DITHER v2.4</span>
                <span class="text-emerald-400 font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>STATUS: VERIFIED</span>
              </div>
            </div>

            <!-- Right: Bio & Telemetry -->
            <div class="flex-1 space-y-3">
              <div>
                <div class="text-xs text-gray-400 font-mono">CALLSIGN: <span class="text-cyan-400 font-bold">${profile.operator.callsign}</span></div>
                <div class="text-lg font-bold text-white">${profile.operator.name}</div>
                <div class="text-xs text-cyan-300 font-mono">${profile.operator.role}</div>
              </div>

              <div class="text-xs text-gray-300 leading-relaxed border-t border-b border-cyan-500 border-opacity-20 py-2">
                ${profile.bio}
              </div>

              <!-- Telemetry Metrics -->
              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <div class="p-2 border border-cyan-500 border-opacity-20 rounded bg-black bg-opacity-30">
                  <div class="text-gray-400 text-[10px]">ERFAHRUNG // UPTIME</div>
                  <div class="text-cyan-400 font-bold">${profile.telemetry.uptime}</div>
                </div>
                <div class="p-2 border border-cyan-500 border-opacity-20 rounded bg-black bg-opacity-30">
                  <div class="text-gray-400 text-[10px]">STANDORT // SEKTOR</div>
                  <div class="text-cyan-400 font-bold truncate">${profile.operator.location || 'Potsdam, DE'}</div>
                </div>
              </div>

              <!-- Social Links -->
              <div class="flex gap-2 pt-2 flex-wrap">
                ${(profile.links || []).map((l) => {
                  const isMail = l.label?.toLowerCase().includes('mail') || l.url?.startsWith('mailto:') || l.icon === 'mail';
                  if (isMail) {
                    return `
                      <button type="button" class="btn-open-contact text-xs px-2.5 py-1 border border-cyan-400 text-cyan-300 hover:bg-cyan-500 hover:bg-opacity-20 rounded font-mono transition cursor-pointer flex items-center gap-1">
                        <span>✉</span>
                        <span>${escapeHtml(l.label)}</span>
                      </button>
                    `;
                  }
                  return `
                    <a href="${l.url}" target="_blank" rel="noopener" class="text-xs px-2.5 py-1 border border-cyan-400 text-cyan-300 hover:bg-cyan-500 hover:bg-opacity-20 rounded font-mono transition">
                      ${escapeHtml(l.label)}
                    </a>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Middle Section: Skills (Left) & File Attachments (Right) -->
          ${(profile.skills?.length || profile.attachments?.length) ? `
          <div class="mt-6 pt-5 border-t border-cyan-500 border-opacity-30">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              <!-- Left: Skills -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-cyan-400 font-bold font-mono tracking-wider">SKILLS // FÄHIGKEITEN &amp; KENNTNISSE</span>
                    <span class="text-[10px] px-1.5 py-0.5 border border-cyan-500 border-opacity-30 text-cyan-300 rounded font-mono">${(profile.skills || []).length}</span>
                  </div>
                  <span class="text-[10px] text-gray-400 font-mono hidden sm:inline">// VERIFIED SKILLSET</span>
                </div>
                <div class="flex flex-wrap gap-1.5 p-3 rounded bg-black bg-opacity-40 border border-cyan-500 border-opacity-20 max-h-56 overflow-y-auto custom-scrollbar">
                  ${(profile.skills || []).map(skill => `
                    <span class="operator-skill-chip">
                      <span class="text-cyan-400 text-[9px]">⚡</span>
                      <span>${escapeHtml(skill)}</span>
                    </span>
                  `).join('')}
                </div>
              </div>

              <!-- Right: Attachments / Documents -->
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-cyan-400 font-bold font-mono tracking-wider">ATTACHMENTS // DOKUMENTE</span>
                    <span class="text-[10px] px-1.5 py-0.5 border border-cyan-500 border-opacity-30 text-cyan-300 rounded font-mono">${(profile.attachments || []).length}</span>
                  </div>
                  <span class="text-[10px] text-gray-400 font-mono hidden sm:inline">// REPOSITORY FILES</span>
                </div>
                <div class="space-y-2 p-3 rounded bg-black bg-opacity-40 border border-cyan-500 border-opacity-20 max-h-56 overflow-y-auto custom-scrollbar">
                  ${(profile.attachments && profile.attachments.length > 0) ? profile.attachments.map(att => {
                    const href = att.file || att.url || '#';
                    const icon = att.icon || (att.url ? '🌐' : '📄');
                    const badgeText = att.type || (att.url ? 'LINK' : 'PDF');
                    return `
                    <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="operator-attachment-card group">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-cyan-400 text-base">${icon}</span>
                        <div class="min-w-0">
                          <div class="att-title truncate">${escapeHtml(att.title || att.name)}</div>
                          <div class="att-meta truncate">${escapeHtml(att.desc || att.file || att.url)}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        ${att.size ? `<span class="text-[10px] text-gray-400 font-mono">${escapeHtml(att.size)}</span>` : ''}
                        <span class="att-badge">${escapeHtml(badgeText)}</span>
                        <span class="text-cyan-400 text-xs group-hover:translate-x-0.5 transition-transform">↗</span>
                      </div>
                    </a>
                  `;
                  }).join('') : `
                    <div class="text-xs text-gray-400 font-mono p-2">Keine Dateianhänge hinterlegt.</div>
                  `}
                </div>
              </div>

            </div>
          </div>
          ` : ''}

          <!-- Career & Job Experience Timeline (CV) -->
          <div class="mt-6 pt-5 border-t border-cyan-500 border-opacity-30">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs text-cyan-400 font-bold font-mono tracking-wider">CAREER TIMELINE // BERUFLICHER WERDEGANG</span>
                <span class="text-[10px] px-2 py-0.5 border border-cyan-500 border-opacity-30 text-cyan-300 rounded font-mono">${(profile.jobs || []).length} STATIONEN</span>
              </div>
              <div class="text-[10px] text-gray-400 font-mono hidden sm:block">// VERIFIED EMPLOYMENT RECORD</div>
            </div>

            <div class="timeline-stream-wrapper !p-2 !pl-10">
              <div class="timeline-circuit-bus !left-4"></div>
              
              ${(profile.jobs || []).map((job) => {
                const period = job.startDate && job.endDate ? `${job.startDate} — ${job.endDate}` : (job.startDate || '');
                return `
                  <div class="timeline-item !mb-4">
                    <div class="timeline-connector !w-16">
                      <div class="timeline-node-dot"></div>
                      <div class="timeline-branch-line"></div>
                      <span class="timeline-branch-month text-[10px]">${escapeHtml(job.startDate || '')}</span>
                    </div>
                    <div class="timeline-card !p-3.5 flex-1">
                      <div class="timeline-card-body !p-0">
                        <div class="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <h4 class="timeline-card-title text-sm font-bold text-cyan-300">${escapeHtml(job.title)}</h4>
                          <span class="text-[10px] px-2 py-0.5 border border-cyan-500 border-opacity-40 text-cyan-300 rounded font-mono">${escapeHtml(period)}</span>
                        </div>
                        <div class="text-xs text-gray-300 font-semibold mb-1.5 flex items-center gap-1.5">
                          <span class="text-cyan-400 font-mono text-[11px]">🏢</span>
                          <span class="text-cyan-200">${escapeHtml(job.company)}</span>
                        </div>
                        <p class="operator-timeline-card-desc">${escapeHtml(job.description)}</p>
                        ${(job.attachments && job.attachments.length > 0) ? `
                          <div class="mt-3 pt-2.5 border-t border-cyan-500 border-opacity-20 flex flex-wrap items-center gap-2">
                            <span class="text-[10px] text-gray-400 font-mono">ANHANG / LINK:</span>
                            ${job.attachments.map(att => {
                              const href = att.file || att.url || '#';
                              const icon = att.icon || (att.url ? '🌐' : '📎');
                              const typeStr = att.type ? `<span class="text-[9px] opacity-75">(${escapeHtml(att.type)})</span>` : '';
                              return `
                                <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="job-attachment-btn">
                                  <span>${icon}</span>
                                  <span>${escapeHtml(att.title || att.name || 'Dokument')}</span>
                                  ${typeStr}
                                  <span class="text-[10px]">↗</span>
                                </a>
                              `;
                            }).join('')}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `,
      width: Math.min(1020, Math.max(840, Math.round(window.innerWidth * 0.7))),
      height: Math.min(Math.max(680, Math.round(window.innerHeight * 0.85)), Math.max(620, Math.round(window.innerHeight * 0.75)))
    });

    // Handle E-Mail click to open encrypted dispatch contact modal
    const mailBtn = win.element.querySelector('.btn-open-contact');
    if (mailBtn) {
      mailBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playKeyClick();
        this.openContactModal();
      });
    }

    // Interactive 3D Parallax Tilt & Scanline effect on Overwatch Screen
    const holoScreen = win.element.querySelector('.overwatch-screen');
    const holoImg = win.element.querySelector('#hologram-avatar');
    if (holoScreen && holoImg) {
      holoScreen.addEventListener('mousemove', (e) => {
        const rect = holoScreen.getBoundingClientRect();
        const normX = (e.clientX - rect.left) / rect.width - 0.5;
        const normY = (e.clientY - rect.top) / rect.height - 0.5;
        holoImg.style.transform = `perspective(500px) rotateY(${normX * 14}deg) rotateX(${-normY * 14}deg) scale(1.03)`;
      });
      holoScreen.addEventListener('mouseleave', () => {
        holoImg.style.transform = 'perspective(500px) rotateY(0deg) rotateX(0deg) scale(1)';
      });
    }
  }

  // Open Radar Telemetry Window
  openRadarWindow() {
    const existing = windowManager.getWindow('telemetry-radar');
    if (existing) {
      windowManager.restoreWindow('telemetry-radar');
      windowManager.focusWindow('telemetry-radar');
      return;
    }

    const profile = dataLoader.getProfile();
    const skills = profile ? profile.radar_skills : [];

    let radarInstance = null;

    const radarIcon = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9.5" stroke-width="1.8" /><circle cx="12" cy="12" r="4.8" stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="1.5 1.5" /><path d="M12 12 L20.2 8.2 A 9.5 9.5 0 0 0 17.5 4.8 Z" fill="currentColor" fill-opacity="0.3" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><line x1="12" y1="12" x2="17.5" y2="4.8" stroke-width="1.8" stroke-linecap="round" /></svg>`;

    const win = windowManager.createWindow({
      id: 'telemetry-radar',
      title: 'SEC//WIN: SKILL_RADAR',
      icon: radarIcon,
      contentHtml: `
        <div class="flex flex-col items-center justify-between p-2 h-full">
          <canvas id="radar-canvas" width="840" height="700" style="max-width: 100%; height: auto; border: 1px solid rgba(0,229,255,0.25); background: rgba(2,6,23,0.75); box-shadow: 0 0 20px rgba(0,229,255,0.12); border-radius: 4px;"></canvas>
          <div class="text-[11px] text-cyan-400 font-mono mt-2 text-center flex items-center justify-center gap-3">
            <span>● TACTICAL 360° SKILL SCAN</span>
            <span class="text-gray-500">//</span>
            <span class="text-gray-300">SECTOR 0x7F</span>
            <span class="text-gray-500">//</span>
            <span class="text-emerald-400 font-bold">${skills.length} TARGETS LOCKED</span>
          </div>
        </div>
      `,
      width: 900,
      height: Math.min(840, Math.round(window.innerHeight * 0.88)),
      onClose: () => {
        if (radarInstance) radarInstance.destroy();
      }
    });

    const canvasEl = win.element.querySelector('#radar-canvas');
    if (canvasEl) {
      radarInstance = new RadarHUD(canvasEl, skills);
      radarInstance.start();
    }
  }

  // Open Contact Modal Form (send-greetings / encrypted dispatch)
  openContactModal(prefill = {}) {
    if (windowManager.getWindow('contact-modal')) {
      windowManager.restoreWindow('contact-modal');
      windowManager.focusWindow('contact-modal');
      return;
    }

    const defaultSubject = prefill.subject || '';
    const defaultMsg = prefill.message || '';

    windowManager.createWindow({
      id: 'contact-modal',
      title: 'SEC//WIN: ENCRYPTED_DISPATCH',
      contentHtml: `
        <div style="font-family:'Oxanium',monospace;" class="space-y-3">
          <div class="text-xs text-cyan-400 font-bold tracking-wider">SECURE ENCRYPTED DISPATCH // NACHRICHT AN OPERATOR</div>
          <form id="contact-form" class="space-y-3">
            <!-- CSRF Token -->
            <input type="hidden" id="contact-csrf" name="csrf_token" value="" />
            <!-- Honeypot trap for bots -->
            <div style="position: absolute; left: -9999px; opacity: 0; pointer-events: none;" aria-hidden="true">
              <input type="text" id="contact-trap" name="cyber_trap" tabindex="-1" autocomplete="off" />
            </div>

            <div>
              <label class="block text-[11px] text-gray-400 mb-1">CALLSIGN / NAME:</label>
              <input type="text" id="contact-name" name="name" class="w-full bg-black bg-opacity-60 border border-cyan-500 border-opacity-30 p-2 text-xs text-white rounded focus:border-cyan-400 outline-none" required placeholder="Agent 007" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">COMM-LINK / E-MAIL:</label>
              <input type="email" id="contact-email" name="email" class="w-full bg-black bg-opacity-60 border border-cyan-500 border-opacity-30 p-2 text-xs text-white rounded focus:border-cyan-400 outline-none" required placeholder="agent@agency.org" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">BETREFF / SUBJECT:</label>
              <input type="text" id="contact-subject" name="subject" value="${defaultSubject}" class="w-full bg-black bg-opacity-60 border border-cyan-500 border-opacity-30 p-2 text-xs text-white rounded focus:border-cyan-400 outline-none" required placeholder="Projektanfrage / Feedback" />
            </div>
            <div>
              <label class="block text-[11px] text-gray-400 mb-1">ENCRYPTED PAYLOAD / NACHRICHT:</label>
              <textarea id="contact-msg" name="message" rows="4" class="w-full bg-black bg-opacity-60 border border-cyan-500 border-opacity-30 p-2 text-xs text-white rounded focus:border-cyan-400 outline-none" required placeholder="Hallo Hannes, ich habe dein CyberDeck-Portfolio gesehen...">${defaultMsg}</textarea>
            </div>
            <button type="submit" id="btn-send-dispatch" class="w-full py-2.5 bg-cyan-500 bg-opacity-20 border border-cyan-400 hover:bg-opacity-40 text-cyan-300 font-bold text-xs tracking-wider uppercase rounded transition cursor-pointer">
              [ TRANSMIT DISPATCH // SENDEN ]
            </button>
            <div id="contact-status" class="text-xs text-center font-mono empty:hidden pt-2"></div>
          </form>
        </div>
      `,
      width: 540,
      height: Math.min(545, Math.max(480, window.innerHeight - 100))
    });

    const form = document.getElementById('contact-form');
    const status = document.getElementById('contact-status');
    const submitBtn = document.getElementById('btn-send-dispatch');

    // Populate CSRF token from HTML meta header
    const metaCsrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const csrfInput = document.getElementById('contact-csrf');
    if (csrfInput) csrfInput.value = metaCsrf;

    let cooldownInterval = null;

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (cooldownInterval) clearInterval(cooldownInterval);

        const formData = new FormData(form);
        if (!formData.get('csrf_token')) {
          const currentMeta = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
          formData.set('csrf_token', currentMeta);
        }

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.textContent = '[ ENCRYPTING & TRANSMITTING... ]';
        status.className = 'text-xs text-center font-mono text-cyan-300';
        status.textContent = 'UPLINK AKTIV: SENDE DISPATCH AN SEC//OPS-SERVER...';

        try {
          const response = await fetch('api/contact.php', {
            method: 'POST',
            body: formData
          });

          const data = await response.json().catch(() => ({}));

          if (response.ok && data.success) {
            status.className = 'text-xs text-center font-mono text-emerald-400';
            status.textContent = `✔ ${data.message || 'DISPATCH ERFOLGREICH ÜBERMITTELT.'}`;
            sound.playAccessGranted();
            form.reset();

            if (data.new_csrf) {
              const metaEl = document.querySelector('meta[name="csrf-token"]');
              if (metaEl) metaEl.setAttribute('content', data.new_csrf);
              if (csrfInput) csrfInput.value = data.new_csrf;
            }

            submitBtn.textContent = '[ GESENDET // TRANSMITTED ]';
            setTimeout(() => {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '1';
              submitBtn.textContent = '[ TRANSMIT DISPATCH // SENDEN ]';
            }, 3000);
          } else if (response.status === 429) {
            // Rate Limit Cooldown Active
            let remaining = data.remaining || 60;
            status.className = 'text-xs text-center font-mono text-amber-400';
            status.textContent = `⚠ SICHERHEITS-COOLDOWN: BITTE WARTE NOCH ${remaining}s VOR DER NÄCHSTEN NACHRICHT.`;
            sound.playWarningBeep();

            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';

            cooldownInterval = setInterval(() => {
              remaining--;
              if (remaining <= 0) {
                clearInterval(cooldownInterval);
                cooldownInterval = null;
                status.className = 'text-xs text-center font-mono text-cyan-300';
                status.textContent = 'COOLDOWN BEENDET. DU KANNST JETZT SENDEN.';
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.textContent = '[ TRANSMIT DISPATCH // SENDEN ]';
              } else {
                status.textContent = `⚠ SICHERHEITS-COOLDOWN: BITTE WARTE NOCH ${remaining}s VOR DER NÄCHSTEN NACHRICHT.`;
                submitBtn.textContent = `[ COOLDOWN // ${remaining}s ]`;
              }
            }, 1000);
          } else {
            status.className = 'text-xs text-center font-mono text-rose-400';
            status.textContent = `✖ FEHLER: ${data.message || 'Dispatch konnte nicht übertragen werden.'}`;
            sound.playAccessDenied();
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.textContent = '[ TRANSMIT DISPATCH // SENDEN ]';
          }
        } catch (err) {
          status.className = 'text-xs text-center font-mono text-rose-400';
          status.textContent = '✖ VERBINDUNGSFEHLER: Server nicht erreichbar.';
          sound.playAccessDenied();
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.textContent = '[ TRANSMIT DISPATCH // SENDEN ]';
        }
      });
    }
  }

  // Handle URL Query & Hash Deep Links
  handleDeepLinks() {
    const params = new URLSearchParams(window.location.search);
    const openSlug = params.get('open');
    if (openSlug) {
      setTimeout(() => this.openProjectDetail(openSlug), 400);
      return;
    }

    const hash = window.location.hash;
    if (hash.startsWith('#project/')) {
      const slug = hash.replace('#project/', '');
      setTimeout(() => this.openProjectDetail(slug), 400);
    } else if (hash === '#terminal') {
      setTimeout(() => this.openTerminal(), 400);
    }
  }
}

export const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
