const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RATE_LIMIT_SECRET = process.env.RATE_LIMIT_SECRET;

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

function clean(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RATE_LIMIT_SECRET) {
    return reply(res, 503, { error: 'Enquiry service is not configured yet.' });
  }

  // Accept browser submissions only from this site. Requests without Origin are rejected.
  const origin = req.headers.origin;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    if (!origin || !host || new URL(origin).host.toLowerCase() !== String(host).toLowerCase()) {
      return reply(res, 403, { error: 'Invalid request origin.' });
    }
  } catch {
    return reply(res, 403, { error: 'Invalid request origin.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return reply(res, 400, { error: 'Invalid request body.' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply(res, 400, { error: 'Invalid request body.' });
  }

  // Honeypot: silently accept bot submissions without storing them.
  if (clean(body.company_website, 200)) return reply(res, 200, { ok: true });

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 24);
  const email = clean(body.email, 254).toLowerCase();
  const category = clean(body.category, 80);
  const area = clean(body.area, 120);
  const duration = clean(body.duration, 40);
  const message = clean(body.message, 2000);
  const consent = body.consent === true;

  if (name.length < 2 || !/^[0-9+() .-]{8,24}$/.test(phone) || !category || !consent) {
    return reply(res, 400, { error: 'Please provide a valid name, phone number, storage category and consent.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply(res, 400, { error: 'Please enter a valid email address.' });
  }

  const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwardedFor || 'unknown';
  const keyHash = crypto.createHash('sha256').update(`${ip}:${RATE_LIMIT_SECRET}`).digest('hex');

  try {
    const limitResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/storegrid_check_rate_limit`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_key: keyHash, p_limit: 5, p_window_seconds: 3600 })
    });
    if (!limitResponse.ok) return reply(res, 503, { error: 'Enquiry service is temporarily unavailable.' });
    const allowed = await limitResponse.json();
    if (allowed !== true) return reply(res, 429, { error: 'Too many enquiries from this connection. Please try again later.' });

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/storegrid_enquiries`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        name, phone, email: email || null, category, area: area || null,
        duration: duration || null, message: message || null,
        consent: true, source: 'website', status: 'new'
      })
    });
    if (!insertResponse.ok) return reply(res, 502, { error: 'We could not save your enquiry. Please try again.' });

    // Email is best-effort: a mail provider outage must not lose the saved enquiry.
    let emailSent = false;
    if (process.env.RESEND_API_KEY && process.env.MAIL_FROM && process.env.NOTIFY_EMAIL) {
      try {
        const mail = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: process.env.MAIL_FROM,
            to: [process.env.NOTIFY_EMAIL],
            subject: `New StoreGrid enquiry: ${name}`,
            html: `<h2>New StoreGrid enquiry</h2><p><b>Name:</b> ${escapeHtml(name)}</p><p><b>Phone:</b> ${escapeHtml(phone)}</p><p><b>Email:</b> ${escapeHtml(email || 'Not provided')}</p><p><b>Category:</b> ${escapeHtml(category)}</p><p><b>Area:</b> ${escapeHtml(area || 'Not provided')}</p><p><b>Duration:</b> ${escapeHtml(duration || 'Not provided')}</p><p><b>Message:</b><br>${escapeHtml(message || 'Not provided').replace(/\n/g, '<br>')}</p>`
          })
        });
        emailSent = mail.ok;
      } catch { /* Saved enquiry remains successful even if email fails. */ }
    }

    return reply(res, 201, { ok: true, emailNotification: emailSent ? 'sent' : 'not_configured_or_failed' });
  } catch {
    return reply(res, 500, { error: 'Unexpected enquiry service error.' });
  }
};
