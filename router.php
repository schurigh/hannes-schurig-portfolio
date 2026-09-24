<?php
// Router for PHP built-in server:
// Serve static files directly, route everything else to index.php
$path = __DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (is_file($path)) {
    // Let PHP serve the file with correct MIME type
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
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
    ];
    if (isset($mimes[$ext])) {
        header('Content-Type: ' . $mimes[$ext]);
    }
    return false; // serve the file as-is
}

// Fall through to index.php for PHP routes
require __DIR__ . '/index.php';
