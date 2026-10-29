/* ==============================================
   ADMIN-LOGIN.JS — Admin login logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first (for API_BASE)
================================================ */

/* -----------------------------------------------
   IF ALREADY LOGGED IN, SKIP STRAIGHT TO DASHBOARD
   Checks for a saved token in localStorage
----------------------------------------------- */
if (localStorage.getItem('sassAdminToken')) {
  window.location.href = 'admin-dashboard.html';
}

/* -----------------------------------------------
   HANDLE LOGIN FORM SUBMISSION
----------------------------------------------- */
document.getElementById('adminLoginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');

  errorEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Login failed. Please try again.');
    }

    // Save the token and admin info for future requests
    localStorage.setItem('sassAdminToken', result.token);
    localStorage.setItem('sassAdminUser', JSON.stringify(result.admin));

    // Redirect to the dashboard
    window.location.href = 'admin-dashboard.html';

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
    btn.disabled          = false;
    btn.textContent       = 'Sign In';
  }
});
