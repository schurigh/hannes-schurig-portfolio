<?php
/**
 * ============================================================
 * CYBERDECK PORTFOLIO - AI Agent Comm Backend Proxy
 * High-Security RAG Q&A Gateway for Google Gemini REST API
 * Multi-Key Rotation, Non-Blocking Concurrency & Free-Tier Guard
 * ============================================================
 */

// 1. Session Setup with High-Security Cookies
@set_time_limit(180);
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
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');

// 2. Configuration & Status Verification
$baseDir = dirname(__DIR__);
$configFile = file_exists($baseDir . '/data/config.php') 
    ? $baseDir . '/data/config.php' 
    : $baseDir . '/data/config.example.php';

if (function_exists('opcache_invalidate') && file_exists($configFile)) {
    @opcache_invalidate($configFile, true);
}

$config = file_exists($configFile) ? require $configFile : [];

// Check if AI Agent feature is enabled
$aiEnabled = !empty($config['ai_chat_enabled']) && $config['ai_chat_enabled'] === true;

// Validate API Keys (reject empty, too short, or example placeholders)
$rawApiKeys = $config['gemini_api_keys'] ?? [];
$apiKeys = array_values(array_filter((array)$rawApiKeys, function($k) {
    if (!is_string($k)) return false;
    $trimmed = trim($k);
    if (strlen($trimmed) < 15) return false;
    if (stripos($trimmed, 'DEIN_') !== false || stripos($trimmed, 'YOUR_') !== false || strpos($trimmed, '...') !== false) {
        return false;
    }
    return true;
}));

// Validate Models
$rawModels = $config['gemini_models'] ?? [];
$models = !empty($rawModels) && is_array($rawModels) ? array_values(array_filter($rawModels)) : [];

// 3. Lightweight Status Check (GET or POST with action=status)
$isStatusAction = (
    ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'status') ||
    (isset($_POST['action']) && $_POST['action'] === 'status')
);

// If raw JSON payload sent with action=status
if (!$isStatusAction && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $peekInput = file_get_contents('php://input');
    if (!empty($peekInput)) {
        $peekDecoded = json_decode($peekInput, true);
        if (is_array($peekDecoded) && isset($peekDecoded['action']) && $peekDecoded['action'] === 'status') {
            $isStatusAction = true;
        }
    }
}

if ($isStatusAction) {
    if (!$aiEnabled) {
        http_response_code(403);
        echo json_encode([
            'success'    => false,
            'enabled'    => false,
            'configured' => false,
            'keyCount'   => count($apiKeys),
            'modelCount' => count($models),
            'error'      => 'ERR//COMM_ROUTING_DISABLED',
            'code'       => 'OPERATOR_OVERRIDE_ACTIVE',
            'message'    => 'Die neuronale Kommunikationsbrücke wurde durch den System-Operator noch nicht freigeschaltet. Sämtliche KI-Routing-Kanäle sind deaktiviert. Bitte prüfe data/config.php.'
        ]);
        exit;
    }

    if (empty($apiKeys) || empty($models)) {
        http_response_code(403);
        echo json_encode([
            'success'    => false,
            'enabled'    => true,
            'configured' => false,
            'keyCount'   => count($apiKeys),
            'modelCount' => count($models),
            'error'      => 'ERR//COMM_ROUTING_DISABLED',
            'code'       => 'DATA_ROUTING_CORRUPT',
            'message'    => 'Die KI-Kommunikation ist nicht betriebsbereit: Keine gültigen Google Gemini API-Keys oder Modelle in data/config.php hinterlegt.'
        ]);
        exit;
    }

    echo json_encode([
        'success'    => true,
        'enabled'    => true,
        'configured' => true,
        'keyCount'   => count($apiKeys),
        'modelCount' => count($models),
        'message'    => 'COMM-NODE 0x8F ONLINE'
    ]);
    exit;
}

// 4. For query transmissions: Only POST Allowed
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error'   => 'METHOD_NOT_ALLOWED',
        'message' => 'Method Not Allowed. Nur POST-Anfragen gestattet.'
    ]);
    exit;
}

