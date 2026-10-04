-- Shia Rishta core schema. Idempotent: safe to run on every boot.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  age            INT CHECK (age BETWEEN 18 AND 100),
  gender         TEXT CHECK (gender IN ('male','female')) ,
  city           TEXT,
  country        TEXT,
  sect           TEXT,
  profession     TEXT,
  bio            TEXT CHECK (char_length(bio) <= 2000),
  -- privacy tiers enforced server-side: public | members | private
  visibility     TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('public','members','private')),
  photos_visibility TEXT NOT NULL DEFAULT 'members' CHECK (photos_visibility IN ('public','members','private')),
  is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interests (
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a <> user_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS communities (
  id         TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]{2,32}$'),
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '🌍',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT NOT NULL,
  title        TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body         TEXT NOT NULL DEFAULT '' CHECK (char_length(body) <= 10000),
  likes        INT NOT NULL DEFAULT 0,
  is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts (community_id, created_at DESC);

CREATE TABLE IF NOT EXISTS replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body       TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  is_hidden  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_replies_post ON replies (post_id, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('profile','post','reply','message','user')),
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- ── Trust ladder (added 2026-09): email verification, password reset,
--    photo/ID verification queue, wali read-only companion links. ─────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- One row per verification submission; admins approve/reject from the queue.
-- Files live on disk under UPLOAD_DIR; only the path is stored here, and the
-- bytes are served exclusively through an admin-authenticated route.
CREATE TABLE IF NOT EXISTS verifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('selfie', 'id_document')),
  storage_path TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note  TEXT,
  reviewed_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications (status, created_at);

-- Wali companion links: a token a guardian can open for a read-only view of
-- one member's profile. Revocable by the member at any time.
CREATE TABLE IF NOT EXISTS wali_links (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Introductions (added 2026-09): verified matchmakers + guardians create a
--    PRIVATE draft, share a one-time claim link (WhatsApp + email), and the
--    subject claims it — at which point a REAL profile row is created and she
--    owns it. Drafts live in their own table on purpose: a draft can never
--    appear in search, messaging or profiles because it is not a profile.
CREATE TABLE IF NOT EXISTS profile_drafts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_role       TEXT NOT NULL CHECK (creator_role IN ('matchmaker','guardian')),
  -- Root/shared for as long as the draft is unclaimed; consumed on claim or decline.
  claim_token        TEXT NOT NULL UNIQUE,
  claim_token_expires TIMESTAMPTZ NOT NULL,
  short_code         TEXT NOT NULL UNIQUE,
  -- matchmaker: always 'female'. guardian: family draft (son, nephew, sister…).
  gender             TEXT NOT NULL CHECK (gender IN ('male','female')),
  relationship       TEXT,
  display_name       TEXT NOT NULL,
  age                INT CHECK (age BETWEEN 18 AND 100),
  city               TEXT,
  country            TEXT,
  sect               TEXT,
  profession         TEXT,
  bio                TEXT CHECK (char_length(bio) <= 2000),
  expectations       TEXT CHECK (char_length(expectations) <= 2000),
  about_family       TEXT CHECK (char_length(about_family) <= 1000),
  -- Never a photo: images are added by the subject after she claims the draft.
  contact_email      CITEXT NOT NULL,
  contact_phone      TEXT,
  -- Legal backbone: WHO attested that the subject agreed to share these details.
  consent_attested   BOOLEAN NOT NULL DEFAULT FALSE,
  consent_attested_at TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'awaiting_claim'
                     CHECK (status IN ('awaiting_claim','claimed','declined','expired')),
  claimed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at         TIMESTAMPTZ,
  declined_at        TIMESTAMPTZ,
  scrubbed_at        TIMESTAMPTZ,
  last_sent_at       TIMESTAMPTZ,
  send_count         INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drafts_creator ON profile_drafts (created_by, status);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON profile_drafts (status, claim_token_expires);

-- Append-only audit of every introduction event (attestation, send, claim,
-- decline, extension). Reviewable by admins; never edited.
CREATE TABLE IF NOT EXISTS draft_events (
  id         BIGSERIAL PRIMARY KEY,
  draft_id   UUID NOT NULL REFERENCES profile_drafts(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles: member (default) | matchmaker | guardian. Admin stays on is_admin so
-- existing admin auth and the ADMIN_EMAILS bootstrapping keep working.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('member','matchmaker','guardian'));

-- Structured profile fields the introduction draft seeds and she can edit.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expectations TEXT CHECK (char_length(expectations) <= 2000);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS about_family TEXT CHECK (char_length(about_family) <= 1000);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS introduced_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS introduced_at TIMESTAMPTZ;
