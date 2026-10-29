/* ==============================================
   ACCOUNT-DASHBOARD.JS — Customer dashboard logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   AUTH GUARD
----------------------------------------------- */
const customerToken = localStorage.getItem('sassCustomerToken');
if (!customerToken) window.location.href = 'account.html';

/* -----------------------------------------------
   LOGOUT
----------------------------------------------- */
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('sassCustomerToken');
  localStorage.removeItem('sassCustomerUser');
  window.location.href = 'index.html';
});

/* -----------------------------------------------
   AUTHENTICATED FETCH HELPER
----------------------------------------------- */
async function customerFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': `Bearer ${customerToken}` }
  });

  if (response.status === 401) {
    localStorage.removeItem('sassCustomerToken');
    localStorage.removeItem('sassCustomerUser');
    window.location.href = 'account.html';
    throw new Error('Session expired');
  }

  return response;
}

/* -----------------------------------------------
   LOAD PROFILE + ORDER HISTORY
   Endpoint: GET /customers/me
----------------------------------------------- */
async function loadAccount() {
  try {
    const response = await customerFetch(`${API_BASE}/customers/me`);
    const result    = await response.json();

    if (!result.success) throw new Error(result.error);

    const { profile, orders } = result.data;

    // Fill in the name in the welcome header
    document.getElementById('dashName').textContent = profile.full_name.split(' ')[0];

    // Fill in the profile card
    document.getElementById('profileName').textContent    = profile.full_name;
    document.getElementById('profilePhone').textContent   = profile.phone;
    document.getElementById('profileEmail').textContent   = profile.email || '—';
    document.getElementById('profileAddress').textContent = profile.default_address || 'Not set';
    document.getElementById('editAddress').value          = profile.default_address || '';

    renderOrderHistory(orders);

  } catch (err) {
    // Show the error visibly instead of only logging it silently —
    // makes it much easier to diagnose if something goes wrong
    console.error('Could not load account:', err);
    showToast('Could not load your account: ' + err.message);
    document.getElementById('ordersWrap').innerHTML =
      `<div class="dash-loading">Error: ${err.message}</div>`;
  }
}

/* -----------------------------------------------
   RENDER ORDER HISTORY LIST
----------------------------------------------- */
function renderOrderHistory(orders) {
  const wrap = document.getElementById('ordersWrap');

  if (orders.length === 0) {
    wrap.innerHTML = `
      <div class="dash-loading">
        You haven't placed any orders yet.<br/>
        <a href="shop.html" style="color:var(--gold); font-weight:600;">Start shopping →</a>
      </div>
    `;
    return;
  }

  wrap.innerHTML = '';

  // Get the customer's own phone to build the track-order link
  const customerUser = JSON.parse(localStorage.getItem('sassCustomerUser') || '{}');

  orders.forEach(order => {
    const date = new Date(order.created_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const row = document.createElement('a');
    row.className = 'dash-order-row';
    row.href = `track-order.html?order_id=${order.order_id}&phone=${encodeURIComponent(customerUser.phone || '')}`;
    row.style.textDecoration = 'none';
    row.style.cursor = 'pointer';

    row.innerHTML = `
      <span class="dash-order-id">#${order.order_id}</span>
      <span class="dash-order-zone">${order.zone_name || '—'}</span>
      <span class="dash-order-total">${formatPrice(order.total_amount)}</span>
      <span class="status-badge ${order.status}">${order.status}</span>
      <span class="dash-order-date">${dateStr}</span>
    `;

    wrap.appendChild(row);
  });
}

/* -----------------------------------------------
   SAVE DEFAULT ADDRESS
   Endpoint: PUT /customers/me
----------------------------------------------- */
document.getElementById('saveAddressBtn').addEventListener('click', async () => {
  const address = document.getElementById('editAddress').value.trim();
  const btn     = document.getElementById('saveAddressBtn');

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const response = await customerFetch(`${API_BASE}/customers/me`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ default_address: address })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    document.getElementById('profileAddress').textContent = result.data.default_address || 'Not set';
    showToast('Default address updated!');

  } catch (err) {
    showToast('Could not update address: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save';
  }
});

/* -----------------------------------------------
   INIT
----------------------------------------------- */
loadAccount();
