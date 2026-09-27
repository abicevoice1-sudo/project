<?php
// Admin routes — parity with server/routes/admin.js. Everything here requires
// an authenticated admin session (router.use(authRequired, adminRequired)).
// MySQL has no UPDATE...RETURNING: guarded writes probe first, then act.
declare(strict_types=1);

function routeAdmin(string $method, array $segments): void
{
    $user = requireAuthUser();
    if (empty($user['isAdmin'])) {
        je('Admin access required', 403);
    }

    $action = $segments[0] ?? null;

    // The file branch must come before the plain list branch: /verifications
    // alone and /verifications/:id/file both start with action=verifications.
    if ($method === 'GET' && $action === 'verifications' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'file') {
        adminVerificationFile((string)$segments[1]);
        return;
    }
    if ($method === 'GET' && $action === 'verifications') { adminVerificationsList(); return; }
    if ($method === 'POST' && $action === 'verifications' && ($segments[1] ?? null) !== null) {
        $verb = strtolower((string)($segments[2] ?? ''));
        if ($verb === 'approve') { adminApproveVerification((string)$segments[1]); return; }
        if ($verb === 'reject')  { adminRejectVerification((string)$segments[1]); return; }
    }
    if ($method === 'GET' && $action === 'overview') { adminOverview(); return; }
    if ($method === 'GET' && $action === 'analytics') { adminAnalytics(); return; }
    if ($method === 'GET' && $action === 'reports') { adminReports(); return; }
    if ($method === 'POST' && $action === 'reports' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'action') {
        adminReportAction((string)$segments[1]);
        return;
    }
    if ($method === 'POST' && $action === 'reports' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'dismiss') {
        adminReportDismiss((string)$segments[1]);
        return;
    }
    if ($method === 'GET' && $action === 'users') { adminUsers(); return; }
    if ($method === 'POST' && $action === 'users' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'role') {
        adminSetRole((string)$segments[1]);
        return;
    }
    // POST /api/admin/users/:id/unblock — reverse a moderation block set by
    // report "action" (profiles.is_blocked = 1). Idempotent.
    if ($method === 'POST' && $action === 'users' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'unblock') {
        adminUnblockUser((string)$segments[1]);
        return;
    }

    json(['error' => 'Admin endpoint not found'], 404);
}

function adminVerificationsList(): void
{
    $status = $_GET['status'] ?? 'pending';
    if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
        $status = 'pending';
    }

    $stmt = db()->prepare(
        'SELECT v.id, v.kind, v.status, v.created_at, v.reviewed_at, v.review_note,
                u.email AS member_email, p.display_name AS member_name
           FROM verifications v
           JOIN users u ON u.id = v.user_id
           LEFT JOIN profiles p ON p.user_id = v.user_id
          WHERE v.status = ?
          ORDER BY v.created_at ASC LIMIT 200'
    );
    $stmt->execute([$status]);
    json($stmt->fetchAll());
}

function adminApproveVerification(string $verificationId): void
{
    $admin = requireAuthUser();
    $payload = requestJson();
    $note = sanitizeText((string)($payload['note'] ?? ''), 500) ?: null;

    // Guard first (only pending rows are reviewable), then update, then flip badge.
    $probe = db()->prepare("SELECT user_id FROM verifications WHERE id = ? AND status = 'pending' LIMIT 1");
    $probe->execute([$verificationId]);
    $row = $probe->fetch();
    if (!$row) {
        je('Submission not found or already reviewed.', 404);
    }

    db()->prepare("UPDATE verifications SET status = 'approved', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), review_note = ? WHERE id = ?")
        ->execute([$admin['uid'], $note, $verificationId]);
    db()->prepare('UPDATE profiles SET is_verified = 1, updated_at = UTC_TIMESTAMP() WHERE user_id = ?')
        ->execute([$row['user_id']]);

    json(['ok' => true, 'verified' => true]);
}

function adminRejectVerification(string $verificationId): void
{
    $admin = requireAuthUser();
    $payload = requestJson();
    $note = sanitizeText((string)($payload['note'] ?? ''), 500)
        ?: 'Photo was not clear enough — please resubmit.';

    $probe = db()->prepare("SELECT id FROM verifications WHERE id = ? AND status = 'pending' LIMIT 1");
    $probe->execute([$verificationId]);
    if (!$probe->fetch()) {
        je('Submission not found or already reviewed.', 404);
    }

    db()->prepare("UPDATE verifications SET status = 'rejected', reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), review_note = ? WHERE id = ?")
        ->execute([$admin['uid'], $note, $verificationId]);

    json(['ok' => true]);
}

