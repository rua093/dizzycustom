(() => {
  if (window.DCPdpCustomizer) return;

  const finishes = [
    ['red', 'Red', '#dc0f0f', 'solid'], ['white', 'White', '#f5f5f8', 'solid'],
    ['gloss_black', 'Gloss Black', '#0a0a0c', 'solid'], ['matte_black', 'Matte Black', '#1e1e22', 'solid', 'matte'],
    ['gray', 'Gray', '#8c8c94', 'solid'], ['maroon', 'Maroon', '#6e0f0f', 'solid'],
    ['orange', 'Orange', '#f0820a', 'solid'], ['yellow', 'Yellow', '#ebc80f', 'solid'],
    ['lime_green', 'Lime Green', '#8cdc0a', 'solid'], ['green', 'Green', '#0aaa28', 'solid'],
    ['blue', 'Blue', '#143cc8', 'solid'], ['purple', 'Purple', '#780fbe', 'solid'],
    ['pink', 'Pink', '#f06eaa', 'solid'], ['brown', 'Brown', '#4b2314', 'solid'],
    ['mirror_red', 'Mirror Red', '#b40f0f', 'mirror'], ['mirror_silver', 'Mirror Silver', '#bec3c8', 'mirror'],
    ['mirror_gold', 'Mirror Gold', '#bea028', 'mirror'], ['mirror_rosegold', 'Mirror Rosegold', '#c89b8c', 'mirror'],
    ['mirror_orange', 'Mirror Orange', '#e6780a', 'mirror'], ['mirror_green', 'Mirror Green', '#0a822d', 'mirror'],
    ['mirror_blue', 'Mirror Blue', '#0f32be', 'mirror'], ['mirror_purple', 'Mirror Purple', '#6e14b4', 'mirror'],
    ['mirror_pink', 'Mirror Pink', '#be286e', 'mirror'],
    ['carbon_fiber', 'Carbon Fiber', '#25272a', 'patterns', 'carbon'],
    ['brushed_stainless', 'Brushed Stainless', '#afb2b6', 'patterns', 'brushed'],
    ['brushed_gold', 'Brushed Gold', '#b99b37', 'patterns', 'brushed'],
    ['mf_red', 'Flake Red', '#aa0a0f', 'flake'], ['mf_black', 'Flake Black', '#141418', 'flake'],
    ['mf_silver', 'Flake Silver', '#b4b9be', 'flake'], ['mf_gold', 'Flake Gold', '#c8aa14', 'flake'],
    ['mf_green', 'Flake Green', '#0a9628', 'flake'], ['mf_blue', 'Flake Blue', '#0f28b4', 'flake'],
    ['mf_purple', 'Flake Purple', '#6e14aa', 'flake'], ['mf_pink', 'Flake Pink', '#dc5096', 'flake']
  ].map(([id, label, color, group, effect]) => ({ id, label, color, group, effect: effect || group }));

  const materials = new Map(finishes.map((f) => [f.id, f]));
  const materialsById = new Map(finishes.map((f) => [f.id.toLowerCase(), f]));
  const materialsByLabel = new Map(finishes.map((f) => [f.label.toLowerCase(), f]));

  function resolveMaterialId(str) {
    if (!str) return null;
    const clean = str.trim().toLowerCase();
    if (materialsById.has(clean)) return clean;
    if (materialsByLabel.has(clean)) return materialsByLabel.get(clean).id;
    return null;
  }

  const fontLabels = {
    bold: 'Bold',
    lightning: 'Slant',
    aggressive: 'Edge',
    script: 'Flow',
    electric: 'Strike',
    ice: 'Frost',
    oem: 'Classic'
  };

  const fontKeysMap = {
    bold: 'bold',
    block: 'bold',
    lightning: 'lightning',
    aggressive: 'aggressive',
    script: 'script',
    electric: 'electric',
    ice: 'ice',
    oem: 'oem'
  };

  function resolveFontKey(str) {
    if (!str) return null;
    const clean = str.trim().toLowerCase();
    return fontKeysMap[clean] || null;
  }

  // Display names are neutral; font keys remain stable so existing assets keep loading.
  const retroFontMap = {
    lexus: { label: 'Aurora', legacyLabel: 'LEXUS', family: 'DCRetro-lexus', fallback: '"Arial Black", sans-serif' },
    dodge: { label: 'Torque', legacyLabel: 'DODGE', family: 'DCRetro-dodge', fallback: 'Impact, sans-serif' },
    jeep: { label: 'Trail', legacyLabel: 'Jeep', family: 'DCRetro-jeep', fallback: '"Arial Black", sans-serif' },
    audi: { label: 'Vector', legacyLabel: 'Audi', family: 'DCRetro-audi', fallback: '"Helvetica Neue", sans-serif' },
    cabriolet: { label: 'Cruise', legacyLabel: 'Cabriolet', family: 'DCRetro-cabriolet', fallback: 'cursive' },
    chevrolet: { label: 'Heritage', legacyLabel: 'Chevrolet', family: 'DCRetro-chevrolet', fallback: 'Impact, sans-serif' },
    cadillac: { label: 'Velvet', legacyLabel: 'Cadillac', family: 'DCRetro-cadillac', fallback: 'cursive' },
    nissan: { label: 'Nova', legacyLabel: 'Nissan', family: 'DCRetro-nissan', fallback: '"Arial Black", sans-serif' },
    ferrari: { label: 'Sprint', legacyLabel: 'Ferrari', family: 'DCRetro-ferrari', fallback: '"Times New Roman", serif' },
    ikarus: { label: 'Skyline', legacyLabel: 'Ikarus', family: 'DCRetro-ikarus', fallback: 'Georgia, serif' },
    lamborghini: { label: 'Apex', legacyLabel: 'Lamborghini', family: 'DCRetro-lamborghini', fallback: '"Arial Black", sans-serif' },
    ford: { label: 'Harbor', legacyLabel: 'Ford', family: 'DCRetro-ford', fallback: 'cursive' }
  };

  function resolveRetroFontKey(value) {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    return Object.keys(retroFontMap).find((key) => {
      const font = retroFontMap[key];
      return key === normalized || font.label.toLowerCase() === normalized || font.legacyLabel.toLowerCase() === normalized;
    }) || null;
  }

  function resolveMountKey(str) {
    if (!str) return null;
    const clean = str.trim().toLowerCase();
    if (clean.includes('stud')) return 'studs';
    if (clean.includes('tape') || clean.includes('vhb')) return 'tape';
    return null;
  }

  const mountLabels = {
    tape: 'VHB Tape (Flat Surface)',
    studs: 'Studs (Grille Mount)'
  };

  const loadedFonts = new Map();
  function loadFont(font) {
    const familyName = font.retro ? `DCRetro-${font.key}` : `DC Badge ${font.key}`;
    const cacheKey = `${familyName}:${font.url}`;
    if (!loadedFonts.has(cacheKey)) {
      const face = new FontFace(familyName, `url(${JSON.stringify(font.url)})`);
      loadedFonts.set(cacheKey, face.load().then((loaded) => {
        document.fonts.add(loaded);
        return loaded;
      }).catch((err) => {
        loadedFonts.delete(cacheKey);
        throw err;
      }));
    }
    return loadedFonts.get(cacheKey);
  }

  class DCPdpCustomizer {
    constructor() {
      this.controlsContainer = document.getElementById('DCPdpControlsContainer');
      if (!this.controlsContainer) return;

      const params = new URLSearchParams(window.location.search);
      const isCustomProduct = this.controlsContainer.dataset.customProduct === 'true';

      // If not the exact product chosen in Theme Editor, remove and skip immediately
      if (!isCustomProduct) {
        this.controlsContainer.remove();
        return;
      }

      // Enable inputs for custom product
      this.controlsContainer.querySelectorAll('input[name^="properties["]').forEach((el) => {
        el.disabled = false;
      });

      this.ensureCanvasOverlay();

      const configScript = document.getElementById('dc-pdp-customizer-config');
      this.config = configScript ? JSON.parse(configScript.textContent) : { maxLength: 16, fonts: [], layers: 2 };
      const explicitLayers = parseInt(this.controlsContainer?.dataset?.layers || this.canvasWrapper?.dataset?.layers, 10);
      if (explicitLayers === 1 || explicitLayers === 2) {
        this.config.layers = explicitLayers;
      }
      const urlLayers = parseInt(params.get('layers'), 10);
      if (urlLayers === 1 || urlLayers === 2) {
        this.config.layers = urlLayers;
      } else if (params.has('back') && params.get('back')) {
        this.config.layers = 2;
      }
      if (!this.config.layers) {
        this.config.layers = 2;
      }

      const isSingleLayer = this.config.layers === 1;

      this.input = this.controlsContainer.querySelector('[data-pdp-text]');
      this.counter = this.controlsContainer.querySelector('[data-pdp-count]');
      this.fontSelect = this.controlsContainer.querySelector('[data-pdp-font-select]');
      this.specificRequestsInput = this.controlsContainer.querySelector('[data-pdp-specific-requests]');

      this.layer = 'face';
      this.group = 'mirror';
      this.textures = new Map();

      // Default state
      this.state = {
        text: '',
        font: isSingleLayer ? (this.config.defaultFont || 'nissan') : 'lightning',
        face: isSingleLayer ? 'white' : 'mirror_red',
        back: 'gloss_black',
        mount: 'tape',
        specificRequests: ''
      };

      this.initFromUrl(params);
      this.bindEvents();
      if (!isSingleLayer) {
        this.buildSwatches();
      }
      this.updateUI();
      this.initFonts();
      this.initMobileSticky();

      if (this.canvas) {
        this.observer = new ResizeObserver(() => this.scheduleRender());
        this.observer.observe(this.canvas);
      }
    }

    destroy() {
      if (this.onScrollOrResizeHandler) {
        window.removeEventListener('scroll', this.onScrollOrResizeHandler);
        window.removeEventListener('resize', this.onScrollOrResizeHandler);
      }
      if (this.observer) {
        this.observer.disconnect();
      }
      cancelAnimationFrame(this.frame);
      if (this.mediaWrapper && this.mediaWrapper.classList.contains('dc-mobile-sticky')) {
        this.mediaWrapper.classList.remove('dc-mobile-sticky');
        this.mediaWrapper.style.top = '';
        this.mediaWrapper.style.transform = '';
      }
      if (this.mediaSpacer && this.mediaSpacer.parentNode) {
        this.mediaSpacer.remove();
      }
    }

    initMobileSticky() {
      this.mediaWrapper = document.querySelector('.product__media-wrapper');
      if (!this.mediaWrapper) return;

      this.mediaSpacer = document.querySelector('.dc-pdp-mobile-media-spacer');
      if (!this.mediaSpacer) {
        this.mediaSpacer = document.createElement('div');
        this.mediaSpacer.className = 'dc-pdp-mobile-media-spacer';
        this.mediaWrapper.parentNode.insertBefore(this.mediaSpacer, this.mediaWrapper);
      }

      let ticking = false;
      const update = () => {
        this.updateMobileSticky();
        ticking = false;
      };

      this.onScrollOrResizeHandler = () => {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      };

      window.addEventListener('scroll', this.onScrollOrResizeHandler, { passive: true });
      window.addEventListener('resize', this.onScrollOrResizeHandler, { passive: true });

      // Initial check
      update();
    }

    getHeaderOffset() {
      const headerWrapper = document.querySelector('sticky-header') ||
                            document.querySelector('.header-wrapper') ||
                            document.querySelector('.section-header') ||
                            document.querySelector('header');
      if (!headerWrapper) return 0;

      const rect = headerWrapper.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top <= 1) {
        const computed = window.getComputedStyle(headerWrapper);
        if (computed.position === 'fixed' || computed.position === 'sticky') {
          return Math.max(0, Math.round(rect.bottom));
        }
        if (headerWrapper.parentElement) {
          const parentComputed = window.getComputedStyle(headerWrapper.parentElement);
          if (parentComputed.position === 'fixed' || parentComputed.position === 'sticky') {
            return Math.max(0, Math.round(rect.bottom));
          }
        }
      }
      return 0;
    }

    updateMobileSticky() {
      if (!this.mediaWrapper || !this.mediaSpacer) return;

      const isMobile = window.matchMedia('(max-width: 749px)').matches;

      // Reset if on desktop
      if (!isMobile) {
        if (this.mediaWrapper.classList.contains('dc-mobile-sticky')) {
          this.mediaWrapper.classList.remove('dc-mobile-sticky');
          this.mediaWrapper.style.top = '';
          this.mediaWrapper.style.transform = '';
          this.mediaSpacer.style.display = 'none';
          this.mediaSpacer.style.height = '0px';
        }
        return;
      }

      const headerOffset = this.getHeaderOffset();
      const isSticky = this.mediaWrapper.classList.contains('dc-mobile-sticky');

      if (!isSticky) {
        this.naturalMediaHeight = this.mediaWrapper.offsetHeight || 375;
        const mediaRect = this.mediaWrapper.getBoundingClientRect();
        if (mediaRect.top <= headerOffset) {
          this.mediaSpacer.style.display = 'block';
          this.mediaSpacer.style.height = `${this.naturalMediaHeight}px`;

          this.mediaWrapper.classList.add('dc-mobile-sticky');
          this.mediaWrapper.style.top = `${headerOffset}px`;
        }
      } else {
        const spacerRect = this.mediaSpacer.getBoundingClientRect();
        if (spacerRect.top > headerOffset) {
          this.mediaWrapper.classList.remove('dc-mobile-sticky');
          this.mediaWrapper.style.top = '';
          this.mediaWrapper.style.transform = '';
          this.mediaSpacer.style.display = 'none';
          this.mediaSpacer.style.height = '0px';
        } else {
          this.mediaWrapper.style.top = `${headerOffset}px`;

          const productInfo = document.querySelector('.product__info-container');
          if (productInfo) {
            const infoRect = productInfo.getBoundingClientRect();
            const stickyHeight = this.mediaWrapper.offsetHeight || 220;
            const stopPoint = headerOffset + stickyHeight;
            if (infoRect.bottom <= stopPoint) {
              const pushUp = infoRect.bottom - stopPoint;
              this.mediaWrapper.style.transform = `translateY(${pushUp}px)`;
            } else {
              this.mediaWrapper.style.transform = 'translateY(0)';
            }
          }
        }
      }
    }

    ensureCanvasOverlay() {
      const firstMedia = document.querySelector('.product__media-item:first-child') ||
                         document.querySelector('.product__media-list li:first-child') ||
                         document.querySelector('.product__media-wrapper .product__media');

      if (!firstMedia) return;

      this.canvasWrapper = firstMedia.querySelector('.dc-pdp-media-canvas-overlay');
      if (!this.canvasWrapper) {
        const computedPos = window.getComputedStyle(firstMedia).position;
        if (computedPos === 'static') {
          firstMedia.style.position = 'relative';
        }

        const layersAttr = this.controlsContainer?.dataset?.layers || '2';
        const wrapper = document.createElement('div');
        wrapper.className = 'dc-pdp-media-canvas-overlay';
        wrapper.dataset.layers = layersAttr;
        wrapper.innerHTML = `
          <canvas class="dc-pdp-canvas" role="img" aria-label="Custom Emblem Live Preview"></canvas>
          <span class="dc-pdp-live-badge">
            <span class="dc-pdp-live-dot"></span>
            <span>Live Custom Preview</span>
          </span>
        `;
        firstMedia.appendChild(wrapper);
        this.canvasWrapper = wrapper;
        this.canvas = wrapper.querySelector('canvas');
      } else {
        this.canvas = this.canvasWrapper.querySelector('canvas');
      }

      if (this.canvasWrapper) {
        this.canvasWrapper.style.display = 'flex';
      }
    }

    initFromUrl(params) {
      const isSingleLayer = this.config.layers === 1;
      let hasCustomParams = false;

      if (params.has('text') && params.get('text').trim()) {
        this.state.text = params.get('text').trim().slice(0, this.config.maxLength);
        hasCustomParams = true;
      }

      if (params.has('font')) {
        const urlFont = params.get('font').trim();
        if (isSingleLayer) {
          const matchedRetro = resolveRetroFontKey(urlFont);
          if (matchedRetro) {
            this.state.font = matchedRetro;
            hasCustomParams = true;
          }
        } else {
          const font = resolveFontKey(urlFont);
          if (font) {
            this.state.font = font;
            hasCustomParams = true;
          }
        }
      }

      if (params.has('requests')) {
        this.state.specificRequests = params.get('requests').trim();
        hasCustomParams = true;
      }

      if (!isSingleLayer) {
        for (const layer of ['face', 'back']) {
          const mat = resolveMaterialId(params.get(layer));
          if (mat) {
            this.state[layer] = mat;
            hasCustomParams = true;
          }
        }
        const mount = resolveMountKey(params.get('mount'));
        if (mount) {
          this.state.mount = mount;
          hasCustomParams = true;
        }
      }

      if (hasCustomParams) {
        this.saveToStorage();
      } else {
        this.restoreFromStorage();
      }

      this.group = materials.get(this.state.face)?.group || 'mirror';
    }

    saveToStorage() {
      try {
        const isSingleLayer = this.config.layers === 1;
        const storageKey = isSingleLayer ? 'dc_single_layer_state' : 'dc_custom_emblem_state';
        if (isSingleLayer) {
          localStorage.setItem(storageKey, JSON.stringify({
            text: this.state.text,
            font: this.state.font,
            specificRequests: this.state.specificRequests
          }));
        } else {
          localStorage.setItem(storageKey, JSON.stringify({
            text: this.state.text,
            font: this.state.font,
            face: this.state.face,
            back: this.state.back,
            mount: this.state.mount
          }));
        }
      } catch (e) {}
    }

    restoreFromStorage() {
      try {
        const isSingleLayer = this.config.layers === 1;
        const storageKey = isSingleLayer ? 'dc_single_layer_state' : 'dc_custom_emblem_state';
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          if (saved.text && typeof saved.text === 'string') {
            const trimmed = saved.text.trim();
            if (trimmed && trimmed.toLowerCase() !== 'hello my friend' && trimmed.toLowerCase() !== 'dizzy') {
              this.state.text = trimmed.slice(0, this.config.maxLength);
            } else {
              this.state.text = '';
            }
          }
          if (isSingleLayer) {
            if (saved.font && typeof saved.font === 'string') {
              const matchedRetro = resolveRetroFontKey(saved.font);
              if (matchedRetro) {
                this.state.font = matchedRetro;
              }
            }
            if (typeof saved.specificRequests === 'string') {
              this.state.specificRequests = saved.specificRequests;
            }
          } else {
            const font = resolveFontKey(saved.font);
            if (font) this.state.font = font;
            const face = resolveMaterialId(saved.face);
            if (face) this.state.face = face;
            const back = resolveMaterialId(saved.back);
            if (back) this.state.back = back;
            const mount = resolveMountKey(saved.mount);
            if (mount) this.state.mount = mount;
          }
        }
      } catch (e) {}
    }

    bindEvents() {
      // Text input
      if (this.input) {
        this.input.addEventListener('input', () => {
          this.state.text = this.input.value;
          this.updateUI();
          this.scrollToFirstMedia();
        });
      }

      // Add-to-cart validation: prevent checkout if custom text is empty
      document.querySelectorAll('form[action*="/cart/add"]').forEach((form) => {
        form.addEventListener('submit', (e) => {
          if (!this.displayText()) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (this.input) {
              this.input.focus();
              this.input.classList.add('dc-input-error');
              setTimeout(() => this.input.classList.remove('dc-input-error'), 2000);
            }
            return false;
          }
          this.syncPropertiesToForm();
        }, true);
      });

      // Retro Font select dropdown
      if (this.fontSelect) {
        this.fontSelect.addEventListener('change', () => {
          this.state.font = this.fontSelect.value;
          this.updateUI();
          this.scrollToFirstMedia();
        });
      }

      // Specific requests input (Single-layer)
      if (this.specificRequestsInput) {
        this.specificRequestsInput.addEventListener('input', () => {
          this.state.specificRequests = this.specificRequestsInput.value;
          this.syncPropertiesToForm();
          this.saveToStorage();
        });
      }

      // Font modal trigger & close
      const modal = document.getElementById('DCPdpFontModal');
      if (modal) {
        this.controlsContainer.querySelectorAll('[data-pdp-font-modal-trigger]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
          });
        });
        modal.querySelectorAll('[data-pdp-font-modal-close]').forEach((btn) => {
          btn.addEventListener('click', () => {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
          });
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
          }
        });
      }

      // Font pills (Two-layer)
      this.controlsContainer.querySelectorAll('[data-pdp-font]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.state.font = btn.dataset.pdpFont;
          this.updateUI();
          this.scrollToFirstMedia();
        });
      });

      // Layer tabs (Text vs Backing - Two-layer)
      this.controlsContainer.querySelectorAll('[data-pdp-layer]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.layer = btn.dataset.pdpLayer;
          this.group = materials.get(this.state[this.layer])?.group || 'solid';
          this.buildSwatches();
          this.updateUI();
        });
      });

      // Finish category tabs (Two-layer)
      this.controlsContainer.querySelectorAll('[data-pdp-finish]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.group = btn.dataset.pdpFinish;
          this.buildSwatches();
          this.updateUI();
        });
      });

      // Mounting radio inputs (Two-layer)
      this.controlsContainer.querySelectorAll('[data-pdp-mount]').forEach((input) => {
        input.addEventListener('change', () => {
          if (input.checked) {
            this.state.mount = input.dataset.pdpMount;
            this.updateUI();
          }
        });
      });
    }

    scrollToFirstMedia() {
      const slider = document.querySelector('slider-component[id^="GalleryViewer"]');
      if (slider && slider.slider) {
        slider.slider.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }

    buildSwatches() {
      const container = this.controlsContainer.querySelector('[data-pdp-swatches]');
      if (!container) return;
      container.replaceChildren();

      const filtered = finishes.filter((f) => f.group === this.group);
      filtered.forEach((finish) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `dc-pdp-swatch${this.state[this.layer] === finish.id ? ' is-active' : ''}`;
        btn.dataset.swatch = finish.id;
        btn.setAttribute('aria-label', `${finish.label} metal finish`);
        btn.style.background = this.swatchBackground(finish);

        btn.addEventListener('click', () => {
          this.state[this.layer] = finish.id;
          this.updateUI();
          this.scrollToFirstMedia();
        });

        container.appendChild(btn);
      });
    }

    swatchBackground(finish) {
      if (finish.effect === 'mirror') {
        return `linear-gradient(135deg, ${finish.color} 0%, #ffffff 50%, ${finish.color} 100%)`;
      }
      if (finish.effect === 'carbon') {
        return `repeating-linear-gradient(45deg, #181a1c 0 4px, #36393b 4px 8px)`;
      }
      if (finish.effect === 'brushed') {
        return `linear-gradient(90deg, ${finish.color} 0%, rgba(255,255,255,0.4) 50%, ${finish.color} 100%)`;
      }
      if (finish.effect === 'flake') {
        return `radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px), ${finish.color}`;
      }
      return finish.color;
    }

    displayText() {
      return (this.state.text || '').trim();
    }

    updateUI() {
      const isSingleLayer = this.config.layers === 1;

      // Text input value & counter
      if (this.input && document.activeElement !== this.input) {
        this.input.value = this.state.text;
      }
      if (this.counter) {
        const text = this.displayText();
        this.counter.textContent = `${text.length}/${this.config.maxLength}`;
      }

      // Retro font select
      if (this.fontSelect) {
        this.fontSelect.value = this.state.font;
        this.fontSelect.setAttribute('data-font-selected', this.state.font);
      }

      // Retro specific requests
      if (this.specificRequestsInput && document.activeElement !== this.specificRequestsInput) {
        this.specificRequestsInput.value = this.state.specificRequests || '';
      }

      if (!isSingleLayer) {
        // Font pill active state
        this.controlsContainer.querySelectorAll('[data-pdp-font]').forEach((btn) => {
          const isActive = btn.dataset.pdpFont === this.state.font;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', String(isActive));
        });

        // Layer active state
        this.controlsContainer.querySelectorAll('[data-pdp-layer]').forEach((btn) => {
          const isActive = btn.dataset.pdpLayer === this.layer;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', String(isActive));
        });

        // Finish tab active state
        this.controlsContainer.querySelectorAll('[data-pdp-finish]').forEach((btn) => {
          const isActive = btn.dataset.pdpFinish === this.group;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', String(isActive));
        });

        // Swatch active state
        this.controlsContainer.querySelectorAll('[data-swatch]').forEach((btn) => {
          const isActive = btn.dataset.swatch === this.state[this.layer];
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', String(isActive));
        });

        // Color labels & chips
        for (const layer of ['face', 'back']) {
          const finish = materials.get(this.state[layer]) || finishes[0];
          const nameElem = this.controlsContainer.querySelector(`[data-pdp-color-name="${layer}"]`);
          const chipElem = this.controlsContainer.querySelector(`[data-pdp-chip="${layer}"]`);
          if (nameElem) nameElem.textContent = finish.label;
          if (chipElem) chipElem.style.background = this.swatchBackground(finish);
        }

        // Mount radio state
        this.controlsContainer.querySelectorAll('[data-pdp-mount]').forEach((input) => {
          input.checked = input.dataset.pdpMount === this.state.mount;
        });
      }

      // Sync hidden form properties into PDP product form
      this.syncPropertiesToForm();

      this.saveToStorage();

      this.scheduleRender();
    }

    syncPropertiesToForm() {
      const isSingleLayer = this.config.layers === 1;
      const customText = this.displayText();

      if (isSingleLayer) {
        const fontVal = retroFontMap[this.state.font]?.label || 'Nova';
        const specificReq = this.state.specificRequests || '';
        const props = {
          'properties[Custom Text]': customText,
          'properties[Font]': fontVal,
          'properties[Specific Requests]': specificReq,
          'properties[Text Color]': 'White',
          'properties[Outline Color]': 'Black',
          'properties[Mounting]': 'VHB Tape (Flat Surface)'
        };

        const propIdMap = {
          'properties[Custom Text]': 'dc-pdp-prop-text',
          'properties[Font]': 'dc-pdp-prop-font',
          'properties[Specific Requests]': 'dc-pdp-prop-requests',
          'properties[Text Color]': 'dc-pdp-prop-face',
          'properties[Outline Color]': 'dc-pdp-prop-outline',
          'properties[Mounting]': 'dc-pdp-prop-mount'
        };

        let anyInputFound = false;
        for (const [propName, inputId] of Object.entries(propIdMap)) {
          const input = document.getElementById(inputId);
          if (input) {
            input.value = props[propName];
            input.disabled = false;
            anyInputFound = true;
          }
        }

        const backInput = document.getElementById('dc-pdp-prop-back');
        if (backInput) {
          backInput.value = '';
          backInput.disabled = true;
        }

        // Also sync directly to cart form
        document.querySelectorAll('form[action*="/cart/add"]').forEach((productForm) => {
          for (const [name, val] of Object.entries(props)) {
            let input = productForm.querySelector(`input[name="${name}"]`);
            if (!input) {
              input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              productForm.appendChild(input);
            }
            input.value = val;
            input.disabled = false;
          }
          const extraBack = productForm.querySelector('input[name="properties[Background Color]"]');
          if (extraBack) extraBack.remove();
        });
        return;
      }

      // Two-layer logic
      const faceLabel = materials.get(this.state.face)?.label || this.state.face;
      const backLabel = materials.get(this.state.back)?.label || this.state.back;
      const fontLabel = fontLabels[this.state.font] || this.state.font;
      const mountLabel = mountLabels[this.state.mount] || this.state.mount;

      const props = {
        'properties[Custom Text]': customText,
        'properties[Font]': fontLabel,
        'properties[Text Color]': faceLabel,
        'properties[Background Color]': backLabel,
        'properties[Mounting]': mountLabel
      };

      const propIdMap = {
        'properties[Custom Text]': 'dc-pdp-prop-text',
        'properties[Font]': 'dc-pdp-prop-font',
        'properties[Text Color]': 'dc-pdp-prop-face',
        'properties[Background Color]': 'dc-pdp-prop-back',
        'properties[Mounting]': 'dc-pdp-prop-mount'
      };

      let anyInputFound = false;
      for (const [propName, inputId] of Object.entries(propIdMap)) {
        const input = document.getElementById(inputId);
        if (input) {
          input.value = props[propName];
          input.disabled = false;
          anyInputFound = true;
        }
      }

      // Fallback: If snippet inputs are absent, attach directly to the product form
      if (!anyInputFound) {
        document.querySelectorAll('form[action*="/cart/add"]').forEach((productForm) => {
          for (const [name, val] of Object.entries(props)) {
            let input = productForm.querySelector(`input[name="${name}"]`);
            if (!input) {
              input = document.createElement('input');
              input.type = 'hidden';
              input.name = name;
              productForm.appendChild(input);
            }
            input.value = val;
            input.disabled = false;
          }
        });
      }
    }

    async initFonts() {
      const fontsToLoad = [];
      if (this.config.baseFonts && this.config.baseFonts.length) {
        fontsToLoad.push(...this.config.baseFonts);
      }
      if (this.config.fonts && this.config.fonts.length) {
        for (const f of this.config.fonts) {
          if (f.url && !fontsToLoad.some(b => b.key === f.key)) {
            fontsToLoad.push(f);
          }
        }
      }

      if (fontsToLoad.length) {
        const results = await Promise.allSettled(fontsToLoad.map(loadFont));
        this.readyFonts = new Set();
        results.forEach((res, i) => {
          if (res.status === 'fulfilled') {
            this.readyFonts.add(fontsToLoad[i].key);
          }
        });
      }

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => this.scheduleRender());
      }
      this.scheduleRender();
    }

    scheduleRender() {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.render());
    }

    texture(id, width, height) {
      const key = `${id}:${width}:${height}`;
      if (this.textures.has(key)) return this.textures.get(key);
      const finish = materials.get(id) || finishes[0];
      const tile = document.createElement('canvas');
      tile.width = width;
      tile.height = height;
      const context = tile.getContext('2d');
      context.fillStyle = finish.color;
      context.fillRect(0, 0, width, height);

      let seed = 71;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

      if (finish.effect === 'mirror' || finish.effect === 'solid') {
        const gradient = context.createLinearGradient(0, 0, width * 0.6, height);
        const opacity = finish.effect === 'mirror' ? 0.75 : 0.1;
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.38, 'rgba(255,255,255,0)');
        gradient.addColorStop(0.5, `rgba(255,255,255,${opacity})`);
        gradient.addColorStop(0.62, 'rgba(255,255,255,0)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      } else if (finish.effect === 'carbon') {
        for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) {
          context.fillStyle = ((x + y) / 8) % 2 ? '#181a1c' : '#36393b';
          context.fillRect(x, y, 6, 3);
          context.fillRect(x + 2, y + 4, 6, 3);
        }
      } else if (finish.effect === 'brushed') {
        for (let y = 0; y < height; y++) {
          context.fillStyle = `rgba(255,255,255,${random() * 0.2})`;
          context.fillRect(0, y, width, 1);
        }
      } else {
        const flake = finish.effect === 'flake';
        for (let i = 0; i < width * height * 0.014; i++) {
          context.fillStyle = `rgba(255,255,255,${random() * (flake ? 0.75 : 0.1)})`;
          const size = flake ? 1 + random() * 2 : 1;
          context.fillRect(random() * width, random() * height, size, size);
        }
      }

      if (this.textures.size > 16) this.textures.clear();
      this.textures.set(key, tile);
      return tile;
    }

    render() {
      if (!this.canvas) return;
      const width = Math.round(this.canvas.clientWidth);
      const height = Math.round(this.canvas.clientHeight);
      if (!width || !height) return;

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
      const context = this.canvas.getContext('2d');
      if (!context) return;

      context.scale(ratio, ratio);

      // TRANSPARENT BACKGROUND: Clear canvas completely so product photo underneath is visible!
      context.clearRect(0, 0, width, height);

      const text = this.displayText();
      if (!text) {
        return;
      }

      const isSingleLayer = this.config.layers === 1;
      let size = Math.min(height * 0.26, width * 0.22, 120);

      const fontKey = (this.state.font || '').toLowerCase();
      let fontSetting = `${size}px "DC Badge ${this.state.font}", Impact, sans-serif`;
      if (isSingleLayer) {
        const retro = retroFontMap[fontKey] || retroFontMap['nissan'];
        fontSetting = `${size}px "${retro.family}", ${retro.fallback}`;
      } else {
        fontSetting = `${size}px "DC Badge ${this.state.font}"`;
      }

      const setFont = () => { context.font = fontSetting; };
      setFont();

      let metrics = context.measureText(text);
      const measureWidth = () => Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      const measureHeight = () => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const scale = Math.min(1, (width * 0.78) / (measureWidth() + size * 0.12), (height * 0.45) / (measureHeight() + size * 0.12));
      size *= scale;

      if (isSingleLayer) {
        const retro = retroFontMap[fontKey] || retroFontMap['nissan'];
        fontSetting = `${size}px "${retro.family}", ${retro.fallback}`;
      } else {
        fontSetting = `${size}px "DC Badge ${this.state.font}"`;
      }
      setFont();

      metrics = context.measureText(text);
      const x = (width - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2;
      const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      const stroke = Math.max(3.5, size * 0.12);
      const depth = Math.max(2.5, size * 0.045);

      context.lineJoin = 'round';
      context.lineWidth = stroke;

      if (isSingleLayer) {
        // === 1-LAYER 3D RETRO RENDER (Delicate hairline border matching DizzyCustom live store) ===
        const isScript = ['cadillac', 'cabriolet', 'ford', 'chevrolet'].includes(fontKey);
        const strokeWidth = isScript ? Math.max(1.0, Math.min(size * 0.015, 1.6)) : Math.max(1.4, Math.min(size * 0.022, 2.2));

        // 1. Soft realistic drop shadow onto car paint
        context.shadowColor = 'rgba(0, 0, 0, 0.35)';
        context.shadowBlur = Math.max(4, size * 0.06);
        context.shadowOffsetY = Math.max(2, size * 0.025);
        context.shadowOffsetX = 1;
        context.fillStyle = 'rgba(0, 0, 0, 0.35)';
        context.fillText(text, x, y);

        // 2. Delicate hairline black outline (drawn BEFORE fill so inner half is covered by white)
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
        context.shadowOffsetX = 0;
        context.strokeStyle = '#000000';
        context.lineWidth = strokeWidth;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeText(text, x, y);

        // 3. Pure White letter face fill (drawn ON TOP so letters stay 100% crisp and open)
        context.fillStyle = '#ffffff';
        context.fillText(text, x, y);

        this.canvas.setAttribute('aria-label', `${text}, ${retroFontMap[this.state.font]?.label || 'Nova'} font, White with Black Outline (Single Layer)`);
      } else {
        // === 2-LAYER 3D RENDER (Backing plate + raised front letters) ===
        // 1. Realistic deep drop shadow onto the product photo surface
        context.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        context.shadowColor = 'rgba(0, 0, 0, 0.85)';
        context.shadowBlur = Math.max(14, size * 0.18);
        context.shadowOffsetY = Math.max(6, size * 0.08);
        context.shadowOffsetX = 1;
        context.strokeText(text, x + depth, y + depth);
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillText(text, x + depth, y + depth);

        // 2. Backing outline layer
        context.shadowColor = 'transparent';
        context.shadowBlur = 0;
        context.shadowOffsetY = 0;
        context.shadowOffsetX = 0;
        context.strokeStyle = context.createPattern(this.texture(this.state.back, width, height), 'no-repeat');
        context.fillStyle = context.strokeStyle;
        context.strokeText(text, x, y);
        context.fillText(text, x, y);

        // 3. Front Face letter layer (slightly raised upward for 3D layered relief)
        context.fillStyle = context.createPattern(this.texture(this.state.face, width, height), 'no-repeat');
        context.fillText(text, x, y - size * 0.015);

        this.canvas.setAttribute('aria-label', `${text}, ${fontLabels[this.state.font] || this.state.font} font, ${materials.get(this.state.face)?.label} on ${materials.get(this.state.back)?.label}`);
      }
    }
  }

  window.DCPdpCustomizer = DCPdpCustomizer;

  function initInstance() {
    if (window.dcPdpCustomizerInstance) {
      window.dcPdpCustomizerInstance.destroy();
      window.dcPdpCustomizerInstance = null;
    }
    window.dcPdpCustomizerInstance = new DCPdpCustomizer();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target && event.target.querySelector('#DCPdpControlsContainer')) {
      initInstance();
    }
  });

  document.addEventListener('shopify:section:unload', (event) => {
    if (event.target && event.target.querySelector('#DCPdpControlsContainer')) {
      window.dcPdpCustomizerInstance?.destroy();
      window.dcPdpCustomizerInstance = null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstance);
  } else {
    initInstance();
  }
})();
