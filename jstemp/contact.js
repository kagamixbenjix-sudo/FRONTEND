/* ==============================================
   CONTACT.JS — Contact page logic
   SASS BOTTLE | Closet & Taste
   Requires: global.js loaded first
================================================ */

/* -----------------------------------------------
   HANDLE CONTACT FORM SUBMISSION
   Note: there is no backend endpoint for this form yet.
   For now, we show a success message to the user and
   log the details to the console. A future step could
   wire this to a /contact endpoint or email service.
----------------------------------------------- */
document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();   // stop the page from reloading

  // Collect form values
  const name    = document.getElementById('contactName').value.trim();
  const phone   = document.getElementById('contactPhone').value.trim();
  const email   = document.getElementById('contactEmail').value.trim();
  const subject = document.getElementById('contactSubject').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  // Log the message details (placeholder until a backend endpoint exists)
  console.log('Contact form submitted:', { name, phone, email, subject, message });

  // Show the success message
  document.getElementById('formSuccess').style.display = 'block';

  // Reset the form fields
  this.reset();

  // Also show a toast for consistency with the rest of the site
  showToast('Message sent! We will get back to you soon.');

  // Hide the success message again after a few seconds
  setTimeout(() => {
    document.getElementById('formSuccess').style.display = 'none';
  }, 6000);
});
