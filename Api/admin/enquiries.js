const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const STATUSES = new Set(['new', 'contacted', 'qualified', 'converted', 'closed']);

function reply(res, status, body) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(body);
}

async function requireAdmin(req) {
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match || !ADMIN_EMAIL || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${match[1]}` }
  });
  if (!response.ok) return null;
  const user = await response.json();
  if (String(user.email || '').trim().toLowerCase() !== ADMIN_EMAIL) return null;
  return user;
}

module.exports = async function handler(req, res) {
  if (!['GET', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'GET, PATCH');
    return reply(res, 405, { error: 'Method not allowed' });
  }

  try {
    const user = await requireAdmin(req);
    if (!user) return reply(res, 401, { error: 'Admin authentication required.' });

    const base = `${SUPABASE_URL}/rest/v1/storegrid_enquiries`;
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    };

    if (req.method === 'GET') {
      const status = String(req.query.status || '').trim();
      const params = new URLSearchParams({ select: '*', order: 'created_at.desc', limit: '250' });
      if (status && status !== 'all') {
        if (!STATUSES.has(status)) return reply(res, 400, { error: 'Invalid status filter.' });
        params.set('status', `eq.${status}`);
      }
      const response = await fetch(`${base}?${params.toString()}`, { headers });
      if (!response.ok) return reply(res, 502, { error: 'Could not load enquiries.' });
      return reply(res, 200, { enquiries: await response.json() });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return reply(res, 400, { error: 'Invalid request body.' }); }
    }
    const id = String(body?.id || '');
    const status = String(body?.status || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || !STATUSES.has(status)) {
      return reply(res, 400, { error: 'A valid enquiry ID and status are required.' });
    }

    const response = await fetch(`${base}?id=eq.${encodeURIComponent(id)}&select=id,status,updated_at`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
    if (!response.ok) return reply(res, 502, { error: 'Could not update enquiry status.' });
    const updated = await response.json();
    if (!updated.length) return reply(res, 404, { error: 'Enquiry not found.' });
    return reply(res, 200, { enquiry: updated[0] });
  } catch {
    return reply(res, 500, { error: 'Admin service error.' });
  }
};
