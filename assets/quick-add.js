if (!customElements.get('quick-add-modal')) {
  customElements.define(
    'quick-add-modal',
    class QuickAddModal extends ModalDialog {
      constructor() {
        super();
        this.modalContent = this.querySelector('[id^="QuickAddInfo-"]');
        this.addEventListener(
          'click',
          (event) => {
            if (event.target === this) event.stopImmediatePropagation();
          },
          true
        );
      }

      hide(preventFocus = false) {
        const cartNotification = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
        if (cartNotification) cartNotification.setActiveElement(this.openedBy);
        this.modalContent.innerHTML = '';

        if (preventFocus) this.openedBy = null;
        super.hide();
      }

      show(opener) {
        opener.setAttribute('aria-disabled', true);
        opener.classList.add('loading');
        opener.querySelector('.loading__spinner').classList.remove('hidden');

        fetch(opener.getAttribute('data-product-url'))
          .then((response) => {
            if (!response.ok) throw new Error(`Quick detail request failed (${response.status})`);
            return response.text();
          })
          .then((responseText) => {
            const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
            this.productElement = responseHTML.querySelector('section[id^="MainProduct-"]');
            if (!this.productElement) throw new Error('Quick detail product section was not found');
            this.productElement.classList.forEach((classApplied) => {
              if (classApplied.startsWith('color-') || classApplied === 'gradient')
                this.modalContent.classList.add(classApplied);
            });
            this.preventDuplicatedIDs();
            this.removeDOMElements();
            // Keep the PDP section wrapper so Quick detail uses the same scoped
            // product and gallery styles as the full product page.
            this.setInnerHTML(this.modalContent, this.productElement.outerHTML);

            if (window.Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }

            if (window.ProductModel) window.ProductModel.loadShopifyXR();

            this.removeGalleryListSemantic();
            this.updateImageSizes();
            this.preventVariantURLSwitching();
            super.show(opener);
            requestAnimationFrame(() => this.refreshGallery());
          })
          .catch((error) => {
            console.error(error);
            window.location.assign(opener.getAttribute('data-product-url'));
          })
          .finally(() => {
            opener.removeAttribute('aria-disabled');
            opener.classList.remove('loading');
            opener.querySelector('.loading__spinner').classList.add('hidden');
          });
      }

      setInnerHTML(element, html) {
        element.innerHTML = html;

        // JSON data must stay inside the product markup. Executable external
        // assets are loaded once and kept outside the modal so reopening Quick
        // Detail does not download or initialize the same component again.
        element.querySelectorAll('script').forEach((oldScriptTag) => {
          const type = oldScriptTag.getAttribute('type');
          if (type === 'application/json' || type === 'application/ld+json') return;

          if (oldScriptTag.src) {
            const isLoaded = Array.from(document.scripts).some(
              (script) => !element.contains(script) && script.src === oldScriptTag.src
            );
            if (isLoaded) {
              oldScriptTag.remove();
              return;
            }

            const newScriptTag = document.createElement('script');
            Array.from(oldScriptTag.attributes).forEach((attribute) => {
              newScriptTag.setAttribute(attribute.name, attribute.value);
            });
            document.head.appendChild(newScriptTag);
            oldScriptTag.remove();
            return;
          }

          if (oldScriptTag.textContent.includes('product-form.js') && customElements.get('product-form')) {
            oldScriptTag.remove();
            return;
          }

          const newScriptTag = document.createElement('script');
          Array.from(oldScriptTag.attributes).forEach((attribute) => {
            newScriptTag.setAttribute(attribute.name, attribute.value);
          });
          newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
          oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
        });
      }

      preventVariantURLSwitching() {
        const variantPicker = this.modalContent.querySelector('variant-radios,variant-selects');
        if (!variantPicker) return;

        variantPicker.setAttribute('data-update-url', 'false');
      }

      removeDOMElements() {
        const pickupAvailability = this.productElement.querySelector('pickup-availability');
        if (pickupAvailability) pickupAvailability.remove();

        const productModal = this.productElement.querySelector('product-modal');
        if (productModal) productModal.remove();

        const modalDialog = this.productElement.querySelectorAll('modal-dialog');
        if (modalDialog) modalDialog.forEach((modal) => modal.remove());

        this.productElement.querySelectorAll('script[type="application/ld+json"]').forEach((script) => script.remove());
        this.productElement.querySelectorAll('script').forEach((script) => {
          if (script.src.includes('product-modal.js') || script.textContent.includes('function isIE()')) script.remove();
        });

        const stylesheetUrls = new Set();
        this.productElement.querySelectorAll('link[rel="stylesheet"]').forEach((stylesheet) => {
          if (stylesheetUrls.has(stylesheet.href)) stylesheet.remove();
          else stylesheetUrls.add(stylesheet.href);
        });
      }

      preventDuplicatedIDs() {
        const sectionId = this.productElement.dataset.section;
        const quickAddSectionId = `quickadd-${sectionId}`;
        this.productElement.id = this.productElement.id.replace(sectionId, quickAddSectionId);
        this.productElement.dataset.section = quickAddSectionId;
        this.productElement.innerHTML = this.productElement.innerHTML.replaceAll(sectionId, quickAddSectionId);
        this.productElement.querySelectorAll('variant-selects, variant-radios, product-info').forEach((element) => {
          element.dataset.originalSection = sectionId;
        });
      }

      removeGalleryListSemantic() {
        const galleryList = this.modalContent.querySelector('[id^="Slider-Gallery"]');
        if (!galleryList) return;

        galleryList.setAttribute('role', 'presentation');
        galleryList.querySelectorAll('[id^="Slide-"]').forEach((li) => li.setAttribute('role', 'presentation'));
      }

      refreshGallery() {
        this.modalContent.querySelectorAll('slider-component').forEach((slider) => slider.resetPages?.());
      }

      updateImageSizes() {
        const product = this.modalContent.querySelector('.product');
        const desktopColumns = product.classList.contains('product--columns');
        if (!desktopColumns) return;

        const mediaImages = product.querySelectorAll('.product__media img');
        if (!mediaImages.length) return;

        let mediaImageSizes =
          '(min-width: 1000px) 715px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)';

        if (product.classList.contains('product--medium')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '605px');
        } else if (product.classList.contains('product--small')) {
          mediaImageSizes = mediaImageSizes.replace('715px', '495px');
        }

        mediaImages.forEach((img) => img.setAttribute('sizes', mediaImageSizes));
      }
    }
  );
}
