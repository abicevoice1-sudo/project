<?php
// Community rooms — exact parity with server/routes/community.js.
declare(strict_types=1);

const SLUG_RE = '/^[a-z0-9]{2,32}$/';

function routeCommunity(string $method, array $segments): void
{
    $action = $segments[0] ?? null;

    if ($method === 'GET' && $action === null) { communityList(); return; }
    if ($method === 'POST' && $action === null) { communityCreate(); return; }
    if ($method === 'GET' && $action === 'post' && ($segments[1] ?? null) !== null) { postThread((string)$segments[1]); return; }
    if ($method === 'POST' && $action === 'post' && ($segments[1] ?? null) !== null && ($segments[2] ?? null) === 'replies') { postReply((string)$segments[1]); return; }
    if ($method === 'GET' && $action !== null && ($segments[1] ?? null) === 'posts') { communityPosts((string)$action); return; }
    if ($method === 'POST' && $action !== null && ($segments[1] ?? null) === 'posts') { communityCreatePost((string)$action); return; }
    // Moderation — admin-only hard delete. The button lives on CommunityPost;
    // wiring verified: admin auth, correct ID, list refresh after delete.
    if ($method === 'DELETE' && $action === 'post' && ($segments[1] ?? null) !== null) { communityDeletePost((string)$segments[1]); return; }
    if ($method === 'DELETE' && $action === 'reply' && ($segments[1] ?? null) !== null) { communityDeleteReply((string)$segments[1]); return; }

    json(['error' => 'Community endpoint not found'], 404);
}

function requireAdminUser(): array
{
    $user = requireAuthUser();
    if (empty($user['isAdmin'])) {
        je('Admin access required', 403);
    }
    return $user;
}

