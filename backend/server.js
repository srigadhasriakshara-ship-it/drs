require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const tutorRoutes = require('./routes/tutors');
const requestRoutes = require('./routes/requests');
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null } } }));
app.use(express.json({ limit: '20kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many authentication attempts. Please wait and try again.' } }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', application: 'Peer Tutoring Finder' }));
app.use('/api/auth', authRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/requests', requestRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  console.error('Request failed:', err?.message || 'Unknown error');
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
});
app.listen(PORT, () => console.log(`Peer Tutoring Finder running at http://localhost:${PORT}`));
