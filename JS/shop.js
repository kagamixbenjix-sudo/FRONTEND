/* ==============================================
   SHOP.JS — Shop page logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   STATE
   Tracks the current filter and sort selection
----------------------------------------------- */
let currentCategory = '';      // empty = all categories
let currentSort     = 'name-asc';
let allProducts     = [];      // full list from backend (used for client-side sort)

/* -----------------------------------------------
   LOAD CATEGORIES
   Fetches all categories from the backend and
   builds the filter chip buttons dynamically.
   Endpoint: GET /categories
----------------------------------------------- */
async function loadCategories() {
  const chipsContainer = document.getElementById('filterChips');

  try {
    const response = await fetch(`${API_BASE}/categories`);

    if (!response.ok) throw new Error(`Status ${response.status}`);

    const categories = await response.json();

    // Build one chip per category and append after the "All" chip
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className        = 'chip';
      btn.textContent      = cat.name;
      btn.dataset.category = cat.name;
      btn.setAttribute('role', 'listitem');

      // Clicking a chip filters the product grid
      btn.addEventListener('click', () => selectCategory(cat.name, btn));

      chipsContainer.appendChild(btn);
    });

  } catch (error) {
    // Categories failed to load — not critical, user can still browse all
    console.error('Could not load categories:', error);
  }
}

/* -----------------------------------------------
   SELECT CATEGORY
   Updates the active chip and reloads the products
----------------------------------------------- */
function selectCategory(category, clickedBtn) {
  currentCategory = category;

  // Remove "active" from all chips and set it on the clicked one
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  clickedBtn.classList.add('active');

  // Reload products with the new filter
  displayProducts();
}

/* -----------------------------------------------
   LOAD PRODUCTS
   Fetches all products once, stores them in memory.
   Filtering and sorting happen client-side for speed.
   Endpoint: GET /products  (all products, no limit)
----------------------------------------------- */
async function loadProducts() {
  const grid = document.getElementById('productsGrid');

  try {
    const response = await fetch(`${API_BASE}/products`);

    if (!response.ok) throw new Error(`Status ${response.status}`);

    allProducts = await response.json();

    // Render the initial list (all, sorted by name A-Z)
    displayProducts();

  } catch (error) {
    console.error('Failed to load products:', error);
    grid.innerHTML = `
      <div class="products-error">
        Could not reach the server.<br/>
        Make sure your backend is running on <strong>${API_BASE}</strong>.
      </div>
    `;
  }
}

/* -----------------------------------------------
   DISPLAY PRODUCTS
   Filters and sorts the in-memory product list,
   then renders the cards into the grid.
----------------------------------------------- */
function displayProducts() {
  const grid       = document.getElementById('productsGrid');
  const resultsInfo = document.getElementById('resultsInfo');

  // 1. Filter by selected category (empty = show all)
  let filtered = currentCategory
    ? allProducts.filter(p => p.category_name === currentCategory)
    : [...allProducts];

  // 2. Sort by the current sort selection
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'price-asc':
        return parseFloat(a.price) - parseFloat(b.price);
      case 'price-desc':
        return parseFloat(b.price) - parseFloat(a.price);
      default:
        return 0;
    }
  });

  // 3. Update the results count
  const label = currentCategory ? `in ${currentCategory}` : 'in our collection';
  resultsInfo.textContent = `Showing ${filtered.length} product${filtered.length !== 1 ? 's' : ''} ${label}`;

  // 4. Clear the grid
  grid.innerHTML = '';

  // 5. Show a message if no products match the filter
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <div style="font-size:2rem;">🍾</div>
        <p>No products found in this category.</p>
      </div>
    `;
    return;
  }

  // 6. Build and append a card for each product
  // buildProductCard() comes from global.js
  filtered.forEach(product => {
    grid.appendChild(buildProductCard(product));
  });
}

/* -----------------------------------------------
   SORT CHANGE HANDLER
   Triggered when the user picks a new sort option
----------------------------------------------- */
document.getElementById('sortSelect').addEventListener('change', (e) => {
  currentSort = e.target.value;
  displayProducts();   // re-render with new sort — no new fetch needed
});

/* -----------------------------------------------
   "All" CHIP — already in HTML, needs its listener
----------------------------------------------- */
document.querySelector('.chip[data-category=""]').addEventListener('click', function () {
  currentCategory = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  this.classList.add('active');
  displayProducts();
});

/* -----------------------------------------------
   INIT — runs when the page is fully loaded
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();   // build the filter chips
  loadProducts();     // fetch and display all products
});
