<?php
/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Google Gemini Model Discovery & Diagnostic
 * ============================================================
 * 
 * Usage:
 *   php tools/gemini_models.php discover
 *   php tools/gemini_models.php test
 *   php tools/gemini_models.php all
 * 
 * Options:
 *   --discover      Query Google Gemini API for all available models for your API key
 *   --test          Test models configured in data/config.php for functionality
 *   --key=KEY       Use specific API key instead of data/config.php
 *   --model=MODEL   Test a specific model ID (e.g. --model=gemini-3.8-flash)
 * ============================================================
 */

@set_time_limit(180);

$baseDir = dirname(__DIR__);
$configFile = file_exists($baseDir . '/data/config.php')
    ? $baseDir . '/data/config.php'
    : $baseDir . '/data/config.example.php';

$config = file_exists($configFile) ? require $configFile : [];

// Parse CLI Arguments
$args = array_slice($argv, 1);
$mode = 'help';
$customKey = null;
$customModel = null;

foreach ($args as $arg) {
    if ($arg === 'discover' || $arg === '--discover' || $arg === '-d') {
        $mode = ($mode === 'test' || $mode === 'all') ? 'all' : 'discover';
    } elseif ($arg === 'test' || $arg === '--test' || $arg === '-t') {
        $mode = ($mode === 'discover' || $mode === 'all') ? 'all' : 'test';
    } elseif ($arg === 'all' || $arg === '--all' || $arg === '-a') {
        $mode = 'all';
    } elseif (strpos($arg, '--key=') === 0) {
        $customKey = trim(substr($arg, 6));
    } elseif (strpos($arg, '--model=') === 0) {
        $customModel = trim(substr($arg, 8));
    } elseif ($arg === 'help' || $arg === '--help' || $arg === '-h') {
        $mode = 'help';
    }
}

if ($mode === 'help') {
    echo "\n";
    echo "============================================================\n";
    echo "  CYBERDECK PORTFOLIO - GEMINI MODEL TOOL\n";
    echo "============================================================\n";
    echo "Befehle:\n";
    echo "  php tools/gemini_models.php discover\n";
    echo "      Fragt Google Gemini nach allen verfuegbaren Modellen ab,\n";
    echo "      die mit deinem API-Key fuer generateContent zulaessig sind.\n\n";
    echo "  php tools/gemini_models.php test\n";
    echo "      Testet die in data/config.php definierten gemini_models\n";
    echo "      auf Funktionsfaehigkeit, Deprecation (404) und Quota.\n\n";
    echo "  php tools/gemini_models.php all\n";
    echo "      Fuehrt Discovery und anschliessenden Test aller Modelle aus.\n\n";
    echo "Optionen:\n";
    echo "  --key=DEIN_KEY      Testet einen expliziten API-Key\n";
    echo "  --model=MODEL_NAME  Testet ein bestimmtes Modell\n\n";
    exit(0);
}

// Extract Keys
$apiKeys = [];
if ($customKey) {
    $apiKeys[] = $customKey;
} else {
    $rawKeys = $config['gemini_api_keys'] ?? [];
    foreach ((array)$rawKeys as $k) {
        if (is_string($k)) {
            $trimmed = trim($k);
            if (strlen($trimmed) >= 15 && stripos($trimmed, 'DEIN_') === false && stripos($trimmed, 'YOUR_') === false) {
                $apiKeys[] = $trimmed;
            }
        }
    }
}

if (empty($apiKeys)) {
    echo "\n[FEHLER] Kein gueltiger Google Gemini API-Key gefunden!\n";
    echo "Bitte trage deinen API-Key in 'data/config.php' ein oder uebergib ihn per '--key=AIza...'.\n\n";
    exit(1);
}