// 5. Extract JSON Payload or POST Fields
$rawInput = file_get_contents('php://input');
$requestData = [];
if (!empty($rawInput)) {
    $decoded = json_decode($rawInput, true);
    if (is_array($decoded)) {
        $requestData = $decoded;
    }
}
if (empty($requestData)) {
    $requestData = $_POST;
}

// 6. Honeypot Anti-Bot Field Check
if (!empty($requestData['cyber_trap']) || !empty($requestData['website_hp'])) {
    // Silent success response for automated spam bots without consuming tokens
    echo json_encode([
        'success' => true,
        'text'    => '[SEC//DISPATCH: TRANSMISSION ARCHIVED] Vielen Dank für deine Eingabe.',
        'telemetry' => [
            'keyUsed'        => 'HONEYPOT',
            'modelUsed'      => 'honeypot-sink',
            'latencyMs'      => 42,
            'quotaRemaining' => 5
        ]
    ]);
    exit;
}

// 7. CSRF Verification
$submittedCsrf = $requestData['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
$sessionCsrf = $_SESSION['csrf_token'] ?? '';

if (empty($sessionCsrf) || empty($submittedCsrf) || !hash_equals($sessionCsrf, $submittedCsrf)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'csrf_invalid',
        'message' => 'Sicherheits-Verifikation fehlgeschlagen (CSRF ungültig). Bitte Seite neu laden.'
    ]);
    exit;
}

// Free session lock immediately for non-blocking concurrent streaming
session_write_close();

// 8. Strict Configuration Enforcement for Transmissions
if (!$aiEnabled) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'ERR//COMM_ROUTING_DISABLED',
        'code'    => 'OPERATOR_OVERRIDE_ACTIVE',
        'message' => 'Die neuronale Kommunikationsbrücke wurde durch den System-Operator noch nicht freigeschaltet. Sämtliche KI-Routing-Kanäle sind deaktiviert. Bitte prüfe data/config.php.'
    ]);
    exit;
}

if (empty($apiKeys) || empty($models)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error'   => 'ERR//COMM_ROUTING_DISABLED',
        'code'    => 'DATA_ROUTING_CORRUPT',
        'message' => 'Die KI-Kommunikation ist nicht betriebsbereit: Keine gültigen Google Gemini API-Keys oder Modelle in data/config.php hinterlegt.'
    ]);
    exit;
}

// 7. Input Extraction & Validation
$rawPrompt = $requestData['prompt'] ?? '';
$cleanPrompt = trim(strip_tags((string)$rawPrompt));
$cleanPrompt = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $cleanPrompt);

// Fallback-safe multibyte string length
$promptLength = function_exists('mb_strlen') ? mb_strlen($cleanPrompt, 'UTF-8') : strlen($cleanPrompt);

if (empty($cleanPrompt) || $promptLength < 3) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'INPUT_TOO_SHORT',
        'message' => 'Bitte gib eine Frage mit mindestens 3 Zeichen ein.'
    ]);
    exit;
}

if ($promptLength > 200) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error'   => 'INPUT_TOO_LONG',
        'message' => 'Maximal 200 Zeichen pro Frage erlaubt.'
    ]);
    exit;
}

// Client-History sanitization (sliding window max 5 messages)
$rawHistory = $requestData['history'] ?? [];
$cleanHistory = [];
if (is_array($rawHistory)) {
    // Keep max last 5 turns
    $recentHistory = array_slice($rawHistory, -5);
    foreach ($recentHistory as $turn) {
        if (!is_array($turn)) continue;
        $role = ($turn['role'] ?? '') === 'model' ? 'model' : 'user';
        $text = trim(strip_tags((string)($turn['text'] ?? '')));
        if (empty($text)) continue;
        // Truncate individual history turns to 500 chars to prevent context bloat
        $turnLen = function_exists('mb_substr') ? mb_substr($text, 0, 500, 'UTF-8') : substr($text, 0, 500);
        $cleanHistory[] = [
            'role' => $role,
            'parts' => [['text' => $turnLen]]
        ];
    }
}

