const express = require('express');
const { adminClient } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
const clean = value => typeof value === 'string' ? value.trim() : '';

router.use(requireAuth);
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await adminClient.from('tutoring_requests').select('id, learner_id, tutor_id, tutor_listing_id, message, status, created_at, tutor_listings(subject), learner:profiles!tutoring_requests_learner_id_fkey(full_name), tutor:profiles!tutoring_requests_tutor_id_fkey(full_name)').or(`learner_id.eq.${req.user.id},tutor_id.eq.${req.user.id}`).order('created_at', { ascending: false }).limit(100);
    if (error) return res.status(500).json({ error: 'Could not load tutoring requests.' });
    const requests = (data || []).map(row => ({ id: row.id, message: row.message, status: row.status, created_at: row.created_at, subject: row.tutor_listings?.subject || 'Tutoring session', learner_name: row.learner?.full_name || 'Student', tutor_name: row.tutor?.full_name || 'Student', role: row.tutor_id === req.user.id ? 'incoming' : 'outgoing' }));
    res.json({ requests });
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const tutorListingId = clean(req.body.tutorListingId); const message = clean(req.body.message);
    if (!tutorListingId) return res.status(400).json({ error: 'Choose a tutor first.' });
    if (message.length > 500) return res.status(400).json({ error: 'Message must be 500 characters or fewer.' });
    const { data: listing, error: listingError } = await adminClient.from('tutor_listings').select('id, user_id, is_active').eq('id', tutorListingId).maybeSingle();
    if (listingError) return res.status(500).json({ error: 'Could not check that tutor listing.' });
    if (!listing || !listing.is_active) return res.status(404).json({ error: 'That tutor listing is no longer available.' });
    if (listing.user_id === req.user.id) return res.status(400).json({ error: 'You cannot request a tutoring session from your own listing.' });
    const { data, error } = await adminClient.from('tutoring_requests').insert({ learner_id: req.user.id, tutor_id: listing.user_id, tutor_listing_id: listing.id, message: message || null }).select('id, status, created_at').single();
    if (error?.code === '23505') return res.status(409).json({ error: 'You already have an active or previous request for this listing.' });
    if (error) return res.status(500).json({ error: 'Could not send the tutoring request.' });
    res.status(201).json({ request: data });
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const status = clean(req.body.status);
    if (!['accepted', 'declined', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Choose a valid request status.' });
    const { data: request, error: readError } = await adminClient.from('tutoring_requests').select('id, learner_id, tutor_id, status').eq('id', req.params.id).maybeSingle();
    if (readError) return res.status(500).json({ error: 'Could not load that request.' });
    if (!request) return res.status(404).json({ error: 'Tutoring request not found.' });
    const isTutor = request.tutor_id === req.user.id; const isLearner = request.learner_id === req.user.id;
    if (!isTutor && !isLearner) return res.status(403).json({ error: 'You cannot update this request.' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'Only pending requests can be updated.' });
    if (status === 'cancelled' && !isLearner) return res.status(403).json({ error: 'Only the learner can cancel a request.' });
    if ((status === 'accepted' || status === 'declined') && !isTutor) return res.status(403).json({ error: 'Only the tutor can accept or decline a request.' });
    const { data, error } = await adminClient.from('tutoring_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id).eq('status', 'pending').select('id, status').maybeSingle();
    if (error) return res.status(500).json({ error: 'Could not update the request.' });
    if (!data) return res.status(409).json({ error: 'This request has already been updated.' });
    res.json({ request: data });
  } catch (error) { next(error); }
});
module.exports = router;
