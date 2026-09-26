<?php
// ONE-TIME admin promotion script. Delete after use.
// Usage: /api/admin-promote.php?token=SECRET&email=user@example.com
// The token must match the PROMOTE_TOKEN env var.

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/db.php';

$token = (string)($_GET['token'] ?? '');
$expected = (string)(getenv('PROMOTE_TOKEN') ?: '');

if ($expected === '' || !hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$email = strtolower(trim((string)($_GET['email'] ?? '')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid email required']);
    exit;
}

$stmt = db()->prepare('UPDATE users SET is_admin = 1 WHERE email = ?');
$stmt->execute([$email]);

if ($stmt->rowCount() === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'No account found for that email']);
    exit;
}

echo json_encode(['ok' => true, 'email' => $email, 'is_admin' => 1]);