// Multi-Transport HTTP Request Helper (Cross-Platform CLI)
function cyber_cli_request(string $url, string $method = 'GET', ?string $postBody = null, int $timeout = 35): array {
    $headers = ['Content-Type: application/json; charset=utf-8'];

    // 1. Native PHP cURL
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postBody ?? '');
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        return ['code' => $code, 'body' => $body ?: '', 'error' => $err, 'transport' => 'php-curl'];
    }

    // 2. Stream Context
    if (in_array('https', stream_get_wrappers())) {
        $httpOpts = [
            'method'        => $method,
            'timeout'       => $timeout,
            'ignore_errors' => true
        ];
        if ($method === 'POST') {
            $httpOpts['header'] = implode("\r\n", $headers);
            $httpOpts['content'] = $postBody ?? '';
        }
        $ctx = stream_context_create(['http' => $httpOpts]);
        $body = @file_get_contents($url, false, $ctx);
        $code = 200;
        if (isset($http_response_header) && is_array($http_response_header)) {
            if (preg_match('#HTTP/[0-9\.]+\s+([0-9]+)#i', $http_response_header[0] ?? '', $m)) {
                $code = (int)$m[1];
            }
        }
        return ['code' => $code, 'body' => $body ?: '', 'error' => '', 'transport' => 'stream-context'];
    }

    // 3. CLI curl fallback
    if (function_exists('proc_open')) {
        $descriptors = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
        $cmd = 'curl -s -S -i --max-time ' . (int)$timeout;
        if ($method === 'POST') {
            $cmd .= ' -X POST -H "Content-Type: application/json; charset=utf-8" --data-binary @-';
        }
        $cmd .= ' ' . escapeshellarg($url);

        $process = @proc_open($cmd, $descriptors, $pipes);
        if (is_resource($process)) {
            if ($method === 'POST' && $postBody !== null) {
                fwrite($pipes[0], $postBody);
            }
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
            return ['code' => $httpCode, 'body' => $body, 'error' => $stderr, 'transport' => 'cli-curl'];
        }
    }

    return ['code' => 0, 'body' => '', 'error' => 'Kein verfuegbarer HTTP-Transport (php-curl, openssl oder cli-curl)', 'transport' => 'none'];
}

function maskKey(string $key): string {
    if (strlen($key) <= 12) return '***';
    return substr($key, 0, 7) . '...' . substr($key, -4);
}

// ============================================================
// DISCOVER MODE
// ============================================================
if ($mode === 'discover' || $mode === 'all') {
    echo "\n" . str_repeat('=', 78) . "\n";
    echo "  [1/2] GOOGLE GEMINI MODEL DISCOVERY (LISTMODELS API)\n";
    echo str_repeat('=', 78) . "\n";
    
    $primaryKey = $apiKeys[0];
    echo "Abfrage laeuft mit Key: " . maskKey($primaryKey) . " ...\n";

    $url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=' . urlencode($primaryKey);
    $start = microtime(true);
    $res = cyber_cli_request($url, 'GET', null, 30);
    $latency = round((microtime(true) - $start) * 1000);

    if ($res['code'] !== 200 || empty($res['body'])) {
        echo "[FEHLER] API lieferte HTTP {$res['code']} ({$latency}ms):\n";
        echo $res['body'] . "\n" . ($res['error'] ? "Details: " . $res['error'] . "\n" : "");
        if ($mode !== 'all') exit(1);
    } else {
        $json = json_decode($res['body'], true);
        $allModels = $json['models'] ?? [];
        $genModels = [];

        foreach ($allModels as $m) {
            $methods = $m['supportedGenerationMethods'] ?? [];
            if (in_array('generateContent', $methods)) {
                $m['cleanId'] = str_replace('models/', '', $m['name']);
                $genModels[] = $m;
            }
        }

        echo "Gefunden: " . count($allModels) . " Gesamtmodelle | " . count($genModels) . " unterstuetzen Chat/Text (generateContent).\n\n";
        printf("%-32s | %-24s | %-12s\n", "MODELL ID", "BEZEICHNUNG", "TOKENS IN/OUT");
        echo str_repeat('-', 78) . "\n";

        // Filter and highlight common / recommended chat models
        $recommended = [
            'gemini-3.8-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.5-flash',
            'gemini-3.1-pro-preview',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest',
            'gemini-flash-lite-latest',
            'gemini-2.5-flash'
        ];

        foreach ($genModels as $gm) {
            $id = $gm['cleanId'];
            $name = substr($gm['displayName'] ?? '', 0, 24);
            $inK = isset($gm['inputTokenLimit']) ? round($gm['inputTokenLimit'] / 1000) . 'k' : '?';
            $outK = isset($gm['outputTokenLimit']) ? round($gm['outputTokenLimit'] / 1000) . 'k' : '?';
            $tokens = "$inK / $outK";

            $isRec = in_array($id, $recommended);
            $prefix = $isRec ? "⭐ " : "   ";
            printf("%-32s | %-24s | %-12s\n", $prefix . $id, $name, $tokens);
        }

        echo str_repeat('-', 78) . "\n";
        echo "Hinweis: ⭐ = Empfohlene Modelle fuer Portfolio-Chat / Fallback-Kaskade.\n\n";
    }
}

