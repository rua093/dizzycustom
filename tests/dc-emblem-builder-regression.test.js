const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function cartApi() {
  const source = fs.readFileSync('assets/dc-cart-badge.js', 'utf8').replace(
    '  const textureCache = new Map();',
    '  window.__dcCartBadgeTest = { getMaterial, resolveFontInfo };\n\n  const textureCache = new Map();'
  );
  const window = { addEventListener() {} };
  const document = {
    readyState: 'loading',
    addEventListener() {},
    createElement() { return { getContext() { return null; } }; },
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  vm.runInNewContext(source, { window, document, console, Promise, Map, JSON, FontFace: class {} });
  return window.__dcCartBadgeTest;
}

test('a one-layer builder badge keeps its base font and has no retro treatment', () => {
  const { resolveFontInfo } = cartApi();
  const info = resolveFontInfo({ dataset: { font: 'Slant', face: 'Gloss Black', back: '' } });

  assert.deepEqual(
    { isRetro: info.isRetro, key: info.key, isSingleLayer: info.isSingleLayer },
    { isRetro: false, key: 'lightning', isSingleLayer: true }
  );
});

test('cart resolves the renamed retro fonts without changing their font asset', () => {
  const { resolveFontInfo } = cartApi();
  const info = resolveFontInfo({ dataset: { font: 'Aurora', face: 'White', back: '' } });

  assert.deepEqual(
    { isRetro: info.isRetro, key: info.key, isSingleLayer: info.isSingleLayer },
    { isRetro: true, key: 'lexus', isSingleLayer: true }
  );
});

test('cart recognizes Mirror White as a mirror finish', () => {
  const { getMaterial } = cartApi();
  const material = getMaterial('Mirror White', 'mirror_red');

  assert.equal(material.id, 'mirror_white');
  assert.equal(material.group, 'mirror');
});

test('the one-layer builder cart preview draws only its face material', () => {
  const source = fs.readFileSync('assets/dc-cart-badge.js', 'utf8');

  assert.match(source, /if \(isSingleLayer && !info\.isRetro\) \{[\s\S]*ctx\.fillStyle = ctx\.createPattern\(getTexture\(faceMaterial, width, height\), 'no-repeat'\)/);
});

test('builder source applies selected size availability to the purchasable configuration', () => {
  const source = fs.readFileSync('assets/dc-emblem-builder.js', 'utf8');

  assert.match(source, /this\.config\.available\s*=\s*sizeInput\.dataset\.sizeAvailable\s*===\s*'true'/);
});

test('size controls retain keyboard focus and the size card does not animate every property', () => {
  const source = fs.readFileSync('assets/dc-emblem-builder.css', 'utf8');

  assert.doesNotMatch(source, /\.dc-builder-size-label input\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(source, /\.dc-builder-size-label input:focus-visible\s*\+\s*\.dc-builder-size-card/);
  assert.doesNotMatch(source, /\.dc-builder-size-card\s*\{[^}]*transition:\s*all/s);
});

test('the builder defaults to Shopify selected or first available variant and refers to size options', () => {
  const source = fs.readFileSync('sections/dc-emblem-builder.liquid', 'utf8');

  assert.doesNotMatch(source, /for variant in badge_product\.variants\s*\n\s*if variant\.title contains '1x6'/);
  assert.match(source, /fonts, finishes and size options must be included/);
});

test('section loads the shared core before its adapter', () => {
  const liquid = fs.readFileSync('sections/dc-emblem-builder.liquid', 'utf8');
  const adapter = fs.readFileSync('assets/dc-emblem-builder.js', 'utf8');

  assert.match(liquid, /dc-emblem-core\.js' \| asset_url/);
  assert.match(adapter, /this\.core = window\.DCEmblemCore/);
  assert.match(adapter, /this\.core\.normalizeModernState/);
  assert.match(adapter, /this\.core\.serializeModernProperties/);
  assert.match(adapter, /this\.core\.renderModernCanvas/);
});

test('modern cart items carry a mode marker and link back to the modern PDP flow', () => {
  const builder = fs.readFileSync('sections/dc-emblem-builder.liquid', 'utf8');
  const drawer = fs.readFileSync('snippets/cart-drawer.liquid', 'utf8');
  const cart = fs.readFileSync('sections/main-cart-items.liquid', 'utf8');

  assert.match(builder, /name="properties\[_dc_emblem_mode\]"/);
  for (const source of [drawer, cart]) {
    assert.match(source, /prop_first == '_dc_emblem_mode'/);
    assert.match(source, /custom_mode == 'modern'/);
    assert.match(source, /&view=two-layer&layers=/);
  }
});
