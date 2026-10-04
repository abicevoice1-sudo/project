import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signSession } from '../middleware/auth.js';
import { sendMail } from '../mailer.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tokens are stored hashed — a DB leak must not yield usable verify/reset links.
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');
const publicBase = () => (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();

function sessionOf(row) {
  return { uid: row.id, email: row.email, displayName: row.display_name, isAdmin: row.is_admin, emailVerified: row.email_verified === true };
}

// POST /api/auth/register — creates user + default members-visible profile
router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const displayName = String(req.body?.displayName ?? '').trim() || email.split('@')[0];
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (displayName.length > 60) return res.status(400).json({ error: 'Display name is too long.' });

    const adminEmails = String(process.env.ADMIN_EMAILS || '')
      .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const passwordHash = bcrypt.hashSync(password, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const u = await client.query(
        `INSERT INTO users (email, password_hash, display_name, is_admin)
         VALUES ($1,$2,$3,$4) RETURNING id, email, display_name, is_admin`,
        [email, passwordHash, displayName, adminEmails.includes(email)],
      );
      await client.query(
        `INSERT INTO profiles (user_id, display_name) VALUES ($1,$2)`,
        [u.rows[0].id, displayName],
      );
      await client.query('COMMIT');

      // Email verification: token stored hashed, link valid 24 hours.
      const verifyToken = newToken();
      await pool.query(
        `UPDATE users SET email_verify_token=$1, email_verify_expires=now()+interval '24 hours' WHERE id=$2`,
        [sha(verifyToken), u.rows[0].id],
      );
      sendMail({
        to: email,
        subject: 'Verify your Shia Rishta email',
        text: `Assalamu Alaikum ${displayName},\n\nConfirm your email to finish creating your account:\n${publicBase()}/verify-email?token=${verifyToken}\n\nThis link expires in 24 hours.`,
      }).catch((e) => console.error('[mail] verify send failed:', e.message));

      const session = sessionOf({ ...u.rows[0], email_verified: false });
      return res.status(201).json({ user: session, token: signSession(u.rows[0]) });
    } catch (e) {
      await client.query('ROLLBACK');
      if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' });
      throw e;
    } finally {
      client.release();
    }
  } catch (e) { next(e); }
});

// POST /api/auth/login — bcrypt compare, constant-shape errors (no user enumeration)
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    const user = rows[0];
    const ok = user ? bcrypt.compareSync(password, user.password_hash) : false;
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });
    const session = sessionOf(user);
    return res.json({ user: session, token: signSession(user) });
  } catch (e) { next(e); }
});

// GET /api/auth/verify-email?token=… — one-time, 24h link, stored hashed
router.get('/verify-email', async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'Missing verification token.' });
    const { rows } = await pool.query(
      `SELECT id, email_verified FROM users WHERE email_verify_token=$1 AND email_verify_expires > now()`,
      [sha(token)],
    );
    if (!rows[0]) return res.status(400).json({ error: 'This link has expired or was already used. Sign in to get a new one.' });
    if (!rows[0].email_verified) {
      await pool.query(
        `UPDATE users SET email_verified=TRUE, email_verify_token=NULL, email_verify_expires=NULL WHERE id=$1`,
        [rows[0].id],
      );
    }
    res.json({ ok: true, emailVerified: true });
  } catch (e) { next(e); }
});

// POST /api/auth/forgot — constant-shape response, never reveals if an email exists
router.post('/forgot', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (EMAIL_RE.test(email)) {
      const { rows } = await pool.query(`SELECT id, display_name FROM users WHERE email=$1`, [email]);
      if (rows[0]) {
        const token = newToken();
        await pool.query(
          `UPDATE users SET password_reset_token=$1, password_reset_expires=now()+interval '1 hour' WHERE id=$2`,
          [sha(token), rows[0].id],
        );
        sendMail({
          to: email,
          subject: 'Reset your Shia Rishta password',
          text: `Assalamu Alaikum,\n\nReset your password with this link (valid 1 hour):\n${publicBase()}/auth/reset?token=${token}\n\nIf you did not request this, ignore this email — your account is safe.`,
        }).catch((e) => console.error('[mail] reset send failed:', e.message));
      }
    }
    res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
  } catch (e) { next(e); }
});

// POST /api/auth/reset — consumes a hashed, single-use token; sets new password
router.post('/reset', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password ?? '');
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const { rows } = await pool.query(
      `SELECT id FROM users WHERE password_reset_token=$1 AND password_reset_expires > now()`,
      [sha(token)],
    );
    if (!rows[0]) return res.status(400).json({ error: 'This reset link has expired or was already used.' });
    await pool.query(
      `UPDATE users SET password_hash=$2, password_reset_token=NULL, password_reset_expires=NULL WHERE id=$1`,
      [rows[0].id, bcrypt.hashSync(password, 12)],
    );
    res.json({ ok: true, message: 'Password updated. You can sign in with your new password.' });
  } catch (e) { next(e); }
});

// POST /api/auth/resend-verification — fresh 24h link for the member (her own
// email only: she must already be signed in as the account to request it).
// Reads the session from the bearer token itself: this endpoint sits on the
// rate-limited /api/auth ladder, and the only address it can ever mail is the
// signed-in account's own.
router.post('/resend-verification', async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    let me;
    try {
      const jwt = (await import('jsonwebtoken')).default;
      me = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'dev-only-secret-change-me');
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    const token = newToken();
    const { rows } = await pool.query(
      `UPDATE users SET email_verify_token=$1, email_verify_expires=now()+interval '24 hours'
        WHERE id=$2 AND email_verified = FALSE RETURNING email, display_name`,
      [sha(token), me.uid],
    );
    if (!rows[0]) return res.json({ ok: true, alreadyVerified: true });
    sendMail({
      to: rows[0].email,
      subject: 'Verify your Shia Rishta email',
      text: `Assalamu Alaikum ${rows[0].display_name},\n\nConfirm your email to finish creating your account:\n${publicBase()}/verify-email?token=${token}\n\nThis link expires in 24 hours.`,
    }).catch((e) => console.error('[mail] verify send failed:', e.message));
    res.json({ ok: true, message: 'Verification email sent — check your inbox.' });
  } catch (e) { next(e); }
});

export default router;
