/* ==============================================
   ADMIN-REPORTS.JS — Sales reports logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js + Chart.js loaded first
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

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), 'Authorization': `Bearer ${adminToken}` }
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
   CHART.JS THEME DEFAULTS
   Matches the site's chocolate/gold palette
----------------------------------------------- */
Chart.defaults.color = 'rgba(245, 237, 216, 0.65)';
Chart.defaults.font.family = "'Jost', sans-serif";
Chart.defaults.borderColor = 'rgba(201, 153, 58, 0.12)';

const GOLD        = '#C9993A';
const GOLD_LIGHT  = '#E8C06A';
const CREAM       = '#F5EDD8';

// A soft gold-toned palette for multi-slice charts (categories, status)
const PALETTE = ['#C9993A', '#E8C06A', '#6B1A2A', '#7C4A1A', '#8a6a3f', '#4a3018', '#b07a2e'];

const STATUS_COLORS = {
  Pending:    '#ebb757',
  Processing: '#569bd6',
  Delivered:  '#6fcf97',
  Cancelled:  '#eb5757'
};

let revenueChartInstance, topProductsChartInstance, categoryChartInstance, statusChartInstance;

/* -----------------------------------------------
   LOAD REVENUE CHART
   Endpoint: GET /admin/reports/revenue?days=7|30
----------------------------------------------- */
async function loadRevenueChart(days) {
  try {
    const response = await adminFetch(`${API_BASE}/admin/reports/revenue?days=${days}`);
    const result   = await response.json();
    if (!result.success) return;

    const data = result.data;

    // Build a complete date range (fills in days with 0 revenue)
    const labels = [];
    const values = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      labels.push(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }));

      const match = data.find(row => row.day.split('T')[0] === dateStr);
      values.push(match ? parseFloat(match.revenue) : 0);
    }

    const ctx = document.getElementById('revenueChart');

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (UGX)',
          data: values,
          borderColor: GOLD,
          backgroundColor: 'rgba(201, 153, 58, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: GOLD_LIGHT,
          pointBorderColor: GOLD,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: 'rgba(201, 153, 58, 0.08)' },
            ticks: { callback: (v) => formatPrice(v) }
          }
        }
      }
    });

  } catch (err) {
    console.error('Could not load revenue chart:', err);
  }
}

/* -----------------------------------------------
   PERIOD TOGGLE — 7 days / 30 days buttons
----------------------------------------------- */
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadRevenueChart(parseInt(btn.dataset.days));
  });
});

/* -----------------------------------------------
   LOAD TOP PRODUCTS CHART
   Endpoint: GET /admin/reports/top-products?limit=5
----------------------------------------------- */
async function loadTopProductsChart() {
  try {
    const response = await adminFetch(`${API_BASE}/admin/reports/top-products?limit=6`);
    const result   = await response.json();
    if (!result.success) return;

    const data = result.data;
    const ctx  = document.getElementById('topProductsChart');

    if (data.length === 0) {
      ctx.parentElement.innerHTML = '<div class="report-empty">No sales yet — this chart will fill in once orders come through.</div>';
      return;
    }

    if (topProductsChartInstance) topProductsChartInstance.destroy();

    topProductsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(p => p.name),
        datasets: [{
          label: 'Units Sold',
          data: data.map(p => parseInt(p.total_sold)),
          backgroundColor: GOLD,
          borderRadius: 6,
          maxBarThickness: 28
        }]
      },
      options: {
        indexAxis: 'y',   // horizontal bars — easier to read product names
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(201, 153, 58, 0.08)' } },
          y: { grid: { display: false } }
        }
      }
    });

  } catch (err) {
    console.error('Could not load top products chart:', err);
  }
}

/* -----------------------------------------------
   LOAD CATEGORY REVENUE CHART
   Endpoint: GET /admin/reports/by-category
----------------------------------------------- */
async function loadCategoryChart() {
  try {
    const response = await adminFetch(`${API_BASE}/admin/reports/by-category`);
    const result   = await response.json();
    if (!result.success) return;

    const data = result.data;
    const ctx  = document.getElementById('categoryChart');

    if (data.length === 0) {
      ctx.parentElement.innerHTML = '<div class="report-empty">No sales yet — this chart will fill in once orders come through.</div>';
      return;
    }

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(c => c.category_name),
        datasets: [{
          data: data.map(c => parseFloat(c.total_revenue)),
          backgroundColor: PALETTE,
          borderColor: '#2C1A0E',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
          }
        }
      }
    });

  } catch (err) {
    console.error('Could not load category chart:', err);
  }
}

/* -----------------------------------------------
   LOAD ORDER STATUS BREAKDOWN
   Endpoint: GET /admin/reports/status-breakdown
----------------------------------------------- */
async function loadStatusChart() {
  try {
    const response = await adminFetch(`${API_BASE}/admin/reports/status-breakdown`);
    const result   = await response.json();
    if (!result.success) return;

    const data = result.data;
    const ctx  = document.getElementById('statusChart');
    const legendEl = document.getElementById('statusLegend');

    if (data.length === 0) {
      ctx.parentElement.innerHTML = '<div class="report-empty">No orders yet.</div>';
      return;
    }

    const colors = data.map(row => STATUS_COLORS[row.status] || GOLD);

    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(row => row.status),
        datasets: [{
          data: data.map(row => parseInt(row.count)),
          backgroundColor: colors,
          borderColor: '#2C1A0E',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }   // custom legend built below instead
      }
    });

    // Build the custom legend with counts
    legendEl.innerHTML = '';
    data.forEach((row, i) => {
      const item = document.createElement('div');
      item.className = 'status-legend-item';
      item.innerHTML = `
        <div class="status-legend-label">
          <span class="status-legend-dot" style="background:${colors[i]}"></span>
          ${row.status}
        </div>
        <span class="status-legend-count">${row.count}</span>
      `;
      legendEl.appendChild(item);
    });

  } catch (err) {
    console.error('Could not load status chart:', err);
  }
}

/* -----------------------------------------------
   INIT
----------------------------------------------- */
loadRevenueChart(7);
loadTopProductsChart();
loadCategoryChart();
loadStatusChart();
