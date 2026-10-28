const { adminClient } = require('../supabase');

async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Please sign in to continue.' });
  try {
    const { data, error } = await adminClient.auth.getUser(match[1]);
    if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: 'Unable to verify your session. Please sign in again.' });
  }
}
module.exports = { requireAuth };
