<?php
/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Secure Contact Dispatch Mailer
 * High-Security Mail Handler with CSRF, Honeypot & Rate Limiting
 * ============================================================
 */

// Start session for CSRF token & rate limiting
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

header('Content-Type: application/json; charset=utf-8');

// 1. Only POST allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method Not Allowed. Nur POST-Anfragen gestattet.'
    ]);
    exit;
}

// 2. Honeypot Anti-Bot Field Check
if (!empty($_POST['cyber_trap']) || !empty($_POST['website_hp'])) {
    // Silent success response for automated spam bots
    echo json_encode([
        'success' => true,
        'message' => 'Transmission received.'
    ]);
    exit;
}

// 3. CSRF Verification
$submittedCsrf = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
$sessionCsrf = $_SESSION['csrf_token'] ?? '';

if (empty($sessionCsrf) || empty($submittedCsrf) || !hash_equals($sessionCsrf, $submittedCsrf)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'csrf_invalid',
        'message' => 'Sicherheits-Verifikation fehlgeschlagen (CSRF ungültig). Bitte Seite neu laden.'
    ]);
    exit;
}

// 4. Rate Limiting / Cooldown (Max 1 message per 60 seconds)
$cooldownSeconds = 60;
$now = time();

// Determine identifier via session & client IP (strictly REMOTE_ADDR to prevent header-spoofing)
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$rateFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cyberdeck_rate_' . md5($clientIp) . '.txt';

$lastSent = 0;
if (file_exists($rateFile)) {
    $lastSent = (int)@file_get_contents($rateFile);
}
if (isset($_SESSION['last_mail_timestamp'])) {
    $lastSent = max($lastSent, (int)$_SESSION['last_mail_timestamp']);
}

$elapsed = $now - $lastSent;
if ($elapsed < $cooldownSeconds) {
    $remaining = $cooldownSeconds - $elapsed;
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'rate_limit',
        'remaining' => $remaining,
        'message' => "Sicherheits-Cooldown aktiv: Bitte warte noch {$remaining} Sekunden vor der nächsten Nachricht."
    ]);
    exit;
}

// 5. Input Extraction & Extensive Sanitization
$rawName = $_POST['name'] ?? '';
$rawEmail = $_POST['email'] ?? '';
$rawSubject = $_POST['subject'] ?? '';
$rawMessage = $_POST['message'] ?? '';

// Remove newline characters from header fields to prevent Header Injection attacks
$cleanName = trim(str_replace(["\r", "\n", "%0a", "%0d"], '', strip_tags($rawName)));
$cleanEmail = trim(str_replace(["\r", "\n", "%0a", "%0d"], '', strip_tags($rawEmail)));
$cleanSubject = trim(str_replace(["\r", "\n", "%0a", "%0d"], '', strip_tags($rawSubject)));
$cleanMessage = trim(strip_tags($rawMessage));

// Fallback-safe multibyte helpers
if (!function_exists('cyber_substr')) {
    function cyber_substr(string $str, int $start, int $length): string {
        return function_exists('mb_substr') ? mb_substr($str, $start, $length, 'UTF-8') : substr($str, $start, $length);
    }
}
if (!function_exists('cyber_strlen')) {
    function cyber_strlen(string $str): int {
        return function_exists('mb_strlen') ? mb_strlen($str, 'UTF-8') : strlen($str);
    }
}

// Max length boundaries
$cleanName = cyber_substr($cleanName, 0, 100);
$cleanEmail = cyber_substr($cleanEmail, 0, 150);
$cleanSubject = cyber_substr($cleanSubject, 0, 150);
$cleanMessage = cyber_substr($cleanMessage, 0, 4000);

// Validation
if (empty($cleanName)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Bitte gib deinen Namen bzw. Callsign ein.'
    ]);
    exit;
}

if (empty($cleanEmail) || !filter_var($cleanEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Bitte gib eine gültige E-Mail-Adresse ein.'
    ]);
    exit;
}

