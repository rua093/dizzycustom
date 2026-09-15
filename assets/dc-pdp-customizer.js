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
  const fontLabels = {
    bold: 'Block',
    lightning: 'Lightning',
    aggressive: 'Aggressive',
    script: 'Script',
    electric: 'Electric',
    ice: 'Ice',
    oem: 'OEM'
  };
  const mountLabels = {
    tape: 'VHB Tape (Flat Surface)',
    studs: 'Studs (Grille Mount)'
  };

  const loadedFonts = new Map();
  function loadFont(font) {
    const cacheKey = `${font.key}:${font.url}`;
    if (!loadedFonts.has(cacheKey)) {
      const face = new FontFace(`DC Badge ${font.key}`, `url(${JSON.stringify(font.url)})`);
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
      const isCustomBadge = params.get('dc_badge') === '1';
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
      this.config = configScript ? JSON.parse(configScript.textContent) : { maxLength: 16, fonts: [] };

      this.input = this.controlsContainer.querySelector('[data-pdp-text]');
      this.counter = this.controlsContainer.querySelector('[data-pdp-count]');
      this.layer = 'face';
      this.group = 'mirror';
      this.textures = new Map();

      // Default state
      this.state = {
        text: 'DIZZY',
        font: 'lightning',
        face: 'mirror_red',
        back: 'gloss_black',
        mount: 'tape'
      };

      this.initFromUrl(params);
      this.bindEvents();
      this.buildSwatches();
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
          this.mediaSpacer.style.height = `${this.naturalMediaHeight}px`;
          this.mediaSpacer.style.display = 'block';
          this.mediaWrapper.classList.add('dc-mobile-sticky');
          this.mediaWrapper.style.top = `${headerOffset}px`;
        }
      } else {
        const spacerRect = this.mediaSpacer.getBoundingClientRect();

        // Check if user scrolled back up above the initial position
        if (spacerRect.top > headerOffset) {
          this.mediaWrapper.classList.remove('dc-mobile-sticky');
          this.mediaWrapper.style.top = '';
          this.mediaWrapper.style.transform = '';
          this.mediaSpacer.style.display = 'none';
          this.mediaSpacer.style.height = '0px';
          return;
        }
      }

      if (this.mediaWrapper.classList.contains('dc-mobile-sticky')) {
        this.mediaWrapper.style.top = `${headerOffset}px`;

        // Keep the preview visible only until it would cover the first customizer control.
        const controls = this.controlsContainer || document.querySelector('variant-radios, variant-selects');
        if (controls && document.body.contains(controls)) {
          const boundaryTop = controls.getBoundingClientRect().top;
          const stickyHeight = this.naturalMediaHeight || this.mediaWrapper.offsetHeight;
          const stickyBottom = headerOffset + stickyHeight;

          if (boundaryTop < stickyBottom) {
            const diff = Math.round(boundaryTop - stickyBottom);
            this.mediaWrapper.style.transform = `translateY(${diff}px)`;
          } else {
            this.mediaWrapper.style.transform = 'translateY(0)';
          }
        } else {
          this.mediaWrapper.style.transform = 'translateY(0)';
        }
      }
    }

    ensureCanvasOverlay() {
      this.canvasWrapper = document.getElementById('dc-pdp-canvas-wrapper');
      this.canvas = document.getElementById('dc-pdp-canvas');

      if (!this.canvasWrapper || !this.canvas) {
        // Dynamically find the first media element in the gallery
        const firstMedia = document.querySelector('slider-component[id^="GalleryViewer"] .product__media') ||
                           document.querySelector('.product__media-list .product__media') ||
                           document.querySelector('.product__media');
        if (firstMedia) {
          firstMedia.style.position = 'relative';
          const wrapper = document.createElement('div');
          wrapper.id = 'dc-pdp-canvas-wrapper';
          wrapper.className = 'dc-pdp-media-canvas-overlay';
          wrapper.innerHTML = `
            <canvas id="dc-pdp-canvas" class="dc-pdp-canvas" width="800" height="800" role="img" aria-label="Live custom emblem preview"></canvas>
            <span class="dc-pdp-live-badge" aria-hidden="true">
              <span class="dc-pdp-live-dot"></span>
              <span>Live Custom Preview</span>
            </span>
          `;
          firstMedia.appendChild(wrapper);
          this.canvasWrapper = wrapper;
          this.canvas = wrapper.querySelector('canvas');
        }
      }

      if (this.canvasWrapper) {
        this.canvasWrapper.style.display = 'flex';
      }
    }

    initFromUrl(params) {
      if (params.has('text') && params.get('text').trim()) {
        this.state.text = params.get('text').trim().slice(0, this.config.maxLength);
      }
      if (params.has('font') && fontLabels[params.get('font')]) {
        this.state.font = params.get('font');
      }
      for (const layer of ['face', 'back']) {
        if (materials.has(params.get(layer))) {
          this.state[layer] = params.get(layer);
        }
      }
      if (['tape', 'studs'].includes(params.get('mount'))) {
        this.state.mount = params.get('mount');
      }

      this.group = materials.get(this.state.face)?.group || 'mirror';
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

      // Font pills
      this.controlsContainer.querySelectorAll('[data-pdp-font]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.state.font = btn.dataset.pdpFont;
          this.updateUI();
          this.scrollToFirstMedia();
        });
      });

      // Layer tabs (Text vs Backing)
      this.controlsContainer.querySelectorAll('[data-pdp-layer]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.layer = btn.dataset.pdpLayer;
          this.group = materials.get(this.state[this.layer])?.group || 'solid';
          this.buildSwatches();
          this.updateUI();
        });
      });

      // Finish category tabs (Solid, Mirror, Patterns, Metal Flake)
      this.controlsContainer.querySelectorAll('[data-pdp-finish]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.group = btn.dataset.pdpFinish;
          this.buildSwatches();
          this.updateUI();
        });
      });

      // Mounting radio inputs
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

      finishes.filter((f) => f.group === this.group).forEach((finish) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dc-pdp-swatch';
        btn.dataset.swatch = finish.id;
        btn.title = finish.label;
        btn.setAttribute('aria-label', finish.label);

        const chip = document.createElement('span');
        chip.className = 'dc-pdp-swatch__chip';
        chip.style.background = this.swatchBackground(finish);
        btn.appendChild(chip);

        btn.addEventListener('click', () => {
          this.state[this.layer] = finish.id;
          this.updateUI();
          this.scrollToFirstMedia();
        });

        container.appendChild(btn);
      });
    }

    swatchBackground(finish) {
      if (finish.effect === 'mirror') return `linear-gradient(135deg, ${finish.color} 10%, #ffffff 42%, ${finish.color} 55%, #202329 100%)`;
      if (finish.effect === 'brushed') return `repeating-linear-gradient(0deg, #ffffff33 0 1px, transparent 1px 3px), ${finish.color}`;
      if (finish.effect === 'carbon') return 'repeating-conic-gradient(#17191b 0% 25%, #363a3d 0% 50%) 0 / 8px 8px';
      if (finish.effect === 'flake') return `radial-gradient(circle, #ffffffa0 0 1px, transparent 1px) 0 / 6px 7px, ${finish.color}`;
      return finish.color;
    }

    displayText() {
      const text = (this.state.text || '').trim();
      return this.state.font === 'script' ? text : text.toUpperCase();
    }

    updateUI() {
      // Input value and text-transform
      if (this.input && this.input.value !== this.state.text) {
        this.input.value = this.state.text;
      }
      if (this.input) {
        this.input.style.textTransform = this.state.font === 'script' ? 'none' : 'uppercase';
      }
      if (this.counter) {
        this.counter.textContent = `${this.state.text.length}/${this.config.maxLength}`;
      }

      // Font active state
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

      // Sync hidden form properties into PDP product form
      this.syncPropertiesToForm();

      this.scheduleRender();
    }

    syncPropertiesToForm() {
      const faceLabel = materials.get(this.state.face)?.label || this.state.face;
      const backLabel = materials.get(this.state.back)?.label || this.state.back;
      const fontLabel = fontLabels[this.state.font] || this.state.font;
      const mountLabel = mountLabels[this.state.mount] || this.state.mount;
      const customText = this.displayText();

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
      if (!this.config.fonts || !this.config.fonts.length) return;
      const results = await Promise.allSettled(this.config.fonts.map(loadFont));
      this.readyFonts = new Set();
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          this.readyFonts.add(this.config.fonts[i].key);
        }
      });
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

      // TRANSPARENT BACKGROUND: Clear canvas completely so the real product photo underneath is visible!
      context.clearRect(0, 0, width, height);

      const text = this.displayText();
      if (!text || !this.readyFonts?.has(this.state.font)) {
        return;
      }

      let size = Math.min(height * 0.26, width * 0.22, 120);
      const setFont = () => { context.font = `${size}px "DC Badge ${this.state.font}"`; };
      setFont();

      let metrics = context.measureText(text);
      const measureWidth = () => Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      const measureHeight = () => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const scale = Math.min(1, (width * 0.78) / (measureWidth() + size * 0.12), (height * 0.45) / (measureHeight() + size * 0.12));
      size *= scale;
      setFont();

      metrics = context.measureText(text);
      const x = (width - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2;
      const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      const stroke = Math.max(3.5, size * 0.12);
      const depth = Math.max(2.5, size * 0.045);

      context.lineJoin = 'round';
      context.lineWidth = stroke;

      // Realistic deep drop shadow onto the product photo surface
      context.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      context.shadowColor = 'rgba(0, 0, 0, 0.85)';
      context.shadowBlur = Math.max(14, size * 0.18);
      context.shadowOffsetY = Math.max(6, size * 0.08);
      context.shadowOffsetX = 1;
      context.strokeText(text, x + depth, y + depth);
      context.fillStyle = 'rgba(0, 0, 0, 0.75)';
      context.fillText(text, x + depth, y + depth);

      // Backing outline layer
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;
      context.shadowOffsetX = 0;
      context.strokeStyle = context.createPattern(this.texture(this.state.back, width, height), 'no-repeat');
      context.fillStyle = context.strokeStyle;
      context.strokeText(text, x, y);
      context.fillText(text, x, y);

      // Front Face letter layer (slightly raised upward for 3D layered relief)
      context.fillStyle = context.createPattern(this.texture(this.state.face, width, height), 'no-repeat');
      context.fillText(text, x, y - size * 0.015);

      this.canvas.setAttribute('aria-label', `${text}, ${fontLabels[this.state.font]} font, ${materials.get(this.state.face)?.label} on ${materials.get(this.state.back)?.label}`);
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
