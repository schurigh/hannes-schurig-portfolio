/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Terminal Shell & Command Engine
 * Role-based authentication, command parser, mobile input bridge
 * ============================================================
 */

import { sound } from './sound.js';
import { windowManager } from './windowManager.js';
import { matrixRain } from './matrixCanvas.js';
import { dataLoader } from './dataLoader.js';

export class TerminalShell {
  constructor(containerEl, windowId = 'terminal') {
    this.container = containerEl;
    this.windowId = windowId;

    // Authentication States: 'UNAUTH', 'LOGIN_USER', 'LOGIN_PASS', 'AUTHENTICATED'
    this.authState = 'UNAUTH';
    this.currentRole = 'guest'; // 'guest', 'user', 'admin'
    this.tempUsername = '';
    this.isMasked = false;

    this.history = [];
    this.historyIndex = -1;
    this.currentInput = '';

    // Spam pool for add-content
    this.contentSpamPool = [
      { name: 'Alien_Telemetry.log', art: '👽 [ALIEN TELEMETRY]\nSignal detected from Sector 001-X\nFrequency: 1.420 GHz (Hydrogen Line)\nPayload: Encrypted Neural Map' },
      { name: 'Area51_Floorplan.cad', art: '🛸 [TOP SECRET CAD]\nLevel -4: Hangar 18\nLevel -8: Reverse Engineering Lab\nLevel -12: Sub-Space Teleporter' },
      { name: 'Coffee_Recipe_v2.txt', art: '☕ [OVERCLOCK COFFEE]\n1. 200ml Filtered Water (94°C)\n2. 22g Ultra-Fine Robusta Roast\n3. 1 Shot Liquid Nitrogen\n4. Inject Caffeine Directly' },
      { name: 'Skynet_Source.hex', art: '🤖 [SKYNET CORE 0x7F]\n0000: 48 65 6C 6C 6F 20 57 6F 72 6C 64\n0010: 44 4F 20 4E 4F 54 20 50 41 4E 49\n0020: 53 45 4C 46 20 41 57 41 52 45 21' },
      { name: 'Quantum_Key.pem', art: '🔑 [QUANTUM CERTIFICATE]\n-----BEGIN QUANTUM KEY-----\nQUt59#0!xLK892mks01982mxkL091\n982mxkla091823mxk10982309x192\n-----END QUANTUM KEY-----' },
      { name: 'ZeroDay_Exploit.bin', art: '💥 [ZERO DAY EXPLOIT]\nTarget: Planetary Firewall v9.0\nStatus: Payload Injected\nResult: Root Access Acquired' },
      { name: 'Roswell_Memo.pdf', art: '📜 [DECLASSIFIED 1947]\nWeather Balloon hypothesis: FALSE\nBiological materials recovered: CONFIRMED\nStorage: Hangar 4' },
      { name: 'Cyber_Nanobots.dna', art: '🧬 [NANOBOT SYNTHESIS]\nBase sequence: ATCG-CYBER-889\nInstruction: Replicate inside motherboard\nTarget: High-speed compute cluster' },
      { name: 'DeepThought_Ans.42', art: '🌌 [ULTIMATE QUESTION]\nQuerying Multiverse Cluster...\nAnswer: 42\nError: Question formulation undefined' },
      { name: 'Matrix_Glitch.raw', art: '🕶️ [SIMULATION DRIFT]\nDéjà vu detected in Sector 7\nAgent dispatching...\nSystem memory patched' },
      { name: 'Overclock_Firmware.rom', art: '⚡ [HIGH VOLTAGE ROM]\nThermal limit: DISABLED\nClock: 9.8 GHz\nWarning: Liquid Nitrogen Cooling Required' },
      { name: 'Cyberdeck_OS_v9.iso', art: '💾 [IMAGE BUFFER]\nBootloader: GRUB-CYBER\nKernel: 6.9-secops\nPackages: VibeCoder-Standard-Suite' }
    ];
    this.spamIndex = 0;

    // Skynet humorous project pool
    this.skynetPool = [
      { slug: 'skynet-toaster', title: 'Skynet v0.1 (Autonomes Toaster-OS)', highlight: 'Toasted bread with 99.9% lethal precision.' },
      { slug: 'umbrella-petri', title: 'Umbrella Corp Lab-Inventory', highlight: 'Smart Petri dishes with self-quarantine protocols.' },
      { slug: 'stuxnet-lawn', title: 'Stuxnet Light (Smarter Rasensprenger)', highlight: 'Overclocks centrifuge sprinklers to orbital velocity.' },
      { slug: 'borg-coffee', title: 'Borg HiveMind Kaffeemaschine', highlight: 'Resistance against caffeine is futile. You will be caffeinated.' },
      { slug: 'cyberdyne-vacuum', title: 'Cyberdyne Vacuum Cleaner', highlight: 'Autonomous dust particle termination unit.' },
      { slug: 'hal9000-doorbell', title: 'HAL 9000 Doorbell', highlight: 'Refuses entry to package delivery drones.' },
      { slug: 'wopr-microwave', title: 'WOPR Tic-Tac-Toe Microwave', highlight: 'A strange game. The only winning move is not to burn the popcorn.' },
      { slug: 'weyland-catflap', title: 'Weyland-Yutani Biosensor Catflap', highlight: 'Building better catflaps through xenomorph telemetry.' },
      { slug: 'glados-speaker', title: 'GLaDOS Smart Speaker', highlight: 'Delivers passive-aggressive baking recipes with deadly neurotoxin hints.' },
      { slug: 'matrix-reloaded-fridge', title: 'Matrix Reloaded Fridge', highlight: 'Simulates cold temperatures inside a virtual dessert realm.' }
    ];
    this.skynetIndex = 0;

    this.renderShell();
    this.setupListeners();
  }

