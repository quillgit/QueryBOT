import { Router } from 'express';
import { issueToken, validateCredentials } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (!validateCredentials(username, password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = issueToken({ username });
  res.json({ token, user: { username } });
});

export default router;