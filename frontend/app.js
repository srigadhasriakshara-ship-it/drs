const API = '/api';
const state = { token: sessionStorage.getItem('ptf_token'), user: null, signup: false, toastTimer: null };
const $ = (selector) => document.querySelector(selector);
const toast = (message, error = false) => { const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.classList.add('show'); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 3200); };
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  let data; try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) { if (response.status === 401 && state.token) logout(false); throw new Error(data.error || 'Something went wrong. Please try again.'); }
  return data;
}
function safeText(value) { return String(value ?? ''); }
function initials(name) { return safeText(name).trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'PT'; }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function button(text, className, action) { const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', action); return b; }
function updateNavigation() {
  const nav = $('#auth-nav'); nav.textContent = state.user ? `Sign out (${state.user.full_name.split(' ')[0]})` : 'Sign in';
  nav.onclick = () => state.user ? logout() : openAuth(false);
  $('#requests').classList.toggle('hidden', !state.user);
}
function logout(showMessage = true) { state.token = null; state.user = null; sessionStorage.removeItem('ptf_token'); updateNavigation(); $('#request-list').replaceChildren(el('p', 'empty-state', 'Sign in to view your tutoring requests.')); if (showMessage) toast('You have signed out.'); loadTutors(); }
function openAuth(signup = false) { state.signup = signup; renderAuthMode(); $('#auth-dialog').showModal(); }
function renderAuthMode() { $('#auth-title').textContent = state.signup ? 'Create an account' : 'Sign in'; $('#auth-description').textContent = state.signup ? 'Join your campus learning community.' : 'Sign in to connect with peer tutors.'; $('#name-field').classList.toggle('hidden', !state.signup); $('#auth-form [name="fullName"]').required = state.signup; $('#auth-form [name="password"]').autocomplete = state.signup ? 'new-password' : 'current-password'; $('#auth-submit').textContent = state.signup ? 'Create account' : 'Sign in'; $('#switch-label').textContent = state.signup ? 'Already have an account?' : 'New here?'; $('#switch-auth').textContent = state.signup ? 'Sign in' : 'Create an account'; }
$('#close-dialog').addEventListener('click', () => $('#auth-dialog').close());
$('#switch-auth').addEventListener('click', () => { state.signup = !state.signup; $('#auth-form').reset(); renderAuthMode(); });
$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const form = new FormData(event.currentTarget); const submit = $('#auth-submit'); submit.disabled = true;
  try {
    const path = state.signup ? '/auth/register' : '/auth/login'; const body = state.signup ? { fullName: form.get('fullName').trim(), email: form.get('email').trim(), password: form.get('password') } : { email: form.get('email').trim(), password: form.get('password') };
    const result = await api(path, { method: 'POST', body: JSON.stringify(body) });
    if (!result.session?.access_token) { toast('Account created. If email confirmation is enabled in Supabase, confirm your email before signing in.'); state.signup = false; renderAuthMode(); return; }
    state.token = result.session.access_token; sessionStorage.setItem('ptf_token', state.token); state.user = result.user; $('#auth-dialog').close(); event.currentTarget.reset(); updateNavigation(); toast(state.signup ? 'Welcome to Peer Tutoring Finder!' : 'Signed in successfully.'); await loadTutors(); await loadRequests();
  } catch (error) { toast(error.message, true); } finally { submit.disabled = false; }
});
function tutorCard(tutor) {
  const card = el('article', 'tutor-card'); const top = el('div', 'tutor-top'); top.append(el('div', 'tutor-avatar', initials(tutor.full_name))); const info = el('div'); info.append(el('div', 'tutor-name', tutor.full_name), el('div', 'tutor-email', tutor.email)); top.append(info); card.append(top);
  const tags = el('div', 'tag-row'); tags.append(el('span', 'tag', tutor.subject), el('span', 'tag', tutor.level)); card.append(tags);
  card.append(el('p', 'tutor-description', tutor.description || 'Happy to help you learn this subject step by step.'));
  card.append(el('div', 'tutor-meta', `Availability: ${tutor.availability}`));
  if (state.user && state.user.id !== tutor.user_id) card.append(button('Request a session →', 'button', () => sendRequest(tutor)));
  else if (!state.user) card.append(button('Sign in to request', 'button', () => openAuth(false)));
  else card.append(el('span', 'tag', 'Your tutor listing'));
  return card;
}
async function loadTutors() {
  const container = $('#tutor-results'); container.replaceChildren(el('p', 'empty-state', 'Loading tutor profiles…'));
  const params = new URLSearchParams(); const q = $('#search-q').value.trim(); const level = $('#search-level').value; if (q) params.set('q', q); if (level) params.set('level', level);
  try { const data = await api(`/tutors?${params}`); container.replaceChildren(); if (!data.tutors.length) { container.append(el('p', 'empty-state', 'No tutor profiles match that search yet. Try another subject or check back later.')); return; } data.tutors.forEach(tutor => container.append(tutorCard(tutor))); }
  catch (error) { container.replaceChildren(el('p', 'empty-state', error.message)); }
}
$('#search-form').addEventListener('submit', event => { event.preventDefault(); loadTutors(); });
async function sendRequest(tutor) {
  const message = prompt(`What would you like help with in ${tutor.subject}? (Optional, up to 500 characters)`); if (message === null) return;
  try { await api('/requests', { method: 'POST', body: JSON.stringify({ tutorListingId: tutor.id, message: message.trim() }) }); toast('Tutoring request sent.'); await loadRequests(); }
  catch (error) { toast(error.message, true); }
}
$('#offer-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!state.user) { openAuth(false); toast('Please sign in before publishing a tutor profile.'); return; }
  const form = new FormData(event.currentTarget); const submit = event.currentTarget.querySelector('button[type="submit"]'); submit.disabled = true;
  try { await api('/tutors', { method: 'POST', body: JSON.stringify({ subject: form.get('subject').trim(), level: form.get('level'), availability: form.get('availability').trim(), description: form.get('description').trim() }) }); event.currentTarget.reset(); toast('Your tutor profile has been published.'); await loadTutors(); }
  catch (error) { toast(error.message, true); } finally { submit.disabled = false; }
});
function requestCard(request) {
  const card = el('article', 'request-card'); const content = el('div'); const heading = el('strong', '', `${request.subject} · ${request.role === 'incoming' ? `From ${request.learner_name}` : `Tutor: ${request.tutor_name}`}`); content.append(heading, el('p', '', request.message || 'No additional message.'), el('p', '', `Created: ${new Date(request.created_at).toLocaleString()}`)); const status = el('span', `status ${request.status}`, request.status); const side = el('div'); side.append(status); const actions = el('div', 'request-actions');
  if (request.role === 'incoming' && request.status === 'pending') { actions.append(button('Accept', 'button', () => updateRequest(request.id, 'accepted')), button('Decline', 'button button-light', () => updateRequest(request.id, 'declined'))); }
  if (request.role === 'outgoing' && request.status === 'pending') actions.append(button('Cancel request', 'button button-light', () => updateRequest(request.id, 'cancelled')));
  side.append(actions); card.append(content, side); return card;
}
async function loadRequests() {
  const container = $('#request-list'); if (!state.user) { container.replaceChildren(el('p', 'empty-state', 'Sign in to view your tutoring requests.')); return; }
  container.replaceChildren(el('p', 'empty-state', 'Loading requests…'));
  try { const data = await api('/requests'); container.replaceChildren(); if (!data.requests.length) { container.append(el('p', 'empty-state', 'No requests yet. Find a tutor or publish your own listing to get started.')); return; } data.requests.forEach(item => container.append(requestCard(item))); }
  catch (error) { container.replaceChildren(el('p', 'empty-state', error.message)); }
}
async function updateRequest(id, status) { try { await api(`/requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }); toast(`Request ${status}.`); await loadRequests(); } catch (error) { toast(error.message, true); } }
$('#refresh-requests').addEventListener('click', loadRequests);
async function initialize() { updateNavigation(); await loadTutors(); if (state.token) { try { const data = await api('/auth/me'); state.user = data.user; updateNavigation(); await loadTutors(); await loadRequests(); } catch { logout(false); } } }
initialize();
