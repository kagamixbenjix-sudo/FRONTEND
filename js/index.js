/* ==============================================
   INDEX.JS — Homepage logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   FETCH FEATURED PRODUCTS
   Loads up to 8 products from the backend
   and renders them in the homepage grid.
   Endpoint: GET /products?limit=8
----------------------------------------------- */
async function loadFeaturedProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  try {
    // Request the first 8 products from the backend
    const response = await fetch(`${API_BASE}/products?limit=8`);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const products = await response.json();

    // Clear the loading placeholder
    grid.innerHTML = '';

    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="products-error">No products available at the moment.</div>';
      return;
    }

    // Build and append a card for each product returned
    products.forEach(product => {
      grid.appendChild(buildProductCard(product));
    });

  } catch (error) {
    // Show a friendly message if the backend is not reachable
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
   INIT — runs when the page is fully loaded
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedProducts();
});
