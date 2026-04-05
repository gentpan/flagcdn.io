<?php
/**
 * 下载次数统计：全站总次数（不区分 IP）
 * GET   → 返回当前总数 {"count": N}
 * POST  → 次数 +1，写入文件，返回新总数 {"count": N}
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$dir = dirname(__DIR__) . '/data';
$file = $dir . '/download-count.txt';

if (!is_dir($dir)) {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to initialize download storage']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$fp = fopen($file, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to open download storage']);
    exit;
}

if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    http_response_code(500);
    echo json_encode(['error' => 'Failed to lock download storage']);
    exit;
}

$raw = stream_get_contents($fp);
$count = (int) trim($raw !== false ? $raw : '0');
if ($count < 0) {
    $count = 0;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $count += 1;
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, (string) $count);
    fflush($fp);
}

flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['count' => $count]);
