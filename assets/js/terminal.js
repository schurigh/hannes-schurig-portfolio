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

/** Escape strings before inserting into innerHTML to prevent XSS. */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class TerminalShell {
  constructor(containerEl, windowId = 'terminal') {
    this.container = containerEl;
    this.windowId = windowId;

    // Authentication States: 'UNAUTH', 'LOGIN_USER', 'LOGIN_PASS', 'AUTHENTICATED'
    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (isLocalhost) {
      this.authState = 'AUTHENTICATED';
      this.currentRole = 'admin';
    } else {
      this.authState = 'UNAUTH';
      this.currentRole = 'guest'; // 'guest', 'user', 'admin'
    }
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
    const isAdmin = this.currentRole === 'admin';
    const initialPrompt = isAdmin ? '[admin] &gt; ' : '&gt; ';

    this.container.innerHTML = `
      <div class="terminal-container" style="position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column;">
        <canvas class="terminal-matrix-rain-canvas" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.35s ease;"></canvas>
        <div class="terminal-history" id="term-history" style="position: relative; z-index: 1; flex: 1; overflow-y: auto;">
          <div class="terminal-line output-info">SEC//OPS COMMAND SHELL [v4.19.0-CYBERDECK]</div>
          ${isAdmin ? `
            <div class="terminal-line output-warn">ENVIRONMENT: LOCALHOST // DEV MODE DETECTED</div>
            <div class="terminal-line output-error">SECURITY CLEARANCE: ROOT OPERATOR [ADMIN ACCESS GRANTED]</div>
          ` : `
            <div class="terminal-line output-info">TYPE 'help' TO QUERY AVAILABLE DIRECTIVES.</div>
            <div class="terminal-line output-info">TYPE 'login' OR 'auth' FOR SECURITY ELEVATION.</div>
          `}
          <div class="terminal-line" style="color: #64748b;">--------------------------------------------------</div>
        </div>
        <div class="terminal-input-row" style="position: relative; z-index: 1;">
          <span class="terminal-prompt" id="term-prompt">${initialPrompt}</span>
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
    this.matrixCanvasEl = this.container.querySelector('.terminal-matrix-rain-canvas');

    if (isAdmin) {
      windowManager.setTheme(this.windowId, 'red');
      const headerTitle = document.querySelector(`#win-${this.windowId} .win-title-text`);
      if (headerTitle) headerTitle.textContent = 'SEC//WIN: TERMINAL [ROOT // ADMIN]';
    }
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

    // If input starts with project slug commands
    if (input.startsWith('open ') || input.startsWith('delete-project ')) {
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

    // If input starts with color command
    if (input.startsWith('change-color ') || input.startsWith('color ') || input.startsWith('theme ')) {
      const parts = input.split(' ');
      const prefix = (parts[1] || '').toLowerCase();
      const match = windowManager.themes.find((t) => t.startsWith(prefix));
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
    // All interactive and system directives are available
    return [
      { cmd: 'help', desc: 'Display authorized system commands.' },
      { cmd: 'ask [query]', desc: 'Query Operator AI assistant directly from terminal.' },
      { cmd: 'frage [frage]', desc: 'Alias für ask: Frage an den KI-Operator stellen.' },
      { cmd: 'ai', desc: 'Open Operator AI Communicator (SECOPS Communicator).' },
      { cmd: 'send-msg', desc: 'Open encrypted dispatch channel to operator.' },
      { cmd: 'ls', desc: 'List active portfolio projects in virtual filesystem.' },
      { cmd: 'open', desc: 'Open project specification: open [slug].' },
      { cmd: 'add-project', desc: 'Create new uninitialized repository placeholder.' },
      { cmd: 'delete-project', desc: 'Purge specified project: delete-project [slug].' },
      { cmd: 'power-overclock', desc: 'Boost UI luminance and voltage by +50%.' },
      { cmd: 'power-undervolt', desc: 'Lower system power draw to low-spec monochrome.' },
      { cmd: 'power-reset', desc: 'Reset power states and restore default cyan theme.' },
      { cmd: 'change-color [CODE]', desc: 'Set theme palette (CYAN, AMBER, RED, GREEN, PURPLE, WHITE).' },
      { cmd: 'matrix', desc: 'Stream 100 continuous lines with green matrix rain.' },
      { cmd: 'self-destruct', desc: 'Arm core meltdown countdown & visible destruction.' },
      { cmd: 'radar', desc: 'Open tactical skill radar in operator profile.' },
      { cmd: 'disable-effects', desc: 'Pause matrix stream & high-GPU canvas loops.' },
      { cmd: 'enable-effects', desc: 'Resume matrix stream & visual telemetry.' },
      { cmd: 'cls', desc: 'Purge terminal scrollback buffer.' },
      { cmd: 'clear', desc: 'Alias for cls.' },
      { cmd: 'reset', desc: 'Close all secondary windows & reset clearance.' },
      { cmd: 'restart', desc: 'Trigger 5s hardware reboot sequence.' },
      { cmd: 'reboot', desc: 'Alias for restart.' },
      { cmd: 'shutdown', desc: 'Alias for restart.' },
      { cmd: 'exit', desc: 'Terminate terminal session.' },
      { cmd: 'quit', desc: 'Alias for exit.' },
      { cmd: 'login', desc: 'Elevate security clearance (admin / user / guest).' },
      { cmd: 'auth', desc: 'Alias for login.' },
      { cmd: 'add-money', desc: 'Trigger offshore wire transfer to Cayman account.' },
      { cmd: 'add-content', desc: 'Flood workspace with classified intelligence files.' },
      { cmd: 'list-users', desc: 'Query registered accounts in passwd database.' }
    ];
  }

  executeCommand(command, args, fullArgString) {
    const available = this.getAvailableCommands().map((c) => c.cmd.split(' ')[0]);

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
          this.printLine(`  ${c.cmd.padEnd(20)} : ${c.desc}`);
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

      case 'ask':
      case 'frage': {
        const question = fullArgString ? fullArgString.trim() : '';
        if (!question) {
          this.printLine("USAGE: ask [frage an den operator] / frage [frage]", 'output-warn');
          return;
        }
        window.dispatchEvent(new CustomEvent('app:open-ai-comm', {
          detail: { prompt: question }
        }));
        this.printLine(`[SEC//COMM] DISPATCHING QUERY TO OPERATOR AI: "${question}"...`, 'output-success');
        break;
      }

      case 'ai':
        window.dispatchEvent(new CustomEvent('app:open-ai-comm'));
        this.printLine('OPERATOR AI COMMUNICATOR NODE INITIALIZED.', 'output-success');
        break;

      case 'send-msg':
        window.dispatchEvent(new CustomEvent('app:open-contact', {
          detail: {
            subject: `Greetings from [${this.currentRole.toUpperCase()}]`,
            message: `Hallo Hannes,\n\nIch kontaktiere dich aus der CyberDeck-Terminal-Session (Rolle: ${this.currentRole}).`
          }
        }));
        this.printLine('CONTACT PROTOCOL INITIATED. MODAL DISPATCH READY.', 'output-success');
        break;

      case 'radar':
        window.dispatchEvent(new CustomEvent('app:open-profile'));
        this.printLine('SKILL RADAR LOCATED WITHIN OPERATOR PROFILE. BUFFER OPENED.', 'output-success');
        break;

      case 'ls': {
        const projects = dataLoader.getProjects();
        this.printLine(`VIRTUAL FS /data/projects/ [${projects.length} NODES]:`, 'output-info');
        projects.forEach((p) => {
          const st = (p.status || 'ONLINE').padEnd(8);
          const vis = (p.visibility || 'PUBLIC').padEnd(8);
          const dev = (p.development || '').padEnd(14);
          this.printLine(`  [DIR] ${p.slug.padEnd(24)} | ${st} | ${vis} | ${dev} | ${p.title}`);
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
        this.executeAddProject();
        break;

      case 'delete-project':
        this.executeDeleteProject(args[0]);
        break;

      case 'power-overclock':
      case 'overclock': {
        const res = windowManager.setOverclock(true);
        if (res.error) {
          this.printLine(res.error, 'output-warn');
          sound.playWarningBeep();
        } else {
          this.printLine('POWER OVERCLOCK ENGAGED: VOLTAGE BOOST +50% // LUMINANCE MAXIMIZED.', 'output-warn');
          sound.playAccessGranted();
        }
        break;
      }

      case 'power-undervolt':
      case 'undervolt': {
        const res = windowManager.setUndervolt(true);
        if (res.error) {
          this.printLine(res.error, 'output-warn');
          sound.playWarningBeep();
        } else {
          this.printLine('POWER UNDERVOLT ENGAGED: LOW-POWER MODE // DESATURATION ACTIVE.', 'output-info');
          sound.playWarningBeep();
        }
        break;
      }

      case 'power-reset': {
        windowManager.resetPowerAndTheme();
        this.printLine('POWER & THEME RESET: SYSTEM VOLTAGE NOMINAL // DEFAULT CYAN RESTORED.', 'output-success');
        sound.playAccessGranted();
        break;
      }

      case 'self-destruct':
        this.executeSelfDestruct();
        break;

      case 'matrix':
        this.executeMatrixCompilation();
        break;

      case 'change-color':
      case 'color':
      case 'theme':
      case 'set-theme': {
        if (args.length === 0) {
          this.printLine("USAGE: change-color [CODE]  ODER  change-color [window] [CODE]", 'output-warn');
          this.printLine(`AVAILABLE CODES: ${windowManager.themes.map((t) => t.toUpperCase()).join(', ')}`, 'output-info');
          sound.playWarningBeep();
        } else if (args.length === 1) {
          const colorArg = (args[0] || '').trim().toLowerCase();
          const res = windowManager.setGlobalTheme(colorArg);
          if (res.error) {
            this.printLine(res.error, 'output-error');
            sound.playAccessDenied();
          } else {
            this.printLine(`CYBERPUNK THEME PALETTE SET TO: [${res.theme.toUpperCase()}].`, 'output-success');
            sound.playAccessGranted();
          }
        } else {
          // 2 args: target specific window
          const targetWin = args[0].trim();
          const colorArg = args[1].trim().toLowerCase();
          const win = windowManager.getWindow(targetWin);
          if (!win) {
            this.printLine(`ERROR: WINDOW '${targetWin}' NOT FOUND.`, 'output-error');
            sound.playAccessDenied();
          } else if (!windowManager.themes.includes(colorArg)) {
            this.printLine(`ERROR: UNKNOWN COLOR '${colorArg}'. VALID: ${windowManager.themes.join(', ')}`, 'output-error');
            sound.playAccessDenied();
          } else {
            windowManager.setTheme(targetWin, colorArg);
            this.printLine(`WINDOW '${targetWin}' THEME SET TO: [${colorArg.toUpperCase()}].`, 'output-success');
            sound.playAccessGranted();
          }
        }
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
        <div class="label">${escapeHtml(item.name)}</div>
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

  // Add Empty Dummy Project "New repo - push to initialize"
  executeAddProject() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthNames = [
      'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    const monthName = monthNames[now.getMonth()];
    const dateDisplay = `${monthName} ${year}`;
    const slug = `uninit-repo-${Date.now()}`;

    const dummyProject = {
      slug,
      title: 'New repo - push to initialize',
      category: 'Uninitialized / Empty',
      status: 'OFFLINE',
      visibility: 'PRIVATE',
      development: 'WIP',
      startDate: `${year}-${month}`,
      dateDisplay,
      highlight: 'Leere Repository-Hülle. Warte auf initialen Git-Push zur Synchronisierung...',
      tags: ['Git', 'Uninitialized', 'Dummy'],
      isDummy: true,
      media: [{
        type: 'image',
        url: 'assets/img/projects/placeholder.svg',
        thumb: 'assets/img/projects/placeholder.svg',
        caption: 'Empty Repo Placeholder'
      }],
      links: [],
      content: ''
    };

    dataLoader.addProject(dummyProject);

    // Notify UI & open project-explorer window
    window.dispatchEvent(new CustomEvent('project:added', { detail: { project: dummyProject } }));

    this.printLine(`REPO ALLOCATED: 'New repo - push to initialize' [${dateDisplay}].`, 'output-success');
    this.printLine(`STATUS: DUMMY BUFFER INSERTED INTO PROJECT TIMELINE.`, 'output-info');
    sound.playAccessGranted();
  }

  // Delete Project & Sync Live with Explorer
  executeDeleteProject(targetSlug) {
    let slug = (targetSlug || '').trim();
    if (!slug) {
      // Find currently focused project window
      const windows = windowManager.getAllWindows();
      const projWin = windows.find((w) => w.id.startsWith('proj-') && !w.isMinimized);
      if (projWin) {
        slug = projWin.id.replace('proj-', '');
      }
    }

    if (!slug) {
      this.printLine("NO ACTIVE PROJECT SPECIFIED. USAGE: delete-project [slug]", 'output-warn');
      sound.playWarningBeep();
      return;
    }

    const removed = dataLoader.removeProject(slug);
    if (!removed) {
      this.printLine(`ERROR: PROJECT '${slug}' NOT FOUND IN REGISTRY.`, 'output-error');
      sound.playAccessDenied();
      return;
    }

    // Notify UI & open project-explorer window to remove card
    window.dispatchEvent(new CustomEvent('project:deleted', { detail: { slug } }));

    // If an open project window exists, mark as expunged
    const win = windowManager.getWindow(`proj-${slug}`);
    if (win) {
      const body = win.element.querySelector('.cyber-window-body');
      if (body) {
        body.innerHTML = `
          <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255, 0, 85, 0.25); color: #ff0055; font-family: 'Oxanium', monospace;">
            <div style="font-size: 26px; font-weight: bold; letter-spacing: 2px;">CONTENT REMOVED</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px;">SECURITY PROTOCOL: RECORD EXPUNGED BY OPERATOR</div>
          </div>
        `;
        windowManager.setTheme(win.id, 'red');
      }
    }

    this.printLine(`PURGE RECORD: PROJECT '${slug}' EXPUNGED FROM MEMORY BUFFER.`, 'output-error');
    sound.playAccessDenied();
  }

  // Self Destruct Sequence with Red Pulsating Screen, Background Siren & Glitch Dissolution
  executeSelfDestruct() {
    windowManager.getAllWindows().forEach((w) => {
      windowManager.setTheme(w.id, 'red');
    });

    // Mount pulsating red alarm overlay on screen
    let overlay = document.getElementById('self-destruct-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'self-destruct-overlay';
      document.body.appendChild(overlay);
    }

    // Start pulsing emergency siren in background
    const stopSiren = sound.startSiren();

    const modalId = 'self-destruct-modal';
    windowManager.createWindow({
      id: modalId,
      title: 'CRITICAL ALERT: SELF-DESTRUCT ARMED',
      contentHtml: `
        <div style="padding: 24px; text-align: center; font-family: 'Oxanium', monospace; color: #ff0055;">
          <div style="font-size: 16px; font-weight: bold; letter-spacing: 2px;">CORE BREACH IMMINENT</div>
          <div id="destruct-counter" style="font-size: 64px; font-weight: 800; margin: 12px 0; text-shadow: 0 0 24px #ff0055;">5</div>
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
        // Stop siren and trigger violent destruction phase
        stopSiren();
        sound.playGlitchDistortion();

        // 1. Violent Screen Glitch, Shake & Scanline Dissolution
        document.body.classList.add('destruct-destruction-active');
        let tearOverlay = document.getElementById('destruct-dissolution');
        if (!tearOverlay) {
          tearOverlay = document.createElement('div');
          tearOverlay.id = 'destruct-dissolution';
          tearOverlay.className = 'destruct-dissolution-overlay';
          document.body.appendChild(tearOverlay);
        }

        // 2. After 1.6s of visible destruction -> CRT Collapse
        setTimeout(() => {
          document.body.classList.remove('destruct-destruction-active');
          if (tearOverlay) tearOverlay.remove();
          if (overlay) overlay.remove();

          document.body.classList.add('crt-collapse-active');

          // 3. Screen turns pitch black
          setTimeout(() => {
            document.body.style.background = '#000000';
            document.body.innerHTML = '';
            setTimeout(() => {
              window.location.reload();
            }, 3500);
          }, 650);
        }, 1600);
      }
    }, 1000);
  }

  // Green matrix rain animation on the terminal background canvas
  startTerminalMatrixRain() {
    if (!this.matrixCanvasEl) return () => {};

    const canvas = this.matrixCanvasEl;
    canvas.width = this.container.clientWidth || 600;
    canvas.height = this.container.clientHeight || 400;
    canvas.style.opacity = '0.35';

    const ctx = canvas.getContext('2d');
    const fontSize = 13;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -30);
    }

    const chars = '0123456789ABCDEF010101日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';
    let running = true;
    let animId = null;

    const renderRain = () => {
      if (!running) return;

      // Dark translucent wash to create matrix rain trails
      ctx.fillStyle = 'rgba(2, 6, 23, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px 'Oxanium', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        if (y > 0) {
          const r = Math.random();
          if (r > 0.92) {
            ctx.fillStyle = '#ffffff'; // White glowing lead glyph
          } else if (r > 0.6) {
            ctx.fillStyle = '#22c55e'; // Bright classic matrix green
          } else {
            ctx.fillStyle = '#15803d'; // Deep matrix green trail
          }
          ctx.fillText(char, x, y);
        }

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animId = requestAnimationFrame(renderRain);
    };

    renderRain();

    return () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
      canvas.style.opacity = '0';
      setTimeout(() => {
        if (!running) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 400);
    };
  }

  // Rapid live code stream from a random assets/js/* file (100 non-empty lines) with green matrix background rain
  async executeMatrixCompilation() {
    this.inputEl.disabled = true;
    this.printLine('[MATRIX STREAM] SCANNING VIRTUAL KERNEL /assets/js/...', 'output-warn');
    sound.playKeyClick();

    // Start green matrix rain background in terminal window
    const stopRain = this.startTerminalMatrixRain();

    const jsFiles = [
      'app.js',
      'terminal.js',
      'windowManager.js',
      'radarCanvas.js',
      'lightbox.js',
      'sound.js',
      'matrixCanvas.js',
      'dataLoader.js'
    ];

    const randomFile = jsFiles[Math.floor(Math.random() * jsFiles.length)];
    let rawCode = '';

    try {
      const res = await fetch(`assets/js/${randomFile}?v=${Date.now()}`);
      if (res.ok) {
        rawCode = await res.text();
      }
    } catch (err) {
      console.warn('Matrix code stream fetch failed, using runtime fallback', err);
    }

    if (!rawCode) {
      rawCode = `// Fallback runtime stream for ${randomFile}\n` +
        Array.from({ length: 120 }, (_, i) => `/* MODULE_SYNC_0x${(i * 17).toString(16)} */ const kernel_proc_${i} = { pid: 0x${Math.random().toString(16).slice(2, 6)}, status: 'ALLOCATED' };`).join('\n');
    }

    const allLines = rawCode.split(/\r?\n/);
    // Filter out blank/empty lines so it becomes a solid continuous uninterrupted code block
    const contentLines = allLines.filter((line) => line.trim().length > 0);
    const totalLinesNeeded = 100;
    let startLine = 0;

    if (contentLines.length > totalLinesNeeded) {
      startLine = Math.floor(Math.random() * (contentLines.length - totalLinesNeeded + 1));
    }

    let slice = contentLines.slice(startLine, startLine + totalLinesNeeded);
    if (slice.length < totalLinesNeeded) {
      let padIdx = 0;
      while (slice.length < totalLinesNeeded && contentLines.length > 0) {
        slice.push(contentLines[padIdx % contentLines.length]);
        padIdx++;
      }
    }

    this.printLine('================================================================', 'output-info');
    this.printLine(`STREAMING 100 CODE LINES FROM: assets/js/${randomFile} [SOLID BLOCK]`, 'output-info');
    this.printLine('================================================================', 'output-info');

    let idx = 0;
    const streamInterval = setInterval(() => {
      if (idx < slice.length) {
        const lineNum = String(idx + 1).padStart(3, '0');
        const codeText = slice[idx];
        this.printLine(`[${lineNum}/100] ${codeText}`, 'output-info');
        idx++;
      } else {
        clearInterval(streamInterval);
        stopRain(); // Stop and fade out green matrix rain from terminal window
        this.printLine('================================================================', 'output-info');
        this.printLine(`MATRIX DUMP COMPLETE: 100 CONTINUOUS LINES STREAMED FROM assets/js/${randomFile}`, 'output-success');
        this.inputEl.disabled = false;
        this.inputEl.focus();
        sound.playAccessGranted();
      }
    }, 20);
  }

  // 5s Countdown Reboot
  triggerRebootSequence() {
    window.dispatchEvent(new CustomEvent('app:reboot'));
  }
}
