export function initLeadCapture() {
  const trigger = document.querySelector('.journey__action');
  const note = document.querySelector('.journey__action-note');
  const modal = document.getElementById('lead-modal');
  const dialog = modal?.querySelector('.lead-modal__dialog');
  const form = document.getElementById('lead-capture-form');
  const status = document.getElementById('lead-form-status');
  const closeButtons = modal?.querySelectorAll('[data-lead-close]');
  const emailInput = form?.querySelector('input[name="email"]');
  const nextUrl = document.getElementById('lead-next-url');
  const formUrl = document.getElementById('lead-form-url');
  const replyTo = document.getElementById('lead-replyto');
  const sourceUrl = document.getElementById('lead-source-url');
  const submittedAt = document.getElementById('lead-submitted-at');
  const userAgent = document.getElementById('lead-user-agent');
  const shell = document.querySelector('.site-shell');

  if (!trigger || !note || !modal || !dialog || !form || !status) {
    return;
  }

  let noteTimer;
  let closeTimer;
  let previousFocus = null;

  const currentUrl = new URL(window.location.href);

  const setNote = (message) => {
    clearTimeout(noteTimer);
    note.textContent = message;
    note.classList.add('is-visible');

    noteTimer = window.setTimeout(() => {
      note.classList.remove('is-visible');
    }, 4200);
  };

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.className = 'lead-form__status';

    if (state) {
      status.classList.add(`lead-form__status--${state}`);
    }
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
    modal.hidden = true;
    unlockScroll();

    if (restoreFocus && previousFocus instanceof HTMLElement) {
      previousFocus.focus();
    }
  };

  const openModal = () => {
    clearTimeout(closeTimer);
    previousFocus = document.activeElement;
    modal.hidden = false;
    lockScroll();
    setStatus('');

    window.requestAnimationFrame(() => {
      form.querySelector('.lead-form__input')?.focus();
    });
  };

  const getSuccessUrl = () => {
    const successUrl = new URL(window.location.href);
    successUrl.searchParams.set('lead', 'success');
    return successUrl.toString();
  };

  const populateMetaFields = () => {
    const locationHref = window.location.href;

    if (nextUrl) {
      nextUrl.value = getSuccessUrl();
    }

    if (formUrl) {
      formUrl.value = locationHref;
    }

    if (replyTo && emailInput) {
      replyTo.value = emailInput.value.trim();
    }

    if (sourceUrl) {
      sourceUrl.value = locationHref;
    }

    if (submittedAt) {
      submittedAt.value = new Date().toISOString();
    }

    if (userAgent) {
      userAgent.value = window.navigator.userAgent;
    }
  };

  if (currentUrl.searchParams.get('lead') === 'success') {
    setNote('Thanks. Your details are in and we will reach out.');
    currentUrl.searchParams.delete('lead');
    window.history.replaceState({}, '', currentUrl.toString());
  }

  trigger.addEventListener('click', () => {
    setNote(
      "Foottfall Intelligence is coming soon. Leave your name, mobile number, and email and we'll reach out.",
    );
    openModal();
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

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const submitButton = form.querySelector('.lead-form__submit');
    populateMetaFields();

    const formData = new FormData(form);

    submitButton?.setAttribute('disabled', 'true');
    setStatus('Opening FormSubmit verification/send flow...', 'pending');

    formData.forEach((value, key) => {
      const field = form.elements.namedItem(key);

      if (field instanceof RadioNodeList) {
        return;
      }

      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.value = String(value);
      }
    });

    window.setTimeout(() => {
      HTMLFormElement.prototype.submit.call(form);
    }, 120);
  });
}
