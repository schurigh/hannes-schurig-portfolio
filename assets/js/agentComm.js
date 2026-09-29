/**
 * ============================================================
 * CYBERDECK PORTFOLIO - AI Agent Communicator (Operator AI Communicator)
 * Dual-Panel UI (Stream & Telemetry), Typewriter & History
 * ============================================================
 */

import { sound } from './sound.js';
import { windowManager } from './windowManager.js';

/**
 * Escape raw strings before rendering into HTML to prevent XSS.
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

class AgentCommManager {
  constructor() {
    this.windowId = 'ai-comm';
    this.isOpen = false;
    this.storageKey = 'cyberdeck_ai_comm_history';
    this.welcomedKey = 'cyberdeck_ai_comm_welcomed';
    this.cooldownKey = 'cyberdeck_ai_comm_cooldown_until';
    this.logStorageKey = 'cyberdeck_ai_comm_logs';
    
    this.history = this.loadHistory();
    this.queryLogs = this.loadQueryLogs();
    this.cooldownInterval = null;
    this.isRequestPending = false;
    this.activeTypewriterCancel = null;
    
    this.quotaRemaining = 5;
    this.quotaMax = 5;
    this.lastLatency = null;
    this.activeKeyLabel = 'KEY #1';
    this.activeModel = 'gemini-2.5-flash';
    this.extractedDocsCount = 3;
    this.isConfigured = null;
    this.keyCount = null;
    this.modelCount = null;
  }

  loadQueryLogs() {
    try {
      const saved = sessionStorage.getItem(this.logStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[AI COMM] Failed to load query logs from sessionStorage:', e);
    }
    return [];
  }

  saveQueryLogs() {
    try {
      // Keep max last 25 queries in session buffer
      const toSave = this.queryLogs.slice(-25);
      sessionStorage.setItem(this.logStorageKey, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[AI COMM] Failed to save query logs to sessionStorage:', e);
    }
  }

  recordQueryLog(promptText, telemetry, isError = false, errorMessage = null) {
    const logEntry = {
      id: 'trace_' + Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      prompt: promptText,
      isError: isError,
      errorMessage: errorMessage,
      modelUsed: telemetry?.modelUsed || (isError ? 'FAILOVER / EXHAUSTED' : 'UNKNOWN'),
      keyUsed: telemetry?.keyUsed || 'N/A',
      totalLatencyMs: telemetry?.latencyMs || 0,
      steps: Array.isArray(telemetry?.detailedLog) ? telemetry.detailedLog : []
    };

    this.queryLogs.push(logEntry);
    this.saveQueryLogs();
    this.refreshLogViewerContent();
  }

  getOperatorName() {
    if (window.dataLoader?.profile?.operator?.name) {
      return window.dataLoader.profile.operator.name;
    }
    return 'Hannes Schurig';
  }

  async loadExtractedDocsCount() {
    try {
      let res = await fetch('data/documents_extracted.json');
      if (!res.ok) {
        res = await fetch('data/documents_extracted.example.json');
      }
      if (res.ok) {
        const data = await res.json();
        const docsObj = data.documents || {};
        this.extractedDocsCount = Object.keys(docsObj).length;
        const countEl = document.getElementById('telemetry-docs-count');
        if (countEl) {
          countEl.textContent = this.extractedDocsCount.toString();
        }
        return this.extractedDocsCount;
      }
    } catch (err) {
      console.warn('[AI COMM] Could not load extracted documents JSON:', err);
    }
    return this.extractedDocsCount;
  }

  loadHistory() {
    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[AI COMM] Failed to load history from sessionStorage:', e);
    }
    return [];
  }

  saveHistory() {
    try {
      // Keep max last 10 messages in storage
      const toSave = this.history.slice(-10);
      sessionStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch (e) {
      console.warn('[AI COMM] Failed to save history to sessionStorage:', e);
    }
  }

  async checkStatusAndInit() {
    try {
      const res = await fetch('api/agent_comm.php?action=status');
      const data = await res.json();
      if (typeof data.keyCount === 'number') this.keyCount = data.keyCount;
      if (typeof data.modelCount === 'number') this.modelCount = data.modelCount;

      if (!res.ok || !data.success || !data.configured) {
        this.isConfigured = false;
        this.renderDisabledErrorCard(data.message, data.error || 'DATA_ROUTING_CORRUPT');
        this.updateTelemetryDisabled();
        return false;
      }
      this.isConfigured = true;
      this.updateTelemetryConfigured();
      return true;
    } catch (err) {
      console.error('[AI COMM] Status check error:', err);
      this.isConfigured = false;
      this.renderDisabledErrorCard('Verbindung zum KI-Gateway fehlgeschlagen. Bitte Konfiguration oder Server-Logs prüfen.', 'GATEWAY_OFFLINE');
      this.updateTelemetryDisabled();
      return false;
    }
  }

  updateTelemetryConfigured() {
    const netEl = document.getElementById('telemetry-network');
    const secKeysEl = document.getElementById('telemetry-sec-keys');
    const modelsEl = document.getElementById('telemetry-neural-net');
    if (netEl) {
      netEl.textContent = 'OPERATIONAL';
      netEl.className = 'value text-cyan-400 font-bold';
    }
    if (secKeysEl) {
      secKeysEl.textContent = (this.keyCount && this.keyCount > 0) ? `ACTIVE // ${this.keyCount}` : 'INACTIVE';
      secKeysEl.className = (this.keyCount && this.keyCount > 0) ? 'value text-gray-300' : 'value text-red-400 font-bold';
    }
    if (modelsEl) {
      modelsEl.textContent = (this.modelCount && this.modelCount > 0)
        ? `${this.modelCount} ${this.modelCount === 1 ? 'MODEL' : 'MODELS'}`
        : 'INACTIVE';
      modelsEl.className = (this.modelCount && this.modelCount > 0) ? 'value text-gray-300' : 'value text-red-400 font-bold';
    }
  }

  updateTelemetryDisabled() {
    const netEl = document.getElementById('telemetry-network');
    const secKeysEl = document.getElementById('telemetry-sec-keys');
    const modelsEl = document.getElementById('telemetry-neural-net');
    const latEl = document.getElementById('telemetry-latency');
    if (netEl) {
      netEl.textContent = 'OFFLINE';
      netEl.className = 'value text-red-400 font-bold';
    }
    if (secKeysEl) {
      secKeysEl.textContent = 'INACTIVE';
      secKeysEl.className = 'value text-red-400 font-bold';
    }
    if (modelsEl) {
      modelsEl.textContent = 'INACTIVE';
      modelsEl.className = 'value text-red-400 font-bold';
    }
    if (latEl) {
      latEl.textContent = 'N/A';
    }
    this.updateQuotaDisplay(0, 5);
  }

  open(prefilledPrompt = null) {
    this.isOpen = true;

    // If window already exists, bring it to front
    if (windowManager.windows.has(this.windowId)) {
      windowManager.restoreWindow(this.windowId);
      windowManager.focusWindow(this.windowId);
      if (prefilledPrompt) {
        this.injectAndSend(prefilledPrompt);
      }
      return;
    }

    const iconSvg = `
      <svg class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 16a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h9" />
        <circle cx="7" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="10.5" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="14" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
        <line x1="17" y1="3" x2="22" y2="4" stroke-width="1.2" />
        <line x1="22" y1="4" x2="21" y2="9" stroke-width="1.2" />
        <line x1="21" y1="9" x2="16" y2="8" stroke-width="1.2" />
        <line x1="16" y1="8" x2="17" y2="3" stroke-width="1.2" />
        <line x1="17" y1="3" x2="21" y2="9" stroke-width="1.2" />
        <circle cx="17" cy="3" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="21" cy="9" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="22" cy="4" r="0.85" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="0.85" fill="currentColor" stroke="none" />
      </svg>
    `;

    const contentHtml = this.buildWindowLayout();

    // Start with +50% width and +50% height, capped at max 80% vw and 80% vh
    const baseWidth = Math.round(800 * 1.5); // 1200
    const baseHeight = Math.round(590 * 1.5); // 885
    const maxVw = Math.round(window.innerWidth * 0.8);
    const maxVh = Math.round(window.innerHeight * 0.8);
    const winWidth = Math.min(baseWidth, Math.max(320, maxVw));
    const winHeight = Math.min(baseHeight, Math.max(360, maxVh));

    windowManager.createWindow({
      id: this.windowId,
      title: 'SEC//COMM: OPERATOR AI v4.7',
      contentHtml: contentHtml,
      width: winWidth,
      height: winHeight,
      icon: iconSvg,
      theme: 'cyan',
      onClose: () => {
        this.isOpen = false;
        if (this.activeTypewriterCancel) {
          this.activeTypewriterCancel();
          this.activeTypewriterCancel = null;
        }
      }
    });

    this.attachEventListeners();
    this.restoreStoredChat();
    this.checkAndResumeCooldown();
    this.loadExtractedDocsCount();

    // Check configuration and online status immediately upon window open
    this.checkStatusAndInit().then((isOk) => {
      if (!isOk) return;

      // Trigger initial onboarding welcome transmission if history is empty
      const welcomed = sessionStorage.getItem(this.welcomedKey);
      if (!welcomed && this.history.length === 0) {
        this.sendWelcomeTransmission();
      }

      if (prefilledPrompt) {
        setTimeout(() => this.injectAndSend(prefilledPrompt), 250);
      }
    });
  }

  buildWindowLayout() {
    const operatorName = this.getOperatorName().toUpperCase();
    let keysDisplay = 'STANDBY';
    let modelsDisplay = 'STANDBY';
    if (this.isConfigured === false) {
      keysDisplay = 'INACTIVE';
      modelsDisplay = 'INACTIVE';
    } else if (this.keyCount !== null) {
      keysDisplay = this.keyCount > 0 ? `ACTIVE // ${this.keyCount}` : 'INACTIVE';
      modelsDisplay = this.modelCount > 0 ? `${this.modelCount} ${this.modelCount === 1 ? 'MODEL' : 'MODELS'}` : 'INACTIVE';
    }
    return `
      <div class="agent-comm-container">
        <!-- Left Panel: Chat Stream & Input Dock (~68%) -->
        <section class="agent-comm-main-panel">
          <!-- Subheader Stream Bar (Minimized Height) -->
          <div class="agent-comm-sub-header">
            <div class="comm-stream-indicator">
              <div class="comm-mobile-avatar-wrap" title="OPERATOR AI // COMM-NODE 0x8F">
                <img src="assets/img/operator_ai.webp" alt="AI">
              </div>
              <span class="comm-pulse-dot"></span>
              <span class="font-mono text-[11px] tracking-wider text-cyan-300">COMM CHNL TO: OPERATOR AI</span>
            </div>
            <div class="comm-operator-tag font-mono text-[11px] text-gray-400">
              OPERATOR: <span class="text-cyan-400 font-bold">${escapeHtml(operatorName)} [ROOT]</span>
            </div>
          </div>

          <!-- Messages Scroll Viewport -->
          <div class="agent-comm-messages" id="agent-comm-messages">
            <!-- Dynamic Message Bubbles rendered here -->
          </div>

          <!-- Input Dock (Bottom) -->
          <div class="agent-comm-input-dock">
            <div class="agent-comm-input-wrapper">
              <span class="agent-comm-prompt-symbol">&gt;</span>
              <textarea 
                id="agent-comm-input" 
                class="agent-comm-textarea font-mono" 
                placeholder="[SECURE_CHNL: Frage an den Operator stellen...]" 
                maxlength="200" 
                rows="1"
                spellcheck="false"
              ></textarea>
              <div class="agent-comm-char-counter" id="agent-comm-char-counter">0 / 200</div>
            </div>
            <div class="agent-comm-btn-wrapper">
              <button id="agent-comm-send-btn" class="agent-comm-send-btn font-mono" title="Nachricht absenden">
                <span class="btn-send-text">➤ SENDEN</span>
              </button>
            </div>
          </div>

          <!-- Daily Quota Footer (Right-aligned under chat) -->
          <div class="agent-comm-dock-footer">
            <span class="comm-footer-quota font-mono text-[10px] text-gray-400" id="agent-comm-footer-quota">
              TAGES-LIMIT: <span class="text-cyan-400 font-bold" id="agent-comm-quota-val">${this.quotaRemaining} / 5 VERFÜGBAR</span>
            </span>
          </div>
        </section>

        <!-- Right Panel: OPERATOR AI Telemetry & RAG Status (~32%) -->
        <aside class="agent-comm-sidebar">
          <div class="comm-sidebar-header font-mono">
            <span class="text-cyan-400 text-xs font-bold tracking-widest uppercase">OPERATOR AI STATUS</span>
            <span class="text-[10px] text-gray-400">NODE 0x8F</span>
          </div>

          <!-- Operator AI Avatar Stage (Desktop 100x100) -->
          <div class="comm-sidebar-avatar-stage">
            <div class="comm-avatar-portrait-wrap" title="OPERATOR AI // COMM-NODE 0x8F">
              <img src="assets/img/operator_ai.webp" alt="OPERATOR AI">
              <div class="comm-avatar-scanline"></div>
            </div>
          </div>

          <div class="comm-sidebar-section">
            <div class="comm-telemetry-row">
              <span class="label">NETWORK:</span>
              <span class="value text-cyan-400 font-bold" id="telemetry-network">OPERATIONAL</span>
            </div>
            <div class="comm-telemetry-row">
              <span class="label">SECURITY KEYS:</span>
              <span class="value text-gray-300" id="telemetry-sec-keys">${keysDisplay}</span>
            </div>
            <div class="comm-telemetry-row">
              <span class="label">NEURAL NET:</span>
              <span class="value text-gray-300" id="telemetry-neural-net">${modelsDisplay}</span>
            </div>
            <div class="comm-telemetry-row">
              <span class="label">LATENCY:</span>
              <span class="value text-gray-300" id="telemetry-latency">STANDBY</span>
            </div>
          </div>

          <!-- Quota Gauge -->
          <div class="comm-sidebar-section">
            <div class="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span class="text-gray-300 font-bold">QUOTA TODAY:</span>
              <span class="text-cyan-400" id="telemetry-quota-label">5 / 5 LEFT</span>
            </div>
            <div class="comm-gauge-bar-track">
              <div class="comm-gauge-bar-fill" id="telemetry-quota-bar" style="width: 100%;"></div>
            </div>
          </div>

          <!-- Signal & Data Packet Visualizer -->
          <div class="comm-sidebar-section">
            <div class="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1">
              <span>DATA PACKETS:</span>
              <span class="text-cyan-400 font-bold" id="telemetry-packets">PKT 042 // SYN</span>
            </div>
            <div class="comm-signal-bars" aria-hidden="true">
              <span class="bar bar-1"></span>
              <span class="bar bar-2"></span>
              <span class="bar bar-3"></span>
              <span class="bar bar-4"></span>
              <span class="bar bar-5"></span>
              <span class="bar bar-6"></span>
              <span class="bar bar-7"></span>
              <span class="bar bar-8"></span>
            </div>
          </div>

          <!-- RAG Knowledge Base Badges -->
          <div class="comm-sidebar-section">
            <div class="text-[10px] font-mono text-gray-400 tracking-wider mb-2 uppercase">KNOWLEDGE BASE (RAG):</div>
            <div class="comm-rag-badge">
              <span class="rag-dot rag-dot-ok"></span>
              <span class="font-mono text-[11px] text-gray-300">PROFILE.JSON</span>
              <span class="text-[9px] text-cyan-400 ml-auto font-mono">READY</span>
            </div>
            <div class="comm-rag-badge">
              <span class="rag-dot rag-dot-ok"></span>
              <span class="font-mono text-[11px] text-gray-300">PROJECTS.JSON</span>
              <span class="text-[9px] text-cyan-400 ml-auto font-mono">READY</span>
            </div>
            <div class="comm-rag-badge">
              <span class="rag-dot rag-dot-ok"></span>
              <span class="font-mono text-[11px] text-gray-300">DOCUMENTS (OCR)</span>
              <span class="text-[9px] text-cyan-400 ml-auto font-mono" id="telemetry-docs-count">${this.extractedDocsCount}</span>
            </div>
          </div>

          <!-- History & Buffer Management -->
          <div class="comm-sidebar-footer">
            <button id="agent-comm-btn-view-log" class="comm-btn-log font-mono" title="Detaillierte Query- und Routing-Logs dieser Browsersitzung anzeigen">
              [ VIEW BUFFER LOG ]
            </button>
            <button id="agent-comm-btn-purge" class="comm-purge-btn font-mono" title="Lokalen Chatverlauf leeren">
              [ PURGE CHAT BUFFER ]
            </button>
          </div>
        </aside>
      </div>
    `;
  }

  attachEventListeners() {
    const inputEl = document.getElementById('agent-comm-input');
    const sendBtn = document.getElementById('agent-comm-send-btn');
    const viewLogBtn = document.getElementById('agent-comm-btn-view-log');
    const purgeBtn = document.getElementById('agent-comm-btn-purge');

    if (inputEl) {
      inputEl.addEventListener('input', () => {
        this.updateCharCount();
        this.autoGrowTextarea(inputEl);
      });

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
      // Auto-focus input
      setTimeout(() => inputEl.focus(), 100);
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        sound.playKeyClick();
        this.handleSend();
      });
    }

    if (viewLogBtn) {
      viewLogBtn.addEventListener('click', () => {
        sound.playKeyClick();
        this.openBufferLogViewer();
      });
    }

    if (purgeBtn) {
      purgeBtn.addEventListener('click', () => {
        sound.playWarningBeep();
        this.purgeBuffer();
      });
    }

    // Clicking anywhere in the messages area cancels an active typewriter effect immediately
    const messagesEl = document.getElementById('agent-comm-messages');
    if (messagesEl) {
      messagesEl.addEventListener('click', () => {
        if (this.activeTypewriterCancel) {
          this.activeTypewriterCancel();
          this.activeTypewriterCancel = null;
        }
      });
    }
  }

  autoGrowTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  updateCharCount() {
    const inputEl = document.getElementById('agent-comm-input');
    const counterEl = document.getElementById('agent-comm-char-counter');
    if (!inputEl || !counterEl) return;

    const count = inputEl.value.length;
    counterEl.textContent = `${count} / 200`;

    counterEl.classList.remove('text-amber-400', 'text-red-400');
    if (count >= 200) {
      counterEl.classList.add('text-red-400');
    } else if (count >= 170) {
      counterEl.classList.add('text-amber-400');
    }
  }

  injectAndSend(text) {
    const inputEl = document.getElementById('agent-comm-input');
    if (inputEl) {
      inputEl.value = text.slice(0, 200);
      this.updateCharCount();
      this.handleSend();
    }
  }

  getTimeString() {
    const d = new Date();
    return d.toTimeString().slice(0, 5);
  }

  sendWelcomeTransmission() {
    sessionStorage.setItem(this.welcomedKey, 'true');
    const operatorName = this.getOperatorName();
    const welcomeText = `**[SEC//COMM: COMM-NODE 0x8F ONLINE]**\n\nWillkommen im Kommunikationskanal des Operators. Ich bin die digitale Assistenz-Einheit von ${operatorName}. Während der Operator im Einsatz ist, beantworte ich deine Fragen zu seinem Werdegang, Projekten, Tech-Stacks und Qualifikationen.\n\n⚠️ **WICHTIGER DATENSCHUTZHINWEIS:**\n*Dies ist ein experimentelles KI-Feature. Eingegebene Prompts und Chat-Inhalte werden verschlüsselt an die Google Gemini REST-API (Google LLC, USA) übertragen und verarbeitet. Bitte übermittle keine sensiblen, vertraulichen oder personenbezogenen Daten. Da generative Modelle Ungenauigkeiten erzeugen können, sind alle Antworten unverbindlich – für verifizierte Fakten bitte die Original-Dokumente prüfen.*`;

    const welcomeMsg = {
      isWelcome: true,
      role: 'model',
      text: welcomeText,
      timestamp: this.getTimeString(),
      telemetry: {
        keyUsed: 'INIT NODE',
        modelUsed: 'local-bootstrap',
        latencyMs: 12
      }
    };

    this.history.push(welcomeMsg);
    this.saveHistory();
    this.appendMessageBubble(welcomeMsg, false);
  }

  restoreStoredChat() {
    const messagesEl = document.getElementById('agent-comm-messages');
    if (!messagesEl) return;
    messagesEl.innerHTML = '';

    this.history.forEach((msg) => {
      this.appendMessageBubble(msg, false);
    });

    this.scrollToBottom();
  }

  appendMessageBubble(msg, useTypewriter = false) {
    const messagesEl = document.getElementById('agent-comm-messages');
    if (!messagesEl) return null;

    const isUser = msg.role === 'user';
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `comm-message-item ${isUser ? 'comm-msg-user' : 'comm-msg-ai'}`;

    const timestamp = msg.timestamp || this.getTimeString();

    if (isUser) {
      bubbleWrapper.innerHTML = `
        <div class="comm-bubble-content user-bubble">
          <div class="comm-bubble-header font-mono">
            <span>GUEST//USER [${escapeHtml(timestamp)}] &gt;</span>
          </div>
          <div class="comm-bubble-body font-mono">
            ${escapeHtml(msg.text)}
          </div>
        </div>
      `;
      messagesEl.appendChild(bubbleWrapper);
      this.scrollToBottom();
      return bubbleWrapper;
    }

    // AI Message
    const avatarSvg = `
      <div class="comm-avatar-box" title="Operator AI // Comm-Node 0x8F">
        <img src="assets/img/operator_ai.webp" alt="AI">
      </div>
    `;

    let parsedHtml = (window.marked && typeof window.marked.parse === 'function')
      ? window.marked.parse(msg.text)
      : `<p>${escapeHtml(msg.text).replace(/\n/g, '<br>')}</p>`;

    if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      parsedHtml = window.DOMPurify.sanitize(parsedHtml);
    }

    const telemetry = msg.telemetry || {};
    const routingSignature = telemetry.keyUsed
      ? `[ROUTED VIA ${escapeHtml(telemetry.keyUsed)} // ${(telemetry.modelUsed || 'GEMINI').toUpperCase()} // ${telemetry.latencyMs || 0}ms]`
      : `[SEC//COMM: VERIFIED TRANSMISSION]`;

    bubbleWrapper.innerHTML = `
      ${avatarSvg}
      <div class="comm-bubble-content ai-bubble">
        <div class="comm-bubble-header font-mono">
          <span>OPERATOR AI // NODE [${escapeHtml(timestamp)}] &gt;</span>
        </div>
        <div class="comm-bubble-body markdown-body">
          ${useTypewriter ? '' : parsedHtml}
        </div>
        <div class="comm-bubble-footer font-mono">
          <span class="comm-routing-tag">${routingSignature}</span>
        </div>
      </div>
    `;

    messagesEl.appendChild(bubbleWrapper);
    this.scrollToBottom();

    if (useTypewriter) {
      const bodyEl = bubbleWrapper.querySelector('.comm-bubble-body');
      this.runTypewriter(bodyEl, msg.text, parsedHtml);
    }

    return bubbleWrapper;
  }

  runTypewriter(targetEl, rawMarkdown, fullHtml) {
    if (!targetEl) return;

    let isCancelled = false;
    let charIndex = 0;
    const speedMs = 16;
    const textLen = rawMarkdown.length;

    // Split raw markdown into readable chunks/words
    const cursorSpan = document.createElement('span');
    cursorSpan.className = 'comm-typewriter-cursor';
    cursorSpan.textContent = '█';

    const flushFull = () => {
      if (isCancelled) return;
      isCancelled = true;
      targetEl.innerHTML = fullHtml;
      this.scrollToBottom();
    };

    this.activeTypewriterCancel = flushFull;

    const step = () => {
      if (isCancelled) return;
      if (charIndex < textLen) {
        charIndex += Math.min(3, textLen - charIndex);
        const currentSlice = rawMarkdown.slice(0, charIndex);
        
        // Render partial text safely
        targetEl.textContent = currentSlice;
        targetEl.appendChild(cursorSpan);

        if (charIndex % 30 === 0) {
          this.scrollToBottom();
        }

        setTimeout(step, speedMs);
      } else {
        // Complete typewriter: render final markdown HTML
        flushFull();
        this.activeTypewriterCancel = null;
      }
    };

    step();
  }

  scrollToBottom() {
    const messagesEl = document.getElementById('agent-comm-messages');
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  renderTypingIndicator() {
    const messagesEl = document.getElementById('agent-comm-messages');
    if (!messagesEl) return null;

    const indicator = document.createElement('div');
    indicator.id = 'agent-comm-typing-indicator';
    indicator.className = 'comm-message-item comm-msg-ai';
    indicator.innerHTML = `
      <div class="comm-avatar-box">
        <img src="assets/img/operator_ai.webp" alt="AI" class="opacity-80 animate-pulse">
      </div>
      <div class="comm-bubble-content ai-bubble">
        <div class="comm-bubble-header font-mono">
          <span>OPERATOR AI // ROUTING &gt;</span>
        </div>
        <div class="comm-typing-dots">
          <span></span><span></span><span></span>
          <span id="agent-comm-progress-text" class="ml-2 font-mono text-[11px] text-cyan-400">QUERYING NEURAL COMM-NODE #1...</span>
        </div>
      </div>
    `;

    messagesEl.appendChild(indicator);
    this.scrollToBottom();
    return indicator;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('agent-comm-typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  updateTypingIndicatorProgress(nodeIndex, totalNodes) {
    const textEl = document.getElementById('agent-comm-progress-text');
    if (textEl) {
      textEl.textContent = `QUERYING NEURAL COMM-NODE #${nodeIndex}...`;
    }
    const packetEl = document.getElementById('telemetry-packets');
    if (packetEl) {
      packetEl.textContent = `NODE #${nodeIndex} // SYN`;
    }
  }

  async readStreamingResponse(response, onProgress) {
    if (!response.body || typeof response.body.getReader !== 'function') {
      const text = await response.text();
      return this.parseNdjsonPayload(text);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalResult = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === 'progress') {
              if (onProgress) onProgress(parsed);
            } else if (parsed.type === 'result' || parsed.success !== undefined) {
              finalResult = parsed;
            }
          } catch (e) {
            console.warn('[AI COMM] Stream parse error:', e, trimmed);
          }
        }
      }
    } catch (streamErr) {
      console.warn('[AI COMM] Stream reader error:', streamErr);
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (parsed.type === 'result' || parsed.success !== undefined) {
          finalResult = parsed;
        }
      } catch (e) {}
    }

    return finalResult || { success: false, error: 'ERR//EMPTY_RESPONSE', message: 'Keine Antwort vom Server erhalten.' };
  }

  parseNdjsonPayload(text) {
    const lines = text.split('\n');
    let result = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'result' || parsed.success !== undefined) {
          result = parsed;
        }
      } catch (e) {}
    }
    return result || { success: false, error: 'ERR//INVALID_RESPONSE', message: 'Ungültige Server-Antwort.' };
  }

  async handleSend() {
    if (this.isRequestPending) return;

    const inputEl = document.getElementById('agent-comm-input');
    if (!inputEl) return;

    const userText = inputEl.value.trim();
    if (!userText || userText.length < 3) return;

    // Check client cooldown
    const cooldownUntil = parseInt(sessionStorage.getItem(this.cooldownKey) || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (cooldownUntil > now) {
      const rem = cooldownUntil - now;
      sound.playWarningBeep();
      this.showNoticeBubble(`[COOLDOWN ACTIVE] Bitte warte noch ${rem}s vor der nächsten Anfrage.`);
      return;
    }

    // 1. Add user message
    const userMsg = {
      role: 'user',
      text: userText,
      timestamp: this.getTimeString()
    };
    this.history.push(userMsg);
    this.saveHistory();
    this.appendMessageBubble(userMsg, false);

    // Clear input
    inputEl.value = '';
    this.updateCharCount();
    this.autoGrowTextarea(inputEl);

    // 2. Set pending state
    this.isRequestPending = true;
    this.renderTypingIndicator();
    this.setSendButtonLoading(true);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    try {
      const response = await fetch('api/agent_comm.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          prompt: userText,
          csrf_token: csrfToken,
          history: this.history.slice(-6).map((h) => ({
            role: h.role,
            text: h.text
          }))
        })
      });

      const data = await this.readStreamingResponse(response, (progress) => {
        if (progress.nodeIndex) {
          this.updateTypingIndicatorProgress(progress.nodeIndex, progress.totalNodes);
        }
      });
      this.removeTypingIndicator();

      if (!response.ok || !data || !data.success) {
        sound.playAccessDenied();
        this.recordQueryLog(userText, data ? data.telemetry : null, true, (data && (data.message || data.error)) || 'Verbindung fehlgeschlagen');
        this.handleApiError(data || { success: false, error: 'ERR//HTTP_' + response.status, message: 'Server-Fehler HTTP ' + response.status });
        return;
      }

      // Success
      if (typeof sound.playMessageSent === 'function') {
        sound.playMessageSent();
      } else if (typeof sound.playAccessGranted === 'function') {
        sound.playAccessGranted();
      }
      this.recordQueryLog(userText, data.telemetry, false);

      const aiMsg = {
        role: 'model',
        text: data.text,
        timestamp: this.getTimeString(),
        telemetry: data.telemetry || {}
      };

      this.history.push(aiMsg);
      this.saveHistory();
      this.appendMessageBubble(aiMsg, true);

      // Update Telemetry Sidebar
      this.updateTelemetrySidebar(data.telemetry);

      // Start 60s cooldown
      const cooldownSec = data.telemetry?.cooldownSeconds || 60;
      this.startCooldown(cooldownSec);

    } catch (err) {
      console.error('[AI COMM] Request error:', err);
      this.removeTypingIndicator();
      sound.playAccessDenied();
      this.recordQueryLog(userText, null, true, err.message);
      this.showNoticeBubble(`[COMMUNICATION ERROR] Netzwerkverbindung unterbrochen oder Timeout: ${err.message}`);
    } finally {
      this.isRequestPending = false;
      this.setSendButtonLoading(false);
    }
  }

  handleApiError(data) {
    if (data.error === 'ERR//COMM_ROUTING_DISABLED') {
      this.renderDisabledErrorCard(data.message);
      return;
    }

    if (data.error === 'rate_limit_cooldown') {
      const rem = data.remaining || 60;
      this.startCooldown(rem);
      this.showNoticeBubble(`[COOLDOWN] ${data.message || 'Bitte warten vor der nächsten Anfrage.'}`);
      return;
    }

    if (data.error === 'rate_limit_daily') {
      this.quotaRemaining = 0;
      this.updateQuotaDisplay(0, 5);
      this.showNoticeBubble(`[QUOTA EXHAUSTED] ${data.message || 'Tageslimit erreicht.'}`);
      return;
    }

    this.showNoticeBubble(`[SYS//ERROR: ${escapeHtml(data.error || 'UNKNOWN')}] ${escapeHtml(data.message || 'Fehler bei der Übertragung.')}`);
  }

  showNoticeBubble(noticeText) {
    const messagesEl = document.getElementById('agent-comm-messages');
    if (!messagesEl) return;

    const noticeEl = document.createElement('div');
    noticeEl.className = 'comm-notice-bubble font-mono';
    noticeEl.innerHTML = `<span>⚠️ ${escapeHtml(noticeText)}</span>`;
    messagesEl.appendChild(noticeEl);
    this.scrollToBottom();
  }

  renderDisabledErrorCard(message) {
    const mainPanel = document.querySelector('.agent-comm-main-panel');
    if (!mainPanel) return;

    mainPanel.innerHTML = `
      <div class="agent-comm-error-card">
        <div class="error-card-badge font-mono">SEC//COMM: LINK OFFLINE</div>
        <div class="error-card-title font-mono">⚠️ DATA ROUTING CORRUPT // CHECK AI-COMMS CONFIGURATION</div>
        <div class="error-card-code font-mono">ERR//COMM_ROUTING_DISABLED: OPERATOR_OVERRIDE_ACTIVE</div>
        <p class="error-card-text font-sans">
          ${escapeHtml(message || 'Die neuronale Kommunikationsbrücke wurde durch den System-Operator noch nicht freigeschaltet. Sämtliche KI-Routing-Kanäle sind deaktiviert. Bitte prüfe data/config.php.')}
        </p>
        <p class="error-card-text-en font-sans text-gray-400 text-xs">
          The neural communication relay has not been enabled by the system operator. All AI routing channels are disabled. Please inspect data/config.php.
        </p>
        <button id="btn-close-ai-error" class="cyber-btn cyber-btn-error font-mono mt-4">
          [ SYSTEM DISMISS // SCHLIESSEN ]
        </button>
      </div>
    `;

    const closeBtn = document.getElementById('btn-close-ai-error');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sound.playKeyClick();
        windowManager.closeWindow(this.windowId);
      });
    }
  }

  startCooldown(seconds) {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    const now = Math.floor(Date.now() / 1000);
    const cooldownUntil = now + seconds;
    sessionStorage.setItem(this.cooldownKey, cooldownUntil.toString());

    this.updateCooldownButton(seconds);

    this.cooldownInterval = setInterval(() => {
      const currentNow = Math.floor(Date.now() / 1000);
      const remaining = cooldownUntil - currentNow;
      if (remaining <= 0) {
        clearInterval(this.cooldownInterval);
        this.cooldownInterval = null;
        sessionStorage.removeItem(this.cooldownKey);
        this.resetCooldownButton();
      } else {
        this.updateCooldownButton(remaining);
      }
    }, 1000);
  }

  checkAndResumeCooldown() {
    const cooldownUntil = parseInt(sessionStorage.getItem(this.cooldownKey) || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (cooldownUntil > now) {
      this.startCooldown(cooldownUntil - now);
    }
  }

  updateCooldownButton(remaining) {
    const sendBtn = document.getElementById('agent-comm-send-btn');
    if (!sendBtn) return;
    sendBtn.disabled = true;
    sendBtn.classList.add('btn-cooldown-active');
    sendBtn.innerHTML = `<span class="btn-send-text">[ COOLDOWN ${remaining}s ]</span>`;
  }

  resetCooldownButton() {
    const sendBtn = document.getElementById('agent-comm-send-btn');
    if (!sendBtn) return;
    sendBtn.disabled = false;
    sendBtn.classList.remove('btn-cooldown-active');
    sendBtn.innerHTML = `<span class="btn-send-text">➤ SENDEN</span>`;
  }

  setSendButtonLoading(isLoading) {
    const sendBtn = document.getElementById('agent-comm-send-btn');
    if (!sendBtn) return;
    if (isLoading) {
      sendBtn.disabled = true;
      sendBtn.innerHTML = `<span class="btn-send-text animate-pulse">[ DISPATCHING... ]</span>`;
    } else {
      const cooldownUntil = parseInt(sessionStorage.getItem(this.cooldownKey) || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (cooldownUntil <= now) {
        this.resetCooldownButton();
      }
    }
  }

  updateTelemetrySidebar(telemetry) {
    if (!telemetry) return;

    if (typeof telemetry.keyCount === 'number') this.keyCount = telemetry.keyCount;
    if (typeof telemetry.modelCount === 'number') this.modelCount = telemetry.modelCount;
    this.updateTelemetryConfigured();

    if (telemetry.quotaRemaining !== undefined) {
      this.quotaRemaining = telemetry.quotaRemaining;
      this.updateQuotaDisplay(this.quotaRemaining, telemetry.quotaMax || 5);
    }

    if (telemetry.latencyMs !== undefined) {
      const latEl = document.getElementById('telemetry-latency');
      if (latEl) latEl.textContent = `${telemetry.latencyMs}ms`;
    }
  }

  updateQuotaDisplay(remaining, max = 5) {
    const labelEl = document.getElementById('telemetry-quota-label');
    const barEl = document.getElementById('telemetry-quota-bar');
    const footerValEl = document.getElementById('agent-comm-quota-val');

    if (labelEl) {
      labelEl.textContent = `${remaining} / ${max} LEFT`;
    }
    if (footerValEl) {
      footerValEl.textContent = `${remaining} / ${max} VERFÜGBAR`;
    }
    if (barEl) {
      const pct = Math.max(0, Math.min(100, Math.round((remaining / max) * 100)));
      barEl.style.width = `${pct}%`;
      barEl.classList.remove('bar-warning', 'bar-danger');
      if (pct <= 20) {
        barEl.classList.add('bar-danger');
      } else if (pct <= 50) {
        barEl.classList.add('bar-warning');
      }
    }
  }

  openBufferLogViewer() {
    const logWinId = 'ai-comm-log';
    if (windowManager.windows.has(logWinId)) {
      windowManager.restoreWindow(logWinId);
      windowManager.focusWindow(logWinId);
      this.refreshLogViewerContent();
      return;
    }

    const logIconSvg = `
      <svg class="w-3.5 h-3.5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    `;

    const contentHtml = `
      <div class="comm-log-wrapper">
        <div class="comm-log-topbar">
          <div class="comm-log-badge font-mono">
            <span class="comm-pulse-dot"></span>
            <span>SEC//TRACE: LOCAL BROWSER BUFFER LOG</span>
          </div>
          <div class="comm-log-status font-mono text-[11px] text-gray-400">
            AUDIT TRAIL: <span class="text-cyan-400 font-bold" id="comm-log-count">${this.queryLogs.length} QUERIES</span>
          </div>
        </div>

        <div class="comm-log-scrollable font-mono" id="comm-log-body">
          ${this.buildLogBodyHtml()}
        </div>

        <div class="comm-log-toolbar font-mono">
          <button id="btn-copy-comm-log" class="cyber-btn text-xs">
            [ 📋 LOG KOPIEREN ]
          </button>
          <button id="btn-clear-comm-log" class="cyber-btn cyber-btn-warning text-xs">
            [ 🗑️ LOG LEEREN ]
          </button>
          <button id="btn-close-comm-log" class="cyber-btn text-xs ml-auto">
            [ ✕ SCHLIESSEN ]
          </button>
        </div>
      </div>
    `;

    const winWidth = Math.min(740, window.innerWidth - 30);
    const winHeight = Math.min(520, window.innerHeight - 80);

    windowManager.createWindow({
      id: logWinId,
      title: 'SEC//LOG: COMM-NODE BUFFER EXECUTION TRACE',
      contentHtml: contentHtml,
      width: winWidth,
      height: winHeight,
      icon: logIconSvg,
      theme: 'cyan'
    });

    this.attachLogViewerListeners();
  }

  buildLogBodyHtml() {
    if (!this.queryLogs || this.queryLogs.length === 0) {
      return `
        <div class="comm-log-empty">
          <div class="text-cyan-300 font-bold mb-1">[BUFFER LOG EMPTY // KEINE EINTRÄGE]</div>
          <div class="text-gray-400 text-xs">
            In dieser Browsersitzung wurden noch keine KI-Abfragen ausgeführt. Sobald du eine Frage im Chat stellst, werden hier Model-Auswahl, verwendete API-Keys, Latenzen und die Rückmeldungen von Google Gemini lokal protokolliert.
          </div>
          <div class="text-[10px] text-gray-500 mt-2">
            *Hinweis: Dieser Trace wird ausschließlich lokal in deinem Browser (sessionStorage) gespeichert und niemals mit anderen Besuchern geteilt.*
          </div>
        </div>
      `;
    }

    return this.queryLogs.map((entry, qIdx) => {
      const statusBadge = entry.isError
        ? `<span class="comm-log-tag tag-error">ERROR</span>`
        : `<span class="comm-log-tag tag-ok">OK</span>`;

      const stepsHtml = (entry.steps && entry.steps.length > 0)
        ? entry.steps.map((st) => {
            const codeCls = st.httpCode === 200 ? 'code-200' : (st.httpCode === 429 ? 'code-429' : 'code-err');
            return `
              <div class="comm-log-step">
                <div class="comm-step-header">
                  <span class="text-gray-400">[${escapeHtml(st.timestamp || '')}]</span>
                  <span class="text-cyan-300 font-bold">MODEL: ${escapeHtml(st.model || 'N/A')}</span>
                  <span class="text-gray-300">KEY: ${escapeHtml(st.key || 'N/A')}</span>
                  <span class="comm-log-code ${codeCls}">HTTP ${st.httpCode || 0}</span>
                  <span class="text-gray-400 text-[10px] ml-auto">${st.latencyMs || 0}ms</span>
                </div>
                <div class="comm-step-feedback">
                  &gt; ${escapeHtml(st.feedback || '')}
                </div>
              </div>
            `;
          }).join('')
        : `
          <div class="comm-log-step">
            <div class="comm-step-feedback text-gray-400">
              &gt; Model: ${escapeHtml(entry.modelUsed)} | Key: ${escapeHtml(entry.keyUsed)} | Latenz: ${entry.totalLatencyMs}ms
              ${entry.errorMessage ? `<br><span class="text-rose-400">&gt; Fehler: ${escapeHtml(entry.errorMessage)}</span>` : ''}
            </div>
          </div>
        `;

      return `
        <div class="comm-log-card">
          <div class="comm-log-card-header">
            <span class="font-bold text-cyan-400">#${qIdx + 1} // ${escapeHtml(entry.timestamp)}</span>
            ${statusBadge}
            <span class="comm-log-prompt-preview text-gray-300" title="${escapeHtml(entry.prompt)}">
              "${escapeHtml(entry.prompt.length > 65 ? entry.prompt.slice(0, 65) + '...' : entry.prompt)}"
            </span>
          </div>
          <div class="comm-log-card-body">
            ${stepsHtml}
          </div>
        </div>
      `;
    }).reverse().join('');
  }

  attachLogViewerListeners() {
    const copyBtn = document.getElementById('btn-copy-comm-log');
    const clearBtn = document.getElementById('btn-clear-comm-log');
    const closeBtn = document.getElementById('btn-close-comm-log');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        sound.playKeyClick();
        this.copyLogToClipboard(copyBtn);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        sound.playWarningBeep();
        this.queryLogs = [];
        sessionStorage.removeItem(this.logStorageKey);
        this.refreshLogViewerContent();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sound.playKeyClick();
        windowManager.closeWindow('ai-comm-log');
      });
    }
  }

  copyLogToClipboard(btn) {
    if (!this.queryLogs || this.queryLogs.length === 0) {
      return;
    }

    let text = `============================================================\n`;
    text += `CYBERDECK PORTFOLIO OS // OPERATOR AI EXECUTION TRACE LOG\n`;
    text += `Exportiert: ${new Date().toLocaleString()} (Lokal aus Browsersitzung)\n`;
    text += `============================================================\n\n`;

    this.queryLogs.forEach((q, idx) => {
      text += `[QUERY #${idx + 1}] ${q.timestamp} | Status: ${q.isError ? 'FAILED' : 'SUCCESS'}\n`;
      text += `Prompt: "${q.prompt}"\n`;
      if (q.steps && q.steps.length > 0) {
        q.steps.forEach((st) => {
          text += `  -> Model: ${st.model} | Key: ${st.key} | HTTP ${st.httpCode} (${st.latencyMs}ms)\n`;
          text += `     Feedback: ${st.feedback}\n`;
        });
      } else {
        text += `  -> Model: ${q.modelUsed} | Key: ${q.keyUsed} | Latenz: ${q.totalLatencyMs}ms\n`;
        if (q.errorMessage) text += `     Fehler: ${q.errorMessage}\n`;
      }
      text += `------------------------------------------------------------\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      const origText = btn.textContent;
      btn.textContent = '[ ✓ KOPIERT! ]';
      setTimeout(() => { btn.textContent = origText; }, 2000);
    }).catch((err) => {
      console.error('Clipboard copy failed:', err);
    });
  }

  refreshLogViewerContent() {
    const bodyEl = document.getElementById('comm-log-body');
    const countEl = document.getElementById('comm-log-count');
    if (bodyEl) {
      bodyEl.innerHTML = this.buildLogBodyHtml();
    }
    if (countEl) {
      countEl.textContent = `${this.queryLogs.length} QUERIES`;
    }
  }

  purgeBuffer() {
    // Keep only the welcome / onboarding transmission
    const welcomeMsg = this.history.find(
      (m) => m.isWelcome || (m.role === 'model' && typeof m.text === 'string' && m.text.includes('DATENSCHUTZHINWEIS'))
    );

    if (welcomeMsg) {
      welcomeMsg.isWelcome = true;
      this.history = [welcomeMsg];
    } else {
      this.history = [];
      this.sendWelcomeTransmission();
      return;
    }

    this.saveHistory();

    const messagesEl = document.getElementById('agent-comm-messages');
    if (messagesEl) {
      messagesEl.innerHTML = '';
      this.appendMessageBubble(welcomeMsg, false);
    }

    this.showNoticeBubble('CHAT BUFFER PURGED: Chatverlauf geleert. Initiale System-Übertragung beibehalten.');
  }
}

export const agentComm = new AgentCommManager();
