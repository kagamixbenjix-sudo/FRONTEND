/* ==============================================
   ADMIN-DASHBOARD.JS — Admin dashboard logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first (for API_BASE, formatPrice)
================================================ */

/* -----------------------------------------------
   AUTH GUARD
   Redirect to login if there is no saved token
----------------------------------------------- */
const adminToken = localStorage.getItem('sassAdminToken');

if (!adminToken) {
  window.location.href = 'admin-login.html';
}

/* -----------------------------------------------
   DISPLAY ADMIN USERNAME
----------------------------------------------- */
const adminUser = JSON.parse(localStorage.getItem('sassAdminUser') || '{}');
if (adminUser.username) {
  document.getElementById('adminUsernameDisplay').textContent = adminUser.username;
}

/* -----------------------------------------------
   LOGOUT
----------------------------------------------- */
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('sassAdminToken');
  localStorage.removeItem('sassAdminUser');
  window.location.href = 'admin-login.html';
});

/* -----------------------------------------------
   AUTHENTICATED FETCH HELPER
   Wraps fetch() to always include the admin token,
   and redirects to login if the token is rejected.
----------------------------------------------- */
async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${adminToken}`
    }
  });

  // If the token is invalid or expired, send back to login
  if (response.status === 401) {
    localStorage.removeItem('sassAdminToken');
    localStorage.removeItem('sassAdminUser');
    window.location.href = 'admin-login.html';
    throw new Error('Session expired');
  }

  return response;
}

/* -----------------------------------------------
   STATE
----------------------------------------------- */
let currentStatusFilter = '';
let allOrders = [];

/* -----------------------------------------------
   LOAD DASHBOARD STATS
   Endpoint: GET /admin/stats
----------------------------------------------- */
async function loadStats() {
  try {
    const response = await adminFetch(`${API_BASE}/admin/stats`);
    const result   = await response.json();

    if (!result.success) return;

    const stats = result.data;

    document.getElementById('statTotalOrders').textContent   = stats.total_orders;
    document.getElementById('statPendingOrders').textContent = stats.pending_orders;
    document.getElementById('statTodayRevenue').textContent  = formatPrice(stats.today_revenue);
    document.getElementById('statTotalRevenue').textContent  = formatPrice(stats.total_revenue);

  } catch (err) {
    console.error('Could not load stats:', err);
  }
}

/* -----------------------------------------------
   LOAD ORDERS
   Endpoint: GET /admin/orders (optionally ?status=X)
----------------------------------------------- */
async function loadOrders() {
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="loading-row">Loading orders…</td></tr>';

  try {
    const url = currentStatusFilter
      ? `${API_BASE}/admin/orders?status=${currentStatusFilter}`
      : `${API_BASE}/admin/orders`;

    const response = await adminFetch(url);
    const result    = await response.json();

    if (!result.success) throw new Error(result.error);

    allOrders = result.data;
    renderOrdersTable();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-row">Could not load orders: ${err.message}</td></tr>`;
  }
}

/* -----------------------------------------------
   RENDER ORDERS TABLE
----------------------------------------------- */
function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');

  if (allOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">No orders found.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  allOrders.forEach(order => {
    const row = document.createElement('tr');

    // Format the date nicely
    const date = new Date(order.created_at);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
                    ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <td>#${order.order_id}</td>
      <td>${order.customer_name}</td>
      <td>${order.zone_name || '—'}</td>
      <td>${formatPrice(order.total_amount)}</td>
      <td>${order.payment_method}</td>
      <td><span class="status-badge ${order.status}">${order.status}</span></td>
      <td>${dateStr}</td>
      <td>→</td>
    `;

    // Clicking a row opens the detail modal
    row.addEventListener('click', () => openOrderModal(order.order_id));

    tbody.appendChild(row);
  });
}

/* -----------------------------------------------
   STATUS FILTER CHIPS
----------------------------------------------- */
document.querySelectorAll('.status-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentStatusFilter = chip.dataset.status;
    loadOrders();
  });
});

/* -----------------------------------------------
   OPEN ORDER DETAIL MODAL
   Endpoint: GET /admin/orders/:id
----------------------------------------------- */
let currentModalOrderId = null;

async function openOrderModal(orderId) {
  currentModalOrderId = orderId;

  try {
    const response = await adminFetch(`${API_BASE}/admin/orders/${orderId}`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    const order = result.data;

    document.getElementById('modalOrderId').textContent  = `#${order.order_id}`;
    document.getElementById('modalCustomer').textContent = order.customer_name;
    document.getElementById('modalPhone').textContent    = order.phone_number;
    document.getElementById('modalZone').textContent     = order.zone_name || '—';
    document.getElementById('modalAddress').textContent  = order.delivery_address;
    document.getElementById('modalPayment').textContent  = order.payment_method;
    document.getElementById('modalNote').textContent     = order.notes || '—';
    document.getElementById('modalTotal').textContent    = formatPrice(order.total_amount);
    document.getElementById('modalStatusSelect').value   = order.status;

    // Render the item list
    const itemsEl = document.getElementById('modalItems');
    itemsEl.innerHTML = '';

    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'modal-item-row';
      row.innerHTML = `
        <span>${item.product_name} × ${item.quantity}</span>
        <span>${formatPrice(item.unit_price * item.quantity)}</span>
      `;
      itemsEl.appendChild(row);
    });

    document.getElementById('orderModal').style.display = 'flex';

  } catch (err) {
    showToast('Could not load order details: ' + err.message);
  }
}

/* -----------------------------------------------
   CLOSE MODAL
----------------------------------------------- */
document.getElementById('modalCloseBtn').addEventListener('click', () => {
  document.getElementById('orderModal').style.display = 'none';
});

// Close modal when clicking outside the box
document.getElementById('orderModal').addEventListener('click', (e) => {
  if (e.target.id === 'orderModal') {
    document.getElementById('orderModal').style.display = 'none';
  }
});

/* -----------------------------------------------
   UPDATE ORDER STATUS
   Endpoint: PATCH /admin/orders/:id/status
----------------------------------------------- */
document.getElementById('updateStatusBtn').addEventListener('click', async () => {
  const newStatus = document.getElementById('modalStatusSelect').value;
  const btn       = document.getElementById('updateStatusBtn');

  btn.disabled    = true;
  btn.textContent = 'Updating…';

  try {
    const response = await adminFetch(
      `${API_BASE}/admin/orders/${currentModalOrderId}/status`,
      {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus })
      }
    );

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast(`Order #${currentModalOrderId} updated to ${newStatus}`);

    // Close modal and refresh the orders list + stats
    document.getElementById('orderModal').style.display = 'none';
    loadOrders();
    loadStats();

  } catch (err) {
    showToast('Could not update status: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Update';
  }
});

/* -----------------------------------------------
   INIT
----------------------------------------------- */
loadStats();
loadOrders();