// ============================================================
// TEST MODE
// ============================================================
if ($mode === 'test' || $mode === 'all') {
    $headline = ($mode === 'all') ? "  [2/2] MODELL-FUNKTIONSTEST (GENERATECONTENT PING)" : "  GOOGLE GEMINI MODELL-FUNKTIONSTEST";
    echo "\n" . str_repeat('=', 78) . "\n";
    echo $headline . "\n";
    echo str_repeat('=', 78) . "\n";

    $modelsToTest = [];
    if ($customModel) {
        $modelsToTest[] = $customModel;
    } else {
        $modelsToTest = $config['gemini_models'] ?? ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
    }

    echo "Konfigurierte Modelle in data/config.php: " . implode(', ', $modelsToTest) . "\n";
    echo "Verfuegbare API-Keys: " . count($apiKeys) . " Key(s)\n\n";

    $results = [];

    foreach ($modelsToTest as $model) {
        echo "Teste Modell '{$model}' ...\n";

        foreach ($apiKeys as $kIdx => $key) {
            $keyLabel = "KEY #" . ($kIdx + 1) . " (" . maskKey($key) . ")";
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . urlencode($key);
            
            $payload = json_encode([
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => 'PING: Respond with 1 word: OK']]]
                ],
                'generationConfig' => [
                    'maxOutputTokens' => 10,
                    'temperature'     => 0.1
                ]
            ]);

            $start = microtime(true);
            $res = cyber_cli_request($url, 'POST', $payload, 35);
            $latency = round((microtime(true) - $start) * 1000);

            $httpCode = $res['code'];
            $body = $res['body'];
            $errParsed = json_decode($body, true);

            $statusText = '';
            $verdict = '';

            if ($httpCode === 200) {
                $text = $errParsed['candidates'][0]['content']['parts'][0]['text'] ?? 'OK';
                $verdict = '[✓ OPERATIONAL]';
                $statusText = "HTTP 200 OK ({$latency}ms) -> Antwort: \"" . trim($text) . "\"";
            } elseif ($httpCode === 404) {
                $msg = $errParsed['error']['message'] ?? 'Model Not Found';
                $verdict = '[✕ RETIRED / 404]';
                $statusText = "HTTP 404: {$msg}";
            } elseif ($httpCode === 429) {
                $msg = $errParsed['error']['message'] ?? 'Quota Exceeded / Rate Limit';
                $verdict = '[⚠ QUOTA / RATE LIMIT]';
                $statusText = "HTTP 429 ({$latency}ms): {$msg}";
            } elseif ($httpCode === 503) {
                $msg = $errParsed['error']['message'] ?? 'High Demand / Overloaded';
                $verdict = '[⏱ BUSY / HIGH DEMAND]';
                $statusText = "HTTP 503 ({$latency}ms): {$msg}";
            } elseif ($httpCode === 0) {
                $verdict = '[⏳ TIMEOUT]';
                $statusText = "HTTP 0: Timeout nach 35s. Gemini API antwortet nicht.";
            } else {
                $msg = $errParsed['error']['message'] ?? substr($body, 0, 100);
                $verdict = "[! HTTP {$httpCode}]";
                $statusText = "Fehler ({$latency}ms): {$msg}";
            }

            echo "  └─ {$keyLabel}: {$verdict}\n";
            echo "     {$statusText}\n\n";

            $results[] = [
                'model'   => $model,
                'key'     => $keyLabel,
                'code'    => $httpCode,
                'verdict' => $verdict,
                'latency' => $latency
            ];
        }
    }

    echo str_repeat('-', 78) . "\n";
    echo "ZUSAMMENFASSUNG DER MODELL-KASKADE:\n";
    echo str_repeat('-', 78) . "\n";
    foreach ($results as $r) {
        printf("%-26s | %-18s | %-20s | %dms\n", $r['model'], $r['key'], $r['verdict'], $r['latency']);
    }
    echo "\nEmpfehlung:\n";
    echo "Modelle mit '[✕ RETIRED / 404]' muessen in 'data/config.php' durch aktive Modelle\n";
    echo "wie 'gemini-3.8-flash', 'gemini-3.5-flash-lite' oder 'gemini-3.1-pro-preview' ersetzt werden.\n\n";
}
