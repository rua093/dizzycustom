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
  const materials = new Map(finishes.map((finish) => [finish.id, finish]));
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
      this.form = this.querySelector('form');
      this.input = this.querySelector('[data-text]');
      this.canvas = this.querySelector('[data-preview]');
      this.submit = this.querySelector('[data-submit]');
      this.variant = this.querySelector('[data-variant]');
      this.quantity = this.querySelector('[data-quantity]');
      this.error = this.querySelector('[data-error]');
      this.state = { text: this.config.defaultText.slice(0, this.config.maxLength), font: 'lightning', face: 'mirror_red', back: 'gloss_black', mount: 'tape' };
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
        if (event.target.matches('[data-mount]')) this.state.mount = event.target.dataset.mount;
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

    restore() {
      const params = new URLSearchParams(location.search);
      if (params.get('dc_badge') !== '1') return;
      this.interacted = true;
      if (params.has('text')) this.state.text = params.get('text').slice(0, this.config.maxLength);
      if (this.config.fonts.some((font) => font.key === params.get('font'))) this.state.font = params.get('font');
      for (const layer of ['face', 'back']) if (materials.has(params.get(layer))) this.state[layer] = params.get(layer);
      if (['tape', 'studs'].includes(params.get('mount'))) this.state.mount = params.get('mount');
      if (this.variant && Array.from(this.variant.options).some((option) => option.value === params.get('variant'))) this.variant.value = params.get('variant');
      this.group = materials.get(this.state.face).group;
    }

    onClick(event) {
      const button = event.target.closest('button');
      if (!button || button.disabled) return;
      if (button.dataset.font) this.state.font = button.dataset.font;
      if (button.dataset.layer) {
        this.layer = button.dataset.layer;
        this.group = materials.get(this.state[this.layer]).group;
      }
      if (button.dataset.finish) this.group = button.dataset.finish;
      if (button.dataset.swatch) this.state[this.layer] = button.dataset.swatch;
      if (button.dataset.layer || button.dataset.finish) this.buildSwatches();
      this.update();
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
      container.replaceChildren();
      container.setAttribute('aria-label', `${this.layer === 'face' ? 'Text' : 'Backing'} color`);
      finishes.filter((finish) => finish.group === this.group).forEach((finish) => {
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
      const text = this.state.text.trim();
      return this.state.font === 'script' ? text : text.toUpperCase();
    }

    validationMessage() {
      if (!this.displayText()) return 'Type your text first.';
      if (this.state.text.length > this.config.maxLength) return `Use up to ${this.config.maxLength} characters.`;
      if (!/^[\x20-\x7E]+$/.test(this.state.text)) return 'Please use English letters, numbers and standard punctuation for these fonts.';
      if (this.state.font === 'ice' && !/^[A-Za-z0-9 !,.:;?]+$/.test(this.state.text)) return 'Ice supports letters, numbers, spaces and ! , . : ; ? punctuation. Choose another font for other symbols.';
      if (this.state.font === 'lightning' && this.state.text.includes('~')) return 'Lightning does not support ~. Please remove it or choose another font.';
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
      if (this.input.value !== this.state.text) this.input.value = this.state.text;
      this.input.style.textTransform = this.state.font === 'script' ? 'none' : 'uppercase';
      this.querySelector('[data-count]').textContent = `${this.state.text.length}/${this.config.maxLength}`;
      this.querySelectorAll('[data-font]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.font === this.state.font)));
      this.querySelectorAll('[data-layer]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.layer === this.layer)));
      this.querySelectorAll('[data-finish]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.finish === this.group)));
      this.querySelectorAll('[data-swatch]').forEach((button) => {
        const active = button.dataset.swatch === this.state[this.layer];
        button.setAttribute('aria-pressed', String(active));
        button.firstElementChild.textContent = active ? '✓' : '';
      });
      for (const layer of ['face', 'back']) {
        const finish = materials.get(this.state[layer]);
        this.querySelector(`[data-chip="${layer}"]`).style.background = this.swatchBackground(finish);
        this.querySelector(`[data-color-name="${layer}"]`).textContent = finish.label;
        this.querySelector(`[data-property="${layer}"]`).value = finish.label;
      }
      this.querySelector('[data-property="font"]').value = this.config.fonts.find((font) => font.key === this.state.font).label;
      this.querySelectorAll('[data-mount]').forEach((input) => { input.checked = input.dataset.mount === this.state.mount; });
      const message = this.validationMessage();
      this.input.setAttribute('aria-invalid', String(Boolean(message && this.readyFonts)));
      this.error.textContent = message;
      const option = this.variant?.selectedOptions[0];
      const available = option?.dataset.available === 'true';
      const quantitySummary = this.querySelector('[data-quantity-summary]');
      if (quantitySummary) quantitySummary.textContent = `· Quantity: ${this.quantity.value}`;
      this.submit.disabled = Boolean(this.busy || !available || message);
      this.querySelector('[data-submit-label]').textContent = this.busy ? 'Adding…' : !this.variant ? 'Ordering coming soon' : !available ? 'Sold out' : this.displayText() ? `Build “${this.displayText()}”` : 'Build my badge';
      const link = this.querySelector('[data-product-link]');
      if (link) {
        const url = new URL(this.config.productUrl, location.origin);
        url.searchParams.set('view', 'emblem-builder');
        url.searchParams.set('dc_badge', '1');
        for (const key of ['font', 'face', 'back', 'mount']) url.searchParams.set(key, this.state[key]);
        url.searchParams.set('text', this.state.text);
        if (option) url.searchParams.set('variant', option.value);
        link.href = url.pathname + url.search;
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
      let size = Math.min(height * .55, 180);
      const setFont = () => { context.font = `${size}px "DC Badge ${this.state.font}"`; };
      setFont();
      let metrics = context.measureText(text);
      const measureWidth = () => Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
      const measureHeight = () => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const scale = Math.min(1, width * .88 / (measureWidth() + size * .12), height * .68 / (measureHeight() + size * .12));
      size *= scale;
      setFont();
      metrics = context.measureText(text);
      const x = (width - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2;
      const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
      const stroke = Math.max(3, size * .11);
      const depth = Math.max(2, size * .04);
      context.lineJoin = 'round';
      context.lineWidth = stroke;
      context.strokeStyle = '#090b0d';
      context.shadowColor = '#000000a0';
      context.shadowBlur = 12;
      context.shadowOffsetY = 8;
      context.strokeText(text, x + depth, y + depth);
      context.fillStyle = '#090b0d';
      context.fillText(text, x + depth, y + depth);
      context.shadowColor = 'transparent';
      context.shadowBlur = 0;
      context.shadowOffsetY = 0;
      context.strokeStyle = context.createPattern(this.texture(this.state.back, width, height), 'no-repeat');
      context.fillStyle = context.strokeStyle;
      context.strokeText(text, x, y);
      context.fillText(text, x, y);
      context.fillStyle = context.createPattern(this.texture(this.state.face, width, height), 'no-repeat');
      context.fillText(text, x, y - size * .012);
      this.canvas.setAttribute('aria-label', `${text}, ${this.state.font} font, ${materials.get(this.state.face).label} text on ${materials.get(this.state.back).label} backing`);
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
      const selected = this.variant?.selectedOptions[0];
      if (selected?.dataset.available !== 'true') return;
      const root = window.Shopify?.routes?.root || '/';
      const drawer = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
      const form = new FormData(this.form);
      form.set('properties[Custom Text]', this.displayText());
      if (drawer) {
        form.set('sections', drawer.getSectionsToRender().map((section) => section.id).join(','));
        form.set('sections_url', location.pathname);
        drawer.setActiveElement(this.submit);
      }
      this.busy = true;
      this.update();
      this.querySelector('[data-controls]').disabled = true;
      let added = false;
      try {
        const response = await fetch(`${root}cart/add.js`, { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: form });
        const data = await response.json();
        if (!response.ok || data.status) throw new Error(data.description || data.message || 'Could not add your badge. Please try again.');
        added = true;
        if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') publish(PUB_SUB_EVENTS.cartUpdate, { source: 'dc-emblem-builder', productVariantId: selected.value, cartData: data });
        if (drawer && data.sections && Object.values(data.sections).every(Boolean)) {
          drawer.classList.remove('is-empty');
          drawer.renderContents(data);
        } else location.assign(`${root}cart`);
      } catch (error) {
        if (added) location.assign(`${root}cart`);
        else this.cartError = error.message || 'Connection lost. Please check your cart before trying again.';
      } finally {
        this.busy = false;
        this.querySelector('[data-controls]').disabled = false;
        this.update();
        if (this.cartError) { this.error.textContent = this.cartError; this.cartError = ''; }
      }
    }
  }

  customElements.define('dc-emblem-builder', EmblemBuilder);
})();
