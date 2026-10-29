/* ==============================================
   CONFIRMATION.JS — Order confirmation page logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   READ ORDER INFO FROM URL
   The cart page redirects here with:
   confirmation.html?order_id=42&total=35000
   We extract those values and display them.
----------------------------------------------- */
function displayOrderInfo() {
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get('order_id');
  const total   = params.get('total');

  // Display the order ID — e.g. "#42"
  const orderIdEl = document.getElementById('orderIdDisplay');
  if (orderId) {
    orderIdEl.textContent = `#${orderId}`;
  } else {
    orderIdEl.textContent = '—';
  }

  // Display the total amount — formatted as "35,000 UGX"
  const totalEl = document.getElementById('orderTotalDisplay');
  if (total) {
    totalEl.textContent = formatPrice(total);
  } else {
    totalEl.textContent = '—';
  }
}

/* -----------------------------------------------
   INIT
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  displayOrderInfo();
});
