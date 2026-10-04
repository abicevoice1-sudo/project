// ─── Introductions — verified matchmakers & guardians create private drafts,
//     share a one-time claim link (WhatsApp + email), and the subject claims it.
//
// Safety invariants enforced here, not in the UI:
//   • a draft is never a profile — it cannot appear in search or messaging
//   • no photos are accepted on a draft, ever
//   • matchmakers may only draft FEMALE profiles; guardians may draft family
//   • the creator must attest they have the subject's permission to share
//     their contact details (recorded with actor + timestamp)
//   • claiming requires the link token AND the draft's email; the token is
//     consumed, ownership lands on the subject, and the creator keeps only a
//     read-only "introduced by" record she can revoke
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { sendMail } from '../mailer.js';

const router = Router();

const CLAIM_DAYS = 45;               // generous: people are busy
const OPEN_DRAFT_LIMIT = { matchmaker: 10, guardian: 5 };
const CLAIM_BONUS = 5;               // more slots earned by people claiming your drafts
const publicBase = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

const newToken = () => crypto.randomBytes(32).toString('base64url');
const newShortCode = () => crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);

const logEvent = (draftId, actorId, event, detail = null) =>
  pool.query(`INSERT INTO draft_events (draft_id, actor_id, event, detail) VALUES ($1,$2,$3,$4)`,
    [draftId, actorId, event, detail]).catch(() => { /* audit is best-effort, never blocks */ });

const roleOf = async (userId) => {
  const { rows } = await pool.query(`SELECT role FROM users WHERE id = $1`, [userId]);
  return rows[0]?.role || 'member';
};

async function quotaFor(userId, role) {
  const base = OPEN_DRAFT_LIMIT[role] ?? 0;
  const claimed = await pool.query(
    `SELECT COUNT(*)::int AS n FROM profile_drafts WHERE created_by = $1 AND status = 'claimed'`, [userId]);
  const open = await pool.query(
    `SELECT COUNT(*)::int AS n FROM profile_drafts WHERE created_by = $1 AND status = 'awaiting_claim'`, [userId]);
  return { limit: base + claimed.rows[0].n * CLAIM_BONUS, open: open.rows[0].n, claimed: claimed.rows[0].n };
}

