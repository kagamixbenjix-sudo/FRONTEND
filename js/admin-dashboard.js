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
    document.getElementById('modalPhone').textContent    = order.phone_number || '—';
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

/* ================================================
   NEW IN-STORE SALE
   Lets the admin build a small cart of products +
   quantities for a walk-in customer, then submits
   it all as one order via POST /admin/orders/in-store
================================================ */

let inStoreProducts = [];   // all products, loaded once and reused
let inStoreCart      = [];   // items added to the current sale in progress
let inStoreQty       = 1;    // quantity selected via the stepper, for the next item to add

/* -----------------------------------------------
   QUANTITY STEPPER — +/- buttons next to the
   product picker, mirrors the public product page
----------------------------------------------- */
document.getElementById('inStoreQtyMinus').addEventListener('click', () => {
  if (inStoreQty > 1) {
    inStoreQty--;
    document.getElementById('inStoreQtyValue').textContent = inStoreQty;
  }
});

document.getElementById('inStoreQtyPlus').addEventListener('click', () => {
  inStoreQty++;
  document.getElementById('inStoreQtyValue').textContent = inStoreQty;
});

/* -----------------------------------------------
   LOAD PRODUCTS FOR THE PICKER
   Endpoint: GET /admin/products
   Skips products that are out of stock — nothing to
   sell for them right now.
----------------------------------------------- */
async function loadInStoreProducts() {
  try {
    const response = await adminFetch(`${API_BASE}/admin/products`);
    const result   = await response.json();
    if (!result.success) throw new Error(result.error);

    inStoreProducts = result.data.filter(p => p.in_stock !== false);

    const select = document.getElementById('inStoreProductSelect');
    select.innerHTML = '';

    inStoreProducts.forEach(product => {
      const opt = document.createElement('option');
      opt.value = product.id;
      const stockHint = product.stock_mode === 'quantity'
        ? ` (${product.stock_quantity} in stock)`
        : '';
      opt.textContent = `${product.name} — ${formatPrice(product.price)}${stockHint}`;
      select.appendChild(opt);
    });

    // Show the thumbnail for whichever product ends up selected first
    updateInStoreProductPreview();

  } catch (err) {
    console.error('Could not load products for in-store sale:', err);
  }
}

/* -----------------------------------------------
   UPDATE PRODUCT THUMBNAIL PREVIEW
   Shows the photo of whichever product is currently
   selected in the dropdown, so the admin can visually
   confirm it's the right one before adding it.
----------------------------------------------- */
function updateInStoreProductPreview() {
  const select  = document.getElementById('inStoreProductSelect');
  const preview = document.getElementById('inStoreProductPreview');
  const productId = parseInt(select.value);
  const product = inStoreProducts.find(p => p.id === productId);

  if (product && product.image_url) {
    preview.innerHTML = `<img src="${resolveImageUrl(product.image_url)}" alt="${product.name}"/>`;
  } else {
    preview.innerHTML = '🍾';
  }
}

document.getElementById('inStoreProductSelect').addEventListener('change', updateInStoreProductPreview);

/* -----------------------------------------------
   OPEN THE "NEW IN-STORE SALE" MODAL
   Resets the cart every time it's opened fresh.
----------------------------------------------- */
document.getElementById('newInStoreSaleBtn').addEventListener('click', async () => {
  inStoreCart = [];
  document.getElementById('inStoreCustomerName').value = '';
  inStoreQty = 1;
  document.getElementById('inStoreQtyValue').textContent = inStoreQty;
  document.getElementById('inStoreFormError').style.display = 'none';
  renderInStoreCart();

  // Reload products fresh each time, so stock numbers shown are current
  await loadInStoreProducts();

  document.getElementById('inStoreModal').style.display = 'flex';
});

document.getElementById('inStoreModalCloseBtn').addEventListener('click', () => {
  document.getElementById('inStoreModal').style.display = 'none';
});

document.getElementById('inStoreModal').addEventListener('click', (e) => {
  if (e.target.id === 'inStoreModal') {
    document.getElementById('inStoreModal').style.display = 'none';
  }
});

/* -----------------------------------------------
   ADD AN ITEM TO THE IN-PROGRESS SALE
   Merges with an existing line if the same product
   was already added once.
----------------------------------------------- */
document.getElementById('inStoreAddItemBtn').addEventListener('click', () => {
  const select  = document.getElementById('inStoreProductSelect');
  const productId = parseInt(select.value);
  const quantity  = inStoreQty;

  if (!productId || !quantity || quantity < 1) return;

  const product = inStoreProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = inStoreCart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    inStoreCart.push({
      product_id: productId,
      name:       product.name,
      price:      product.price,
      quantity:   quantity
    });
  }

  // Reset the stepper back to 1 for the next item
  inStoreQty = 1;
  document.getElementById('inStoreQtyValue').textContent = inStoreQty;

  renderInStoreCart();
});

/* -----------------------------------------------
   RENDER THE RUNNING CART LIST + TOTAL
----------------------------------------------- */
function renderInStoreCart() {
  const itemsEl = document.getElementById('inStoreItems');

  if (inStoreCart.length === 0) {
    itemsEl.innerHTML = '<p class="instore-empty-state">🍾 No items added yet — start by picking a product above.</p>';
    document.getElementById('inStoreTotal').textContent = formatPrice(0);
    return;
  }

  itemsEl.innerHTML = '';
  let total = 0;

  inStoreCart.forEach((item, index) => {
    const lineTotal = parseFloat(item.price) * item.quantity;
    total += lineTotal;

    const row = document.createElement('div');
    row.className = 'modal-item-row';
    row.innerHTML = `
      <span class="instore-item-name"><span class="instore-bottle-icon">🍾</span>${item.name} × ${item.quantity}</span>
      <span style="display:flex; align-items:center; gap:10px;">
        ${formatPrice(lineTotal)}
        <button type="button" class="btn-remove-in-store-item" data-index="${index}">Remove</button>
      </span>
    `;
    itemsEl.appendChild(row);
  });

  document.getElementById('inStoreTotal').textContent = formatPrice(total);

  itemsEl.querySelectorAll('.btn-remove-in-store-item').forEach(btn => {
    btn.addEventListener('click', () => {
      inStoreCart.splice(parseInt(btn.dataset.index), 1);
      renderInStoreCart();
    });
  });
}

/* -----------------------------------------------
   RECORD THE SALE
   Endpoint: POST /admin/orders/in-store
----------------------------------------------- */
document.getElementById('recordSaleBtn').addEventListener('click', async () => {
  const errorEl = document.getElementById('inStoreFormError');
  const btn     = document.getElementById('recordSaleBtn');
  errorEl.style.display = 'none';

  if (inStoreCart.length === 0) {
    errorEl.textContent   = 'Add at least one product before recording the sale.';
    errorEl.style.display = 'block';
    return;
  }

  const customerName = document.getElementById('inStoreCustomerName').value.trim();

  btn.disabled    = true;
  btn.textContent = 'Recording…';

  try {
    const response = await adminFetch(`${API_BASE}/admin/orders/in-store`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName || undefined,
        items: inStoreCart.map(item => ({
          product_id: item.product_id,
          quantity:   item.quantity
        }))
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast(`Sale #${result.order_id} recorded — ${formatPrice(result.total)}`);
    document.getElementById('inStoreModal').style.display = 'none';

    loadOrders();
    loadStats();

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Record Sale';
  }
});

/* -----------------------------------------------
   INIT
----------------------------------------------- */
loadStats();
loadOrders();