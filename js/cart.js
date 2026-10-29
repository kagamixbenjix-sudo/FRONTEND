/* ==============================================
   CART.JS — Cart & checkout page logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   STATE
----------------------------------------------- */
let deliveryZones = [];      // loaded from backend
let selectedZoneFee = 0;     // fee for the selected delivery zone

/* -----------------------------------------------
   RENDER CART ITEMS
   Reads from localStorage and builds the item rows
----------------------------------------------- */
function renderCartItems() {
  const cart      = getCart();
  const cartEmpty   = document.getElementById('cartEmpty');
  const cartContent = document.getElementById('cartContent');

  // Show empty state if cart has no items
  if (cart.length === 0) {
    cartEmpty.style.display   = 'block';
    cartContent.style.display = 'none';
    return;
  }

  cartEmpty.style.display   = 'none';
  cartContent.style.display = 'grid';

  // Build the item rows
  const itemsEl = document.getElementById('cartItems');
  itemsEl.innerHTML = '';

  cart.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cart-item';

    // Image or emoji placeholder
    const imgHtml = item.image_url
      ? `<img src="${resolveImageUrl(item.image_url)}" alt="${item.name}"/>`
      : '🍾';

    row.innerHTML = `
      <div class="cart-item-img">${imgHtml}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} each</div>
      </div>
      <div class="cart-item-controls">
        <div class="item-qty-wrap">
          <button class="item-qty-btn" data-action="minus" data-index="${index}">−</button>
          <span class="item-qty-value">${item.quantity}</span>
          <button class="item-qty-btn" data-action="plus" data-index="${index}">+</button>
        </div>
        <button class="item-remove-btn" data-index="${index}">Remove</button>
      </div>
    `;

    itemsEl.appendChild(row);
  });

  // Wire up quantity buttons and remove buttons
  itemsEl.querySelectorAll('.item-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index  = parseInt(btn.dataset.index);
      const action = btn.dataset.action;
      updateItemQty(index, action);
    });
  });

  itemsEl.querySelectorAll('.item-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeItem(parseInt(btn.dataset.index));
    });
  });

  // Update summary after rendering
  updateSummary();
}

/* -----------------------------------------------
   UPDATE ITEM QUANTITY
   Increases or decreases an item's quantity.
   Removes the item if quantity reaches 0.
----------------------------------------------- */
function updateItemQty(index, action) {
  const cart = getCart();

  if (action === 'plus') {
    cart[index].quantity += 1;
  } else if (action === 'minus') {
    cart[index].quantity -= 1;
    // Remove the item if quantity drops to 0
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
  }

  saveCart(cart);
  updateCartBadge();
  renderCartItems();   // re-render the whole list
}

/* -----------------------------------------------
   REMOVE ITEM
   Removes one item entirely from the cart
----------------------------------------------- */
function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  updateCartBadge();
  renderCartItems();
}

/* -----------------------------------------------
   UPDATE ORDER SUMMARY
   Recalculates subtotal, delivery fee and total
----------------------------------------------- */
function updateSummary() {
  const cart = getCart();

  // Build the per-item lines in the summary
  const linesEl = document.getElementById('summaryLines');
  linesEl.innerHTML = '';

  let subtotal = 0;

  cart.forEach(item => {
    const lineTotal = parseFloat(item.price) * item.quantity;
    subtotal += lineTotal;

    const line = document.createElement('div');
    line.className = 'summary-line';
    line.innerHTML = `
      <span>${item.name} × ${item.quantity}</span>
      <span>${formatPrice(lineTotal)}</span>
    `;
    linesEl.appendChild(line);
  });

  const total = subtotal + selectedZoneFee;

  // Update the summary rows
  document.getElementById('summarySubtotal').textContent = formatPrice(subtotal);
  document.getElementById('summaryDelivery').textContent = selectedZoneFee > 0
    ? formatPrice(selectedZoneFee)
    : 'Select zone';
  document.getElementById('summaryTotal').textContent = selectedZoneFee > 0
    ? formatPrice(total)
    : '—';

  // Update the Mobile Money USSD link with the current total
  updateUssdLink(total);
}

