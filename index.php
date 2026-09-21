<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="de" class="theme-cyan">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>CyberDeck Portfolio // SecOps-UI</title>
  
  <!-- SEO & Cyber Meta Tags -->
  <meta name="description" content="Interaktives CyberDeck Portfolio OS & Command Center. Vibecoding, AI Orchestration & Creative Engineering.">
  <meta name="theme-color" content="#030712">
  <meta name="csrf-token" content="<?= $csrfToken ?>">
  <meta property="og:title" content="CyberDeck // SecOps-UI Portfolio">
  <meta property="og:description" content="Interaktives Cyber-War-Room Portfolio im Terminal- und Fake-OS-Stil.">
  <meta property="og:type" content="website">

  <!-- Local Stylesheets (No external CDNs - 100% DSGVO-compliant) -->
  <link rel="stylesheet" href="assets/css/tailwind.min.css">
  <link rel="stylesheet" href="assets/css/cyber-theme.css">

  <!-- Local Markdown Parser -->
  <script src="assets/js/vendor/marked.min.js"></script>
</head>
<body class="text-gray-100 antialiased select-none" style="background-color: #020712;">

  <!-- Background Matrix Rain Stream Canvas -->
  <canvas id="matrix-canvas"></canvas>

  <!-- CRT Scanline Subgrid Overlay -->
  <div class="scanlines-overlay"></div>

  <!-- Offshore Wire Transfer HUD Banner (for add-money command) -->
  <div id="wire-transfer-banner">
    <div class="text-[10px] text-yellow-500 font-mono tracking-widest uppercase">OFFSHORE ROUTING // CAYMAN ISLANDS</div>
    <div id="wire-counter" class="text-xl md:text-2xl font-black text-yellow-400 font-mono tracking-wider">0 €</div>
    <div class="text-[9px] text-gray-400 font-mono">SWIFT ENCRYPTION: 4096-BIT ACTIVE</div>
  </div>

  <!-- Desktop Work Area -->
  <main id="desktop-area">
    <!-- Desktop Shortcuts Container -->
    <div id="desktop-icons" class="desktop-icons-container"></div>
  </main>

  <!-- Cyber Dock / Taskbar (Windows-Style mit offenen Fenstern) -->
  <nav id="taskbar" class="cyber-dock">
    <!-- Offene Fenster Liste (immer zentriert) -->
    <div id="dock-windows-container" class="dock-windows-list">
      <div class="taskbar-empty-hint font-mono">[ SEC//OPS STANDBY ]</div>
    </div>

    <!-- System Tray Rechts (Sound & Uhr) -->
    <div class="dock-system-tray">
      <button id="dock-btn-sound" class="dock-tray-item" title="Audio Umschalten (Sound)">
        <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
      </button>
      <div id="dock-clock" class="dock-clock font-mono">00:00:00</div>
    </div>
  </nav>

  <!-- Desktop Context Menu (Right Click) -->
  <div id="cyber-context-menu">
    <div id="ctx-new-terminal" class="context-menu-item">
      <span>&gt;_</span>
      <span>New Terminal</span>
    </div>
    <div id="ctx-arrange-windows" class="context-menu-item">
      <span>▤</span>
      <span>Arrange Windows</span>
    </div>
    <div class="context-menu-separator"></div>
    <div id="ctx-toggle-sound" class="context-menu-item">
      <span>♪</span>
      <span>Toggle Audio</span>
    </div>
    <div id="ctx-toggle-matrix" class="context-menu-item">
      <span>░</span>
      <span>Toggle Matrix Stream</span>
    </div>
    <div class="context-menu-separator"></div>
    <div id="ctx-reboot" class="context-menu-item" style="color: #f87171;">
      <span>⚠</span>
      <span>System Reboot</span>
    </div>
  </div>

  <!-- BIOS / Kernel Bootloader Overlay -->
  <div id="boot-screen">
    <div id="boot-lines" class="boot-lines"></div>
    <div class="boot-skip-hint font-mono">[ KLICK ODER LEERTASTE ZUM ÜBERSPRINGEN ]</div>
  </div>

  <!-- App Bootstrap Module -->
  <script type="module" src="assets/js/app.js"></script>
</body>
</html>
