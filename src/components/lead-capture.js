export function initLeadCapture() {
  const triggers = document.querySelectorAll('[data-lead-trigger]');
  const modal = document.getElementById('lead-modal');
  const dialog = modal?.querySelector('.lead-modal__dialog');
  const form = document.getElementById('lead-capture-form');
  const status = document.getElementById('lead-form-status');
  const closeButtons = modal?.querySelectorAll('[data-lead-close]');
  const sourceSection = document.getElementById('lead-source-section');
  const sourceUrl = document.getElementById('lead-source-url');
  const submittedAt = document.getElementById('lead-submitted-at');
  const userAgent = document.getElementById('lead-user-agent');
  const shell = document.querySelector('.site-shell');
  const submitButton = form?.querySelector('.lead-form__submit');

  if (!triggers.length || !modal || !dialog || !form || !status || !submitButton) {
    return;
  }

  let closeTimer;
  let previousFocus = null;

  const setStatus = (message = '') => {
    status.textContent = message;
  };

  const lockScroll = () => {
    document.body.classList.add('body--modal-open');
    shell?.classList.add('site-shell--modal-open');
  };

  const unlockScroll = () => {
    document.body.classList.remove('body--modal-open');
    shell?.classList.remove('site-shell--modal-open');
  };

  const closeModal = ({ restoreFocus = true } = {}) => {
    clearTimeout(closeTimer);
    closeTimer = 0;
    modal.hidden = true;
    unlockScroll();
    setStatus('');
    form.reset();

    if (restoreFocus && previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  };

  const openModal = (trigger) => {
    clearTimeout(closeTimer);
    closeTimer = 0;
    previousFocus = trigger ?? document.activeElement;
    modal.hidden = false;
    lockScroll();
    setStatus('');

    if (sourceSection && trigger?.dataset.leadSource) {
      sourceSection.value = trigger.dataset.leadSource;
    }

    window.requestAnimationFrame(() => {
      form.querySelector('.lead-form__input')?.focus();
    });
  };

  const populateMetaFields = () => {
    if (sourceUrl) {
      sourceUrl.value = window.location.href;
    }

    if (submittedAt) {
      submittedAt.value = new Date().toISOString();
    }

    if (userAgent) {
      userAgent.value = window.navigator.userAgent;
    }
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openModal(trigger));
  });

  closeButtons?.forEach((button) => {
    button.addEventListener('click', () => closeModal());
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  dialog.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    populateMetaFields();

    submitButton.setAttribute('disabled', 'true');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: new FormData(form),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload.success !== true) {
        throw new Error('request-failed');
      }

      setStatus('Message sent.');
      closeTimer = window.setTimeout(() => {
        closeModal({ restoreFocus: false });
      }, 1000);
    } catch (error) {
      console.error('Lead submission failed.', error);
    } finally {
      if (!closeTimer) {
        submitButton.removeAttribute('disabled');
      } else {
        window.setTimeout(() => {
          submitButton.removeAttribute('disabled');
        }, 1000);
      }
    }
  });
}