/* -----------------------------------------------
   PRE-FILL FORM FOR LOGGED-IN CUSTOMERS
   Name, phone and address are filled in automatically —
   but the delivery zone is always left for the customer
   to actively confirm on every order.
----------------------------------------------- */
async function prefillCustomerInfo() {
  const token = localStorage.getItem('sassCustomerToken');
  if (!token) return;   // guest — nothing to pre-fill

  try {
    const response = await fetch(`${API_BASE}/customers/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    if (!result.success) return;

    const { profile } = result.data;

    document.getElementById('customerName').value = profile.full_name;
    document.getElementById('phoneNumber').value   = profile.phone;
    if (profile.default_address) {
      document.getElementById('deliveryAddress').value = profile.default_address;
    }
    // Zone is intentionally left blank — must be chosen each time

  } catch (err) {
    console.error('Could not pre-fill customer info:', err);
  }
}

/* -----------------------------------------------
   LOAD DELIVERY ZONES
   Fetches zones from backend and populates the select
   Endpoint: GET /delivery-zones
----------------------------------------------- */
async function loadDeliveryZones() {
  try {
    const response = await fetch(`${API_BASE}/delivery-zones`);
    if (!response.ok) throw new Error(`Status ${response.status}`);

    const data = await response.json();
    deliveryZones = data.data || data;   // handle both response shapes

    const select = document.getElementById('deliveryZone');

    // Add one option per zone
    deliveryZones.forEach(zone => {
      const opt = document.createElement('option');
      opt.value       = zone.id;
      opt.textContent = `${zone.name} — ${formatPrice(zone.fee)}`;
      opt.dataset.fee = zone.fee;
      opt.dataset.name = zone.name;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Could not load delivery zones:', err);
  }
}

/* -----------------------------------------------
   DELIVERY ZONE CHANGE HANDLER
   Updates the delivery fee and summary when a zone is selected
----------------------------------------------- */
document.getElementById('deliveryZone').addEventListener('change', function () {
  const selected = this.options[this.selectedIndex];

  if (!selected.value) {
    // No zone selected — reset
    selectedZoneFee = 0;
    document.getElementById('zoneFeeInfo').style.display = 'none';
  } else {
    selectedZoneFee = parseFloat(selected.dataset.fee);

    // Show the fee info below the select
    const feeInfo = document.getElementById('zoneFeeInfo');
    document.getElementById('zoneFeeText').textContent =
      `Delivery to ${selected.dataset.name}: ${formatPrice(selectedZoneFee)}`;
    feeInfo.style.display = 'flex';
  }

  updateSummary();
});

/* -----------------------------------------------
   PAYMENT METHOD CHANGE HANDLER
   Shows/hides the Mobile Money USSD section
----------------------------------------------- */
document.querySelectorAll('input[name="payment"]').forEach(radio => {
  radio.addEventListener('change', function () {
    const mmInfo = document.getElementById('mobilMoneyInfo');
    mmInfo.style.display = this.value === 'Mobile Money' ? 'flex' : 'none';
    updateSummary();   // refresh USSD link with current total
  });
});

/* -----------------------------------------------
   UPDATE USSD LINK
   Builds a tel: link that opens the Mobile Money app
   with the total amount pre-filled
----------------------------------------------- */
function updateUssdLink(total) {
  const link = document.getElementById('ussdLink');
  if (!link) return;

  // MTN Mobile Money Uganda USSD code: *165*amount#
  // The tel: scheme opens the phone dialer with the code
  const ussdCode = `*165*${Math.round(total)}#`;
  link.href = `tel:${ussdCode}`;
  link.textContent = `Pay ${formatPrice(total)} via Mobile Money`;
}

/* -----------------------------------------------
   VALIDATE ORDER FORM
   Returns an error message string or null if valid
----------------------------------------------- */
function validateForm() {
  const name    = document.getElementById('customerName').value.trim();
  const phone   = document.getElementById('phoneNumber').value.trim();
  const zone    = document.getElementById('deliveryZone').value;
  const address = document.getElementById('deliveryAddress').value.trim();

  if (!name)    return 'Please enter your full name.';
  if (!phone)   return 'Please enter your phone number.';
  if (!zone)    return 'Please select a delivery zone.';
  if (!address) return 'Please enter your delivery address.';

  return null;   // all good
}

/* -----------------------------------------------
   PLACE ORDER
   Collects all form data and cart items,
   sends them to the backend, then redirects
   to the confirmation page on success.
   Endpoint: POST /orders
----------------------------------------------- */
async function placeOrder() {
  const errorEl = document.getElementById('orderError');
  const btn     = document.getElementById('placeOrderBtn');

  // Hide any previous error
  errorEl.style.display = 'none';

  // Validate the form
  const validationError = validateForm();
  if (validationError) {
    errorEl.textContent   = validationError;
    errorEl.style.display = 'block';
    return;
  }

  // Collect form values
  const customerName    = document.getElementById('customerName').value.trim();
  const phoneNumber     = document.getElementById('phoneNumber').value.trim();
  const deliveryZoneId  = parseInt(document.getElementById('deliveryZone').value);
  const deliveryAddress = document.getElementById('deliveryAddress').value.trim();
  const paymentMethod   = document.querySelector('input[name="payment"]:checked').value;
  const notes           = document.getElementById('orderNote').value.trim();

  // Build the items array from the cart
  const cart  = getCart();
  const items = cart.map(item => ({
    product_id:  item.id,
    quantity:    item.quantity,
    unit_price:  item.price
  }));

  // Disable the button while the request is in progress
  btn.disabled    = true;
  btn.textContent = 'Placing order…';

  try {
    // Attach the customer's token if they're logged in, so the
    // backend can link this order to their account. Guests send
    // no Authorization header at all — checkout works either way.
    const customerToken = localStorage.getItem('sassCustomerToken');
    const headers = { 'Content-Type': 'application/json' };
    if (customerToken) {
      headers['Authorization'] = `Bearer ${customerToken}`;
    }

    const response = await fetch(`${API_BASE}/orders`, {
      method:  'POST',
      headers: headers,
      body: JSON.stringify({
        customer_name:    customerName,
        phone_number:     phoneNumber,
        delivery_zone_id: deliveryZoneId,
        delivery_address: deliveryAddress,
        payment_method:   paymentMethod,
        notes:            notes,
        items:            items
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Something went wrong. Please try again.');
    }

    // Order placed — clear the cart
    localStorage.removeItem('sassBottleCart');
    updateCartBadge();

    // Redirect to the confirmation page with the order ID
    window.location.href = `confirmation.html?order_id=${result.order_id}&total=${result.total_amount}`;

  } catch (err) {
    // Show the error and re-enable the button
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
    btn.disabled          = false;
    btn.textContent       = 'Place Order';
  }
}

/* Wire up the Place Order button */
document.getElementById('placeOrderBtn').addEventListener('click', placeOrder);

/* -----------------------------------------------
   INIT
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderCartItems();
  loadDeliveryZones();
  prefillCustomerInfo();
});
