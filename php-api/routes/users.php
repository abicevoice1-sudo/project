<?php
// Account management routes.
// DELETE /users/me — full data wipe (transactional, irreversible).
// PUT    /users/me — change display name and/or email.

declare(strict_types=1);

function routeUsers(string $method, array $segments): void
{
    $id = $segments[0] ?? null;
    if ($id !== 'me') {
        json(['error' => 'Users endpoint not found'], 404);
    }
    if ($method === 'DELETE') { userDeleteMe(); return; }
    if ($method === 'PUT')     { userUpdateMe(); return; }
    if ($method === 'GET' && ($segments[1] ?? null) === 'export') { userExportMe(); return; }

    json(['error' => 'Users endpoint not found'], 404);
}

function userExportMe(): void
{
    $user = requireAuthUser();
    $uid = (string)$user['uid'];
    $pdo = db();

    $export = ['exportedAt' => gmdate('c'), 'userId' => $uid];

    $stmt = $pdo->prepare('SELECT id, email, display_name, is_admin, email_verified, created_at FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$uid]);
    $export['account'] = $stmt->fetch() ?: null;

    $stmt = $pdo->prepare('SELECT * FROM profiles WHERE user_id = ? LIMIT 1');
    $stmt->execute([$uid]);
    $export['profile'] = $stmt->fetch() ?: null;

    $stmt = $pdo->prepare('SELECT id, community_id, title, body, created_at FROM posts WHERE author_id = ? ORDER BY created_at DESC LIMIT 500');
    try { $stmt->execute([$uid]); $export['communityPosts'] = $stmt->fetchAll(); }
    catch (Throwable $e) { $export['communityPosts'] = []; }

    $stmt = $pdo->prepare('SELECT id, post_id, body, created_at FROM replies WHERE author_id = ? ORDER BY created_at DESC LIMIT 500');
    try { $stmt->execute([$uid]); $export['communityReplies'] = $stmt->fetchAll(); }
    catch (Throwable $e) { $export['communityReplies'] = []; }

    $stmt = $pdo->prepare('SELECT to_user_id AS target, created_at FROM interests WHERE from_user_id = ? ORDER BY created_at DESC LIMIT 500');
    try { $stmt->execute([$uid]); $export['interestsSent'] = $stmt->fetchAll(); }
    catch (Throwable $e) { $export['interestsSent'] = []; }

    $stmt = $pdo->prepare('SELECT token, created_at, revoked FROM wali_links WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
    try { $stmt->execute([$uid]); $export['waliLinks'] = $stmt->fetchAll(); }
    catch (Throwable $e) { $export['waliLinks'] = []; }

    // Messages are intentionally excluded from the portable export — they
    // involve another member's words. Conversation metadata is included.
    $stmt = $pdo->prepare('SELECT id, user_a, user_b, created_at FROM conversations WHERE user_a = ? OR user_b = ? ORDER BY created_at DESC LIMIT 200');
    try { $stmt->execute([$uid, $uid]); $export['conversations'] = $stmt->fetchAll(); }
    catch (Throwable $e) { $export['conversations'] = []; }

    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="shiarishta-data-export.json"');
    echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function userDeleteMe(): void
{
    $user = requireAuthUser();
    $uid = (string)$user['uid'];
    $pdo = db();

    try {
        $pdo->beginTransaction();
        // Delete in dependency order. Explicit deletes stay correct even
        // where foreign keys are not declared with cascades.
        $pdo->prepare('DELETE FROM messages WHERE sender_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM conversations WHERE user_a = ? OR user_b = ?')->execute([$uid, $uid]);
        $pdo->prepare('DELETE FROM interests WHERE from_user_id = ? OR to_user_id = ?')->execute([$uid, $uid]);
        $pdo->prepare('DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?')->execute([$uid, $uid]);
        $pdo->prepare('DELETE FROM reports WHERE reporter_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM wali_links WHERE user_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM verifications WHERE user_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM email_verifications WHERE user_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM profiles WHERE user_id = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$uid]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }

    json(['ok' => true]);
}

function userMeShape(array $row): array
{
    return [
        'uid' => (string)$row['id'],
        'email' => (string)$row['email'],
        'displayName' => (string)$row['display_name'],
        'emailVerified' => (bool)$row['email_verified'],
    ];
}

function userUpdateMe(): void
{
    $user = requireAuthUser();
    $uid = (string)$user['uid'];
    $b = requestJson();
    $pdo = db();

    $stmt = $pdo->prepare('SELECT id, email, display_name, email_verified FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    if (!$row) {
        je('Account not found.', 404);
    }

    $updates = [];
    $params = [];
    $displayName = array_key_exists('displayName', $b) ? trim((string)$b['displayName']) : null;
    $email = array_key_exists('email', $b) ? strtolower(trim((string)$b['email'])) : null;

    if ($displayName !== null) {
        $len = mb_strlen($displayName);
        if ($len < 2 || $len > 60) {
            je('Display name must be 2–60 characters.', 400);
        }
        $updates[] = 'display_name = ?';
        $params[] = $displayName;
    }

    if ($email !== null) {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            je('Enter a valid email address.', 400);
        }
        // Constant-shape check: the query only asks "is this taken by someone
        // else", never whether any account exists for it.
        $dup = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
        $dup->execute([$email, $uid]);
        if ($dup->fetch()) {
            je('An account with this email already exists.', 409);
        }
        if ($email !== strtolower((string)$row['email'])) {
            $updates[] = 'email = ?';
            $params[] = $email;
            // A new email must be re-verified before messaging unlocks again.
            $updates[] = 'email_verified = 0';
        }
    }

    $emailChanged = $email !== null && $email !== strtolower((string)$row['email']);

    if (empty($updates)) {
        json(userMeShape($row));
    }

    $params[] = $uid;
    $pdo->prepare('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?')
        ->execute($params);

    // Keep the public profile name in sync — the profile row is what other
    // members see, and the two must never disagree.
    if ($displayName !== null) {
        $pdo->prepare('UPDATE profiles SET display_name = ? WHERE user_id = ?')
            ->execute([$displayName, $uid]);
    }

    $verifyUrl = null;
    if ($emailChanged) {
        $verifyToken = issueVerificationToken($uid);
        $verifyUrl = 'https://shiarishta.com/verify/' . $verifyToken;
        if (mailEnabled()) {
            mailSend([
                'to' => $email,
                'subject' => 'Verify your new ShiaRishta email',
                'text' => "Assalamu Alaikum {$displayName},\n\nYou changed your account email. Confirm it to keep your account fully active:\n{$verifyUrl}\n\nThis link expires in 24 hours.",
            ]);
        }
    }

    $stmt->execute([$uid]);
    $out = userMeShape($stmt->fetch());

    // Explicit devMode stopgap: SMTP comes later; until then the UI can surface
    // the verification link directly.
    if ($verifyUrl !== null && !mailEnabled()) {
        $out['devMode'] = true;
        $out['verifyUrl'] = $verifyUrl;
    }

    json($out);
}
