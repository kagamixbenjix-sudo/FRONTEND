/* ==============================================
   PRODUCT.JS — Product detail page logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   GET PRODUCT ID FROM URL
   The URL looks like: product.html?id=62
   We read the "id" parameter to know which product to load
----------------------------------------------- */
function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/* -----------------------------------------------
   QUANTITY SELECTOR
   Tracks current quantity selected by the user (min 1)
----------------------------------------------- */
let currentQty = 1;

function initQtySelector() {
  const minusBtn  = document.getElementById('qtyMinus');
  const plusBtn   = document.getElementById('qtyPlus');
  const qtyDisplay = document.getElementById('qtyValue');

  minusBtn.addEventListener('click', () => {
    if (currentQty > 1) {
      currentQty--;
      qtyDisplay.textContent = currentQty;
    }
  });

  plusBtn.addEventListener('click', () => {
    currentQty++;
    qtyDisplay.textContent = currentQty;
  });
}

/* -----------------------------------------------
   RENDER PRODUCT
   Takes the product object from the backend and
   fills in all the elements on the page
----------------------------------------------- */
function renderProduct(product) {
  // Update the page title with the product name
  document.title = `${product.name} – SASS BOTTLE`;

  // Product image or emoji placeholder
  const imgWrap = document.getElementById('productImgWrap');
  if (product.image_url) {
    imgWrap.innerHTML = `<img src="${resolveImageUrl(product.image_url)}" alt="${product.name}"/>`;
  } else {
    imgWrap.innerHTML = `<div class="product-img-placeholder">🍾</div>`;
  }

  // Category badge
  if (product.category_name) {
    document.getElementById('productCategory').textContent = product.category_name;
  }

  // Product name
  document.getElementById('productName').textContent = product.name;

  // Price — formatted as "35,000 UGX"
  document.getElementById('productPrice').textContent = formatPrice(product.price);

  // Meta tags: volume, origin, ABV — only shown if value exists
  const metaEl  = document.getElementById('productMeta');
  const metaTags = [];

  if (product.volume_ml) {
    metaTags.push(`<div class="meta-tag"><span>Volume</span>${product.volume_ml} ml</div>`);
  }
  if (product.origin) {
    metaTags.push(`<div class="meta-tag"><span>Origin</span>${product.origin}</div>`);
  }
  if (product.abv) {
    metaTags.push(`<div class="meta-tag"><span>ABV</span>${product.abv}%</div>`);
  }
  if (product.vintage) {
    metaTags.push(`<div class="meta-tag"><span>Vintage</span>${product.vintage}</div>`);
  }

  metaEl.innerHTML = metaTags.join('');

  // Description
  const descEl = document.getElementById('productDescription');
  if (product.description) {
    descEl.textContent = product.description;
  } else {
    descEl.style.display = 'none';
  }

  // Tasting notes
  const tastingEl = document.getElementById('productTasting');
  if (product.tasting_notes) {
    tastingEl.innerHTML = `<strong>Tasting Notes</strong>${product.tasting_notes}`;
  } else {
    tastingEl.style.display = 'none';
  }

  // Stock status and Add to Cart button
  const addBtn    = document.getElementById('addToCartBtn');
  const stockEl   = document.getElementById('stockStatus');

  if (product.in_stock === false) {
    // Product is out of stock
    addBtn.disabled      = true;
    addBtn.textContent   = 'Out of Stock';
    stockEl.className    = 'stock-status out-stock';
    stockEl.textContent  = '✕ Currently unavailable';
  } else {
    // Product is available — wire up the Add to Cart button
    stockEl.className   = 'stock-status in-stock';
    stockEl.textContent = '✓ In stock';

    addBtn.addEventListener('click', () => {
      // Add the product to cart with the selected quantity
      const cart     = JSON.parse(localStorage.getItem('sassBottleCart') || '[]');
      const existing = cart.find(item => item.id === product.id);

      if (existing) {
        existing.quantity += currentQty;
      } else {
        cart.push({
          id:        product.id,
          name:      product.name,
          price:     product.price,
          image_url: product.image_url || null,
          quantity:  currentQty
        });
      }

      localStorage.setItem('sassBottleCart', JSON.stringify(cart));
      updateCartBadge();
      showToast(`${product.name} × ${currentQty} added to cart!`);
    });
  }

  // Show the product detail section (was hidden while loading)
  document.getElementById('productLoading').style.display = 'none';
  document.getElementById('productDetail').style.display  = 'grid';
}

/* -----------------------------------------------
   LOAD RELATED PRODUCTS
   Fetches other products from the same category
   and renders them below the main product info
----------------------------------------------- */
async function loadRelatedProducts(categoryName, currentProductId) {
  try {
    const response = await fetch(
      `${API_BASE}/products?category=${encodeURIComponent(categoryName)}`
    );

    if (!response.ok) return;

    const products = await response.json();

    // Exclude the current product from the related list
    const related = products
      .filter(p => p.id !== currentProductId)
      .slice(0, 4);   // show max 4 related products

    if (related.length === 0) return;

    // Show the related section and fill it
    const section = document.getElementById('relatedSection');
    const grid    = document.getElementById('relatedGrid');

    document.getElementById('relatedLabel').textContent =
      `More from our ${categoryName} collection`;

    related.forEach(product => {
      grid.appendChild(buildProductCard(product));
    });

    section.style.display = 'block';

  } catch (err) {
    // Related products failing is not critical — just hide the section
    console.error('Could not load related products:', err);
  }
}

/* -----------------------------------------------
   FETCH PRODUCT FROM BACKEND
   Uses the id from the URL to call GET /products/:id
----------------------------------------------- */
async function loadProduct() {
  const id = getProductIdFromUrl();

  // If no id in the URL, show an error
  if (!id) {
    document.getElementById('productLoading').style.display = 'none';
    document.getElementById('productError').style.display   = 'block';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/products/${id}`);

    if (!response.ok) {
      throw new Error(`Product not found (status ${response.status})`);
    }

    const product = await response.json();

    // Render the product info on the page
    renderProduct(product);
    initQtySelector();

    // Load related products from the same category
    if (product.category_name) {
      loadRelatedProducts(product.category_name, product.id);
    }

  } catch (err) {
    console.error('Failed to load product:', err);
    document.getElementById('productLoading').style.display = 'none';
    document.getElementById('productError').style.display   = 'block';
  }
}

/* -----------------------------------------------
   INIT
----------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  loadProduct();
});
