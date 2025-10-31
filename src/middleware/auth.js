import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

if (!ADMIN_USER || !ADMIN_PASS) {
  console.error('[Auth] ADMIN_USER and ADMIN_PASS are not set. Configure them in .env to enable login.');
}

export function issueToken(user) {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: '12h' });
}

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [, token] = auth.split(' ');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload.user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function validateCredentials(username, password) {
  if (!ADMIN_USER || !ADMIN_PASS) return false;
  return username === ADMIN_USER && password === ADMIN_PASS;
}