function adminVerificationFile(string $verificationId): void
{
    $stmt = db()->prepare('SELECT storage_path FROM verifications WHERE id = ? LIMIT 1');
    $stmt->execute([$verificationId]);
    $row = $stmt->fetch();
    if (!$row) {
        je('Not found.', 404);
    }

    // Defense in depth: never serve anything outside UPLOAD_DIR even if a path
    // in the DB were tampered with (parity with routes/admin.js).
    $path = (string)$row['storage_path'];
    $base = trim((string)(getenv('UPLOAD_DIR') ?: (__DIR__ . '/../uploads')));
    $realBase = realpath($base) ?: $base;
    $realFile = realpath($path) ?: $path;

    if ($realBase === '' || $realFile === '' || strncmp($realFile, $realBase, strlen($realBase)) !== 0) {
        je('Forbidden.', 403);
    }
    if (!is_file($realFile)) {
        je('File missing on disk.', 404);
    }

    // Decrypt in memory, then stream. The plaintext never touches disk and is
    // never cached: no-store on every response, and admins are the only readers.
    $plain = decBytesAtRest((string)@file_get_contents($realFile));
    if ($plain === '') {
        je('Could not decrypt this file.', 500);
    }

    header('Content-Type: image/jpeg');
    header('Content-Length: ' . strlen($plain));
    header('Cache-Control: no-store, no-cache, must-revalidate, private');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    echo $plain;
    exit;
}
function adminOverview(): void
{
    // COUNT(*) comes back as a string from MySQL — cast for numeric parity.
    json([
        'totalMembers' => (int)db()->query('SELECT COUNT(*) AS n FROM users')->fetch()['n'],
        'activeProfiles' => (int)db()->query('SELECT COUNT(*) AS n FROM profiles WHERE is_blocked = 0')->fetch()['n'],
        'messagesToday' => (int)db()->query('SELECT COUNT(*) AS n FROM messages WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)')->fetch()['n'],
        'livePosts' => (int)db()->query('SELECT COUNT(*) AS n FROM posts WHERE is_hidden = 0')->fetch()['n'],
        'repliesThisWeek' => (int)db()->query('SELECT COUNT(*) AS n FROM replies WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)')->fetch()['n'],
        'openReports' => (int)db()->query("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'")->fetch()['n'],
    ]);
}

// GET /api/admin/analytics?range=7d|30d — real series from created_at buckets.
// Node uses generate_series (Postgres); MySQL has none, so the day axis is
// built in PHP and counts come from one grouped query each.
function adminAnalytics(): void
{
    $range = ($_GET['range'] ?? '') === '30d' ? '30d' : '7d';
    $days = $range === '30d' ? 30 : 7;

    // generate_series(now() - days, now()) is inclusive → days + 1 buckets.
    $labels = [];
    $dayKeys = [];
    for ($i = $days; $i >= 0; $i--) {
        $ts = time() - ($i * 86400);
        $labels[] = date('M d', $ts);
        $dayKeys[] = date('Y-m-d', $ts);
    }

    $bucketCounts = function (string $table) use ($days): array {
        // $days is an int derived from a fixed enum above — safe to inline
        // (placeholder markers are not accepted inside INTERVAL by all
        // MariaDB versions with native prepares).
        $stmt = db()->prepare("SELECT DATE(created_at) AS d, COUNT(*) AS n FROM {$table}
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL {$days} DAY) GROUP BY DATE(created_at)");
        $stmt->execute();
        $map = [];
        foreach ($stmt->fetchAll() as $r) {
            $map[(string)$r['d']] = (int)$r['n'];
        }
        return $map;
    };

    $memberCounts = $bucketCounts('users');
    $messageCounts = $bucketCounts('messages');

    json([
        'range' => $range,
        'charts' => [
            [
                'key' => 'memberGrowth',
                'title' => 'Member Growth',
                'labels' => $labels,
                'values' => array_map(fn($d) => $memberCounts[$d] ?? 0, $dayKeys),
                'color' => 'var(--color-primary)',
            ],
            [
                'key' => 'messageVolume',
                'title' => 'Message Volume',
                'labels' => $labels,
                'values' => array_map(fn($d) => $messageCounts[$d] ?? 0, $dayKeys),
                'color' => 'var(--color-accent)',
            ],
        ],
    ]);
}

