<?php
// Router for PHP built-in server:
// Serve static files directly, route everything else to index.php
$uriPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = __DIR__ . $uriPath;

// Security check: Block direct access to sensitive internal files, dotfiles & config
$basename = basename($path);
if (
    str_starts_with($basename, '.') || 
    stripos($uriPath, '/intern') === 0 ||
    in_array($basename, ['config.php', 'config.example.php', 'system_prompt.php', 'system_prompt.example.php'])
) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo '403 Forbidden: Direct access to internal configuration or dotfiles is blocked.';
    exit;
}

if (is_file($path)) {
    // If it's a php file, let PHP execute it
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if ($ext === 'php') {
        return false;
    }
    $mimes = [
        'js'   => 'application/javascript',
        'css'  => 'text/css',
        'json' => 'application/json',
        'svg'  => 'image/svg+xml',
        'webp' => 'image/webp',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'woff2'=> 'font/woff2',
        'woff' => 'font/woff',
        'ttf'  => 'font/ttf',
        'ico'  => 'image/x-icon',
        'html' => 'text/html',
        'txt'  => 'text/plain',
        'pdf'  => 'application/pdf',
        'webmanifest' => 'application/manifest+json',
        'xml'  => 'application/xml',
    ];
    $mtime = filemtime($path);
    $size = filesize($path);
    $etag = sprintf('"%x-%x"', $mtime, $size);
    $lastModified = gmdate('D, d M Y H:i:s', $mtime) . ' GMT';

    // HTTP Conditional Validation:
    // If the browser already has the current version, return 304 Not Modified (0 bytes transferred!)
    $ifNoneMatch = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim($_SERVER['HTTP_IF_NONE_MATCH']) : null;
    $ifModifiedSince = isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) ? trim($_SERVER['HTTP_IF_MODIFIED_SINCE']) : null;

    if ($ifNoneMatch === $etag || ($ifModifiedSince && strtotime($ifModifiedSince) >= $mtime)) {
        http_response_code(304);
        header('ETag: ' . $etag);
        header('Last-Modified: ' . $lastModified);
        header('Cache-Control: no-cache');
        exit;
    }

    $contentType = $mimes[$ext] ?? mime_content_type($path) ?: 'application/octet-stream';
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . $size);
    header('ETag: ' . $etag);
    header('Last-Modified: ' . $lastModified);
    header('Cache-Control: no-cache');
    readfile($path);
    exit;
}

// Fall through to index.php for PHP routes
require __DIR__ . '/index.php';
