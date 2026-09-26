<?php
// Session tracking — one row per login token so members can see and reason
// about their active sessions (Security tab "Sessions" list).
//
// A session is identified by the SHA-256 hash of the bearer JWT issued at
// login. The token itself is never stored; a DB leak must not yield usable
// credentials. last_seen is refreshed on every authenticated request via
// requireAuthUser() (once per request), so the list reflects real activity.

declare(strict_types=1);

function sessionTokenHash(): ?string
{
    $t = hbearer();
    return $t === null ? null : sha256Hex($t);
}

// Called at login with the freshly-signed JWT.
function recordSession(string $userId, string $token): void
{
    try {
        $stmt = db()->prepare(
            'INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, created_at, last_seen)
             VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE last_seen = UTC_TIMESTAMP()'
        );
        $stmt->execute([
            uuid(),
            $userId,
            sha256Hex($token),
            substr(cip(), 0, 64),
            substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512),
        ]);
        // Quietly prune dead sessions for this user — a 30-day idle session is
        // long gone (JWT TTL is 7 days), so keeping it would only confuse the list.
        db()->prepare('DELETE FROM sessions WHERE user_id = ? AND last_seen < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)')
            ->execute([$userId]);
    } catch (Throwable $e) {
        // Session tracking is observability, never a login gate — a failure
        // here must not brick sign-in.
        error_log('[api] session record failed: ' . $e->getMessage());
    }
}

// Called from requireAuthUser() — guarded to run at most once per request.
function touchSession(): void
{
    static $touched = false;
    if ($touched) return;
    $touched = true;

    $hash = sessionTokenHash();
    if ($hash === null) return;
    try {
        db()->prepare('UPDATE sessions SET last_seen = UTC_TIMESTAMP() WHERE token_hash = ?')
            ->execute([$hash]);
    } catch (Throwable $e) {
        error_log('[api] session touch failed: ' . $e->getMessage());
    }
}

// Called at logout so the session list stops showing a signed-out device.
function dropSession(): void
{
    $hash = sessionTokenHash();
    if ($hash === null) return;
    try {
        db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([$hash]);
    } catch (Throwable $e) {
        error_log('[api] session drop failed: ' . $e->getMessage());
    }
}
