<?php
if (session_status() === PHP_SESSION_NONE) {
    $isSecure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443);
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $isSecure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
$csrfToken = htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8');
$profileFile = file_exists(__DIR__ . '/data/profile.json') ? 'data/profile.json' : 'data/profile.example.json';
$projectsFile = file_exists(__DIR__ . '/data/projects.json') ? 'data/projects.json' : 'data/projects.example.json';
$cssVersion = file_exists(__DIR__ . '/assets/css/cyber-theme.css') ? filemtime(__DIR__ . '/assets/css/cyber-theme.css') : time();
$appJsVersion = file_exists(__DIR__ . '/assets/js/app.js') ? filemtime(__DIR__ . '/assets/js/app.js') : time();
$profileVersion = file_exists(__DIR__ . '/' . $profileFile) ? filemtime(__DIR__ . '/' . $profileFile) : time();
$projectsVersion = file_exists(__DIR__ . '/' . $projectsFile) ? filemtime(__DIR__ . '/' . $projectsFile) : time();
?>
<!DOCTYPE html>
<html lang="de" class="theme-cyan">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>CyberDeck OS // Interaktives Portfolio</title>
  
  <!-- SEO & Cyber Meta Tags -->
  <meta name="description" content="Interaktives CyberDeck Portfolio OS & Command Center. Vibecoding, AI Orchestration & Creative Engineering.">
  <meta name="theme-color" content="#030712">
  <meta name="csrf-token" content="<?= $csrfToken ?>">
  <meta name="profile-source" content="<?= $profileFile ?>?v=<?= $profileVersion ?>">
  <meta name="projects-source" content="<?= $projectsFile ?>?v=<?= $projectsVersion ?>">
  <meta property="og:title" content="CyberDeck OS // Interaktives Portfolio">
  <meta property="og:description" content="Interaktives Cyber-War-Room Portfolio im Terminal- und Fake-OS-Stil.">
  <meta property="og:type" content="website">

  <!-- Favicons & App Icons for all platforms -->
  <link rel="icon" type="image/svg+xml" href="assets/img/favicon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="assets/img/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="assets/img/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="assets/img/apple-touch-icon.png">
  <link rel="manifest" href="site.webmanifest">
  <link rel="shortcut icon" href="favicon.ico">
  <meta name="msapplication-TileColor" content="#030712">
  <meta name="msapplication-config" content="browserconfig.xml">

  <!-- Local Stylesheets (No external CDNs - 100% DSGVO-compliant) -->
  <link rel="stylesheet" href="assets/css/tailwind.min.css">
  <link rel="stylesheet" href="assets/css/cyber-theme.css?v=<?= $cssVersion ?>">

  <!-- Local Markdown Parser & DOM Purifier -->
  <script src="assets/js/vendor/marked.min.js"></script>
  <script src="assets/js/vendor/purify.min.js"></script>
