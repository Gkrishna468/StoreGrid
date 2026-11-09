(() => {
  'use strict';

  const SUPABASE_URL = 'https://qziqopbavffhwtbatgxp.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_XuR520i3iSxtm8ndU_1OyQ_Zhp8yZOC';
  const ADMIN_EMAIL = 'gopalkrishna.sv46@gmail.com';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const loginPanel = document.getElementById('loginPanel');
  const dashboardPanel = document.getElementById('dashboardPanel');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const dashboardMessage = document.getElementById('dashboardMessage');
  const emailInput = document.getElementById('adminEmail');
  const passwordInput = document.getElementById('adminPassword');
  const loginButton = document.getElementById('loginButton');
  const rows = document.getElementById('enquiryRows');
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');

  let currentSession = null;
  let enquiries = [];

  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));

  const dateLabel = (value) => value
    ? new Date(value).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })
    : '—';

  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    loginMessage.textContent = message;
  }

  async function api(path, options = {}) {
    const { data } = await client.auth.getSession();
    if (!data.session?.access_token) throw new Error('Your session has expired. Please sign in again.');
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }

  function render() {
    const query = searchInput.value.trim().toLowerCase();
    const visible = enquiries.filter(item => {
      const matchesStatus = statusFilter.value === 'all' || item.status === statusFilter.value;
      const allSearchable = [
        item.name, item.phone, item.email, item.category, item.area,
        item.duration, item.message, item.source, item.status
      ].join(' ').toLowerCase();
      return matchesStatus && (!query || allSearchable.includes(query));
    });

    if (!visible.length) {
      rows.innerHTML = '<tr><td colspan="5">No matching enquiries found.</td></tr>';
      return;
    }

    rows.innerHTML = visible.map(item => `
      <tr>
        <td><strong>${safe(item.name)}</strong><small>${safe(item.message || 'No additional message')}</small>
          <details class="enquiry-details">
            <summary>View complete enquiry</summary>
            <dl>
              <dt>Enquiry ID</dt><dd>${safe(item.id)}</dd>
              <dt>Name</dt><dd>${safe(item.name)}</dd>
              <dt>Phone</dt><dd>${safe(item.phone)}</dd>
              <dt>Email</dt><dd>${safe(item.email || 'Not provided')}</dd>
              <dt>Storage category</dt><dd>${safe(item.category || 'Not provided')}</dd>
              <dt>Preferred area</dt><dd>${safe(item.area || 'Not provided')}</dd>
              <dt>Storage duration</dt><dd>${safe(item.duration || 'Not provided')}</dd>
              <dt>Additional details</dt><dd class="detail-message">${safe(item.message || 'Not provided')}</dd>
              <dt>Contact consent</dt><dd>${item.consent ? 'Yes' : 'No'}</dd>
              <dt>Source</dt><dd>${safe(item.source || 'Not provided')}</dd>
              <dt>Received</dt><dd>${safe(dateLabel(item.created_at))}</dd>
              <dt>Last updated</dt><dd>${safe(dateLabel(item.updated_at))}</dd>
            </dl>
          </details>
        </td>
        <td><strong>${safe(item.phone)}</strong><small>${safe(item.email || 'No email provided')}</small>
          <small><a href="tel:${safe(item.phone)}">Call customer</a></small>
          ${item.email ? `<small><a href="mailto:${safe(item.email)}">Email customer</a></small>` : ''}
        </td>
        <td><strong>${safe(item.category || '—')}</strong>
          <small>${safe(item.area || 'Area not specified')} · ${safe(item.duration || 'Duration not specified')}</small>
        </td>
        <td>${safe(dateLabel(item.created_at))}</td>
        <td><select class="status-select" data-id="${safe(item.id)}" aria-label="Update status for ${safe(item.name)}">
          ${['new','contacted','qualified','converted','closed'].map(s =>
            `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select></td>
      </tr>
    `).join('');
  }

  async function loadEnquiries() {
    dashboardMessage.textContent = 'Loading enquiries…';
    const status = statusFilter.value;
    const payload = await api(`/api/admin/enquiries${status === 'all' ? '' : `?status=${encodeURIComponent(status)}`}`);
    enquiries = payload.enquiries || [];
    render();
    dashboardMessage.textContent = `${enquiries.length} most recent record(s) loaded.`;
  }

  async function showDashboard(session) {
    currentSession = session;
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    document.getElementById('signedInAs').textContent = `Signed in as ${session.user.email}`;
    try { await loadEnquiries(); }
    catch (error) { dashboardMessage.textContent = error.message; }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    if (email !== ADMIN_EMAIL) {
      loginMessage.textContent = 'This email is not authorised for StoreGrid administration.';
      return;
    }
    if (!password) {
      loginMessage.textContent = 'Please enter your password.';
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in…';
    loginMessage.textContent = 'Verifying administrator credentials…';

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.session || String(data.user?.email || '').toLowerCase() !== ADMIN_EMAIL) {
        await client.auth.signOut();
        throw new Error('This account is not authorised for StoreGrid administration.');
      }
      passwordInput.value = '';
      await showDashboard(data.session);
    } catch (error) {
      loginMessage.textContent = error.message || 'Unable to sign in. Please try again.';
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'Sign in securely';
    }
  });

  document.getElementById('signOutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    currentSession = null;
    enquiries = [];
    showLogin('You have been signed out.');
  });

  document.getElementById('refreshButton').addEventListener('click', () =>
    loadEnquiries().catch(error => { dashboardMessage.textContent = error.message; })
  );

  statusFilter.addEventListener('change', () =>
    loadEnquiries().catch(error => { dashboardMessage.textContent = error.message; })
  );

  searchInput.addEventListener('input', render);

  rows.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-id]');
    if (!select) return;
    const id = select.dataset.id;
    const newStatus = select.value;
    select.disabled = true;
    try {
      await api('/api/admin/enquiries', {
        method: 'PATCH',
        body: JSON.stringify({ id, status: newStatus })
      });
      const item = enquiries.find(x => x.id === id);
      if (item) item.status = newStatus;
      render();
      dashboardMessage.textContent = 'Enquiry status updated.';
    } catch (error) {
      dashboardMessage.textContent = error.message;
      await loadEnquiries();
    }
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentSession = null;
      enquiries = [];
      showLogin();
      return;
    }
    if (String(session.user.email || '').toLowerCase() !== ADMIN_EMAIL) {
      currentSession = null;
      client.auth.signOut();
      showLogin('This account is not authorised for StoreGrid administration.');
      return;
    }
    if (!currentSession || currentSession.access_token !== session.access_token) {
      currentSession = session;
      showDashboard(session);
    }
  });

  client.auth.getSession().then(({ data }) => {
    const session = data.session;
    if (session && String(session.user.email || '').toLowerCase() === ADMIN_EMAIL) {
      showDashboard(session);
    } else {
      showLogin();
    }
  });
})();