function adminReports(): void
{
    $status = in_array($_GET['status'] ?? '', ['open', 'actioned', 'dismissed'], true) ? $_GET['status'] : 'open';
    $stmt = db()->prepare('SELECT r.*, u.email AS reporter_email FROM reports r
        JOIN users u ON u.id = r.reporter_id WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 200');
    $stmt->execute([$status]);
    json($stmt->fetchAll());
}

// POST /api/admin/reports/:id/action — hide the target + mark actioned
function adminReportAction(string $reportId): void
{
    $stmt = db()->prepare('SELECT * FROM reports WHERE id = ? LIMIT 1');
    $stmt->execute([$reportId]);
    $report = $stmt->fetch();
    if (!$report) {
        je('Report not found.', 404);
    }

    $type = (string)$report['target_type'];
    $targetId = (string)$report['target_id'];
    if ($type === 'post') {
        db()->prepare('UPDATE posts SET is_hidden = 1 WHERE id = ?')->execute([$targetId]);
    } elseif ($type === 'reply') {
        db()->prepare('UPDATE replies SET is_hidden = 1 WHERE id = ?')->execute([$targetId]);
    } elseif ($type === 'profile' || $type === 'user') {
        try {
            db()->prepare('UPDATE profiles SET is_blocked = 1 WHERE user_id = ?')->execute([$targetId]);
        } catch (Throwable) { /* target may have no profile row */ }
    }
    db()->prepare("UPDATE reports SET status = 'actioned' WHERE id = ?")->execute([$reportId]);

    json(['ok' => true]);
}

// POST /api/admin/reports/:id/dismiss
function adminReportDismiss(string $reportId): void
{
    db()->prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?")->execute([$reportId]);
    json(['ok' => true]);
}

// GET /api/admin/users?role=member — find members (e.g. to approve applications)
function adminUsers(): void
{
    $role = $_GET['role'] ?? null;
    if ($role && in_array($role, ['member', 'matchmaker', 'guardian'], true)) {
        $stmt = db()->prepare('SELECT id, email, display_name, role, email_verified, created_at FROM users WHERE role = ? ORDER BY created_at DESC LIMIT 100');
        $stmt->execute([$role]);
        json($stmt->fetchAll());
        return;
    }

    json(db()->query('SELECT id, email, display_name, role, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 100')->fetchAll());
}

// POST /api/admin/users/:id/role { role } — approve a matchmaker/guardian (or
// revoke back to member). Revoking never deletes data; it only stops new drafts.
function adminSetRole(string $userId): void
{
    $payload = requestJson();
    $role = trim((string)($payload['role'] ?? ''));
    if (!in_array($role, ['member', 'matchmaker', 'guardian'], true)) {
        je('Role must be member, matchmaker or guardian.', 400);
    }

    // Guard: 404 for unknown members (Node RETURNING yields no row).
    $probe = db()->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $probe->execute([$userId]);
    $row = $probe->fetch();
    if (!$row) {
        je('Member not found.', 404);
    }

    db()->prepare('UPDATE users SET role = ? WHERE id = ?')->execute([$role, $userId]);

    json(['ok' => true, 'id' => $row['id'], 'email' => $row['email'], 'role' => $role]);
}

// POST /api/admin/users/:id/unblock — clear a moderation block so the member's
// profile is visible again. No-op when there is no profile row.
function adminUnblockUser(string $userId): void
{
    $probe = db()->prepare('SELECT id, email FROM users WHERE id = ? LIMIT 1');
    $probe->execute([$userId]);
    $row = $probe->fetch();
    if (!$row) {
        je('Member not found.', 404);
    }
    try {
        db()->prepare('UPDATE profiles SET is_blocked = 0 WHERE user_id = ?')->execute([$userId]);
    } catch (Throwable) { /* target may have no profile row */ }
    json(['ok' => true, 'id' => $row['id'], 'email' => $row['email']]);
}

