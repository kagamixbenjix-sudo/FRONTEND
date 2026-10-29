/* ==============================================
   ADMIN-PRODUCTS.JS — Product management logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   AUTH GUARD
----------------------------------------------- */
const adminToken = localStorage.getItem('sassAdminToken');
if (!adminToken) window.location.href = 'admin-login.html';

const adminUser = JSON.parse(localStorage.getItem('sassAdminUser') || '{}');
if (adminUser.username) {
  document.getElementById('adminUsernameDisplay').textContent = adminUser.username;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('sassAdminToken');
  localStorage.removeItem('sassAdminUser');
  window.location.href = 'admin-login.html';
});

/* -----------------------------------------------
   AUTHENTICATED FETCH HELPER
----------------------------------------------- */
async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${adminToken}`
    }
  });

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
let allProducts       = [];
let allCategories      = [];
let currentCategory    = '';
let currentSearch       = '';
let currentSort         = 'name-asc';
let editingProductId   = null;   // null = adding a new product

/* -----------------------------------------------
   LOAD CATEGORIES — used for filter chips + the form select
----------------------------------------------- */
async function loadCategories() {
  try {
    const response = await fetch(`${API_BASE}/categories`);
    allCategories = await response.json();

    // Build filter chips
    const chipsContainer = document.getElementById('categoryFilters');
    allCategories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'status-chip';
      btn.textContent = cat.name;
      btn.dataset.category = cat.name;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#categoryFilters .status-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = cat.name;
        renderProductsTable();
      });
      chipsContainer.appendChild(btn);
    });

    // Build the category <select> options for the form
    const select = document.getElementById('prodCategory');
    allCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });

  } catch (err) {
    console.error('Could not load categories:', err);
  }
}

// "All" chip listener
document.querySelector('#categoryFilters .status-chip[data-category=""]').addEventListener('click', function () {
  document.querySelectorAll('#categoryFilters .status-chip').forEach(c => c.classList.remove('active'));
  this.classList.add('active');
  currentCategory = '';
  renderProductsTable();
});

/* -----------------------------------------------
   SEARCH INPUT — filters the table as the admin types
----------------------------------------------- */
document.getElementById('productSearch').addEventListener('input', function () {
  currentSearch = this.value.trim();
  renderProductsTable();
});

/* -----------------------------------------------
   SORT DROPDOWN — re-renders with the new order
----------------------------------------------- */
document.getElementById('productSortSelect').addEventListener('change', function () {
  currentSort = this.value;
  renderProductsTable();
});

/* -----------------------------------------------
   LOAD PRODUCTS
   Endpoint: GET /admin/products
----------------------------------------------- */
async function loadProducts() {
  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading products…</td></tr>';

  try {
    const response = await adminFetch(`${API_BASE}/admin/products`);
    const result   = await response.json();

    if (!result.success) throw new Error(result.error);

    allProducts = result.data;
    renderProductsTable();

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row">Could not load products: ${err.message}</td></tr>`;
  }
}

/* -----------------------------------------------
   RENDER PRODUCTS TABLE
   Applies the current category filter client-side
----------------------------------------------- */
function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');

  // 1. Filter by selected category
  let filtered = currentCategory
    ? allProducts.filter(p => p.category_name === currentCategory)
    : [...allProducts];

  // 2. Filter by search text — matches anywhere in the product name
  if (currentSearch) {
    const term = currentSearch.toLowerCase();
    filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
  }

  // 3. Sort alphabetically (A–Z or Z–A)
  filtered.sort((a, b) =>
    currentSort === 'name-desc'
      ? b.name.localeCompare(a.name)
      : a.name.localeCompare(b.name)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No products found.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  filtered.forEach(product => {
    const row = document.createElement('tr');

    const availBadge = product.in_stock
      ? '<span class="avail-badge in">✓ In Stock</span>'
      : '<span class="avail-badge out">✕ Out of Stock</span>';

    // Thumbnail — shows the photo if one was uploaded, else a bottle emoji
    const thumbHtml = product.image_url
      ? `<img src="${resolveImageUrl(product.image_url)}" alt="${product.name}"/>`
      : '🍾';

    row.innerHTML = `
      <td><div class="table-thumb">${thumbHtml}</div></td>
      <td>${product.name}</td>
      <td>${product.category_name}</td>
      <td>${formatPrice(product.price)}</td>
      <td>${availBadge}</td>
      <td>
        <button class="btn-toggle-stock" data-id="${product.id}" data-current="${product.in_stock}">
          ${product.in_stock ? 'Mark Out' : 'Mark In'}
        </button>
        <button class="btn-edit-row" data-id="${product.id}">Edit</button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // Wire up the quick toggle buttons
  tbody.querySelectorAll('.btn-toggle-stock').forEach(btn => {
    btn.addEventListener('click', () => quickToggleStock(
      parseInt(btn.dataset.id),
      btn.dataset.current === 'true'
    ));
  });

  // Wire up the edit buttons
  tbody.querySelectorAll('.btn-edit-row').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
  });
}

/* -----------------------------------------------
   QUICK TOGGLE IN STOCK / OUT OF STOCK
   One-click flip from the table, no need to open the modal
----------------------------------------------- */
async function quickToggleStock(productId, currentlyInStock) {
  try {
    const response = await adminFetch(`${API_BASE}/admin/products/${productId}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ in_stock: !currentlyInStock })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast(`${result.data.name} marked as ${result.data.in_stock ? 'in stock' : 'out of stock'}`);
    loadProducts();   // refresh the table

  } catch (err) {
    showToast('Could not update product: ' + err.message);
  }
}

