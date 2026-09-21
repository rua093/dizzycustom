(() => {
  if (window.DCEmblemCore) return;

  const MATERIALS = [
    ['red', 'Red', '#dc0f0f', 'solid'], ['white', 'White', '#f5f5f8', 'solid'],
    ['gloss_black', 'Gloss Black', '#0a0a0c', 'solid'], ['matte_black', 'Matte Black', '#1e1e22', 'solid', 'matte'],
    ['gray', 'Gray', '#8c8c94', 'solid'], ['maroon', 'Maroon', '#6e0f0f', 'solid'],
    ['orange', 'Orange', '#f0820a', 'solid'], ['yellow', 'Yellow', '#ebc80f', 'solid'],
    ['lime_green', 'Lime Green', '#8cdc0a', 'solid'], ['green', 'Green', '#0aaa28', 'solid'],
    ['blue', 'Blue', '#143cc8', 'solid'], ['purple', 'Purple', '#780fbe', 'solid'],
    ['pink', 'Pink', '#f06eaa', 'solid'], ['brown', 'Brown', '#4b2314', 'solid'],
    ['mirror_white', 'Mirror White', '#f7f7f7', 'mirror'],
    ['mf_red', 'Flake Red', '#aa0a0f', 'flake'], ['mf_black', 'Flake Black', '#141418', 'flake'],
    ['mf_silver', 'Flake Silver', '#b4b9be', 'flake'], ['mf_gold', 'Flake Gold', '#c8aa14', 'flake'],
    ['mf_green', 'Flake Green', '#0a9628', 'flake'], ['mf_blue', 'Flake Blue', '#0f28b4', 'flake'],
    ['mf_purple', 'Flake Purple', '#6e14aa', 'flake'], ['mf_pink', 'Flake Pink', '#dc5096', 'flake']
  ].map(([id, label, color, group, effect]) => ({ id, label, color, group, effect: effect || group }));

  const materials = new Map(MATERIALS.map((material) => [material.id, material]));
  const BASE_FONT_KEYS = {
    bold: 'bold', block: 'bold', lightning: 'lightning', slant: 'lightning',
    aggressive: 'aggressive', edge: 'aggressive', script: 'script', flow: 'script',
    electric: 'electric', strike: 'electric', ice: 'ice', frost: 'ice', oem: 'oem', classic: 'oem'
  };
  const MODERN_STORAGE_KEY = 'dc_modern_emblem_builder_state_v2';

  function getFinishGroups(layers, layer) {
    if (Number(layers) === 1) return new Set(['solid']);
    return new Set(layer === 'back' ? ['solid', 'flake'] : ['solid', 'mirror', 'flake']);
  }

  function isFinishAvailable(id, layers, layer) {
    const material = materials.get(id);
    if (!material || !getFinishGroups(layers, layer).has(material.group)) return false;
    return material.group !== 'mirror' || (layer === 'face' && material.id === 'mirror_white');
  }

  function normalizeModernState(raw = {}) {
    const state = {
      layers: 2,
      face: 'mirror_white',
      back: 'gloss_black',
      font: 'lightning',
      text: '',
      ...raw
    };
    state.layers = Number(state.layers) === 1 ? 1 : 2;
    state.font = resolveBaseFontKey(state.font) || 'lightning';
    if (raw.variantId) state.variantId = String(raw.variantId);
    if (!isFinishAvailable(state.back, 2, 'back')) state.back = 'gloss_black';
    if (state.layers === 1) {
      if (!isFinishAvailable(state.face, 1, 'face')) state.face = 'gloss_black';
    } else if (!isFinishAvailable(state.face, 2, 'face')) {
      state.face = 'mirror_white';
    }
    return state;
  }

  function resolveBaseFontKey(labelOrKey) {
    if (!labelOrKey) return null;
    return BASE_FONT_KEYS[String(labelOrKey).trim().toLowerCase()] || null;
  }

  function getVariantMaxLength(variantTitle, fallback = 16) {
    const match = String(variantTitle || '').match(/Max\s+(\d+)\s+Letters/i);
    return match ? Number(match[1]) : fallback;
  }

  function normalizeModernText(text, maxLength = 16) {
    return String(text || '').toUpperCase().slice(0, maxLength);
  }

  function getMaterial(id) {
    return materials.get(id) || materials.get('gloss_black');
  }

  function serializeModernProperties(state, fonts) {
    const normalized = normalizeModernState(state);
    const font = (fonts || []).find((item) => item.key === normalized.font);
    const properties = {
      'Custom Text': normalizeModernText(normalized.text).trim(),
      Font: font?.label || normalized.font || 'Bold',
      'Text Color': getMaterial(normalized.face).label,
      _dc_emblem_mode: 'modern'
    };
    if (normalized.layers === 2) properties['Background Color'] = getMaterial(normalized.back).label;
    return properties;
  }

  function migrateLegacyModernState(legacy) {
    if (!legacy || typeof legacy !== 'object' || legacy.specificRequests) return null;
    if (!legacy.font && !legacy.face && !legacy.back) return null;
    const layers = Number(legacy.layers) === 1 ? 1 : 2;
    return normalizeModernState({
      layers,
      font: legacy.font,
      face: legacy.face,
      back: legacy.back,
      variantId: legacy.variantId,
      text: legacy.text
    });
  }

  function saveModernState(state) {
    try {
      const normalized = normalizeModernState(state);
      window.localStorage.setItem(MODERN_STORAGE_KEY, JSON.stringify(normalized));
      window.localStorage.setItem('dc_custom_emblem_state', JSON.stringify({
        text: normalized.text,
        font: normalized.font,
        face: normalized.face,
        back: normalized.back,
        variantId: normalized.variantId,
        layers: normalized.layers
      }));
    } catch (error) {}
  }

  function restoreModernState() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODERN_STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') return normalizeModernState(saved);
      const legacyRaw = window.localStorage.getItem('dc_custom_emblem_state');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        const migrated = migrateLegacyModernState(legacy);
        if (migrated) return migrated;
      }
      return null;
    } catch (error) { return null; }
  }

  function renderModernCanvas({ context, width, height, text, fontKey, faceId, backId, layers, texture, maxFontSize = 180, widthRatio = 0.88, heightRatio = 0.68, faceOffset = 0.012 }) {
    const displayText = normalizeModernText(text).trim();
    if (!displayText) return;
    const state = normalizeModernState({ layers, face: faceId, back: backId });
    let size = Math.min(height * 0.55, maxFontSize);
    const setFont = () => { context.font = `${size}px "DC Badge ${fontKey}", Impact, sans-serif`; };
    setFont();
    let metrics = context.measureText(displayText);
    const measureWidth = () => Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);
    const measureHeight = () => metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    size *= Math.min(1, (width * widthRatio) / (measureWidth() + size * 0.12), (height * heightRatio) / (measureHeight() + size * 0.12));
    setFont();
    metrics = context.measureText(displayText);
    const x = (width - metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft) / 2;
    const y = (height + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    context.lineJoin = 'round';
    if (state.layers === 1) {
      context.fillStyle = context.createPattern(texture(state.face, width, height), 'no-repeat');
      context.fillText(displayText, x, y);
      return;
    }
    const stroke = Math.max(3, size * 0.11);
    const depth = Math.max(2, size * 0.04);
    context.lineWidth = stroke;
    context.strokeStyle = '#090b0d';
    context.shadowColor = '#000000a0';
    context.shadowBlur = 12;
    context.shadowOffsetY = 8;
    context.shadowOffsetX = 1;
    context.strokeText(displayText, x + depth, y + depth);
    context.fillStyle = '#090b0d';
    context.fillText(displayText, x + depth, y + depth);
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    context.shadowOffsetX = 0;
    context.strokeStyle = context.createPattern(texture(state.back, width, height), 'no-repeat');
    context.fillStyle = context.strokeStyle;
    context.strokeText(displayText, x, y);
    context.fillText(displayText, x, y);
    context.fillStyle = context.createPattern(texture(state.face, width, height), 'no-repeat');
    context.fillText(displayText, x, y - size * faceOffset);
  }

  window.DCEmblemCore = { MATERIALS, BASE_FONT_KEYS, MODERN_STORAGE_KEY, getMaterial, getFinishGroups, isFinishAvailable, normalizeModernState, resolveBaseFontKey, getVariantMaxLength, normalizeModernText, serializeModernProperties, migrateLegacyModernState, saveModernState, restoreModernState, renderModernCanvas };
})();
