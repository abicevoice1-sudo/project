<?php
// Auth routes — exact parity with server/routes/auth.js:
// register | login | verify-email | forgot | reset | resend-verification.
// Tokens are stored HASHED — a DB leak must not yield usable verify/reset links.

declare(strict_types=1);

function routeAuth(string $method, array $segments): void
{
    $action = $segments[0] ?? '';

    if ($method === 'POST' && $action === 'register') { authRegister(); return; }
    if ($method === 'POST' && $action === 'login')    { authLogin();    return; }
    if ($method === 'GET'  && $action === 'verify-email') { authVerifyEmail(); return; }
    if ($method === 'POST' && $action === 'forgot')   { authForgot();   return; }
    if ($method === 'POST' && $action === 'reset')    { authReset();    return; }
    if ($method === 'POST' && $action === 'resend-verification') { authResendVerification(); return; }

    json(['error' => 'Auth endpoint not found'], 404);
}

function authRegister(): void
{
    $payload = requestJson();
    $email = strtolower(trim((string)($payload['email'] ?? '')));
    $password = (string)($payload['password'] ?? '');
    $displayName = trim((string)($payload['displayName'] ?? '')) ?: explode('@', $email)[0];

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        je('Enter a valid email address.', 400);
    }
    if (strlen($password) < 8) {
        je('Password must be at least 8 characters.', 400);
    }
    if (mb_strlen($displayName) > 60) {
        je('Display name is too long.', 400);
    }
    // Sect is required at registration — ShiaRishta is a Shia matrimonial platform.
    $sect = trim((string)($payload['sect'] ?? ''));
    $validSects = ['Ithna Ashari (Twelver)', 'Ismaili', 'Bohra (Dawoodi)', 'Zaydi', 'Alevi', 'Other / Prefer not to say'];
    if (!in_array($sect, $validSects, true)) {
        je('Please select your sect.', 400);
    }

    // ADMIN_EMAILS drives is_admin on register — the first-admin bootstrap.
    $adminEmails = adminEmails();
    $isAdmin = in_array($email, $adminEmails, true);
    $userId = uuid();
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $pdo = db();
    try {
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $email, $hash, $displayName, $isAdmin ? 1 : 0]);
        $profileStmt = $pdo->prepare('INSERT INTO profiles (user_id, display_name, sect) VALUES (?, ?, ?)');
        $profileStmt->execute([$userId, $displayName, $sect]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if (($e instanceof PDOException) && (($e->errorInfo[1] ?? 0) === 1062 || stripos($e->getMessage(), 'Duplicate') !== false)) {
            je('An account with this email already exists.', 409);
        }
        throw $e;
    }

    // Email verification: token stored hashed, link valid 24 hours.
    $verifyToken = bin2hex(random_bytes(32));
    $pdo->prepare("UPDATE users SET email_verify_token = ?, email_verify_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR) WHERE id = ?")
        ->execute([sha256Hex($verifyToken), $userId]);

    mailSend([
        'to' => $email,
        'subject' => 'Verify your ShiaRishta email',
        'text' => "Assalamu Alaikum {$displayName},\n\nConfirm your email to finish creating your account:\n" . publicBase() . "/verify-email?token={$verifyToken}\n\nThis link expires in 24 hours.",
    ]);

    $userRow = ['id' => $userId, 'email' => $email, 'display_name' => $displayName, 'is_admin' => $isAdmin, 'email_verified' => false];
    json([
        'user' => makeMemberSession($userRow),
        'token' => signSession($userRow),
    ], 201);
}

function authLogin(): void
{
    $payload = requestJson();
    $email = strtolower(trim((string)($payload['email'] ?? '')));
    $password = (string)($payload['password'] ?? '');

    $row = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $row->execute([$email]);
    $user = $row->fetch();

    // Constant-shape errors: no account enumeration.
    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        je('Invalid email or password.', 401);
    }

    json([
        'user' => makeMemberSession($user),
        'token' => signSession($user),
    ]);
}

function authVerifyEmail(): void
{
    $token = (string)($_GET['token'] ?? '');
    if ($token === '') {
        je('Missing verification token.', 400);
    }

    $stmt = db()->prepare('SELECT id FROM users WHERE email_verify_token = ? AND email_verify_expires > UTC_TIMESTAMP() LIMIT 1');
    $stmt->execute([sha256Hex($token)]);
    $user = $stmt->fetch();

    if (!$user) {
        je('This link has expired or was already used. Sign in to get a new one.', 400);
    }

    $update = db()->prepare('UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?');
    $update->execute([$user['id']]);

    json(['ok' => true, 'emailVerified' => true]);
}
function authForgot(): void
{
    $payload = requestJson();
    $email = strtolower(trim((string)($payload['email'] ?? '')));

    // Constant response whether or not the account exists — no enumeration.
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $stmt = db()->prepare('SELECT id, display_name FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            $token = bin2hex(random_bytes(32));
            db()->prepare("UPDATE users SET password_reset_token = ?, password_reset_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE id = ?")
                ->execute([sha256Hex($token), $user['id']]);

            mailSend([
                'to' => $email,
                'subject' => 'Reset your ShiaRishta password',
                'text' => "Assalamu Alaikum,\n\nReset your password with this link (valid 1 hour):\n" . publicBase() . "/auth/reset?token={$token}\n\nIf you did not request this, ignore this email — your account is safe.",
            ]);
        }
    }

    json(['ok' => true, 'message' => 'If that email is registered, a reset link is on its way.']);
}

function authReset(): void
{
    $payload = requestJson();
    $token = (string)($payload['token'] ?? '');
    $password = (string)($payload['password'] ?? '');

    if (strlen($password) < 8) {
        je('Password must be at least 8 characters.', 400);
    }

    // Hashed, single-use token.
    $stmt = db()->prepare('SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > UTC_TIMESTAMP() LIMIT 1');
    $stmt->execute([sha256Hex($token)]);
    $user = $stmt->fetch();

    if (!$user) {
        je('This reset link has expired or was already used.', 400);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);
    db()->prepare('UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
        ->execute([$hash, $user['id']]);

    json(['ok' => true, 'message' => 'Password updated. You can sign in with your new password.']);
}

function authResendVerification(): void
{
    // Reads the session from the bearer token itself: the only address this
    // endpoint can ever mail is the signed-in account's own.
    $user = requireAuthUser();
    $token = bin2hex(random_bytes(32));

    // MySQL has no UPDATE...RETURNING: probe first, then update.
    $probe = db()->prepare('SELECT id, email, display_name FROM users WHERE id = ? AND email_verified = 0 LIMIT 1');
    $probe->execute([$user['uid']]);
    $row = $probe->fetch();

    if (!$row) {
        json(['ok' => true, 'alreadyVerified' => true]);
        return;
    }

    db()->prepare("UPDATE users SET email_verify_token = ?, email_verify_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR) WHERE id = ?")
        ->execute([sha256Hex($token), $user['uid']]);

    mailSend([
        'to' => $row['email'],
        'subject' => 'Verify your ShiaRishta email',
        'text' => "Assalamu Alaikum {$row['display_name']},\n\nConfirm your email to finish creating your account:\n" . publicBase() . "/verify-email?token={$token}\n\nThis link expires in 24 hours.",
    ]);

    json(['ok' => true, 'message' => 'Verification email sent — check your inbox.']);
}

