/* ==============================================
   ACCOUNT.JS — Customer login/register logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   IF ALREADY LOGGED IN, GO STRAIGHT TO DASHBOARD
----------------------------------------------- */
if (localStorage.getItem('sassCustomerToken')) {
  window.location.href = 'account-dashboard.html';
}

/* -----------------------------------------------
   TOGGLE BETWEEN SIGN IN / CREATE ACCOUNT
----------------------------------------------- */
const loginForm    = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showLoginBtn  = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');

showLoginBtn.addEventListener('click', () => {
  showLoginBtn.classList.add('active');
  showRegisterBtn.classList.remove('active');
  loginForm.style.display    = 'flex';
  registerForm.style.display = 'none';
});

showRegisterBtn.addEventListener('click', () => {
  showRegisterBtn.classList.add('active');
  showLoginBtn.classList.remove('active');
  registerForm.style.display = 'flex';
  loginForm.style.display    = 'none';
});

/* -----------------------------------------------
   HANDLE LOGIN
----------------------------------------------- */
loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const phone    = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');

  errorEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const response = await fetch(`${API_BASE}/customers/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ phone, password })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Sign in failed');
    }

    localStorage.setItem('sassCustomerToken', result.token);
    localStorage.setItem('sassCustomerUser', JSON.stringify(result.customer));

    window.location.href = 'account-dashboard.html';

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
    btn.disabled           = false;
    btn.textContent        = 'Sign In';
  }
});

/* -----------------------------------------------
   HANDLE REGISTRATION
----------------------------------------------- */
registerForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const full_name = document.getElementById('regName').value.trim();
  const phone     = document.getElementById('regPhone').value.trim();
  const email     = document.getElementById('regEmail').value.trim();
  const password  = document.getElementById('regPassword').value;
  const errorEl   = document.getElementById('registerError');
  const btn       = document.getElementById('registerBtn');

  errorEl.style.display = 'none';
  btn.disabled    = true;
  btn.textContent = 'Creating account…';

  try {
    const response = await fetch(`${API_BASE}/customers/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ full_name, phone, email: email || undefined, password })
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Registration failed');
    }

    localStorage.setItem('sassCustomerToken', result.token);
    localStorage.setItem('sassCustomerUser', JSON.stringify(result.customer));

    window.location.href = 'account-dashboard.html';

  } catch (err) {
    errorEl.textContent   = err.message;
    errorEl.style.display = 'block';
    btn.disabled           = false;
    btn.textContent        = 'Create Account';
  }
});