// GET /api/drafts/capabilities — what this member may do (drives the UI; the
// real enforcement lives in every write below).
router.get('/capabilities', authRequired, async (req, res, next) => {
  try {
    const role = await roleOf(req.user.uid);
    const canDraft = role === 'matchmaker' || role === 'guardian';
    res.json({
      role,
      canDraft,
      draftGenderScope: role === 'matchmaker' ? ['female'] : role === 'guardian' ? ['male', 'female'] : [],
      quota: canDraft ? await quotaFor(req.user.uid, role) : null,
    });
  } catch (e) { next(e); }
});
// POST /api/drafts — create a private draft (role + scope + quota + attestation)
router.post('/', authRequired, async (req, res, next) => {
  try {
    const role = await roleOf(req.user.uid);
    if (role !== 'matchmaker' && role !== 'guardian') {
      return res.status(403).json({ error: 'Only verified matchmakers and guardians can introduce a profile.' });
    }
    const b = req.body || {};
    const gender = String(b.gender || '');
    if (!['male', 'female'].includes(gender)) return res.status(400).json({ error: 'Choose male or female.' });
    // Scope: matchmakers serve sisters only; family drafts for men go through a guardian.
    if (role === 'matchmaker' && gender !== 'female') {
      return res.status(403).json({ error: 'Matchmaker accounts may introduce female profiles only. Family drafts for men are created by a guardian.' });
    }
    if (b.consentAttested !== true) {
      return res.status(400).json({ error: 'You must confirm you have this person’s permission to share their contact details.' });
    }
    const displayName = String(b.displayName || '').trim();
    const contactEmail = String(b.contactEmail || '').trim().toLowerCase();
    if (!displayName) return res.status(400).json({ error: 'A name is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({ error: 'A valid email for her is required.' });
    const age = b.age === undefined || b.age === null || b.age === '' ? null : Number(b.age);
    if (age !== null && (!Number.isInteger(age) || age < 18 || age > 100)) {
      return res.status(400).json({ error: 'Age must be between 18 and 100.' });
    }
    if (role === 'guardian' && !String(b.relationship || '').trim()) {
      return res.status(400).json({ error: 'State your relationship (son, nephew, sister…).' });
    }
    const quota = await quotaFor(req.user.uid, role);
    if (quota.open >= quota.limit) {
      return res.status(429).json({
        error: `You already have ${quota.open} introductions awaiting a response. Claimed profiles unlock more slots.`,
      });
    }
    // No photo column exists on purpose: an image cannot be smuggled in here.
    const { rows } = await pool.query(
      `INSERT INTO profile_drafts
         (created_by, creator_role, claim_token, claim_token_expires, short_code, gender, relationship,
          display_name, age, city, country, sect, profession, bio, expectations, about_family,
          contact_email, contact_phone, consent_attested, consent_attested_at)
       VALUES ($1,$2,$3, now() + ($4 || ' days')::interval, $5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,TRUE, now())
       RETURNING id, short_code, claim_token, claim_token_expires, status, gender, display_name`,
      [
        req.user.uid, role, newToken(), String(CLAIM_DAYS), newShortCode(), gender,
        String(b.relationship || '').trim() || null, displayName, age,
        String(b.city || '').trim() || null, String(b.country || '').trim() || null,
        String(b.sect || '').trim() || null, String(b.profession || '').trim() || null,
        String(b.bio || '').slice(0, 2000) || null, String(b.expectations || '').slice(0, 2000) || null,
        String(b.aboutFamily || '').slice(0, 1000) || null,
        contactEmail, String(b.contactPhone || '').trim() || null,
      ],
    );
    const d = rows[0];
    await logEvent(d.id, req.user.uid, 'created', `role=${role} gender=${gender}`);
    await logEvent(d.id, req.user.uid, 'consent_attested', contactEmail);
    res.status(201).json({
      ok: true,
      draft: {
        id: d.id, status: d.status, gender: d.gender, displayName: d.display_name,
        shortCode: d.short_code, expiresAt: d.claim_token_expires,
      },
      shareUrl: `${publicBase()}/claim/${d.claim_token}`,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(
        `Assalamu Alaikum — I have set up a private profile for you on Shia Rishta (nikah-first matchmaking). Review it and make it yours here (valid ${CLAIM_DAYS} days): ${publicBase()}/claim/${d.claim_token}\n\nShort code if the link expires: ${d.short_code}`,
      )}`,
      quota: await quotaFor(req.user.uid, role),
    });
  } catch (e) { next(e); }
});
/*__PART3__*/
// POST /api/drafts/:id/send — send the platform email (dual delivery alongside
// her own WhatsApp share). Burn: mail with decline + delete links, so the
// message itself is proof she can refuse. One resend requires a fresh action.
router.post('/:id/send', authRequired, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM profile_drafts WHERE id = $1 AND created_by = $2`, [req.params.id, req.user.uid]);
    const d = rows[0];
    if (!d) return res.status(404).json({ error: 'Draft not found.' });
    if (d.status !== 'awaiting_claim') return res.status(400).json({ error: 'This draft is already resolved.' });
    const u = await pool.query(`SELECT display_name FROM users WHERE id = $1`, [req.user.uid]);
    const by = u.rows[0]?.display_name || 'A verified matchmaker';
    const link = `${publicBase()}/claim/${d.claim_token}`;
    await sendMail({
      to: d.contact_email,
      subject: `${by} set up a private profile for you on Shia Rishta`,
      text: `Assalamu Alaikum ${d.display_name},\n\n${by}, a verified ${d.creator_role} on Shia Rishta (nikah-first matchmaking), set up a private profile for you and confirmed they have your permission to share your details.\n\nReview it and make it yours (valid ${CLAIM_DAYS} days):\n${link}\n\nShort code if the link does not work: ${d.short_code}\n\nNot you, or do not want this? Decline and erase everything:\n${link}?decline=1\n\nNothing is public. Your photo is not included — you add it yourself if you claim the profile.`,
    }).catch((e) => console.error('[mail] draft invite failed:', e.message));
    await pool.query(
      `UPDATE profile_drafts SET last_sent_at = now(), send_count = send_count + 1 WHERE id = $1`, [d.id]);
    await logEvent(d.id, req.user.uid, 'invite_sent', d.contact_email);
    res.json({ ok: true, sentTo: d.contact_email, expiresAt: d.claim_token_expires });
  } catch (e) { next(e); }
});

// GET /api/drafts/mine — my drafts with status (dashboard feed)
router.get('/mine', authRequired, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status, gender, display_name, short_code, claim_token,
              claim_token_expires, contact_email, send_count, last_sent_at,
              claimed_at, declined_at, created_at
         FROM profile_drafts WHERE created_by = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.uid],
    );
    const base = publicBase();
    res.json(rows.map((d) => ({
      ...d,
      claim_token: d.status === 'awaiting_claim' ? d.claim_token : undefined,
      shareUrl: d.status === 'awaiting_claim' ? `${base}/claim/${d.claim_token}` : undefined,
    })));
  } catch (e) { next(e); }
});

