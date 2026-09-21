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
import { asciiRenderer } from './asciiRenderer.js';

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
      "LOADING VIRTUAL VFS: /content/projects .......... [OK]",
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
      title: 'SEC//SYS: SYSTEM READY',
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
        title: 'Telemetrie',
        action: () => this.openRadarWindow(),
        icon: `<svg class="w-full h-full p-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`
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
      btn.title = win.title;

      btn.innerHTML = `
        <span class="taskbar-item-icon">${win.icon || '▪'}</span>
        <span class="taskbar-item-title">${win.title}</span>
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
    const win = windowManager.createWindow({
      id: 'terminal',
      title: 'SEC//WIN: TERMINAL [ACTIVE]',
      contentHtml: `<div id="terminal-mount" style="height: 100%; width: 100%; display: flex; flex-direction: column;"></div>`,
      width: 640,
      height: 400,
      x: 60,
      y: 80,
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

  // Open Projects Explorer Window
  openProjectsExplorer() {
    const projects = dataLoader.getProjects();
    const categories = Array.from(new Set(projects.map((p) => p.category)));

    const contentHtml = `
      <div class="flex flex-col md:flex-row h-full gap-4">
        <!-- Sidebar -->
        <div class="w-full md:w-48 flex-shrink-0 border-b md:border-b-0 md:border-r border-cyan-500 border-opacity-20 pr-3">
          <div class="text-xs text-cyan-400 font-bold tracking-wider uppercase mb-3">Sektoren / Archive</div>
          <div class="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0" id="explorer-filter-list">
            <button class="filter-btn active text-left px-2 py-1 text-xs text-white bg-cyan-500 bg-opacity-20 border border-cyan-400 rounded" data-filter="all">Alle Projekte (${projects.length})</button>
            ${categories.map((cat) => `
              <button class="filter-btn text-left px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-cyan-500 hover:bg-opacity-10 rounded" data-filter="${cat}">${cat}</button>
            `).join('')}
          </div>
        </div>

        <!-- Main Grid Area -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="explorer-grid">
            ${projects.map((p) => `
              <div class="project-card p-3 border border-cyan-500 border-opacity-25 rounded bg-blue-950 bg-opacity-30 hover:border-cyan-400 hover:bg-opacity-50 transition cursor-pointer" data-slug="${p.slug}">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs text-cyan-400 font-bold">${p.title}</span>
                  <span class="text-[10px] px-1.5 py-0.5 border border-cyan-400 text-cyan-300 rounded font-mono">${p.status}</span>
                </div>
                <div class="text-xs text-gray-300 mb-2 line-clamp-2">${p.highlight}</div>
                <div class="flex flex-wrap gap-1">
                  ${p.tags.map((t) => `<span class="text-[10px] bg-black bg-opacity-50 text-cyan-200 px-1.5 py-0.5 rounded font-mono">#${t}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    const win = windowManager.createWindow({
      id: 'projects-explorer',
      title: 'SEC//WIN: PROJECTS_EXPLORER',
      contentHtml,
      width: 760,
      height: 480
    });

    // Attach interaction to project cards
    const cards = win.element.querySelectorAll('.project-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        this.openProjectDetail(slug);
      });
    });

    // Filter interaction
    const filterBtns = win.element.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => {
          b.className = 'filter-btn text-left px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-cyan-500 hover:bg-opacity-10 rounded';
        });
        btn.className = 'filter-btn active text-left px-2 py-1 text-xs text-white bg-cyan-500 bg-opacity-20 border border-cyan-400 rounded';

        const filter = btn.dataset.filter;
        cards.forEach((card) => {
          const proj = dataLoader.getProjectBySlug(card.dataset.slug);
          if (filter === 'all' || (proj && proj.category === filter)) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
        sound.playKeyClick();
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
              <div class="w-full sm:w-60 flex-shrink-0">
                <img src="${project.media[0].url}" alt="${project.title}" class="w-full h-auto rounded border border-cyan-500 border-opacity-20" />
                <div class="text-[10px] text-gray-400 font-mono mt-1">${project.media[0].caption || ''}</div>
              </div>
            ` : ''}
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h2 class="text-lg font-bold text-cyan-400">${project.title}</h2>
                <span class="text-xs px-2 py-0.5 border border-cyan-400 text-cyan-300 rounded font-mono">${project.status}</span>
              </div>
              <p class="text-sm text-gray-200 mb-3">${project.highlight}</p>
              
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

        <!-- Markdown Body -->
        <div class="markdown-body border-t border-cyan-500 border-opacity-20 pt-3">
          ${parsedMarkdown}
        </div>
      </div>
    `;

    windowManager.createWindow({
      id: `proj-${slug}`,
      title: `SEC//PROJ: ${project.title.toUpperCase()}`,
      contentHtml,
      width: 720,
      height: 500
    });
  }

  // Open About Operator Profile (ASCII Portrait + Bio + Radar)
  async openAboutProfile() {
    const profile = dataLoader.getProfile() || { operator: { name: 'Operator' } };

    const win = windowManager.createWindow({
      id: 'about-profile',
      title: 'SEC//WIN: OPERATOR_DOSSIER',
      contentHtml: `
        <div class="space-y-4">
          <div class="flex flex-col md:flex-row gap-4 items-start">
            <!-- Left: ASCII Portrait Canvas -->
            <div class="w-full md:w-64 flex-shrink-0 flex flex-col items-center border border-cyan-500 border-opacity-25 p-2 rounded bg-black bg-opacity-50">
              <div class="text-[11px] text-cyan-400 font-mono tracking-wider mb-2">LIVE ASCII STREAM</div>
              <pre id="ascii-target" style="font-family:'Oxanium',monospace; font-size:6.5px; line-height:1; color:#00e5ff; overflow:hidden;"></pre>
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
                  <div class="text-gray-400 text-[10px]">UPTIME</div>
                  <div class="text-cyan-400 font-bold">${profile.telemetry.uptime}</div>
                </div>
                <div class="p-2 border border-cyan-500 border-opacity-20 rounded bg-black bg-opacity-30">
                  <div class="text-gray-400 text-[10px]">NEURAL SYNC</div>
                  <div class="text-cyan-400 font-bold">${profile.telemetry.neural_sync}</div>
                </div>
              </div>

              <!-- Social Links -->
              <div class="flex gap-2 pt-2">
                ${profile.links.map((l) => `
                  <a href="${l.url}" target="_blank" rel="noopener" class="text-xs px-2.5 py-1 border border-cyan-400 text-cyan-300 hover:bg-cyan-500 hover:bg-opacity-20 rounded font-mono transition">
                    ${l.label}
                  </a>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `,
      width: 680,
      height: 480
    });

    // Render ASCII portrait
    const asciiTarget = win.element.querySelector('#ascii-target');
    if (asciiTarget) {
      asciiTarget.textContent = 'CONVERTING OPTICAL BUFFER...';
      const avatarPath = profile?.operator?.avatar || 'assets/img/me.webp';
      const asciiArt = await asciiRenderer.convertImage(avatarPath, 60);
      asciiTarget.textContent = asciiArt;
    }
  }

  // Open Radar Telemetry Window
  openRadarWindow() {
    const profile = dataLoader.getProfile();
    const skills = profile ? profile.radar_skills : [];

    let radarInstance = null;

    const win = windowManager.createWindow({
      id: 'telemetry-radar',
      title: 'SEC//WIN: SKILL_RADAR_TELEMETRY',
      contentHtml: `
        <div class="flex flex-col items-center justify-center p-2">
          <canvas id="radar-canvas" width="340" height="340" style="max-width: 100%; border-radius: 50%; border: 1px solid rgba(0,229,255,0.3); box-shadow: 0 0 16px rgba(0,229,255,0.2);"></canvas>
          <div class="text-xs text-gray-400 font-mono mt-3 text-center">
            TACTICAL 360° SKILL SCAN // SECTOR 0x7F
          </div>
        </div>
      `,
      width: 420,
      height: 460,
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
          </form>
          <div id="contact-status" class="text-xs text-center font-mono min-h-[1.5em] mt-1"></div>
        </div>
      `,
      width: 520,
      height: 560
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