/* -----------------------------------------------
   OPEN "ADD PRODUCT" MODAL
----------------------------------------------- */
document.getElementById('addProductBtn').addEventListener('click', () => {
  editingProductId = null;
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('prodInStock').checked = true;
  document.getElementById('prodInStockLabel').textContent = 'In Stock';
  document.getElementById('deleteProductBtn').style.display = 'none';
  document.getElementById('productFormError').style.display = 'none';

  // Reset the photo preview — no photo selected yet for a new product
  document.getElementById('imagePreviewWrap').style.display = 'none';
  document.getElementById('imagePreview').src = '';

  document.getElementById('productModal').style.display = 'flex';
});

/* -----------------------------------------------
   SHOW PREVIEW WHEN A NEW PHOTO IS SELECTED
   Reads the file locally so the admin sees it instantly,
   before it's even uploaded to the server.
----------------------------------------------- */
document.getElementById('prodImage').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('imagePreview').src = e.target.result;
    document.getElementById('imagePreviewWrap').style.display = 'flex';
  };
  reader.readAsDataURL(file);
});

/* -----------------------------------------------
   OPEN "EDIT PRODUCT" MODAL
----------------------------------------------- */
function openEditModal(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  editingProductId = productId;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('prodName').value     = product.name;
  document.getElementById('prodCategory').value = product.category_id;
  document.getElementById('prodPrice').value    = product.price;
  document.getElementById('prodVolume').value   = product.volume_ml || '';
  document.getElementById('prodInStock').checked = product.in_stock;
  document.getElementById('prodInStockLabel').textContent = product.in_stock ? 'In Stock' : 'Out of Stock';

  document.getElementById('deleteProductBtn').style.display = 'block';
  document.getElementById('productFormError').style.display = 'none';

  // Reset the file input, then show the product's current photo if it has one
  document.getElementById('prodImage').value = '';
  if (product.image_url) {
    document.getElementById('imagePreview').src = resolveImageUrl(product.image_url);
    document.getElementById('imagePreviewWrap').style.display = 'flex';
  } else {
    document.getElementById('imagePreviewWrap').style.display = 'none';
  }

  document.getElementById('productModal').style.display = 'flex';
}

/* -----------------------------------------------
   TOGGLE LABEL TEXT WHEN SWITCH IS FLIPPED
----------------------------------------------- */
document.getElementById('prodInStock').addEventListener('change', function () {
  document.getElementById('prodInStockLabel').textContent = this.checked ? 'In Stock' : 'Out of Stock';
});

/* -----------------------------------------------
   CLOSE MODAL
----------------------------------------------- */
document.getElementById('productModalCloseBtn').addEventListener('click', () => {
  document.getElementById('productModal').style.display = 'none';
});

document.getElementById('productModal').addEventListener('click', (e) => {
  if (e.target.id === 'productModal') {
    document.getElementById('productModal').style.display = 'none';
  }
});

/* -----------------------------------------------
   SAVE PRODUCT (Add or Edit)
----------------------------------------------- */
document.getElementById('productForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const errorEl = document.getElementById('productFormError');
  const btn     = document.getElementById('productSaveBtn');
  errorEl.style.display = 'none';

  // Use FormData instead of JSON so the photo file can be sent along
  // with the other fields in a single request
  const formData = new FormData();
  formData.append('name', document.getElementById('prodName').value.trim());
  formData.append('category_id', document.getElementById('prodCategory').value);
  formData.append('price', document.getElementById('prodPrice').value);

  if (document.getElementById('prodVolume').value) {
    formData.append('volume_ml', document.getElementById('prodVolume').value);
  }

  formData.append('in_stock', document.getElementById('prodInStock').checked);

  // Only attach a photo if the admin actually selected one
  const photoFile = document.getElementById('prodImage').files[0];
  if (photoFile) {
    formData.append('image', photoFile);
  }

  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    const url    = editingProductId ? `${API_BASE}/admin/products/${editingProductId}` : `${API_BASE}/admin/products`;
    const method = editingProductId ? 'PUT' : 'POST';

    // No Content-Type header here — the browser sets the correct
    // multipart boundary automatically when the body is FormData
    const response = await adminFetch(url, {
      method: method,
      body:   formData
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast(editingProductId ? 'Product updated!' : 'Product added!');
    document.getElementById('productModal').style.display = 'none';
    loadProducts();

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save Product';
  }
});

/* -----------------------------------------------
   DELETE PRODUCT
----------------------------------------------- */
document.getElementById('deleteProductBtn').addEventListener('click', async () => {
  if (!editingProductId) return;

  const confirmed = confirm('Are you sure you want to delete this product? This cannot be undone.');
  if (!confirmed) return;

  try {
    const response = await adminFetch(`${API_BASE}/admin/products/${editingProductId}`, {
      method: 'DELETE'
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    showToast('Product deleted.');
    document.getElementById('productModal').style.display = 'none';
    loadProducts();

  } catch (err) {
    showToast('Could not delete: ' + err.message);
  }
});

/* -----------------------------------------------
   INIT
----------------------------------------------- */
loadCategories().then(loadProducts);