// 8. Thread-Safe Rate Limiting & Cooldown Protection (.rate_limits.json)
$clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
// Salted IP hash to protect visitor privacy
$ipHash = hash_hmac('sha256', $clientIp, 'cyberdeck_rate_salt_0x8f');
$rateLimitFile = $baseDir . '/data/.rate_limits.json';

$now = time();
$cooldownSeconds = 60;
$dailyLimit = 5;
$dailyResetWindow = 86400; // 24 hours

$quotaRemaining = $dailyLimit;
$cooldownRemaining = 0;

$rfp = @fopen($rateLimitFile, 'c+');
if ($rfp && flock($rfp, LOCK_EX)) {
    $fileSize = filesize($rateLimitFile);
    $rateData = [];
    if ($fileSize > 0) {
        $content = fread($rfp, $fileSize);
        $decodedRates = json_decode($content, true);
        if (is_array($decodedRates)) {
            $rateData = $decodedRates;
        }
    }

    // Auto-clean entries older than 48 hours (garbage collection)
    $cleanRates = [];
    foreach ($rateData as $k => $v) {
        if (!empty($v['last_request']) && ($now - $v['last_request'] < 172800)) {
            $cleanRates[$k] = $v;
        }
    }
    $rateData = $cleanRates;

    $entry = $rateData[$ipHash] ?? [
        'last_request' => 0,
        'daily_count'  => 0,
        'daily_reset'  => $now + $dailyResetWindow
    ];

    // Reset daily counter if window expired
    if ($now >= $entry['daily_reset']) {
        $entry['daily_count'] = 0;
        $entry['daily_reset'] = $now + $dailyResetWindow;
    }

    // 1. Check Cooldown (60 seconds)
    $elapsed = $now - (int)$entry['last_request'];
    if ($elapsed < $cooldownSeconds && $entry['last_request'] > 0) {
        $cooldownRemaining = $cooldownSeconds - $elapsed;
        flock($rfp, LOCK_UN);
        fclose($rfp);

        http_response_code(429);
        echo json_encode([
            'success'   => false,
            'error'     => 'rate_limit_cooldown',
            'remaining' => $cooldownRemaining,
            'message'   => "Sicherheits-Cooldown aktiv: Bitte warte noch {$cooldownRemaining} Sekunden vor der nächsten Anfrage."
        ]);
        exit;
    }

    // 2. Check Daily Quota (Max 5 requests/day)
    if ($entry['daily_count'] >= $dailyLimit) {
        $resetInHours = max(1, round(($entry['daily_reset'] - $now) / 3600));
        flock($rfp, LOCK_UN);
        fclose($rfp);

        http_response_code(429);
        echo json_encode([
            'success'        => false,
            'error'          => 'rate_limit_daily',
            'quotaRemaining' => 0,
            'message'        => "Tageskontingent erschöpft: Maximal {$dailyLimit} Anfragen pro 24 Stunden erreicht. Reset in ca. {$resetInHours} Stunden."
        ]);
        exit;
    }

    // Update rate entry and release lock IMMEDIATELY (~1ms lock duration)
    $entry['last_request'] = $now;
    $entry['daily_count']++;
    $rateData[$ipHash] = $entry;

    $quotaRemaining = max(0, $dailyLimit - $entry['daily_count']);

    ftruncate($rfp, 0);
    rewind($rfp);
    fwrite($rfp, json_encode($rateData, JSON_PRETTY_PRINT));
    fflush($rfp);
    flock($rfp, LOCK_UN);
    fclose($rfp);
} else {
    if ($rfp) fclose($rfp);
}

// 9. API Key Pool & Multi-Key State Management (.key_state.json)
// COMPLIANCE NOTE: Multi-key pooling is designed for legitimate redundancy and fallback
// (e.g. Free-Tier primary with Pay-as-you-go secondary). In accordance with Google's Terms
// of Service, this pool must NOT be used for artificial quota or rate-limit circumvention.
$keyStateFile = $baseDir . '/data/.key_state.json';

