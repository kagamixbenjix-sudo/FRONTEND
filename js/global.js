/* ==============================================
   GLOBAL.JS — Shared functions for all pages
   SASS BOTTLE | Closet & Taste
================================================ */

/* -----------------------------------------------
   CONFIG
   Change the backend URL here if your port changes
----------------------------------------------- */
const API_BASE = 'http://https://backend-zvo3.onrender.com';

/* -----------------------------------------------
   AGE VERIFICATION BANNER
   Shows on first visit only — stored in localStorage
   so the banner never appears again once confirmed
----------------------------------------------- */
function initAgeBanner() {
  const banner     = document.getElementById('ageBanner');
  const confirmBtn = document.getElementById('ageConfirmBtn');

  if (!banner) return; // safety check — banner must exist in the HTML

  // If the user already confirmed before, hide the banner right away
  if (localStorage.getItem('sassBottleAgeOk') === 'true') {
    banner.style.display = 'none';
    return;
  }

  // User clicks "I confirm" — save the choice and hide the banner
  confirmBtn.addEventListener('click', () => {
    localStorage.setItem('sassBottleAgeOk', 'true');
    banner.style.display = 'none';
  });
}

/* -----------------------------------------------
   MOBILE NAVIGATION TOGGLE
   Opens / closes the nav links on small screens
----------------------------------------------- */
function initMobileNav() {
  const toggle   = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close the mobile menu when the user clicks a link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* -----------------------------------------------
   CART — localStorage helpers
   The cart is an array of objects:
   [ { id, name, price, image_url, quantity }, ... ]
----------------------------------------------- */

/* Read the cart from localStorage */
function getCart() {
  return JSON.parse(localStorage.getItem('sassBottleCart') || '[]');
}

/* Save the cart back to localStorage */
function saveCart(cart) {
  localStorage.setItem('sassBottleCart', JSON.stringify(cart));
}

/* Add a product to the cart (or increment quantity if already there) */
function addToCart(product) {
  const cart     = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  updateCartBadge();
  showToast(`${product.name} added to cart!`);
}

/* Count total items in the cart and update the nav badge */
function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;

  const total = getCart().reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (total > 0) {
    badge.textContent    = total;
    badge.style.display  = 'flex';
  } else {
    badge.style.display  = 'none';
  }
}

/* -----------------------------------------------
   TOAST NOTIFICATION
   Shows a short message at the bottom-right for ~3 seconds
----------------------------------------------- */
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  // Auto-hide after 2.8 seconds
  setTimeout(() => toast.classList.remove('show'), 2800);
}

/* -----------------------------------------------
   FORMAT PRICE
   Formats a number as "6,000 UGX"
----------------------------------------------- */
function formatPrice(amount) {
  return Number(amount).toLocaleString('en-UG') + ' UGX';
}

/* -----------------------------------------------
   RESOLVE IMAGE URL
   Product photos uploaded via the admin are stored as
   relative paths like "/uploads/products/xyz.jpg" —
   this turns them into a full URL pointing at the backend.
   External URLs (http/https) are returned unchanged.
----------------------------------------------- */
function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

/* -----------------------------------------------
   BUILD PRODUCT CARD
   Creates a card element from a product object.
   Used on the homepage and the shop page.
----------------------------------------------- */
function buildProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Use the product image if available, else show a bottle emoji
  const imgHtml = product.image_url
    ? `<img src="${resolveImageUrl(product.image_url)}" alt="${product.name}" loading="lazy"/>`
    : `<div class="product-img-placeholder">🍾</div>`;

  card.innerHTML = `
    <div class="product-img-wrap">
      ${imgHtml}
      ${product.category_name
        ? `<span class="product-badge">${product.category_name}</span>`
        : ''}
    </div>
    <div class="product-info">
      <div class="product-name">${product.name}</div>
      ${product.volume_ml
        ? `<div class="product-volume">${product.volume_ml} ml</div>`
        : ''}
      <div class="product-footer">
        <div class="product-price">${formatPrice(product.price)}</div>
        <button class="btn-buy" data-id="${product.id}">Buy Now</button>
      </div>
    </div>
  `;

  // Clicking the card body opens the product detail page
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-buy')) {
      window.location.href = `product.html?id=${product.id}`;
    }
  });

  // Clicking "Buy Now" adds the item to the cart
  card.querySelector('.btn-buy').addEventListener('click', (e) => {
    e.stopPropagation(); // prevent card click from firing too
    addToCart({
      id:        product.id,
      name:      product.name,
      price:     product.price,
      image_url: product.image_url || null
    });
  });

  return card;
}

/* -----------------------------------------------
   ACCOUNT NAV ICON
   Injected next to the cart icon on every page so we
   don't have to edit every page's HTML by hand.
   Links to account-dashboard.html if logged in,
   or account.html if not.
----------------------------------------------- */
function injectAccountNavIcon() {
  const cartLink = document.querySelector('.nav-cart');
  if (!cartLink) return;   // page has no nav (shouldn't happen, but safe)

  const isLoggedIn = !!localStorage.getItem('sassCustomerToken');

  // If logged in, show a small "Hi, Name" pill next to the icons —
  // appears on every page since this function runs globally
  if (isLoggedIn) {
    const customerUser = JSON.parse(localStorage.getItem('sassCustomerUser') || '{}');
    const firstName = (customerUser.full_name || '').split(' ')[0];

    if (firstName) {
      const namePill = document.createElement('span');
      namePill.className = 'nav-account-name';
      namePill.textContent = `Hi, ${firstName}`;
      cartLink.parentElement.insertBefore(namePill, cartLink);
    }
  }

  const accountLink = document.createElement('a');
  accountLink.href = isLoggedIn ? 'account-dashboard.html' : 'account.html';
  accountLink.className = 'nav-cart';   // reuse the same icon button styling
  accountLink.setAttribute('aria-label', isLoggedIn ? 'My Account' : 'Sign In');
  accountLink.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  `;

  // Insert it right before the cart icon
  cartLink.parentElement.insertBefore(accountLink, cartLink);
}

/* -----------------------------------------------
   INIT — run shared setup on every page load
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initAgeBanner();
  initMobileNav();
  updateCartBadge();
  injectAccountNavIcon();
});
