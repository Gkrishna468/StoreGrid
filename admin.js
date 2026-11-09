
(() => {
  'use strict';

  // ==========================================
  // STOREGRID ADMIN CONFIGURATION
  // ==========================================

  const SUPABASE_URL =
    'https://qziqopbavffhwtbatgxp.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    'sb_publishable_XuR520i3iSxtm8ndU_1OyQ_Zhp8yZOC';

  const ADMIN_EMAIL =
    'gopalkrishna.sv46@gmail.com';

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  // ==========================================
  // HTML ELEMENTS
  // ==========================================

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

  // ==========================================
  // HELPERS
  // ==========================================

  const safe = (value) =>
    String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const dateLabel = (value) =>
    value
      ? new Date(value).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
      : '—';

  function showLogin(message = '') {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    loginMessage.textContent = message;
  }

  // ==========================================
  // AUTHENTICATED API REQUEST
  // ==========================================

  async function api(path, options = {}) {
    const { data } = await client.auth.getSession();

    if (!data.session?.access_token) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || 'Request failed.');
    }

    return payload;
  }

  // ==========================================
  // PASSWORD LOGIN
  // ==========================================

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (email !== ADMIN_EMAIL) {
      loginMessage.textContent =
        'This email is not authorised for StoreGrid administration.';
      return;
    }

    if (!password) {
      loginMessage.textContent = 'Please enter your password.';
      return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';
    loginMessage.textContent = 'Verifying administrator credentials...';

    try {
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        loginMessage.textContent =
          'Login failed. Check your email and password.';
        return;
      }

      if (!data.session ||
          String(data.user?.email || '').toLowerCase() !== ADMIN_EMAIL) {
        await client.auth.signOut();
        loginMessage.textContent =
          'This account is not authorised for StoreGrid administration.';
        return;
      }

      passwordInput.value = '';

      currentSession = data.session;

      await showDashboard(data.session);

    } catch (error) {
      loginMessage.textContent =
        error.message || 'Unable to sign in. Please try again.';
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'Sign in securely';
    }
  });

  // ==========================================
  // DASHBOARD DISPLAY
  // ==========================================

  async function showDashboard(session) {
    currentSession = session;

    loginPanel.hidden = true;
    dashboardPanel.hidden = false;

    document.getElementById('signedInAs').textContent =
      `Signed in as ${session.user.email}`;

    try {
      await loadEnquiries();
    } catch (error) {
      dashboardMessage.textContent = error.message;
    }
  }

  // ==========================================
  // LOAD ENQUIRIES
  // ==========================================

  async function loadEnquiries() {
    dashboardMessage.textContent = 'Loading enquiries...';

    const status = statusFilter.value;

    const payload = await api(
      `/api/admin/enquiries${
        status === 'all'
          ? ''
          : `?status=${encodeURIComponent(status)}`
      }`
    );

    enquiries = payload.enquiries || [];

    render();

    dashboardMessage.textContent =
      `${enquiries.length} record(s) loaded.`;
  }

  // ==========================================
  // SEARCH AND FILTER
  // ==========================================

  function render() {
    const query = searchInput.value.trim().toLowerCase();

    const visible = enquiries.filter(item => {
      const matchesStatus =
        statusFilter.value === 'all' ||
        item.status === statusFilter.value;

      const haystack = [
        item.name,
        item.phone,
        item.email,
        item.category,
        item.area,
        item.message
      ].join(' ').toLowerCase();

      return matchesStatus &&
        (!query || haystack.includes(query));
    });

    if (!visible.length) {
      rows.innerHTML =
        '<tr><td colspan="5">No matching enquiries found.</td></tr>';
      return;
    }

    rows.innerHTML = visible.map(item => `
      <tr>
        <td>
          <strong>${safe(item.name)}</strong>
          <small>${safe(item.message || 'No additional message')}</small>
        </td>

        <td>
          <strong>${safe(item.phone)}</strong>
          <small>${safe(item.email || 'No email provided')}</small>
        </td>

        <td>
          <strong>${safe(item.category || '—')}</strong>
          <small>
            ${safe(item.area || 'Area not specified')}
            ·
            ${safe(item.duration || 'Duration not specified')}
          </small>
        </td>

        <td>${safe(dateLabel(item.created_at))}</td>

        <td>
          <select
            class="status-select"
            data-id="${safe(item.id)}"
            aria-label="Update status for ${safe(item.name)}"
          >
            ${['new', 'contacted', 'qualified', 'converted', 'closed']
              .map(status => `
                <option
                  value="${status}"
                  ${item.status === status ? 'selected' : ''}
                >
                  ${status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              `).join('')}
          </select>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================
  // UPDATE ENQUIRY STATUS
  // ==========================================

  rows.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-id]');

    if (!select) return;

    select.disabled = true;

    try {
      await api('/api/admin/enquiries', {
        method: 'PATCH',
        body: JSON.stringify({
          id: select.dataset.id,
          status: select.value
        })
      });

      const item = enquiries.find(
        x => x.id === select.dataset.id
      );

      if (item) {
        item.status = select.value;
      }

      render();

      dashboardMessage.textContent =
        'Enquiry status updated successfully.';

    } catch (error) {
      dashboardMessage.textContent = error.message;

      await loadEnquiries();

    } finally {
      select.disabled = false;
    }
  });

  // ==========================================
  // SIGN OUT
  // ==========================================

  document
    .getElementById('signOutButton')
    .addEventListener('click', async () => {
      await client.auth.signOut();

      currentSession = null;
      enquiries = [];

      showLogin('You have been signed out.');
    });

  // ==========================================
  // DASHBOARD CONTROLS
  // ==========================================

  document
    .getElementById('refreshButton')
    .addEventListener('click', () => {
      loadEnquiries().catch(error => {
        dashboardMessage.textContent = error.message;
      });
    });

  statusFilter.addEventListener('change', () => {
    loadEnquiries().catch(error => {
      dashboardMessage.textContent = error.message;
    });
  });

  searchInput.addEventListener('input', render);

  // ==========================================
  // AUTHENTICATION SESSION MONITOR
  // ==========================================

  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentSession = null;
      enquiries = [];
      showLogin();
      return;
    }

    const email = String(
      session.user.email || ''
    ).toLowerCase();

    if (email !== ADMIN_EMAIL) {
      currentSession = null;
      client.auth.signOut();
      showLogin(
        'This account is not authorised for StoreGrid administration.'
      );
      return;
    }

    if (
      !currentSession ||
      currentSession.access_token !== session.access_token
    ) {
      currentSession = session;
      showDashboard(session);
    }
  });

  // ==========================================
  // RESTORE EXISTING SESSION
  // ==========================================

  client.auth.getSession().then(({ data }) => {
    const session = data.session;

    if (
      session &&
      String(session.user.email || '').toLowerCase() === ADMIN_EMAIL
    ) {
      currentSession = session;
      showDashboard(session);
    } else {
      showLogin();
    }
  });

})();