// Helper: Read key state atomically
function getKeyStates(string $file): array {
    $default = ['keys' => [], 'active_index' => 0];
    if (!file_exists($file)) return $default;
    $fp = @fopen($file, 'r');
    if (!$fp) return $default;
    flock($fp, LOCK_SH);
    $content = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $data = json_decode($content, true);
    return is_array($data) ? $data : $default;
}

// Helper: Update key state atomically (~1ms lock)
function setKeyState(string $file, string $keyId, string $status, int $cooldownUntil, ?string $error = null): void {
    $fp = @fopen($file, 'c+');
    if (!$fp) return;
    if (flock($fp, LOCK_EX)) {
        $size = filesize($file);
        $data = ['keys' => [], 'active_index' => 0];
        if ($size > 0) {
            $raw = fread($fp, $size);
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) $data = $parsed;
        }
        $data['keys'][$keyId] = [
            'status'         => $status,
            'cooldown_until' => $cooldownUntil,
            'last_error'     => $error,
            'updated_at'     => time()
        ];
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

// 10. Assemble RAG Knowledge Store
$profilePath = file_exists($baseDir . '/data/profile.json') 
    ? $baseDir . '/data/profile.json' 
    : $baseDir . '/data/profile.example.json';

$projectsPath = file_exists($baseDir . '/data/projects.json') 
    ? $baseDir . '/data/projects.json' 
    : $baseDir . '/data/projects.example.json';

$documentsPath = file_exists($baseDir . '/data/documents_extracted.json') 
    ? $baseDir . '/data/documents_extracted.json' 
    : $baseDir . '/data/documents_extracted.example.json';

$systemPromptPath = file_exists($baseDir . '/data/system_prompt.php') 
    ? $baseDir . '/data/system_prompt.php' 
    : $baseDir . '/data/system_prompt.example.php';

if (function_exists('opcache_invalidate') && file_exists($systemPromptPath)) {
    @opcache_invalidate($systemPromptPath, true);
}

$systemPromptTemplate = file_exists($systemPromptPath) ? require $systemPromptPath : '';

// Helper to minify JSON text for prompt injection
function minifyJson(string $filePath): string {
    if (!file_exists($filePath)) return '{}';
    $raw = @file_get_contents($filePath);
    if (!$raw) return '{}';
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '{}';
}

$profileJsonMin = minifyJson($profilePath);
$projectsJsonMin = minifyJson($projectsPath);
$documentsJsonMin = minifyJson($documentsPath);

$assembledSystemPrompt = str_replace(
    ['{JSON profile.json}', '{JSON projects.json}', '{JSON documents_extracted.json}'],
    [$profileJsonMin, $projectsJsonMin, $documentsJsonMin],
    $systemPromptTemplate
);

// 11. Model Cascade & Gemini Request Execution with Instant Multi-Key Failover
$models = $config['gemini_models'] ?? ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview'];
$keyStates = getKeyStates($keyStateFile);

$mandatoryDisclaimer = "*Hinweis: Dieser Operator-Chat ist ein experimentelles Feature zum Testen. Antworten können Ungenauigkeiten enthalten – für verbindliche Daten bitte die Original-Dokumente prüfen.*";

$selectedKeyIndex = 0;
$successfulResponse = null;
$finalModelUsed = $models[0];
$finalKeyLabel = 'KEY #1';
$attempts = [];
$startTimeTotal = microtime(true);

// Enable unbuffered streaming for real-time node progress
header('Content-Type: application/x-ndjson; charset=utf-8');
header('Cache-Control: no-cache, no-transform');
header('X-Accel-Buffering: no');

if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', '1');
}
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
while (ob_get_level() > 0) {
    @ob_end_flush();
}
ob_implicit_flush(1);

// Build Google Gemini contents payload
$contentsPayload = $cleanHistory;
$contentsPayload[] = [
    'role'  => 'user',
    'parts' => [['text' => $cleanPrompt]]
];