// DELETE /api/community/post/:id — admin moderation: remove the post and its
// replies in one transaction.
function communityDeletePost(string $postId): void
{
    requireAdminUser();
    $probe = db()->prepare('SELECT id FROM posts WHERE id = ? LIMIT 1');
    $probe->execute([$postId]);
    if (!$probe->fetch()) {
        je('Post not found.', 404);
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM replies WHERE post_id = ?')->execute([$postId]);
        $pdo->prepare('DELETE FROM posts WHERE id = ?')->execute([$postId]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
    json(['ok' => true, 'id' => $postId]);
}

// DELETE /api/community/reply/:id — admin moderation: remove one reply.
function communityDeleteReply(string $replyId): void
{
    requireAdminUser();
    $probe = db()->prepare('SELECT id FROM replies WHERE id = ? LIMIT 1');
    $probe->execute([$replyId]);
    if (!$probe->fetch()) {
        je('Reply not found.', 404);
    }
    db()->prepare('DELETE FROM replies WHERE id = ?')->execute([$replyId]);
    json(['ok' => true, 'id' => $replyId]);
}

function communityList(): void
{
    $stmt = db()->query(
        'SELECT c.id, c.name, c.icon,
                (SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id AND p.is_hidden = 0) AS posts
           FROM communities c ORDER BY c.id'
    );
    $rows = $stmt->fetchAll();
    // Node maps the live post count into `members` for the room card.
    json(array_map(fn($r) => [
        'id' => $r['id'], 'name' => $r['name'], 'icon' => $r['icon'], 'members' => (int)$r['posts'],
    ], $rows));
}

function communityCreate(): void
{
    $user = requireAuthUser();
    $payload = requestJson();
    $name = trim((string)($payload['name'] ?? ''));
    if ($name === '') {
        je('A community name is required.', 400);
    }
    $name = mb_substr($name, 0, 60);
    $slug = strtolower(preg_replace('/[^a-z0-9]/', '', $name)) ?? '';
    if (!preg_match(SLUG_RE, $slug)) {
        je('Use 2–32 lowercase letters/numbers for the name.', 400);
    }

    try {
        $stmt = db()->prepare('INSERT INTO communities (id, name, created_by) VALUES (?, ?, ?)');
        $stmt->execute([$slug, $name, $user['uid']]);
        json(['id' => $slug, 'name' => $name, 'icon' => '🌍'], 201);
    } catch (Throwable $e) {
        if (($e instanceof PDOException) && (($e->errorInfo[1] ?? 0) === 1062)) {
            je('That community already exists.', 409);
        }
        throw $e;
    }
}
function communityPosts(string $slug): void
{
    // 'all' = every room (Node: $1 = 'all' OR community_id = $1).
    $base = 'SELECT p.id, p.community_id AS sub, p.title, p.body, p.author_name AS author, p.likes, p.created_at,
        (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.is_hidden = 0) AS replies
        FROM posts p WHERE p.is_hidden = 0';
    if ($slug === 'all') {
        $stmt = db()->query($base . ' ORDER BY p.created_at DESC LIMIT 100');
    } else {
        $stmt = db()->prepare($base . ' AND p.community_id = ? ORDER BY p.created_at DESC LIMIT 100');
        $stmt->execute([$slug]);
    }
    $rows = $stmt->fetchAll();
    json(array_map(fn($r) => [
        'id' => (string)$r['id'], 'sub' => $r['sub'], 'title' => $r['title'], 'body' => $r['body'],
        'author' => $r['author'], 'likes' => (int)$r['likes'], 'time' => $r['created_at'],
        'replies' => (int)$r['replies'], 'tags' => [],
    ], $rows));
}

function communityCreatePost(string $slug): void
{
    $user = requireAuthUser();
    $payload = requestJson();
    $title = trim((string)($payload['title'] ?? ''));
    $body = mb_substr(trim((string)($payload['body'] ?? '')), 0, 10000);

    if ($title === '') je('A title is required.', 400);
    if (mb_strlen($title) > 300) je('Title must be under 300 characters.', 400);

    $room = db()->prepare('SELECT id FROM communities WHERE id = ? LIMIT 1');
    $room->execute([$slug]);
    if (!$room->fetch()) {
        je('Community not found.', 404);
    }

    $author = trim((string)($payload['author'] ?? '')) ?: (($user['displayName'] ?? '') ?: 'Member');
    $postId = uuid();
    $stmt = db()->prepare('INSERT INTO posts (id, community_id, author_id, author_name, title, body) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$postId, $slug, $user['uid'], mb_substr($author, 0, 60), $title, $body]);

    json(['id' => $postId], 201);
}

function postThread(string $id): void
{
    $stmt = db()->prepare('SELECT p.id, p.community_id AS sub, p.title, p.body, p.author_name AS author, p.likes, p.created_at,
        (SELECT COUNT(*) FROM replies r WHERE r.post_id = p.id AND r.is_hidden = 0) AS replies
        FROM posts p WHERE p.id = ? AND p.is_hidden = 0 LIMIT 1');
    $stmt->execute([$id]);
    $post = $stmt->fetch();
    if (!$post) {
        je('Post not found.', 404);
    }

    $replyStmt = db()->prepare('SELECT id, author_name AS author, body, created_at AS time FROM replies WHERE post_id = ? AND is_hidden = 0 ORDER BY created_at ASC LIMIT 200');
    $replyStmt->execute([$id]);
    $replies = $replyStmt->fetchAll();

    json([
        'id' => (string)$post['id'],
        'sub' => $post['sub'],
        'title' => $post['title'],
        'body' => $post['body'],
        'author' => $post['author'],
        'likes' => (int)$post['likes'],
        'time' => $post['created_at'],
        'replies' => (int)$post['replies'],
        'tags' => [],
        'repliesList' => $replies,
    ]);
}

function postReply(string $postId): void
{
    $user = requireAuthUser();
    $payload = requestJson();
    $body = trim((string)($payload['body'] ?? ''));

    if ($body === '') je('Reply cannot be empty.', 400);
    if (mb_strlen($body) > 5000) je('Reply must be under 5000 characters.', 400);

    $exists = db()->prepare('SELECT id FROM posts WHERE id = ? AND is_hidden = 0 LIMIT 1');
    $exists->execute([$postId]);
    if (!$exists->fetch()) {
        je('Post not found.', 404);
    }

    $author = ($user['displayName'] ?? '') ?: 'Member';
    $replyId = uuid();
    $stmt = db()->prepare('INSERT INTO replies (id, post_id, author_id, author_name, body) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$replyId, $postId, $user['uid'], mb_substr($author, 0, 60), $body]);

    json(['id' => $replyId], 201);
}