</head>
<body class="text-gray-100 antialiased select-none" style="background-color: #020712;">

  <!-- Background Matrix Rain Stream Canvas -->
  <canvas id="matrix-canvas"></canvas>

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
      
      <div class="dock-tray-divider"></div>

      <div class="dock-info-wrapper">
        <button id="dock-btn-info" class="dock-tray-info-btn font-mono" title="Projekt-Informationen &amp; Open Source" aria-expanded="false" aria-controls="dock-info-overlay">
          <svg class="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>Info</span>
        </button>

        <!-- Info Popover / Overlay -->
        <div id="dock-info-overlay" class="dock-info-overlay hidden" role="dialog" aria-labelledby="info-overlay-title">
          <div class="dock-info-overlay-header">
            <div class="flex items-center gap-2">
              <span class="text-cyan-400 text-sm">ℹ</span>
              <span id="info-overlay-title" class="font-bold text-xs text-cyan-300 font-mono tracking-wider">PROJECT // CYBERDECK PORTFOLIO</span>
            </div>
            <button id="dock-info-close" class="dock-info-close-btn" aria-label="Schließen">✕</button>
          </div>
          <div class="dock-info-overlay-body">
            <p class="text-xs text-gray-300 leading-relaxed font-sans mb-3.5">
              Dieses CyberDeck-Portfolio ist ein modernes, quelloffenes (Open Source) Web-Betriebssystem und interaktives Entwickler-Portfolio im retro-futuristischen Cyberpunk-/Sci-Fi-Terminal-Stil. Es wurde als hochgradig anpassbares Schaufenster für Entwickler, Engineers und Tech-Enthusiasten konzipiert, um Projekte, berufliche Meilensteine, Fähigkeiten und Live-Demos immersiv im Browser zu präsentieren. Ausgestattet mit einem voll funktionsfähigen Fenstermanager (Verschieben, Maximieren, Kacheln), integriertem CLI-Terminal mit Easter Eggs und Befehlsausführung, Radar-Visualisierung, Web-Audio-Synthesizer für authentische Sound-Effekte und einer schlanken, dateibasierten Datenarchitektur (JSON) lässt es sich ohne Datenbank oder Framework-Overhead mühelos als eigenes Portfolio oder interaktive Web-App deployen und erweitern.
            </p>
            <div class="pt-3 border-t border-cyan-500 border-opacity-20 flex flex-wrap items-center justify-between gap-2.5 font-mono text-[11px]">
              <a href="https://github.com/schurigh/hannes-schurig-portfolio" target="_blank" rel="noopener" class="dock-info-github-link">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                <span>GitHub Repository</span>
                <span>↗</span>
              </a>
              <div class="text-gray-400 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Stand: 01.10.2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Desktop Context Menu (Right Click) -->
  <div id="cyber-context-menu">
    <div id="ctx-new-terminal" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </span>
      <span class="context-menu-text">New Terminal</span>
    </div>
    <div id="ctx-arrange-windows" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="7" y="7" width="14" height="14" rx="1.5" />
          <path d="M17 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
        </svg>
      </span>
      <span class="context-menu-text">Arrange Windows</span>
    </div>
    <div class="context-menu-separator"></div>
    <div id="ctx-toggle-sound" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        </svg>
      </span>
      <span class="context-menu-text">Toggle Audio</span>
    </div>
    <div id="ctx-toggle-matrix" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h4v4H4zM16 4h4v4h-4zM10 10h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4z" />
        </svg>
      </span>
      <span class="context-menu-text">Toggle Matrix Stream</span>
    </div>
    <div class="context-menu-separator"></div>
    <div id="ctx-system-info" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </span>
      <span class="context-menu-text">System Info</span>
    </div>
    <div id="ctx-report-bug" class="context-menu-item">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect width="8" height="14" x="8" y="6" rx="4" />
          <path d="m19 7-3 2" />
          <path d="m5 7 3 2" />
          <path d="m19 19-3-2" />
          <path d="m5 19 3-2" />
          <path d="M20 13h-4" />
          <path d="M4 13h4" />
          <path d="m10 4 1 2" />
          <path d="m14 4-1 2" />
        </svg>
      </span>
      <span class="context-menu-text">Report a bug</span>
    </div>
    <div class="context-menu-separator"></div>
    <div id="ctx-reboot" class="context-menu-item" style="color: #f87171;">
      <span class="context-menu-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </span>
      <span class="context-menu-text">System Reboot</span>
    </div>
  </div>

  <!-- BIOS / Kernel Bootloader Overlay -->
  <div id="boot-screen">
    <div id="boot-lines" class="boot-lines"></div>
    <div class="boot-skip-hint font-mono">[ KLICK ODER LEERTASTE ZUM ÜBERSPRINGEN ]</div>
  </div>

  <!-- App Bootstrap Module -->
  <script type="module" src="assets/js/app.js?v=<?= $appJsVersion ?>"></script>
</body>
</html>