$postFields = json_encode([
    'systemInstruction' => [
        'parts' => [['text' => $assembledSystemPrompt]]
    ],
    'contents' => $contentsPayload,
    'generationConfig' => [
        'temperature'     => 0.35,
        'maxOutputTokens' => 800
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Helper: Multi-Transport HTTP POST (curl_init -> stream_context -> cli-curl fallback)
function cyber_http_post(string $url, string $postFields, array $headers = [], int $timeout = 35): array {
    // 1. Native PHP cURL extension
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        return [
            'code'      => (int)$httpCode,
            'body'      => $responseBody ?: '',
            'error'     => $error,
            'transport' => 'php-curl'
        ];
    }

    // 2. PHP stream wrapper with HTTPS support
    if (in_array('https', stream_get_wrappers())) {
        $context = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => implode("\r\n", $headers),
                'content'       => $postFields,
                'timeout'       => $timeout,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => true
            ]
        ]);
        $responseBody = @file_get_contents($url, false, $context);
        $httpCode = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            if (preg_match('#HTTP/[0-9\.]+\s+([0-9]+)#i', $http_response_header[0], $m)) {
                $httpCode = (int)$m[1];
            }
        }
        return [
            'code'      => $httpCode,
            'body'      => $responseBody ?: '',
            'error'     => null,
            'transport' => 'stream-context'
        ];
    }

    // 3. Fallback: System curl CLI via proc_open
    if (function_exists('proc_open')) {
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];
        $headerFlags = '';
        foreach ($headers as $h) {
            $headerFlags .= ' -H ' . escapeshellarg($h);
        }
        $cmd = 'curl -s -S -i -X POST' . $headerFlags . ' --max-time ' . (int)$timeout . ' --data-binary @- ' . escapeshellarg($url);
        $process = @proc_open($cmd, $descriptors, $pipes);
        if (is_resource($process)) {
            fwrite($pipes[0], $postFields);
            fclose($pipes[0]);
            $rawOutput = stream_get_contents($pipes[1]);
            fclose($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[2]);
            proc_close($process);

            $httpCode = 0;
            $body = '';
            if (!empty($rawOutput)) {
                $parts = explode("\r\n\r\n", $rawOutput, 2);
                if (count($parts) < 2) $parts = explode("\n\n", $rawOutput, 2);
                while (preg_match('#^HTTP/[0-9\.]+\s+100#i', $parts[0]) && count($parts) >= 2) {
                    $subParts = explode("\r\n\r\n", $parts[1], 2);
                    if (count($subParts) < 2) $subParts = explode("\n\n", $parts[1], 2);
                    if (count($subParts) >= 2) $parts = $subParts;
                    else break;
                }
                if (preg_match('#HTTP/[0-9\.]+\s+([0-9]+)#i', $parts[0], $m)) {
                    $httpCode = (int)$m[1];
                }
                $body = $parts[1] ?? '';
            }
            return [
                'code'      => $httpCode,
                'body'      => $body,
                'error'     => $stderr,
                'transport' => 'cli-curl'
            ];
        }
    }

    return [
        'code'      => 0,
        'body'      => '',
        'error'     => 'No suitable HTTP transport available (missing php-curl, openssl and proc_open).',
        'transport' => 'none'
    ];
}

// Try each key in pool until success or all exhausted
$keyCount = count($apiKeys);
$modelCount = count($models);
$totalNodes = $keyCount * $modelCount;
$detailedQueryLog = [];

