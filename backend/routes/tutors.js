const express = require('express');
const { adminClient } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const levels = ['Beginner', 'Intermediate', 'Advanced'];
const clean = value => typeof value === 'string' ? value.trim() : '';

router.get('/', async (req, res, next) => {
  try {
    const q = clean(req.query.q).slice(0, 80);
    const level = clean(req.query.level);
    if (level && !levels.includes(level)) return res.status(400).json({ error: 'Choose a valid skill level.' });
    let query = adminClient.from('tutor_listings').select('id, user_id, subject, level, availability, description, created_at, profiles!tutor_listings_user_id_fkey(full_name, email)').eq('is_active', true).order('created_at', { ascending: false }).limit(100);
    if (level) query = query.eq('level', level);
    if (q) query = query.ilike('subject', `%${q.replace(/[,%()]/g, '')}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: 'Could not load tutor profiles.' });
    const tutors = (data || []).map(item => ({ id: item.id, user_id: item.user_id, subject: item.subject, level: item.level, availability: item.availability, description: item.description, created_at: item.created_at, full_name: item.profiles?.full_name || 'Student', email: item.profiles?.email || '' }));
    res.json({ tutors });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const subject = clean(req.body.subject); const level = clean(req.body.level); const availability = clean(req.body.availability); const description = clean(req.body.description);
    if (subject.length < 2 || subject.length > 80) return res.status(400).json({ error: 'Subject must be between 2 and 80 characters.' });
    if (!levels.includes(level)) return res.status(400).json({ error: 'Choose a valid skill level.' });
    if (availability.length < 2 || availability.length > 120) return res.status(400).json({ error: 'Availability must be between 2 and 120 characters.' });
    if (description.length > 500) return res.status(400).json({ error: 'Description must be 500 characters or fewer.' });
    const { data, error } = await adminClient.from('tutor_listings').insert({ user_id: req.user.id, subject, level, availability, description: description || null }).select('id, user_id, subject, level, availability, description, created_at').single();
    if (error) return res.status(500).json({ error: 'Could not publish your tutor profile.' });
    res.status(201).json({ tutor: data });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await adminClient.from('tutor_listings').update({ is_active: false }).eq('id', req.params.id).eq('user_id', req.user.id).select('id').maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not remove your listing.' });
    if (!data) return res.status(404).json({ error: 'Tutor listing not found or you do not own it.' });
    res.json({ message: 'Tutor listing removed.' });
  } catch (error) { next(error); }
});
module.exports = router;
