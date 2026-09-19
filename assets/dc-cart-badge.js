/**
 * Dizzy Custom Cart Drawer Live 3D Badge Overlay
 * Renders custom 3D text overlay onto product thumbnail images inside the cart drawer.
 */
(() => {
  if (window.DCCartBadgeInitialized) return;
  window.DCCartBadgeInitialized = true;

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

  const materialsById = new Map(finishes.map((f) => [f.id.toLowerCase(), f]));
  const materialsByLabel = new Map(finishes.map((f) => [f.label.toLowerCase(), f]));

  function getMaterial(keyOrLabel, fallbackId) {
    if (!keyOrLabel) return materialsById.get(fallbackId) || finishes[0];
    const normalized = keyOrLabel.trim().toLowerCase();
    return materialsById.get(normalized) || materialsByLabel.get(normalized) || materialsById.get(fallbackId) || finishes[0];
  }

  const retroFontMap = {
    lexus: { label: 'LEXUS', family: 'DCRetro-lexus', fallback: '"Arial Black", sans-serif' },
    dodge: { label: 'DODGE', family: 'DCRetro-dodge', fallback: 'Impact, sans-serif' },
    jeep: { label: 'Jeep', family: 'DCRetro-jeep', fallback: '"Arial Black", sans-serif' },
    audi: { label: 'Audi', family: 'DCRetro-audi', fallback: '"Helvetica Neue", sans-serif' },
    cabriolet: { label: 'Cabriolet', family: 'DCRetro-cabriolet', fallback: 'cursive' },
    chevrolet: { label: 'Chevrolet', family: 'DCRetro-chevrolet', fallback: 'Impact, sans-serif' },
    cadillac: { label: 'Cadillac', family: 'DCRetro-cadillac', fallback: 'cursive' },
    nissan: { label: 'Nissan', family: 'DCRetro-nissan', fallback: '"Arial Black", sans-serif' },
    ferrari: { label: 'Ferrari', family: 'DCRetro-ferrari', fallback: '"Times New Roman", serif' },
    ikarus: { label: 'Ikarus', family: 'DCRetro-ikarus', fallback: 'Georgia, serif' },
    lamborghini: { label: 'Lamborghini', family: 'DCRetro-lamborghini', fallback: '"Arial Black", sans-serif' },
    ford: { label: 'Ford', family: 'DCRetro-ford', fallback: 'cursive' }
  };

  const retroFontAliases = {
    aurora: 'lexus', torque: 'dodge', trail: 'jeep', vector: 'audi',
    cruise: 'cabriolet', heritage: 'chevrolet', velvet: 'cadillac', nova: 'nissan',
    sprint: 'ferrari', skyline: 'ikarus', apex: 'lamborghini', harbor: 'ford'
  };

  const fontKeysMap = {
    block: 'bold',
    bold: 'bold',
    lightning: 'lightning',
    slant: 'lightning',
    aggressive: 'aggressive',
    edge: 'aggressive',
    script: 'script',
    flow: 'script',
    electric: 'electric',
    strike: 'electric',
    ice: 'ice',
    frost: 'ice',
    oem: 'oem',
    classic: 'oem'
  };

  function resolveFontInfo(overlay) {
    const rawFont = (overlay.dataset.font || '').trim().toLowerCase();
    const rawBack = overlay.dataset.back;
    const isSingleLayer = !rawBack || rawBack.trim() === '' || rawBack.trim().toLowerCase() === 'none';

    const retroKey = retroFontAliases[rawFont] || rawFont;
    if (retroFontMap[retroKey] || (isSingleLayer && !fontKeysMap[rawFont])) {
      const matchedKey = retroFontMap[retroKey] ? retroKey : 'cabriolet';
      const retro = retroFontMap[matchedKey] || retroFontMap.cabriolet;
      return {
        isRetro: true,
        key: matchedKey,
        family: retro.family,
        fallback: retro.fallback,
        isSingleLayer: true
      };
    }

    const badgeKey = fontKeysMap[rawFont] || 'bold';
    return {
      isRetro: false,
      key: badgeKey,
      family: `DC Badge ${badgeKey}`,
      fallback: 'Impact, sans-serif',
      isSingleLayer
    };
  }

  const textureCache = new Map();
  function getTexture(finish, width, height) {
    const key = `${finish.id}:${width}:${height}`;
    if (textureCache.has(key)) return textureCache.get(key);
    const tile = document.createElement('canvas');
    tile.width = width;
    tile.height = height;
    const ctx = tile.getContext('2d');
    ctx.fillStyle = finish.color;
    ctx.fillRect(0, 0, width, height);

    let seed = 71;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

    if (finish.effect === 'mirror' || finish.effect === 'solid') {
      const gradient = ctx.createLinearGradient(0, 0, width * 0.6, height);
      const opacity = finish.effect === 'mirror' ? 0.75 : 0.1;
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.38, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.5, `rgba(255,255,255,${opacity})`);
      gradient.addColorStop(0.62, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    } else if (finish.effect === 'carbon') {
      for (let y = 0; y < height; y += 6) {
        for (let x = 0; x < width; x += 6) {
          ctx.fillStyle = ((x + y) / 6) % 2 ? '#181a1c' : '#36393b';
          ctx.fillRect(x, y, 5, 2.5);
          ctx.fillRect(x + 1.5, y + 3, 5, 2.5);
        }
      }
    } else if (finish.effect === 'brushed') {
      for (let y = 0; y < height; y++) {
        ctx.fillStyle = `rgba(255,255,255,${random() * 0.2})`;
        ctx.fillRect(0, y, width, 1);
      }
    } else {
      const flake = finish.effect === 'flake';
      for (let i = 0; i < width * height * 0.014; i++) {
        ctx.fillStyle = `rgba(255,255,255,${random() * (flake ? 0.75 : 0.1)})`;
        const size = flake ? 1 + random() * 2 : 1;
        ctx.fillRect(random() * width, random() * height, size, size);
      }
    }

    if (textureCache.size > 24) textureCache.clear();
    textureCache.set(key, tile);
    return tile;
  }

  const loadedFonts = new Map();
  function loadCartFont(fontKey, isRetro) {
    const cacheKey = isRetro ? `retro:${fontKey}` : `badge:${fontKey}`;
    if (loadedFonts.has(cacheKey)) return loadedFonts.get(cacheKey);
    const fontsConfigEl = document.getElementById('dc-cart-fonts-config');
    let fontsMap = {};
    if (fontsConfigEl) {
      try { fontsMap = JSON.parse(fontsConfigEl.textContent); } catch (e) {}
    }
    const fontUrl = fontsMap[fontKey];
    if (!fontUrl) return Promise.resolve();

    const familyName = isRetro ? `DCRetro-${fontKey}` : `DC Badge ${fontKey}`;
    const face = new FontFace(familyName, `url(${JSON.stringify(fontUrl)})`);
    const promise = face.load().then((loaded) => {
      document.fonts.add(loaded);
      return loaded;
    }).catch((err) => {
      console.warn(`Could not load cart font ${fontKey}:`, err);
    });
    loadedFonts.set(cacheKey, promise);
    return promise;
  }

  function renderOverlay(overlay) {
    const canvas = overlay.querySelector('canvas');
    if (!canvas) return;
    const rawText = overlay.dataset.text || '';
    if (!rawText.trim()) return;

    const info = resolveFontInfo(overlay);
    const isSingleLayer = info.isSingleLayer;
    const faceMaterial = getMaterial(overlay.dataset.face, 'mirror_red');
    const backMaterial = isSingleLayer ? null : getMaterial(overlay.dataset.back, 'gloss_black');

    const width = Math.round(overlay.clientWidth || canvas.clientWidth || 132);
    const height = Math.round(overlay.clientHeight || canvas.clientHeight || 132);
    if (!width || !height) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, width, height);

    const text = (isSingleLayer || info.isRetro || info.key === 'script') ? rawText.trim() : rawText.trim().toUpperCase();

    let size = Math.min(height * 0.26, width * 0.22);
    const setFont = () => { ctx.font = `${size}px "${info.family}", ${info.fallback}`; };
    setFont();

    let metrics = ctx.measureText(text);
    const measureWidth = () => Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    const measureHeight = () => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    const scale = Math.min(1, (width * 0.78) / (measureWidth() + size * 0.12), (height * 0.45) / (measureHeight() + size * 0.12));
    size *= scale;
    setFont();

    metrics = ctx.measureText(text);
    const x = (width - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2;
    const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    const stroke = Math.max(2.5, size * 0.12);
    const depth = Math.max(1.8, size * 0.045);

    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke;

    if (isSingleLayer && !info.isRetro) {
      ctx.fillStyle = ctx.createPattern(getTexture(faceMaterial, width, height), 'no-repeat');
      ctx.fillText(text, x, y);
    } else if (isSingleLayer) {
      // 1-LAYER 3D RETRO RENDER (Delicate hairline border matching PDP exactly)
      const isScript = ['cadillac', 'cabriolet', 'ford', 'chevrolet'].includes(info.key);
      const strokeWidth = isScript ? Math.max(0.9, Math.min(size * 0.015, 1.5)) : Math.max(1.2, Math.min(size * 0.022, 2.0));

      // 1. Soft realistic drop shadow onto car paint
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = Math.max(4, size * 0.06);
      ctx.shadowOffsetY = Math.max(2, size * 0.025);
      ctx.shadowOffsetX = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillText(text, x, y);

      // 2. Delicate hairline black outline (drawn BEFORE fill so inner half is covered by white)
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowOffsetX = 0;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y);

      // 3. Pure White letter face fill (drawn ON TOP so letters stay 100% crisp and open)
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, x, y);
    } else {
      // 2-LAYER 3D RENDER (Backing plate + raised letters on thumbnail)
      // 1. Realistic Drop Shadow onto product photo
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = Math.max(10, size * 0.18);
      ctx.shadowOffsetY = Math.max(4, size * 0.08);
      ctx.shadowOffsetX = 1;
      ctx.strokeText(text, x + depth, y + depth);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillText(text, x + depth, y + depth);

      // 2. Backing outline layer
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowOffsetX = 0;
      ctx.strokeStyle = ctx.createPattern(getTexture(backMaterial, width, height), 'no-repeat');
      ctx.fillStyle = ctx.strokeStyle;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      // 3. Front Face letter layer (raised)
      ctx.fillStyle = ctx.createPattern(getTexture(faceMaterial, width, height), 'no-repeat');
      ctx.fillText(text, x, y - size * 0.015);
    }
  }

  const resizeObserver = window.ResizeObserver
    ? new ResizeObserver((entries) => {
        for (const entry of entries) {
          const overlay = entry.target;
          if (overlay && overlay.dataset && overlay.dataset.dcCartOverlay !== undefined) {
            renderOverlay(overlay);
          }
        }
      })
    : null;

  function renderAllCartBadges() {
    const overlays = document.querySelectorAll('[data-dc-cart-overlay]');
    if (!overlays.length) return;

    overlays.forEach((overlay) => {
      if (resizeObserver) {
        resizeObserver.observe(overlay);
      }
      const info = resolveFontInfo(overlay);
      loadCartFont(info.key, info.isRetro).then(() => {
        renderOverlay(overlay);
      });
    });
  }

  window.renderAllCartBadges = renderAllCartBadges;

  // Auto-init on page load and cart drawer updates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAllCartBadges);
  } else {
    renderAllCartBadges();
  }

  // Observe CartDrawer DOM mutations for real-time quantity/item updates
  function observeCartDrawer() {
    const cartDrawer = document.getElementById('CartDrawer') || document.querySelector('cart-drawer');
    if (cartDrawer) {
      const observer = new MutationObserver((mutations) => {
        let hasChanges = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            hasChanges = true;
            break;
          }
        }
        if (hasChanges) {
          setTimeout(renderAllCartBadges, 20);
        }
      });
      observer.observe(cartDrawer, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeCartDrawer);
  } else {
    observeCartDrawer();
  }

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => setTimeout(renderAllCartBadges, 50));
  }
})();
