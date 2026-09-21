(() => {
  if (customElements.get('dc-emblem-builder')) return;

  // Stable material IDs are shared by preview, product links and cart properties.
  const finishes = [
    ['red', 'Red', '#dc0f0f', 'solid'], ['white', 'White', '#f5f5f8', 'solid'],
    ['gloss_black', 'Gloss Black', '#0a0a0c', 'solid'], ['matte_black', 'Matte Black', '#1e1e22', 'solid', 'matte'],
    ['gray', 'Gray', '#8c8c94', 'solid'], ['maroon', 'Maroon', '#6e0f0f', 'solid'],
    ['orange', 'Orange', '#f0820a', 'solid'], ['yellow', 'Yellow', '#ebc80f', 'solid'],
    ['lime_green', 'Lime Green', '#8cdc0a', 'solid'], ['green', 'Green', '#0aaa28', 'solid'],
    ['blue', 'Blue', '#143cc8', 'solid'], ['purple', 'Purple', '#780fbe', 'solid'],
    ['pink', 'Pink', '#f06eaa', 'solid'], ['brown', 'Brown', '#4b2314', 'solid'],
    ['mirror_white', 'Mirror White', '#f7f7f7', 'mirror'], ['mirror_red', 'Mirror Red', '#b40f0f', 'mirror'], ['mirror_silver', 'Mirror Silver', '#bec3c8', 'mirror'],
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
  const materials = new Map(finishes.map((finish) => [finish.id, finish]));
  // Keep pattern materials for existing orders; add 'patterns' here when they are sold again.
  const purchasableFinishGroups = new Set(['solid', 'mirror', 'flake']);
  const backingFinishGroups = new Set(['solid', 'flake']);
  const mirrorWhiteId = 'mirror_white';
  const loadedFonts = new Map();

  function loadFont(font) {
    const cacheKey = `${font.key}:${font.url}`;
    if (!loadedFonts.has(cacheKey)) {
      const face = new FontFace(`DC Badge ${font.key}`, `url(${JSON.stringify(font.url)})`);
      loadedFonts.set(cacheKey, face.load().then((loaded) => document.fonts.add(loaded)).catch((error) => {
        loadedFonts.delete(cacheKey);
        throw error;
      }));
    }
    return loadedFonts.get(cacheKey);
  }

  class EmblemBuilder extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.config = JSON.parse(this.querySelector('[data-builder-config]').textContent);
      this.core = window.DCEmblemCore;
      this.form = this.querySelector('form');
      this.input = this.querySelector('[data-text]');
      this.canvas = this.querySelector('[data-preview]');
      this.submit = this.querySelector('[data-submit]');
      this.variant = this.querySelector('[data-variant]');
      this.quantity = this.querySelector('[data-quantity]');
      this.error = this.querySelector('[data-error]');
      this.currentMaxLength = this.config.defaultSizeMax || this.config.maxLength || 16;
      this.state = {
        text: this.config.defaultText.slice(0, this.currentMaxLength),
        font: 'lightning',
        face: mirrorWhiteId,
        back: 'gloss_black',
        layers: 2,
        variantId: this.config.defaultVariantId,
        sizeTitle: this.config.defaultSizeTitle
      };
      this.layer = 'face';
      this.group = 'mirror';
      this.textures = new Map();
      this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      this.restore();
      const signal = this.controller.signal;
      this.addEventListener('pointerdown', () => this.stopDemo(), { signal });
      this.addEventListener('focusin', () => this.stopDemo(), { signal });
      this.addEventListener('click', (event) => this.onClick(event), { signal });
      this.addEventListener('animationend', (event) => {
        if (event.target === this) this.style.transform = 'none';
      }, { signal });
      this.input.addEventListener('input', () => {
        this.stopDemo();
        this.state.text = this.input.value;
        this.update();
      }, { signal });
      this.addEventListener('change', (event) => {
        const sizeInput = event.target.closest('[data-size-id]');
        if (sizeInput) {
          this.setSize(sizeInput, true);
        }
        if (event.target === this.variant) this.syncVariant();
        this.update();
      }, { signal });
      this.form.addEventListener('submit', (event) => this.addToCart(event), { signal });
      this.reducedMotion.addEventListener('change', () => {
        if (this.reducedMotion.matches) this.stopDemo();
      }, { signal });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopDemo();
      }, { signal });
      this.observer = new ResizeObserver(() => this.scheduleRender());
      this.observer.observe(this.canvas);
      this.syncVariant();
      this.buildSwatches();
      this.querySelector('[data-controls]').disabled = false;
      const initialSizeInput = (this.state.variantId && this.querySelector(`[data-size-id="${this.state.variantId}"]`)) || this.querySelector('[data-size-id]:checked') || this.querySelector('[data-size-id]');
      if (initialSizeInput) {
        this.setSize(initialSizeInput, false);
      }
      this.update();
      this.initializeFonts(signal);
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      this.stopDemo();
      cancelAnimationFrame(this.frame);
    }

    async initializeFonts(signal) {
      const results = await Promise.allSettled(this.config.fonts.map(loadFont));
      if (signal.aborted) return;
      this.readyFonts = new Set();
      results.forEach((result, index) => {
        const key = this.config.fonts[index].key;
        this.querySelector(`[data-font="${key}"]`).disabled = result.status !== 'fulfilled';
        if (result.status === 'fulfilled') this.readyFonts.add(key);
      });
      this.update();
    }

    stopDemo() {
      this.interacted = true;
    }

    setSize(sizeInput, userAction = true) {
      if (userAction) this.stopDemo();
      this.state.variantId = sizeInput.dataset.sizeId;
      this.state.sizeTitle = sizeInput.dataset.sizeTitle;
      this.state.sizePrice = sizeInput.dataset.sizePrice;
      this.config.available = sizeInput.dataset.sizeAvailable === 'true';
      this.currentMaxLength = this.core.getVariantMaxLength(sizeInput.dataset.sizeTitle, parseInt(sizeInput.dataset.sizeMax, 10) || this.config.maxLength || 16);

      const idInput = this.querySelector('[data-variant-id]');
      if (idInput) idInput.value = this.state.variantId;

      this.config.price = this.state.sizePrice;
      const summaryPrice = this.querySelector('[data-summary-price]');
      if (summaryPrice) summaryPrice.textContent = this.state.sizePrice;

      if (this.input) {
        this.input.maxLength = this.currentMaxLength;
        if (this.state.text.length > this.currentMaxLength) {
          this.state.text = this.state.text.slice(0, this.currentMaxLength);
          this.input.value = this.state.text;
        }
      }
      const stageGuide = this.querySelector('.dc-builder-stage-guide');
      if (stageGuide) {
        stageGuide.textContent = `Letters, numbers, spaces and punctuation. Up to ${this.currentMaxLength} characters.`;
      }
      const counter = this.querySelector('[data-count]');
      if (counter) {
        counter.textContent = `${this.state.text.length}/${this.currentMaxLength}`;
      }
    }

    restore() {
      const params = new URLSearchParams(location.search);
      if (params.get('dc_badge') === '1') {
        this.interacted = true;
        if (params.has('text')) this.state.text = params.get('text').slice(0, this.currentMaxLength || this.config.maxLength);
        if (this.config.fonts.some((font) => font.key === params.get('font'))) this.state.font = params.get('font');
        for (const layer of ['face', 'back']) if (materials.has(params.get(layer))) this.state[layer] = params.get(layer);
        if (['1', '2'].includes(params.get('layers'))) this.state.layers = Number(params.get('layers'));
        if (params.has('variant')) {
          this.state.variantId = params.get('variant');
          const matchingInput = this.querySelector(`[data-size-id="${this.state.variantId}"]`);
          if (matchingInput) this.setSize(matchingInput, false);
        }
        if (this.variant && Array.from(this.variant.options).some((option) => option.value === params.get('variant'))) this.variant.value = params.get('variant');
        this.normalizeFaceFinish();
        this.normalizeBackingFinish();
        this.normalizeLayerCount();
        this.group = materials.get(this.state.face).group;
        this.saveToStorage();
        return;
      }
      this.restoreFromStorage();
    }

    saveToStorage() {
      try {
        if (this.core && typeof this.core.saveModernState === 'function') {
          this.core.saveModernState({
            text: this.state.text,
            font: this.state.font,
            face: this.state.face,
            back: this.state.back,
            layers: this.state.layers,
            variantId: this.state.variantId
          });
          return;
        }
        localStorage.setItem('dc_custom_emblem_state', JSON.stringify({
          text: this.state.text,
          font: this.state.font,
          face: this.state.face,
          back: this.state.back,
          layers: this.state.layers,
          variantId: this.state.variantId
        }));
      } catch (e) {}
    }

    restoreFromStorage() {
      try {
        const saved = (this.core && typeof this.core.restoreModernState === 'function')
          ? this.core.restoreModernState()
          : JSON.parse(localStorage.getItem('dc_custom_emblem_state') || 'null');
        if (!saved || typeof saved !== 'object') return;
        if ([1, 2].includes(saved.layers)) this.state.layers = saved.layers;
        if (saved.variantId) {
          this.state.variantId = saved.variantId;
          const matchingInput = this.querySelector(`[data-size-id="${saved.variantId}"]`);
          if (matchingInput) this.setSize(matchingInput, false);
        }
        if (saved.text && typeof saved.text === 'string' && saved.text.trim()) {
          this.state.text = saved.text.trim().slice(0, this.currentMaxLength || this.config.maxLength);
          this.interacted = true;
        }
        if (this.config.fonts.some((f) => f.key === saved.font)) {
          this.state.font = saved.font;
          this.interacted = true;
        }
        for (const layer of ['face', 'back']) {
          if (materials.has(saved[layer])) {
            this.state[layer] = saved[layer];
            this.interacted = true;
          }
        }
        this.normalizeFaceFinish();
        this.normalizeBackingFinish();
        this.normalizeLayerCount();
        this.group = materials.get(this.state.face)?.group || 'mirror';
      } catch (e) {}
    }

    onClick(event) {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.font) this.state.font = button.dataset.font;
      if (button.dataset.layerCount) {
        this.state.layers = Number(button.dataset.layerCount);
        this.normalizeLayerCount();
      }
      if (button.dataset.layer) {
        this.layer = button.dataset.layer;
        this.normalizeBackingFinish();
        const finish = materials.get(this.state[this.layer]);
        this.group = this.getFinishGroups().has(finish?.group) ? finish.group : 'solid';
      }
      if (button.dataset.finish && this.getFinishGroups().has(button.dataset.finish)) this.group = button.dataset.finish;
      const selectedFinish = materials.get(button.dataset.swatch);
      if (button.dataset.swatch && this.isFinishAvailable(selectedFinish)) this.state[this.layer] = button.dataset.swatch;
      if (button.dataset.layer || button.dataset.finish || button.dataset.layerCount) this.buildSwatches();
      this.update();
    }

    getFinishGroups(layer = this.layer) {
      return this.core.getFinishGroups(this.state.layers, layer);
    }

    normalizeLayerCount() {
      this.state = this.core.normalizeModernState(this.state);
      if (this.state.layers === 1) {
        this.layer = 'face';
        this.group = 'solid';
      }
    }

    normalizeBackingFinish() {
      this.state = this.core.normalizeModernState(this.state);
    }

    normalizeFaceFinish() {
      this.state = this.core.normalizeModernState(this.state);
    }

    isFinishAvailable(finish) {
      return Boolean(finish && this.core.isFinishAvailable(finish.id, this.state.layers, this.layer));
    }

    swatchBackground(finish) {
      if (finish.effect === 'mirror') return `linear-gradient(135deg, ${finish.color} 10%, #ffffff 42%, ${finish.color} 55%, #202329 100%)`;
      if (finish.effect === 'brushed') return `repeating-linear-gradient(0deg, #ffffff33 0 1px, transparent 1px 3px), ${finish.color}`;
      if (finish.effect === 'carbon') return 'repeating-conic-gradient(#17191b 0% 25%, #363a3d 0% 50%) 0 / 8px 8px';
      if (finish.effect === 'flake') return `radial-gradient(circle, #ffffffa0 0 1px, transparent 1px) 0 / 6px 7px, ${finish.color}`;
      return finish.color;
    }

    buildSwatches() {
      const container = this.querySelector('[data-swatches]');
      const targetFinishes = finishes.filter((finish) => finish.group === this.group && this.isFinishAvailable(finish));
      const existingButtons = Array.from(container.querySelectorAll('[data-swatch]'));
      const canReuse = existingButtons.length === targetFinishes.length &&
        existingButtons.every((btn, idx) => btn.dataset.swatch === targetFinishes[idx].id);

      if (canReuse) return;

      container.replaceChildren();
      container.setAttribute('aria-label', `${this.layer === 'face' ? 'Text' : 'Backing'} color`);
      targetFinishes.forEach((finish) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dc-builder-swatch';
        button.dataset.swatch = finish.id;
        button.setAttribute('aria-label', finish.label);
        button.title = finish.label;
        const chip = document.createElement('span');
        chip.style.background = this.swatchBackground(finish);
        chip.setAttribute('aria-hidden', 'true');
        button.append(chip);
        container.append(button);
      });
    }

    displayText() {
      return this.core.normalizeModernText(this.state.text, this.currentMaxLength || this.config.maxLength || 16).trim();
    }

    validationMessage() {
      if (!this.displayText()) return 'Type your text first.';
      const max = this.currentMaxLength || this.config.maxLength || 16;
      if (this.state.text.length > max) return `Use up to ${max} characters.`;
      if (!/^[\x20-\x7E]+$/.test(this.state.text)) return 'Please use English letters, numbers and standard punctuation for these fonts.';
      if (this.state.font === 'ice' && !/^[A-Za-z0-9 !,.:;?]+$/.test(this.state.text)) return 'Frost supports letters, numbers, spaces and ! , . : ; ? punctuation. Choose another font for other symbols.';
      if (this.state.font === 'lightning' && this.state.text.includes('~')) return 'Slant does not support ~. Please remove it or choose another font.';
      if (!this.readyFonts?.has(this.state.font)) return this.readyFonts ? 'This font could not load. Please choose another font or reload the page.' : 'Loading badge fonts…';
      return '';
    }

    syncVariant() {
      const option = this.variant?.selectedOptions[0];
      if (!option) return;
      const min = Number(option.dataset.min) || 1;
      const step = Number(option.dataset.step) || 1;
      this.quantity.min = String(min);
      this.quantity.step = String(step);
      if (option.dataset.max) this.quantity.max = option.dataset.max;
      else this.quantity.removeAttribute('max');
      this.quantity.value = String(min);
      this.querySelector('[data-price-display]').textContent = option.dataset.price;
    }

    update() {
      const max = this.currentMaxLength || this.config.maxLength || 16;
      this.state.text = this.core.normalizeModernText(this.state.text, max);
      if (this.input.value !== this.state.text) this.input.value = this.state.text;
      this.input.style.textTransform = 'uppercase';
      this.input.maxLength = max;
      this.querySelector('[data-count]').textContent = `${this.state.text.length}/${max}`;
      this.querySelectorAll('[data-font]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.font === this.state.font)));
      this.querySelectorAll('[data-layer-count]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.layerCount) === this.state.layers)));
      this.querySelectorAll('[data-layer]').forEach((button) => {
        const isBacking = button.dataset.layer === 'back';
        button.hidden = this.state.layers === 1 && isBacking;
        button.disabled = this.state.layers === 1 && isBacking;
        button.setAttribute('aria-pressed', String(button.dataset.layer === this.layer));
      });
      const availableFinishGroups = this.getFinishGroups();
      this.querySelectorAll('[data-finish]').forEach((button) => {
        button.hidden = !availableFinishGroups.has(button.dataset.finish);
        button.disabled = !availableFinishGroups.has(button.dataset.finish);
        button.setAttribute('aria-pressed', String(button.dataset.finish === this.group));
      });
      this.querySelectorAll('[data-swatch]').forEach((button) => {
        const active = button.dataset.swatch === this.state[this.layer];
        button.setAttribute('aria-pressed', String(active));
        button.firstElementChild.textContent = active ? '✓' : '';
      });
      for (const layer of ['face', 'back']) {
        const finish = materials.get(this.state[layer]);
        this.querySelector(`[data-chip="${layer}"]`).style.background = this.swatchBackground(finish);
        this.querySelector(`[data-color-name="${layer}"]`).textContent = finish.label;
      }
      const properties = this.core.serializeModernProperties({ ...this.state, text: this.displayText() }, this.config.fonts);
      this.querySelector('[data-property="font"]').value = properties.Font;
      this.querySelector('[data-property="face"]').value = properties['Text Color'];
      this.querySelector('[data-property="mode"]').value = properties._dc_emblem_mode;
      const backProperty = this.querySelector('[data-property="back"]');
      backProperty.disabled = !properties['Background Color'];
      backProperty.value = properties['Background Color'] || '';
      this.querySelectorAll('[data-size-id]').forEach((input) => {
        input.checked = input.dataset.sizeId === String(this.state.variantId);
      });
      const message = this.validationMessage();
      this.input.setAttribute('aria-invalid', String(Boolean(message && this.readyFonts)));
      this.error.textContent = message;
      const available = Boolean(this.config.available);
      this.submit.disabled = Boolean(this.busy || !available || message);

      let labelText = 'Build My Badge';
      if (this.busy) {
        labelText = 'Adding…';
      } else if (!this.config.productUrl) {
        labelText = 'Ordering coming soon';
      } else if (!available) {
        labelText = 'Sold out';
      } else {
        labelText = 'Build My Badge';
      }
      this.querySelector('[data-submit-label]').textContent = labelText;

      const summaryPrice = this.querySelector('[data-summary-price]');
      if (summaryPrice && this.config.price) {
        summaryPrice.textContent = this.config.price;
      }
      if (this.interacted) {
        this.saveToStorage();
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
      const finish = materials.get(id);
      const tile = document.createElement('canvas');
      tile.width = width;
      tile.height = height;
      const context = tile.getContext('2d');
      context.fillStyle = finish.color;
      context.fillRect(0, 0, width, height);
      // Seeded texture prevents flakes/grain moving while typing or resizing.
      let seed = 71;
      const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      if (finish.effect === 'mirror' || finish.effect === 'solid') {
        const gradient = context.createLinearGradient(0, 0, width * .6, height);
        const opacity = finish.effect === 'mirror' ? .7 : .08;
        gradient.addColorStop(0, 'rgba(255,255,255,0)');
        gradient.addColorStop(.36, `rgba(255,255,255,${opacity})`);
        gradient.addColorStop(.5, 'rgba(0,0,0,.05)');
        gradient.addColorStop(.8, `rgba(255,255,255,${opacity * .4})`);
        gradient.addColorStop(1, 'rgba(0,0,0,.2)');
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
          context.fillStyle = `rgba(255,255,255,${random() * .2})`;
          context.fillRect(0, y, width, 1);
        }
      } else {
        const flake = finish.effect === 'flake';
        for (let i = 0; i < width * height * .014; i++) {
          context.fillStyle = `rgba(255,255,255,${random() * (flake ? .75 : .1)})`;
          const size = flake ? 1 + random() * 2 : 1;
          context.fillRect(random() * width, random() * height, size, size);
        }
      }
      if (this.textures.size > 12) this.textures.clear();
      this.textures.set(key, tile);
      return tile;
    }

    render() {
      const width = Math.round(this.canvas.clientWidth);
      const height = Math.round(this.canvas.clientHeight);
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
      const context = this.canvas.getContext('2d');
      if (!context) return;
      context.scale(ratio, ratio);
      const background = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * .7);
      background.addColorStop(0, '#303a43');
      background.addColorStop(1, '#111820');
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = '#ffffff08';
      context.lineWidth = 1;
      for (let x = -height; x < width; x += 18) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x + height, height); context.stroke();
      }
      const text = this.displayText();
      if (!text || !this.readyFonts?.has(this.state.font)) {
        context.fillStyle = '#c6cdd4';
        context.font = '16px sans-serif';
        context.textAlign = 'center';
        context.fillText(text ? 'Loading your preview…' : 'Your words go here', width / 2, height / 2);
        return;
      }
      this.core.renderModernCanvas({ context, width, height, text, fontKey: this.state.font, faceId: this.state.face, backId: this.state.back, layers: this.state.layers, texture: this.texture.bind(this) });
      const face = materials.get(this.state.face).label;
      const back = materials.get(this.state.back).label;
      this.canvas.setAttribute('aria-label', this.state.layers === 1 ? `${text}, ${this.state.font} font, ${face} single-layer text` : `${text}, ${this.state.font} font, ${face} text on ${back} backing`);
    }

    async addToCart(event) {
      event.preventDefault();
      if (this.busy) return;
      this.stopDemo();
      const validation = this.validationMessage();
      if (validation || !this.form.reportValidity()) {
        this.error.textContent = validation;
        this.input.focus();
        return;
      }
      if (!this.config.available) {
        this.error.textContent = 'This badge is currently unavailable.';
        return;
      }
      const root = window.Shopify?.routes?.root || '/';
      const addUrl = window.routes?.cart_add_url || `${root}cart/add`;
      const drawer = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
      const form = new FormData(this.form);
      form.set('properties[Custom Text]', this.displayText());

      if (drawer && typeof drawer.getSectionsToRender === 'function') {
        form.set('sections', drawer.getSectionsToRender().map((section) => section.id).join(','));
        form.set('sections_url', location.pathname);
        if (typeof drawer.setActiveElement === 'function') {
          drawer.setActiveElement(this.submit);
        }
      }

      this.busy = true;
      this.update();
      this.querySelector('[data-controls]').disabled = true;

      try {
        const response = await fetch(addUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/javascript',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: form
        });
        const data = await response.json();
        if (!response.ok || data.status) {
          throw new Error(data.description || data.message || 'Could not add your badge. Please try again.');
        }

        const variantId = form.get('id');
        try {
          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, { source: 'dc-emblem-builder', productVariantId: variantId, cartData: data });
          }
        } catch (pubErr) {
          console.warn('Cart publish error:', pubErr);
        }

        if (drawer) {
          if (data.sections && Object.values(data.sections).every(Boolean)) {
            drawer.classList.remove('is-empty');
            drawer.renderContents(data);
          } else {
            const res = await fetch(`${root}?section_id=cart-drawer`);
            const html = await res.text();
            const parsed = new DOMParser().parseFromString(html, 'text/html');
            const newContent = parsed.querySelector('#CartDrawer');
            const curContent = drawer.querySelector('#CartDrawer');
            if (newContent && curContent) curContent.innerHTML = newContent.innerHTML;
            drawer.classList.remove('is-empty');
            if (typeof drawer.open === 'function') drawer.open(this.submit);
          }
        } else {
          location.assign(window.routes?.cart_url || `${root}cart`);
        }
      } catch (error) {
        console.error('Cart add error:', error);
        this.cartError = error.message || 'Connection lost. Please check your cart before trying again.';
      } finally {
        this.busy = false;
        this.querySelector('[data-controls]').disabled = false;
        this.update();
        if (this.cartError) {
          this.error.textContent = this.cartError;
          this.cartError = '';
        }
      }
    }
  }

  customElements.define('dc-emblem-builder', EmblemBuilder);
})();