for ($i = 0; $i < $keyCount; $i++) {
    // Determine key index respecting current rotation
    $kIdx = ($keyStates['active_index'] + $i) % $keyCount;
    $apiKey = $apiKeys[$kIdx];
    $keyId = 'key_' . substr(hash('sha256', $apiKey), 0, 10);
    $keyLabel = 'KEY #' . ($kIdx + 1);

    // Check if key is currently in cooldown
    $kState = $keyStates['keys'][$keyId] ?? null;
    if ($kState && !empty($kState['cooldown_until']) && $kState['cooldown_until'] > $now) {
        $rem = $kState['cooldown_until'] - $now;
        $attempts[] = "{$keyLabel} (Cooldown {$rem}s übersprungen)";
        $detailedQueryLog[] = [
            'timestamp' => date('H:i:s'),
            'key'       => $keyLabel,
            'model'     => $models[0] ?? 'gemini',
            'status'    => 'SKIPPED',
            'httpCode'  => 429,
            'latencyMs' => 0,
            'feedback'  => "Key befindet sich im Cooldown (noch {$rem}s verbleibend). Automatisch übersprungen."
        ];
        continue;
    }

    // Try available models for this key
    foreach ($models as $mIdx => $modelName) {
        $nodeNumber = ($kIdx * $modelCount) + ($mIdx + 1);

        // Real-time progress update to browser stream
        echo json_encode([
            'type'       => 'progress',
            'nodeIndex'  => $nodeNumber,
            'totalNodes' => $totalNodes,
            'keyLabel'   => $keyLabel,
            'model'      => $modelName,
            'message'    => "QUERYING NEURAL COMM-NODE #{$nodeNumber}..."
        ], JSON_UNESCAPED_UNICODE) . "\n";
        @flush();

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key=" . urlencode($apiKey);

        $callStart = microtime(true);
        $res = cyber_http_post($url, $postFields, ['Content-Type: application/json; charset=utf-8'], 35);
        $callLatencyMs = round((microtime(true) - $callStart) * 1000);

        $httpCode = $res['code'];
        $responseBody = $res['body'];
        $curlError = $res['error'];

        // HTTP 429 = Quota Limit -> Mark key in cooldown and switch IMMEDIATELY to next key
        if ($httpCode === 429) {
            $isDaily = (stripos($responseBody, 'per_day') !== false || stripos($responseBody, 'daily') !== false);
            $cooldownSec = $isDaily ? 86400 : 65; // 65s for RPM, 24h for RPD
            $errObj = json_decode($responseBody, true);
            $errMsg = $errObj['error']['message'] ?? 'Quota Limit erreicht (Resource Exhausted)';
            setKeyState($keyStateFile, $keyId, 'cooldown', $now + $cooldownSec, "HTTP 429 Quota Exceeded on {$modelName}");
            $attempts[] = "{$keyLabel} [{$modelName}] (429 Quota -> Cooldown {$cooldownSec}s)";
            $detailedQueryLog[] = [
                'timestamp' => date('H:i:s'),
                'key'       => $keyLabel,
                'model'     => $modelName,
                'status'    => 'QUOTA_EXCEEDED',
                'httpCode'  => 429,
                'latencyMs' => $callLatencyMs,
                'feedback'  => "HTTP 429: {$errMsg} -> Cooldown {$cooldownSec}s gesetzt, Failover auf nächsten Key."
            ];
            break; // Break inner model loop, try next key
        }

        // HTTP 200 = Success!
        if ($httpCode === 200 && !empty($responseBody)) {
            $parsed = json_decode($responseBody, true);
            $candidateText = $parsed['candidates'][0]['content']['parts'][0]['text'] ?? '';
            $finishReason = $parsed['candidates'][0]['finishReason'] ?? 'STOP';
            $pTokens = $parsed['usageMetadata']['promptTokenCount'] ?? null;
            $cTokens = $parsed['usageMetadata']['candidatesTokenCount'] ?? null;
            $tokenStr = ($pTokens !== null && $cTokens !== null) ? " (Tokens: {$pTokens} In / {$cTokens} Out)" : "";

            if (!empty($candidateText)) {
                $successfulResponse = trim($candidateText);
                $finalModelUsed = $modelName;
                $finalKeyLabel = $keyLabel;
                $attempts[] = "{$keyLabel} [{$modelName}] (200 OK // {$callLatencyMs}ms // {$res['transport']})";
                $detailedQueryLog[] = [
                    'timestamp' => date('H:i:s'),
                    'key'       => $keyLabel,
                    'model'     => $modelName,
                    'status'    => 'SUCCESS',
                    'httpCode'  => 200,
                    'latencyMs' => $callLatencyMs,
                    'feedback'  => "HTTP 200 OK: Antwort erfolgreich generiert [{$finishReason}]{$tokenStr} ({$res['transport']})."
                ];
                break 2; // Break out of both loops
            } else {
                $detailedQueryLog[] = [
                    'timestamp' => date('H:i:s'),
                    'key'       => $keyLabel,
                    'model'     => $modelName,
                    'status'    => 'EMPTY_RESPONSE',
                    'httpCode'  => 200,
                    'latencyMs' => $callLatencyMs,
                    'feedback'  => "HTTP 200 OK: Leere Antwort erhalten [{$finishReason}]."
                ];
            }
        }

        // Other HTTP Error (400, 403, 500 etc. or HTTP 0 Timeout)
        $errSnippet = !empty($curlError) ? $curlError : '';
        if (empty($errSnippet)) {
            $errParsed = json_decode($responseBody, true);
            $errSnippet = $errParsed['error']['message'] ?? substr($responseBody, 0, 120);
        }
        if ($httpCode === 0 && (stripos($errSnippet, 'timed out') !== false || stripos($errSnippet, 'timeout') !== false)) {
            $errSnippet = "Gateway Timeout ({$callLatencyMs}ms): Modell hat innerhalb von 35s nicht geantwortet (Gemini API ausgelastet). Failover greift.";
        }
        $attempts[] = "{$keyLabel} [{$modelName}] (HTTP {$httpCode} // {$errSnippet})";
        $detailedQueryLog[] = [
            'timestamp' => date('H:i:s'),
            'key'       => $keyLabel,
            'model'     => $modelName,
            'status'    => ($httpCode === 0 ? 'TIMEOUT' : 'ERROR'),
            'httpCode'  => $httpCode,
            'latencyMs' => $callLatencyMs,
            'feedback'  => ($httpCode === 0 ? $errSnippet : "HTTP {$httpCode} Fehler: {$errSnippet}")
        ];
    }
}

