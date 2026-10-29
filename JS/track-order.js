/* ==============================================
   TRACK-ORDER.JS — Order tracking logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   HANDLE TRACK FORM SUBMISSION
   Endpoint: GET /orders/track?order_id=X&phone=Y
----------------------------------------------- */
document.getElementById('trackForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const orderId = document.getElementById('trackOrderId').value.trim();
  const phone   = document.getElementById('trackPhone').value.trim();
  const errorEl = document.getElementById('trackError');
  const btn     = document.getElementById('trackSubmitBtn');

  errorEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Searching…';

  try {
    const response = await fetch(
      `${API_BASE}/orders/track?order_id=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Order not found.');
    }

    renderOrderResult(result.data);

    // Hide the form, show the result
    document.getElementById('trackFormCard').style.display   = 'none';
    document.getElementById('trackResultCard').style.display = 'block';

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Track Order';
  }
});

/* -----------------------------------------------
   RENDER ORDER RESULT
----------------------------------------------- */
function renderOrderResult(order) {
  document.getElementById('resultOrderId').textContent = `#${order.order_id}`;

  const statusPill = document.getElementById('resultStatusPill');
  statusPill.textContent = order.status;
  statusPill.className   = `status-pill ${order.status}`;

  document.getElementById('resultCustomer').textContent = order.customer_name;
  document.getElementById('resultZone').textContent     = order.zone_name || '—';
  document.getElementById('resultAddress').textContent  = order.delivery_address;
  document.getElementById('resultPayment').textContent  = order.payment_method;

  const date = new Date(order.created_at);
  document.getElementById('resultDate').textContent =
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  document.getElementById('resultTotal').textContent = formatPrice(order.total_amount);

  // Render the items
  const itemsEl = document.getElementById('resultItems');
  itemsEl.innerHTML = '';
  order.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'result-item-row';
    row.innerHTML = `
      <span>${item.product_name} × ${item.quantity}</span>
      <span>${formatPrice(item.unit_price * item.quantity)}</span>
    `;
    itemsEl.appendChild(row);
  });

  // Update the visual timeline based on status
  updateTimeline(order.status);
}

/* -----------------------------------------------
   UPDATE STATUS TIMELINE
   Highlights the steps completed so far.
   Cancelled orders show a notice instead of the timeline progress.
----------------------------------------------- */
function updateTimeline(status) {
  const steps = document.querySelectorAll('.timeline-step');
  const lines = document.querySelectorAll('.timeline-line');
  const cancelledNotice = document.getElementById('cancelledNotice');
  const timeline = document.getElementById('statusTimeline');

  // Reset all steps
  steps.forEach(s => s.classList.remove('completed'));
  lines.forEach(l => l.classList.remove('completed'));

  if (status === 'Cancelled') {
    timeline.style.opacity = '0.3';
    cancelledNotice.style.display = 'block';
    return;
  }

  timeline.style.opacity = '1';
  cancelledNotice.style.display = 'none';

  // Order of progress: Pending -> Processing -> Delivered
  const order = ['Pending', 'Processing', 'Delivered'];
  const currentIndex = order.indexOf(status);

  steps.forEach((step, i) => {
    if (i <= currentIndex) step.classList.add('completed');
  });

  lines.forEach((line, i) => {
    if (i < currentIndex) line.classList.add('completed');
  });
}

/* -----------------------------------------------
   TRACK ANOTHER ORDER — resets the form
----------------------------------------------- */
document.getElementById('trackAnotherBtn').addEventListener('click', () => {
  document.getElementById('trackForm').reset();
  document.getElementById('trackResultCard').style.display = 'none';
  document.getElementById('trackFormCard').style.display   = 'block';
});

/* -----------------------------------------------
   AUTO-FILL FROM URL
   Supports links from the confirmation page (order_id only)
   and from the account order history (order_id + phone,
   which triggers an automatic lookup — no extra click needed).
----------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
const prefilledOrderId = urlParams.get('order_id');
const prefilledPhone   = urlParams.get('phone');

if (prefilledOrderId) {
  document.getElementById('trackOrderId').value = prefilledOrderId;
}
if (prefilledPhone) {
  document.getElementById('trackPhone').value = prefilledPhone;
}

// If both are present (coming from the account dashboard),
// submit the lookup automatically for a seamless click-through
if (prefilledOrderId && prefilledPhone) {
  document.getElementById('trackForm').requestSubmit();
}