if (empty($cleanMessage) || cyber_strlen($cleanMessage) < 5) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Bitte gib eine Nachricht mit mindestens 5 Zeichen ein.'
    ]);
    exit;
}

if (empty($cleanSubject)) {
    $cleanSubject = 'Kontaktanfrage von ' . $cleanName;
}

// 6. Recipient & System Configuration
// Load private configuration (data/config.php) or fallback to data/config.example.php
$configFile = null;
foreach ([
    __DIR__ . '/../data/config.php',
    __DIR__ . '/../data/config.local.php',
    __DIR__ . '/../config.php',
    __DIR__ . '/../data/config.example.php'
] as $candidate) {
    if (file_exists($candidate)) {
        $configFile = $candidate;
        break;
    }
}
$config = ($configFile && file_exists($configFile)) ? (require $configFile) : [];

$recipient = getenv('PORTFOLIO_CONTACT_RECIPIENT') 
    ?: ($config['contact_recipient'] ?? 'contact@vibecoding.local');

$senderName = $config['mail_from_name'] ?? 'CyberDeck Dispatch';
$mailDomain = $config['mail_domain'] ?? '';

$mailSubject = '=?UTF-8?B?' . base64_encode('PORTFOLIO: ' . $cleanSubject) . '?=';

// 7. Message Body Construction
$ipAnonymized = preg_replace('/\.\d+$/', '.xxx', $clientIp);
$timestamp = date('d.m.Y H:i:s T');

$body = "========================================================\r\n";
$body .= "CYBERDECK PORTFOLIO - VERSCHLÜSSELTE DISPATCH-NACHRICHT\r\n";
$body .= "========================================================\r\n\r\n";
$body .= "Absender:   " . $cleanName . "\r\n";
$body .= "E-Mail:     " . $cleanEmail . "\r\n";
$body .= "Betreff:    " . $cleanSubject . "\r\n";
$body .= "Zeitpunkt:  " . $timestamp . "\r\n";
$body .= "Client-IP:  " . $ipAnonymized . "\r\n\r\n";
$body .= "---------------------- NACHRICHT -----------------------\r\n\r\n";
$body .= $cleanMessage . "\r\n\r\n";
$body .= "--------------------------------------------------------\r\n";
$body .= "Ende der Übertragung // SecOps-Mailer v2.4\r\n";

// 8. Mail Headers
if (!empty($mailDomain)) {
    $fromDomain = preg_replace('/[^a-zA-Z0-9.-]/', '', $mailDomain);
} else {
    $serverHost = $_SERVER['SERVER_NAME'] ?? 'localhost';
    if ($serverHost === 'localhost' || filter_var($serverHost, FILTER_VALIDATE_IP)) {
        $fromDomain = 'cyberdeck.local';
    } else {
        $fromDomain = preg_replace('/[^a-zA-Z0-9.-]/', '', $serverHost);
    }
}

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: "' . addcslashes($senderName, '"') . '" <noreply@' . $fromDomain . '>',
    'Reply-To: "' . addcslashes($cleanName, '"') . '" <' . $cleanEmail . '>',
    'X-Mailer: CyberDeck-SecOps-Mailer/2.0'
];

// 9. Dispatch Mail
$mailSuccess = @mail($recipient, $mailSubject, $body, implode("\r\n", $headers));

if (!$mailSuccess) {
    error_log('[CyberDeck Mailer] mail() failed for recipient: ' . $recipient . ' at ' . date('c'));
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Übertragungsfehler: Nachricht konnte nicht zugestellt werden. Bitte versuche es später erneut.'
    ]);
    exit;
}

// 10. Update Rate Limit Timestamps (only on success)
$_SESSION['last_mail_timestamp'] = $now;
@file_put_contents($rateFile, (string)$now);

// Regenerate CSRF token after successful submission
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));

echo json_encode([
    'success' => true,
    'new_csrf' => $_SESSION['csrf_token'],
    'message' => 'Dispatch erfolgreich übermittelt. Danke für deine Nachricht!'
]);