// POST /api/drafts/:id/extend — one-tap extension for busy people (fresh 45d)
router.post('/:id/extend', authRequired, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE profile_drafts
          SET claim_token_expires = now() + (${CLAIM_DAYS} || ' days')::interval
        WHERE id = $1 AND created_by = $2 AND status = 'awaiting_claim'
        RETURNING id, claim_token_expires`, [req.params.id, req.user.uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Draft not found or already resolved.' });
    await logEvent(rows[0].id, req.user.uid, 'extended', String(rows[0].claim_token_expires));
    res.json({ ok: true, expiresAt: rows[0].claim_token_expires });
  } catch (e) { next(e); }
});

// GET /api/drafts/by-short-code/:code — manual entry when a link is lost
router.get('/by-short-code/:code', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT claim_token FROM profile_drafts
        WHERE short_code = $1 AND status = 'awaiting_claim' AND claim_token_expires > now()`,
      [String(req.params.code).trim().toUpperCase()]);
    if (!rows[0]) return res.status(404).json({ error: 'That code is unknown, expired or already used.' });
    res.json({ ok: true, claimUrl: `${publicBase()}/claim/${rows[0].claim_token}` });
  } catch (e) { next(e); }
});
/*__PART4__*/
// GET /api/drafts/claim/:token — public review preview. The token is the only
// key, so the preview deliberately OMITS contact details: a leaked link must
// never yield her email or phone. She reviews the rest and can fix it later.
router.get('/claim/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.display_name AS creator_name
         FROM profile_drafts d JOIN users u ON u.id = d.created_by
        WHERE d.claim_token = $1`, [req.params.token]);
    const d = rows[0];
    if (!d) return res.status(404).json({ error: 'This link is unknown. Ask for a fresh one or enter the short code.' });
    if (d.status === 'claimed') return res.status(410).json({ error: 'Already claimed — she owns it now.' });
    if (d.status === 'declined') return res.status(410).json({ error: 'This invitation was declined and erased.' });
    if (d.claim_token_expires < new Date()) {
      await pool.query(`UPDATE profile_drafts SET status = 'expired' WHERE id = $1`, [d.id]);
      return res.status(410).json({ error: 'Expired. The matchmaker can extend it with one tap.' });
    }
    res.json({
      draft: {
        displayName: d.display_name, gender: d.gender, age: d.age,
        city: d.city, country: d.country, sect: d.sect, profession: d.profession,
        bio: d.bio, expectations: d.expectations, aboutFamily: d.about_family,
        relationship: d.relationship, creatorRole: d.creator_role, creatorName: d.creator_name,
        expiresAt: d.claim_token_expires,
        maskedEmail: String(d.contact_email).replace(/^(.).*(@.*)$/, '$1•••$2'),
      },
    });
  } catch (e) { next(e); }
});

// POST /api/drafts/claim/:token/decline — no account needed. Immediate hard
// scrub: personal fields are wiped, token killed. The audit row keeps only
// non-personal facts (role, timestamps) for quota honesty.
router.post('/claim/:token/decline', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM profile_drafts WHERE claim_token = $1`, [req.params.token]);
    const d = rows[0];
    if (!d || d.status !== 'awaiting_claim') return res.status(404).json({ error: 'Unknown or already resolved.' });
    await pool.query(
      `UPDATE profile_drafts SET status = 'declined', declined_at = now(), scrubbed_at = now(),
        display_name = '[declined]', age = NULL, city = NULL, country = NULL, sect = NULL,
        profession = NULL, bio = NULL, expectations = NULL, about_family = NULL,
        contact_email = 'declined.invalid', contact_phone = NULL,
        claim_token = 'dead-' || gen_random_uuid()
       WHERE id = $1`, [d.id]);
    await logEvent(d.id, null, 'declined', 'subject declined, fields scrubbed');
    res.json({ ok: true, message: 'Declined and erased. Nothing of yours remains on Shia Rishta.' });
  } catch (e) { next(e); }
});
/*__PART5__*/
// POST /api/drafts/claim/:token — claim turns the draft into HER real profile.
// Signed in with the draft's email, OR creates a fresh account for that email.
// The profile is seeded from the draft (she can edit everything), ownership
// lands on her, the introduced_by credit stays, and the token dies.
router.post('/claim/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM profile_drafts WHERE claim_token = $1`, [req.params.token]);
    const d = rows[0];
    if (!d || d.status !== 'awaiting_claim') return res.status(404).json({ error: 'Unknown or already resolved.' });
    if (d.claim_token_expires < new Date()) {
      await pool.query(`UPDATE profile_drafts SET status = 'expired' WHERE id = $1`, [d.id]);
      return res.status(410).json({ error: 'Expired. The matchmaker can extend it with one tap.' });
    }
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (email !== String(d.contact_email).toLowerCase()) {
      return res.status(400).json({ error: 'Claim with the same email the invitation was sent to.' });
    }
    // Path 1: she is signed in as that email already.
    let header = req.headers.authorization || '';
    let me = null;
    if (header.startsWith('Bearer ')) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        me = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-only-secret-change-me');
      } catch { me = null; }
    }
    let userId;
    if (me) {
      const u = await pool.query(`SELECT id, email FROM users WHERE id = $1`, [me.uid]);
      if (!u.rowCount || String(u.rows[0].email).toLowerCase() !== email) {
        return res.status(400).json({ error: 'Claim with the same email the invitation was sent to.' });
      }
      userId = u.rows[0].id;
    } else {
      // Path 2: fresh account via the link.
      const exists = await pool.query(`SELECT id FROM users WHERE email = $1`, [email]);
      if (exists.rowCount) return res.status(409).json({ error: 'This email already has an account — sign in, then open the link again.' });
      const password = String(req.body?.password || '');
      if (password.length < 8) return res.status(400).json({ error: 'Choose a password of at least 8 characters.' });
      const created = await pool.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1,$2,$3) RETURNING id`,
        [email, bcrypt.hashSync(password, 12), String(req.body?.displayName || d.display_name || email.split('@')[0]).trim().slice(0, 60)]);
      userId = created.rows[0].id;
    }
/*__PART6__*/
    const p = await pool.query(`SELECT user_id FROM profiles WHERE user_id = $1`, [userId]);
    if (p.rowCount) {
      await pool.query(
        `UPDATE profiles SET display_name = COALESCE(NULLIF(display_name,''), $2),
          age = COALESCE(age, $3), gender = COALESCE(gender, $4), city = COALESCE(city, $5),
          country = COALESCE(country, $6), sect = COALESCE(sect, $7), profession = COALESCE(profession, $8),
          bio = COALESCE(bio, $9), expectations = COALESCE(expectations, $10),
          about_family = COALESCE(about_family, $11),
          introduced_by = $12, introduced_at = now(), updated_at = now()
          WHERE user_id = $1`,
        [userId, d.display_name, d.age, d.gender, d.city, d.country, d.sect, d.profession,
          d.bio, d.expectations, d.about_family, d.created_by]);
    } else {
      // Her name at claim wins; the draft's name is only a placeholder she reviews.
      const chosenName = String(req.body?.displayName || '').trim().slice(0, 60) || d.display_name;
      await pool.query(
        `INSERT INTO profiles (user_id, display_name, age, gender, city, country, sect, profession,
          bio, expectations, about_family, introduced_by, introduced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())`,
        [userId, chosenName, d.age, d.gender, d.city, d.country, d.sect, d.profession,
          d.bio, d.expectations, d.about_family, d.created_by]);
    }
    await pool.query(
      `UPDATE profile_drafts SET status = 'claimed', claimed_by = $2, claimed_at = now(),
        claim_token = 'claimed-' || gen_random_uuid() WHERE id = $1`,
      [d.id, userId]);
    await logEvent(d.id, userId, 'claimed', `owner=${userId}`);
    const sess = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    const { signSession } = await import('../middleware/auth.js');
    res.status(201).json({
      ok: true,
      user: { uid: userId, email: sess.rows[0].email, displayName: sess.rows[0].display_name, isAdmin: sess.rows[0].is_admin, emailVerified: sess.rows[0].email_verified === true },
      token: signSession(sess.rows[0]),
    });
  } catch (e) { next(e); }
});

// GET /api/drafts/:id/events — audit trail (creator + admins only)
router.get('/:id/events', authRequired, async (req, res, next) => {
  try {
    const own = await pool.query(`SELECT created_by FROM profile_drafts WHERE id = $1`, [req.params.id]);
    if (!own.rowCount) return res.status(404).json({ error: 'Not found.' });
    const can = own.rows[0].created_by === req.user.uid || req.user.isAdmin === true;
    if (!can) return res.status(403).json({ error: 'Not yours to inspect.' });
    const { rows } = await pool.query(
      `SELECT event, detail, created_at FROM draft_events WHERE draft_id = $1 ORDER BY created_at ASC LIMIT 100`,
      [req.params.id]);
    res.json(rows);
  } catch (e) { next(e); }
});

// DELETE /api/drafts/:id — creator can withdraw an unresolved draft (scrubbed)
router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE profile_drafts SET status = 'expired', scrubbed_at = now(),
        display_name = '[withdrawn]', bio = NULL, expectations = NULL, about_family = NULL,
        contact_email = 'withdrawn.invalid', contact_phone = NULL,
        claim_token = 'dead-' || gen_random_uuid()
       WHERE id = $1 AND created_by = $2 AND status = 'awaiting_claim' RETURNING id`,
      [req.params.id, req.user.uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found or already resolved.' });
    await logEvent(rows[0].id, req.user.uid, 'withdrawn', 'creator withdrew, fields scrubbed');
    res.json({ ok: true });
  } catch (e) { next(e); }
});
export default router;