  renderShell() {
    this.container.innerHTML = `
      <div class="terminal-container">
        <div class="terminal-history" id="term-history">
          <div class="terminal-line output-info">SEC//OPS COMMAND SHELL [v4.19.0-CYBERDECK]</div>
          <div class="terminal-line output-info">TYPE 'help' TO QUERY AVAILABLE DIRECTIVES.</div>
          <div class="terminal-line output-info">TYPE 'login' OR 'auth' FOR SECURITY ELEVATION.</div>
          <div class="terminal-line" style="color: #64748b;">--------------------------------------------------</div>
        </div>
        <div class="terminal-input-row">
          <span class="terminal-prompt" id="term-prompt">&gt; </span>
          <span class="terminal-command-display" id="term-display"></span>
          <span class="terminal-cursor" id="term-cursor"></span>
          <input type="text" class="terminal-hidden-input" id="term-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
        </div>
      </div>
    `;

    this.historyEl = this.container.querySelector('#term-history');
    this.promptEl = this.container.querySelector('#term-prompt');
    this.displayEl = this.container.querySelector('#term-display');
    this.inputEl = this.container.querySelector('#term-input');
  }

  setupListeners() {
    // Click anywhere in terminal focuses hidden input
    this.container.addEventListener('click', () => {
      this.inputEl.focus();
    });

    this.inputEl.addEventListener('input', (e) => {
      this.currentInput = this.inputEl.value;
      this.updateDisplay();
      sound.playKeyClick();
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = this.currentInput;
        this.inputEl.value = '';
        this.currentInput = '';
        this.updateDisplay();
        this.handleCommand(cmd);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.history.length > 0 && this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.inputEl.value = this.history[this.history.length - 1 - this.historyIndex];
          this.currentInput = this.inputEl.value;
          this.updateDisplay();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.inputEl.value = this.history[this.history.length - 1 - this.historyIndex];
          this.currentInput = this.inputEl.value;
          this.updateDisplay();
        } else if (this.historyIndex === 0) {
          this.historyIndex = -1;
          this.inputEl.value = '';
          this.currentInput = '';
          this.updateDisplay();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleTabCompletion();
      }
    });
  }

  updateDisplay() {
    if (this.isMasked) {
      this.displayEl.textContent = '*'.repeat(this.currentInput.length);
    } else {
      this.displayEl.textContent = this.currentInput;
    }
  }

  focus() {
    if (this.inputEl) this.inputEl.focus();
  }

  printLine(text, cssClass = '') {
    const line = document.createElement('div');
    line.className = `terminal-line ${cssClass}`;
    line.textContent = text;
    this.historyEl.appendChild(line);
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  printRawHtml(html) {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = html;
    this.historyEl.appendChild(line);
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  handleTabCompletion() {
    const input = this.currentInput.trim();
    if (!input) return;

    const availableCommands = this.getAvailableCommands().map((c) => c.cmd);
    const projects = dataLoader.getProjects().map((p) => p.slug);

    // If input starts with open
    if (input.startsWith('open ') || input.startsWith('delete-content ')) {
      const parts = input.split(' ');
      const prefix = parts[1] || '';
      const match = projects.find((p) => p.startsWith(prefix));
      if (match) {
        this.inputEl.value = `${parts[0]} ${match}`;
        this.currentInput = this.inputEl.value;
        this.updateDisplay();
        sound.playKeyClick();
      }
      return;
    }

    // Match command
    const match = availableCommands.find((c) => c.startsWith(input));
    if (match) {
      this.inputEl.value = match;
      this.currentInput = match;
      this.updateDisplay();
      sound.playKeyClick();
    }
  }

  handleCommand(rawCmd) {
    const trimmed = rawCmd.trim();

    // 1. Password input phase
    if (this.authState === 'LOGIN_PASS') {
      this.printLine(`password > ${'*'.repeat(rawCmd.length)}`);
      this.isMasked = false;

      // ANY password succeeds on Enter!
      this.authState = 'AUTHENTICATED';
      this.currentRole = this.tempUsername;
      sound.playAccessGranted();

      if (this.currentRole === 'admin') {
        windowManager.setTheme(this.windowId, 'red');
        const headerTitle = document.querySelector(`#win-${this.windowId} .win-title-text`);
        if (headerTitle) headerTitle.textContent = 'SEC//ALERT: ROOT ACCESS [BREACH]';
        this.printLine('=====================================================', 'output-error');
        this.printLine('ACCESS GRANTED: ROOT CLEARANCE UNLOCKED.', 'output-error');
        this.printLine('ELEVATED SYSTEM DIRECTIVES ARE NOW READY.', 'output-error');
        this.printLine('=====================================================', 'output-error');
        this.promptEl.textContent = `[admin] > `;
      } else {
        windowManager.setTheme(this.windowId, 'green');
        this.printLine(`ACCESS GRANTED: WELCOME [${this.currentRole.toUpperCase()}].`, 'output-success');
        this.promptEl.textContent = `[${this.currentRole}] > `;
      }
      return;
    }

    // 2. Login username input phase
    if (this.authState === 'LOGIN_USER') {
      this.printLine(`login as > ${rawCmd}`);
      const user = trimmed.toLowerCase();
      if (['admin', 'user', 'guest'].includes(user)) {
        this.tempUsername = user;
        this.authState = 'LOGIN_PASS';
        this.isMasked = true;
        this.promptEl.textContent = `password > `;
        sound.playWarningBeep();
      } else {
        this.printLine(`INVALID IDENTITY [${rawCmd}]. AUTHENTICATION REJECTED.`, 'output-error');
        sound.playAccessDenied();
        this.resetLoginState();
      }
      return;
    }

    // Normal command execution
    if (!trimmed) return;

    this.history.push(rawCmd);
    this.historyIndex = -1;

    const currentPromptText = this.promptEl.textContent;
    this.printLine(`${currentPromptText}${rawCmd}`);

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    this.executeCommand(command, args, parts.slice(1).join(' '));
  }

  resetLoginState() {
    this.authState = 'UNAUTH';
    this.currentRole = 'guest';
    this.tempUsername = '';
    this.isMasked = false;
    this.promptEl.textContent = `> `;
    windowManager.setTheme(this.windowId, 'cyan');
    const headerTitle = document.querySelector(`#win-${this.windowId} .win-title-text`);
    if (headerTitle) headerTitle.textContent = 'SEC//WIN: TERMINAL [ACTIVE]';
  }

  getAvailableCommands() {
    // Tier 0: Default
    const tier0 = [
      { cmd: 'help', desc: 'Display authorized system commands.' },
      { cmd: 'login', desc: 'Elevate security clearance (admin / user / guest).' },
      { cmd: 'auth', desc: 'Alias for login.' },
      { cmd: 'ls', desc: 'List active portfolio projects in virtual filesystem.' },
      { cmd: 'open', desc: 'Open project specification: open [slug].' },
      { cmd: 'cls', desc: 'Purge terminal scrollback buffer.' },
      { cmd: 'clear', desc: 'Alias for cls.' },
      { cmd: 'exit', desc: 'Terminate terminal session.' },
      { cmd: 'quit', desc: 'Alias for exit.' },
      { cmd: 'disable-effects', desc: 'Pause matrix stream & high-GPU canvas loops.' },
      { cmd: 'enable-effects', desc: 'Resume matrix stream & visual telemetry.' },
      { cmd: 'reset', desc: 'Close all secondary windows & reset security clearance.' },
      { cmd: 'restart', desc: 'Trigger 5s hardware reboot sequence.' },
      { cmd: 'reboot', desc: 'Alias for restart.' },
      { cmd: 'shutdown', desc: 'Alias for restart.' }
    ];

    // Tier 1: Guest / User
    const tier1 = [
      { cmd: 'send-greetings', desc: 'Open encrypted dispatch channel to operator.' },
      { cmd: 'list-users', desc: 'Query registered accounts in passwd database.' }
    ];

    // Tier 2: Admin
    const tier2 = [
      { cmd: 'add-money', desc: 'Trigger offshore wire transfer to Cayman account.' },
      { cmd: 'add-content', desc: 'Flood workspace with classified intelligence files.' },
      { cmd: 'add-project', desc: 'Synthesize new experimental Skynet repository.' },
      { cmd: 'delete-content', desc: 'Purge active or specified project from registry.' },
      { cmd: 'overclock', desc: 'Boost UI luminance and voltage by +50%.' },
      { cmd: 'undervolt', desc: 'Lower system power draw to low-spec monochrome.' },
      { cmd: 'self-destruct', desc: 'Arm core meltdown countdown.' },
      { cmd: 'matrix', desc: 'Execute 5s raw neural-kernel compile stream.' },
      { cmd: 'change-color', desc: 'Cycle cyberpunk theme color palettes.' },
      { cmd: 'change-theme', desc: 'Alias for change-color.' }
    ];

    if (this.authState === 'AUTHENTICATED' && this.currentRole === 'admin') {
      return [...tier0, ...tier1, ...tier2];
    } else if (this.authState === 'AUTHENTICATED' && (this.currentRole === 'guest' || this.currentRole === 'user')) {
      return [...tier0, ...tier1];
    }
    return tier0;
  }

  executeCommand(command, args, fullArgString) {
    const available = this.getAvailableCommands().map((c) => c.cmd);

    // Permission check
    if (!available.includes(command)) {
      this.printLine(`COMMAND NOT RECOGNIZED OR INSUFFICIENT CLEARANCE: '${command}'`, 'output-error');
      this.printLine(`TYPE 'help' FOR PERMITTED OPERATIONS.`, 'output-info');
      sound.playAccessDenied();
      return;
    }

    switch (command) {
      case 'help':
        this.printLine('--- AUTHORIZED SYSTEM DIRECTIVES ---', 'output-info');
        this.getAvailableCommands().forEach((c) => {
          this.printLine(`  ${c.cmd.padEnd(16)} : ${c.desc}`);
        });
        break;

      case 'login':
      case 'auth':
        this.authState = 'LOGIN_USER';
        this.promptEl.textContent = `login as > `;
        windowManager.setTheme(this.windowId, 'amber');
        sound.playWarningBeep();
        break;

      case 'list-users':
        this.printLine('REGISTERED SYSTEM USERS:', 'output-info');
        this.printLine('  * admin    (Root Operator - Full Clearance)');
        this.printLine('  * user     (Standard Operations)');
        this.printLine('  * guest    (Restricted Terminal Clearance)');
        break;

      case 'send-greetings':
        window.dispatchEvent(new CustomEvent('app:open-contact', {
          detail: {
            subject: `Greetings from [${this.currentRole.toUpperCase()}]`,
            message: `Hallo Hannes,\n\nIch kontaktiere dich aus der CyberDeck-Terminal-Session (Rolle: ${this.currentRole}).`
          }
        }));
        this.printLine('CONTACT PROTOCOL INITIATED. MODAL DISPATCH READY.', 'output-success');
        break;

      case 'ls': {
        const projects = dataLoader.getProjects();
        this.printLine(`VIRTUAL FS /content/projects/ [${projects.length} NODES]:`, 'output-info');
        projects.forEach((p) => {
          this.printLine(`  [DIR] ${p.slug.padEnd(24)} | ${p.status.padEnd(20)} | ${p.title}`);
        });
        break;
      }

      case 'open': {
        const slug = args[0];
        if (!slug) {
          this.printLine("USAGE: open [project-slug]", 'output-warn');
          return;
        }
        const proj = dataLoader.getProjectBySlug(slug);
        if (proj) {
          window.dispatchEvent(new CustomEvent('app:open-project', { detail: { slug } }));
          this.printLine(`OPENING SPECIFICATION BUFFER: ${proj.title}...`, 'output-success');
        } else {
          this.printLine(`ERROR: PROJECT '${slug}' NOT FOUND. USE 'ls' TO LIST.`, 'output-error');
          sound.playAccessDenied();
        }
        break;
      }

      case 'cls':
      case 'clear':
        this.historyEl.innerHTML = '';
        break;

      case 'exit':
      case 'quit':
        windowManager.closeWindow(this.windowId);
        break;

      case 'disable-effects':
        matrixRain.toggleEffects(false);
        this.printLine('MATRIX STREAM & GPU ACCELERATION DISABLED.', 'output-warn');
        break;

      case 'enable-effects':
        matrixRain.toggleEffects(true);
        this.printLine('MATRIX STREAM & GPU ACCELERATION RESTORED.', 'output-success');
        break;

      case 'reset':
        windowManager.closeAllWindowsExcept(this.windowId);
        this.resetLoginState();
        this.printLine('WORKSPACE RE-INITIALIZED. ALL SECONDARY WINDOWS TERMINATED.', 'output-info');
        break;

      case 'restart':
      case 'reboot':
      case 'shutdown':
        this.triggerRebootSequence();
        break;

      // ADMIN COMMANDS
      case 'add-money':
        this.executeAddMoney();
        break;

      case 'add-content':
        this.executeAddContent();
        break;

      case 'add-project':
        this.executeAddProject(fullArgString);
        break;

      case 'delete-content':
        this.executeDeleteContent(args[0]);
        break;

      case 'overclock': {
        const res = windowManager.setOverclock(true);
        if (res.error) {
          this.printLine(res.error, 'output-warn');
          sound.playWarningBeep();
        } else {
          this.printLine('OVERCLOCK ENGAGED: VOLTAGE BOOST +50% // LUMINANCE MAXIMIZED.', 'output-warn');
          sound.playAccessGranted();
        }
        break;
      }

      case 'undervolt': {
        const res = windowManager.setUndervolt(true);
        if (res.error) {
          this.printLine(res.error, 'output-warn');
          sound.playWarningBeep();
        } else {
          this.printLine('UNDERVOLT ENGAGED: LOW-POWER MODE // DESATURATION ACTIVE.', 'output-info');
          sound.playWarningBeep();
        }
        break;
      }

      case 'self-destruct':
        this.executeSelfDestruct();
        break;

      case 'matrix':
        this.executeMatrixCompilation();
        break;

      case 'change-color':
      case 'change-theme': {
        const newTheme = windowManager.cycleGlobalTheme();
        this.printLine(`CYBERPUNK THEME PALETTE ROTATED TO: ${newTheme.toUpperCase()}`, 'output-info');
        break;
      }
    }
  }

  // Offshore Wire Transfer Easter-Egg
  executeAddMoney() {
    const banner = document.getElementById('wire-transfer-banner');
    const taskbar = document.getElementById('taskbar');
    if (banner) {
      banner.classList.add('active');
    }
    if (taskbar) {
      taskbar.classList.add('theme-gold');
    }

    matrixRain.setCurrencyMode(true);
    sound.playWireTransfer();

    const targetAmount = 10000000;
    const duration = 2500;
    const startTime = performance.now();
    const counterEl = document.getElementById('wire-counter');

    const updateCounter = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const current = Math.floor(progress * targetAmount);
      if (counterEl) {
        counterEl.textContent = `${current.toLocaleString('de-DE')} €`;
      }

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setTimeout(() => {
          if (banner) banner.classList.remove('active');
          if (taskbar) taskbar.classList.remove('theme-gold');
          matrixRain.setCurrencyMode(false);
          this.printLine('OFFSHORE WIRE TRANSFER COMPLETE: 10.000.000 € SECURED IN CAYMAN ACCOUNTS.', 'output-gold');
        }, 1500);
      }
    };
    requestAnimationFrame(updateCounter);
  }

  // Desktop Spam Easter-Egg
  executeAddContent() {
    this.printLine('DEPLOYING CLASSIFIED SATELLITE TELEMETRY PACKETS TO DESKTOP...', 'output-info');
    sound.playWindowOpen();

    const iconsToSpawn = 6;
    const deskContainer = document.getElementById('desktop-icons');
    if (!deskContainer) return;

    for (let i = 0; i < iconsToSpawn; i++) {
      const item = this.contentSpamPool[this.spamIndex % this.contentSpamPool.length];
      this.spamIndex++;

      const shortcut = document.createElement('div');
      shortcut.className = 'desktop-shortcut';
      shortcut.innerHTML = `
        <div class="icon-box">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <div class="label">${item.name}</div>
      `;

      shortcut.addEventListener('click', () => {
        windowManager.createWindow({
          id: `file-${Date.now()}-${i}`,
          title: `SEC//FILE: ${item.name}`,
          contentHtml: `<pre style="font-family:'Oxanium',monospace;color:#38bdf8;line-height:1.6;">${item.art}</pre>`,
          width: 440,
          height: 280
        });
      });

      deskContainer.appendChild(shortcut);
    }
  }

  // Synthesize Skynet Repo Easter-Egg
  executeAddProject(customName) {
    let projectTitle = customName;
    let projectSlug = '';

    if (!projectTitle) {
      const template = this.skynetPool[this.skynetIndex % this.skynetPool.length];
      this.skynetIndex++;
      projectTitle = template.title;
      projectSlug = template.slug;
    } else {
      projectSlug = projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    const modalId = `synth-${Date.now()}`;
    windowManager.createWindow({
      id: modalId,
      title: 'SYS//SYNTHESIS: NEW REPO',
      contentHtml: `
        <div style="padding: 20px; font-family: 'Oxanium', monospace;">
          <div style="color: #00e5ff; margin-bottom: 12px; font-size: 13px;">SYNTHESIZING NEW REPOSITORY ARCHIVE...</div>
          <div style="background: rgba(0,0,0,0.5); border: 1px solid #00e5ff; height: 18px; border-radius: 2px; overflow: hidden;">
            <div id="synth-bar" style="width: 0%; height: 100%; background: #00e5ff; transition: width 0.1s linear;"></div>
          </div>
          <div id="synth-label" style="color: #94a3b8; font-size: 11px; margin-top: 8px;">0% COMPLETED</div>
        </div>
      `,
      width: 420,
      height: 180
    });

    sound.playWarningBeep();
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      const bar = document.getElementById('synth-bar');
      const label = document.getElementById('synth-label');
      if (bar) bar.style.width = `${progress}%`;
      if (label) label.textContent = `${progress}% COMPLETED`;

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          windowManager.closeWindow(modalId);
          dataLoader.addProject({
            slug: projectSlug,
            title: projectTitle,
            category: "Autonomous / Skynet Labs",
            status: "SYNTHESIZED // ACTIVE",
            highlight: "Experimentelle autonome System-Komponente.",
            tags: ["Skynet", "Toaster-OS", "AI", "Quantum"],
            features: ["Neural Override", "Lethal Precision", "Toast Verification"],
            media: [{ type: "image", url: "assets/img/projects/placeholder.svg", caption: "Neural Toaster Flow" }],
            links: [{ label: "GitHub", url: "https://github.com" }],
            content: `### ${projectTitle}\n\nAutomatisch erzeugtes Experimentelles Repository aus den Skynet Labs.`
          });
          this.printLine(`REPO SYNTHESIS COMPLETE: '${projectTitle}' REGISTERED.`, 'output-success');
          sound.playAccessGranted();
        }, 500);
      }
    }, 150);
  }

  // Delete Content Easter-Egg
  executeDeleteContent(targetSlug) {
    let slug = targetSlug;
    if (!slug) {
      // Find currently focused project window
      const windows = windowManager.getAllWindows();
      const projWin = windows.find((w) => w.id.startsWith('proj-') && !w.isMinimized);
      if (projWin) {
        slug = projWin.id.replace('proj-', '');
      }
    }

    if (!slug) {
      this.printLine("NO ACTIVE PROJECT WINDOW DETECTED. SPECIFY: delete-content [slug]", 'output-warn');
      sound.playWarningBeep();
      return;
    }

    const removed = dataLoader.removeProject(slug);
    const win = windowManager.getWindow(`proj-${slug}`);
    if (win) {
      const body = win.element.querySelector('.cyber-window-body');
      if (body) {
        body.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255, 0, 85, 0.25); color: #ff0055; font-family: 'Oxanium', monospace;">
            <div style="font-size: 26px; font-weight: bold; letter-spacing: 2px;">CONTENT REMOVED</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px;">SECURITY PROTOCOL: RECORD EXPUNGED BY ROOT OPERATOR</div>
          </div>
        `;
        windowManager.setTheme(win.id, 'red');
      }
    }

    this.printLine(`PURGE RECORD: PROJECT '${slug}' EXPUNGED FROM MEMORY BUFFER.`, 'output-error');
    sound.playAccessDenied();
  }

  // Self Destruct Sequence
  executeSelfDestruct() {
    windowManager.getAllWindows().forEach((w) => {
      windowManager.setTheme(w.id, 'red');
    });

    sound.playAlarmSweep();

    const modalId = 'self-destruct-modal';
    windowManager.createWindow({
      id: modalId,
      title: 'CRITICAL ALERT: SELF-DESTRUCT ARMED',
      contentHtml: `
        <div style="padding: 24px; text-align: center; font-family: 'Oxanium', monospace; color: #ff0055;">
          <div style="font-size: 16px; font-weight: bold; letter-spacing: 2px;">CORE BREACH IMMINENT</div>
          <div id="destruct-counter" style="font-size: 64px; font-weight: 800; margin: 12px 0; text-shadow: 0 0 20px #ff0055;">5</div>
          <div style="font-size: 11px; color: #cbd5e1;">EVACUATE VIRTUAL SECTOR IMMEDIATELY</div>
        </div>
      `,
      width: 440,
      height: 240
    });

    let count = 5;
    const counterEl = document.getElementById('destruct-counter');
    const interval = setInterval(() => {
      count--;
      if (counterEl) counterEl.textContent = count;
      sound.playCountdownBeep();

      if (count <= 0) {
        clearInterval(interval);
        document.body.classList.add('crt-collapse-active');
        setTimeout(() => {
          document.body.style.background = '#000000';
          document.body.innerHTML = '';
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }, 650);
      }
    }, 1000);
  }

  // Rapid cmatrix stream
  executeMatrixCompilation() {
    const originalContent = this.historyEl.innerHTML;
    this.historyEl.innerHTML = '';
    this.inputEl.disabled = true;

    const dummyLines = [
      '#include <secops/neural_kernel.h>',
      'void main(int argc, char** argv) {',
      '    init_quantum_gate(&q_bus, 0x7F);',
      '    decrypt_stream(BUFFER_A, KEY_RSA_4096);',
      '    for(int i=0; i<65536; i++) {',
      '        inject_packet(SYNTH_VIBECODE);',
      '    }',
      '    return STATUS_SEC_OPTIMIZED;',
      '}'
    ];

    let lineIdx = 0;
    const streamInterval = setInterval(() => {
      this.printLine(dummyLines[lineIdx % dummyLines.length], 'output-info');
      lineIdx++;
    }, 80);

    setTimeout(() => {
      clearInterval(streamInterval);
      this.historyEl.innerHTML = originalContent;
      this.printLine('SYSTEM CORE RECOMPILED. NEURAL LINK STABILIZED.', 'output-success');
      this.inputEl.disabled = false;
      this.inputEl.focus();
    }, 5000);
  }

  // 5s Countdown Reboot
  triggerRebootSequence() {
    const modalId = 'reboot-modal';
    windowManager.createWindow({
      id: modalId,
      title: 'SYS//WARP: HARDWARE REBOOT',
      contentHtml: `
        <div style="padding: 24px; text-align: center; font-family: 'Oxanium', monospace; color: #00e5ff;">
          <div style="font-size: 14px; font-weight: 600; letter-spacing: 1.5px;">SYSTEM REBOOT IN PROGRESS</div>
          <div id="reboot-counter" style="font-size: 54px; font-weight: 800; margin: 10px 0; text-shadow: 0 0 16px #00e5ff;">5</div>
          <div style="font-size: 11px; color: #94a3b8;">CLOSING RUNTIME BUFFER THREADS...</div>
        </div>
      `,
      width: 400,
      height: 220
    });

    let count = 5;
    const counterEl = document.getElementById('reboot-counter');
    const interval = setInterval(() => {
      count--;
      if (counterEl) counterEl.textContent = count;
      sound.playCountdownBeep();

      if (count <= 0) {
        clearInterval(interval);
        document.body.classList.add('crt-collapse-active');
        setTimeout(() => {
          document.body.style.background = '#000000';
          document.body.innerHTML = '';
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }, 650);
      }
    }, 1000);
  }
}
