const express = require('express');
const { authClient, adminClient } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
    const { data, error } = await authClient.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return res.status(400).json({ error: error.message });
    if (data.user && data.session) {
      const { error: profileError } = await adminClient.from('profiles').upsert({ id: data.user.id, full_name: fullName, email }, { onConflict: 'id' });
      if (profileError) return res.status(500).json({ error: 'Account was created, but its profile could not be saved. Please contact the project administrator.' });
    }
    return res.status(201).json({ user: data.user ? { id: data.user.id, email: data.user.email, full_name: fullName } : null, session: data.session, message: data.session ? 'Account created.' : 'Account created. Confirm your email if email confirmation is enabled.' });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!emailPattern.test(email) || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) return res.status(401).json({ error: 'Email or password is incorrect, or your email needs confirmation.' });
    const { data: profileData, error: profileError } = await adminClient.from('profiles').select('id, full_name, email').eq('id', data.user.id).maybeSingle();
    if (profileError) return res.status(500).json({ error: 'Could not load your profile.' });
    const fullName = profileData?.full_name || data.user.user_metadata?.full_name || 'Student';
    if (!profileData) await adminClient.from('profiles').upsert({ id: data.user.id, full_name: fullName, email: data.user.email });
    return res.json({ user: { id: data.user.id, email: data.user.email, full_name: fullName }, session: data.session });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await adminClient.from('profiles').select('id, full_name, email').eq('id', req.user.id).maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not load your profile.' });
    if (!data) return res.status(404).json({ error: 'Profile not found. Please sign in again.' });
    res.json({ user: { id: data.id, full_name: data.full_name, email: data.email } });
  } catch (error) { next(error); }
});
module.exports = router;