// 12. Handle All Keys Exhausted or Network Failure
if ($successfulResponse === null) {
    http_response_code(503);
    echo json_encode([
        'type'      => 'result',
        'success'   => false,
        'error'     => 'ERR//COMM_CHNL_EXHAUSTED',
        'message'   => 'Alle KI-Übertragungskanäle oder Kontingente sind derzeit ausgelastet. Bitte versuche es in wenigen Minuten erneut.',
        'telemetry' => [
            'attempts'       => $attempts,
            'keyCount'       => count($apiKeys),
            'modelCount'     => count($models),
            'detailedLog'    => $detailedQueryLog,
            'quotaRemaining' => $quotaRemaining
        ]
    ], JSON_UNESCAPED_UNICODE) . "\n";
    @flush();
    exit;
}

// 13. Ensure Mandatory Disclaimer is Present
$hasDisclaimer = (
    stripos($successfulResponse, 'experimentelles Feature') !== false || 
    stripos($successfulResponse, 'verbindliche Daten') !== false
);

if (!$hasDisclaimer) {
    $successfulResponse .= "\n\n" . $mandatoryDisclaimer;
}

$totalLatencyMs = round((microtime(true) - $startTimeTotal) * 1000);

// 14. Return Structured Success JSON
echo json_encode([
    'type'      => 'result',
    'success'   => true,
    'text'      => $successfulResponse,
    'telemetry' => [
        'keyUsed'         => $finalKeyLabel,
        'modelUsed'       => $finalModelUsed,
        'keyCount'        => count($apiKeys),
        'modelCount'      => count($models),
        'latencyMs'       => $totalLatencyMs,
        'quotaRemaining'  => $quotaRemaining,
        'quotaMax'        => $dailyLimit,
        'cooldownSeconds' => $cooldownSeconds,
        'attempts'        => $attempts,
        'detailedLog'     => $detailedQueryLog
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
@flush();
