class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.addEventListener('submit', this.onSubmit.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  onSubmit(event) {
    const discountForm = event.target.closest('[data-cart-discount-form]');

    if (!discountForm || !this.contains(discountForm)) return;

    event.preventDefault();

    if (this.isCartMutationLocked()) return;

    this.applyDiscount(discountForm);
  }

  isCartMutationLocked() {
    return this.dataset.cartMutation === 'true';
  }

  setCartMutationLoading(isLoading) {
    this.dataset.cartMutation = isLoading ? 'true' : 'false';
    this.classList.toggle('is-cart-updating', isLoading);
    this.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    this.querySelectorAll('[data-cart-mutation-control]').forEach((control) => {
      control.disabled = isLoading;
    });

    this.querySelectorAll('cart-drawer-items, #CartDrawer-CartItems').forEach((element) => {
      element.classList.toggle('cart__items--disabled', isLoading);
      element.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    });
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.querySelector('.drawer__inner');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.classList.toggle('is-empty', parsedState.item_count === 0);
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }

  applyDiscount(form) {
    if (this.isCartMutationLocked()) return;

    const input = form.querySelector('[name="discount"]');
    const discount = input.value.trim();

    if (!discount) {
      this.setDiscountMessage(form, 'Enter a discount code.', 'error');
      input.focus();
      return;
    }

    this.setDiscountMessage(form, 'Applying discount...', 'loading');
    this.setCartMutationLoading(true);
    this.setDiscountFormLoading(form, true);

    const body = JSON.stringify({
      discount,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        if (!response.ok) throw new Error('Discount request failed');
        return response.json();
      })
      .then((parsedState) => {
        const applied = this.hasAppliedDiscount(parsedState);
        this.renderContents(parsedState);
        this.setDiscountMessage(
          this.querySelector('[data-cart-discount-form]'),
          applied ? 'Discount code applied.' : 'Discount code could not be applied.',
          applied ? 'success' : 'error'
        );
      })
      .catch(() => {
        this.setDiscountMessage(
          this.querySelector('[data-cart-discount-form]'),
          'Unable to apply discount code. Please try again.',
          'error'
        );
      })
      .finally(() => {
        this.setDiscountFormLoading(form, false);
        this.setCartMutationLoading(false);
      });
  }

  setDiscountFormLoading(form, isLoading) {
    form.classList.toggle('is-loading', isLoading);
    form.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    form.querySelectorAll('input, button').forEach((element) => {
      element.disabled = isLoading;
    });
  }

  setDiscountMessage(form, text, state) {
    const message = form?.querySelector('[data-cart-discount-message]');
    if (!message) return;

    message.textContent = text;
    message.classList.toggle('is-success', state === 'success');
    message.classList.toggle('is-error', state === 'error');
    message.classList.toggle('is-loading', state === 'loading');
  }

  hasAppliedDiscount(parsedState) {
    const sectionHtml = parsedState.sections?.['cart-drawer'];
    if (!sectionHtml) return false;

    const section = new DOMParser().parseFromString(sectionHtml, 'text/html');
    return Boolean(section.querySelector('.dizzy-cart-drawer__applied-discounts li'));
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);
