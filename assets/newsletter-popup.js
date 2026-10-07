/**
 * DizzyCustom Luxury Newsletter Popup & Floating Launcher
 * - Custom Shopify Native Customer Email Form (AJAX submission)
 * - Auto-popup after configurable delay (default 7s)
 * - Persistent left floating badge on dismissal with re-open capability
 * - Instant discount code display + 1-click copy
 * - Distinct state for previously subscribed contacts
 * - Shopify Theme Editor responsive preview support
 */

(() => {
  const initNewsletterPopup = () => {
    const container = document.querySelector('[data-dizzy-popup-container]');
    if (!container) return;

    const enabled = container.getAttribute('data-enabled') === 'true';
    if (!enabled) return;

    const delaySeconds = parseInt(container.getAttribute('data-delay') || '7', 10);
    const delayMs = Math.max(1, delaySeconds) * 1000;
    const discountCode = container.getAttribute('data-discount-code') || 'DIZZYWELCOME10';

    const backdrop = container.querySelector('.dizzy-popup-backdrop');
    const modal = container.querySelector('.dizzy-popup-modal');
    const closeBtn = container.querySelector('.dizzy-popup__close-btn');
    const cancelBtn = container.querySelector('.dizzy-popup__btn-secondary');
    const launcher = container.querySelector('.dizzy-popup-launcher');
    const form = container.querySelector('#DizzyNewsletterPopupForm');
    const inputEmail = container.querySelector('.dizzy-popup__input');
    const submitBtn = container.querySelector('.dizzy-popup__btn-primary');
    const errorMsg = container.querySelector('.dizzy-popup__error-msg');

    const viewForm = container.querySelector('#DizzyPopupViewForm');
    const viewSuccess = container.querySelector('#DizzyPopupViewSuccess');
    const viewAlready = container.querySelector('#DizzyPopupViewAlreadySubscribed');

    const copyBtns = container.querySelectorAll('.dizzy-popup__copy-btn');
    const continueBtns = container.querySelectorAll('.dizzy-popup__btn-continue');

    // Storage Keys
    const SESSION_DISMISSED_KEY = 'dizzy_popup_session_dismissed';
    const LOCAL_EMAILS_KEY = 'dizzy_newsletter_subscribed_emails';

    const getStoredEmails = () => {
      try {
        const item = localStorage.getItem(LOCAL_EMAILS_KEY);
        return item ? JSON.parse(item) : [];
      } catch (e) {
        return [];
      }
    };

    const addStoredEmail = (email) => {
      try {
        const emails = getStoredEmails();
        const normalized = email.trim().toLowerCase();
        if (!emails.includes(normalized)) {
          emails.push(normalized);
          localStorage.setItem(LOCAL_EMAILS_KEY, JSON.stringify(emails));
        }
      } catch (e) {
        // Fallback silently if storage unavailable
      }
    };

    const isEmailAlreadyStored = (email) => {
      const emails = getStoredEmails();
      return emails.includes(email.trim().toLowerCase());
    };

    // State Transitions
    const showView = (viewToShow) => {
      if (viewForm) viewForm.style.display = 'none';
      if (viewSuccess) viewSuccess.style.display = 'none';
      if (viewAlready) viewAlready.style.display = 'none';

      if (viewToShow) {
        viewToShow.style.display = 'block';
      }
    };

    // Modal Controls
    const openPopup = () => {
      if (!backdrop) return;
      backdrop.classList.add('is-active');
      if (launcher) launcher.classList.remove('is-visible');

      // Autofocus input if on form view
      if (viewForm && viewForm.style.display !== 'none' && inputEmail) {
        setTimeout(() => inputEmail.focus(), 250);
      }
    };

    const closePopup = () => {
      if (!backdrop) return;
      backdrop.classList.remove('is-active');

      try {
        sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
      } catch (e) {}

      // Reveal floating launcher tag on dismissal
      if (launcher) {
        setTimeout(() => {
          launcher.classList.add('is-visible');
        }, 300);
      }
    };

    // Event Bindings
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (cancelBtn) cancelBtn.addEventListener('click', closePopup);

    if (continueBtns) {
      continueBtns.forEach(btn => {
        btn.addEventListener('click', closePopup);
      });
    }

    if (launcher) {
      launcher.addEventListener('click', () => {
        launcher.classList.remove('is-visible');
        openPopup();
      });
    }

    // Backdrop click-to-close (clicking outside modal)
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closePopup();
        }
      });
    }

    // Escape key listener
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop && backdrop.classList.contains('is-active')) {
        closePopup();
      }
    });

    const fallbackCopy = (text, callback) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        callback();
      } catch (err) {}
      document.body.removeChild(textarea);
    };

    // Copy Code Logic
    copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code') || discountCode;
        const showCopiedFeedback = () => {
          btn.classList.add('is-copied');
          const originalHTML = btn.innerHTML;
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>COPIED! ✓</span>
          `;
          setTimeout(() => {
            btn.classList.remove('is-copied');
            btn.innerHTML = originalHTML;
          }, 2500);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(showCopiedFeedback).catch(() => {
            fallbackCopy(code, showCopiedFeedback);
          });
        } else {
          fallbackCopy(code, showCopiedFeedback);
        }
      });
    });

    // Form Submission (Shopify Native Customer AJAX - 0-Reload Guarantee)
    const handleFormSubmit = async (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const emailVal = inputEmail ? inputEmail.value.trim() : '';

      if (!emailVal || !emailVal.includes('@')) {
        if (errorMsg) {
          errorMsg.textContent = 'Please enter a valid email address.';
          errorMsg.style.display = 'block';
        }
        return false;
      }

      if (errorMsg) errorMsg.style.display = 'none';

      // 1. Client-side check: has this user already subscribed with this email?
      if (isEmailAlreadyStored(emailVal)) {
        showView(viewAlready);
        return false;
      }

      // 2. Submit to native Shopify Customer Form endpoint via AJAX
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.innerText;
        submitBtn.innerText = 'Subscribing...';
      }

      try {
        const formData = form ? new FormData(form) : new FormData();
        if (!formData.has('contact[email]')) {
          formData.append('contact[email]', emailVal);
          formData.append('contact[tags]', 'newsletter,popup_welcome10');
          formData.append('form_type', 'customer');
          formData.append('utf8', '✓');
        }

        const endpoint = (form && form.getAttribute('action')) 
          ? form.getAttribute('action').split('#')[0] 
          : '/contact';

        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'text/html'
          }
        });

        const responseText = await response.text();

        // Check if response indicates an error or already subscribed
        const isTaken = responseText.includes('already been taken') || 
                        responseText.includes('already left') || 
                        responseText.includes('form__message--error');

        if (isTaken) {
          addStoredEmail(emailVal);
          showView(viewAlready);
        } else {
          addStoredEmail(emailVal);
          showView(viewSuccess);
        }
      } catch (err) {
        // Fallback gracefully on network error: show success and store email
        addStoredEmail(emailVal);
        showView(viewSuccess);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = submitBtn.dataset.origText || 'Claim 10% Off';
        }
      }
      return false;
    };

    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleFormSubmit);
    }

    if (inputEmail) {
      inputEmail.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          handleFormSubmit(e);
        }
      });
    }

    // Auto-popup Initial Timer (7s)
    let isDismissedInSession = false;
    try {
      isDismissedInSession = sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
    } catch (e) {}

    if (!isDismissedInSession) {
      setTimeout(() => {
        // Recheck before opening in case dismissed in another tab
        let dismissedNow = false;
        try {
          dismissedNow = sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
        } catch (e) {}

        if (!dismissedNow) {
          openPopup();
        } else if (launcher) {
          launcher.classList.add('is-visible');
        }
      }, delayMs);
    } else {
      // If already dismissed previously in session, show launcher tag immediately
      if (launcher) {
        launcher.classList.add('is-visible');
      }
    }

    // Shopify Theme Editor Integration
    if (window.Shopify && Shopify.designMode) {
      document.addEventListener('shopify:section:select', (e) => {
        if (e.target && e.target.contains(container)) {
          openPopup();
        }
      });
      document.addEventListener('shopify:section:deselect', (e) => {
        if (e.target && e.target.contains(container)) {
          closePopup();
        }
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsletterPopup);
  } else {
    initNewsletterPopup();
  }
})();
