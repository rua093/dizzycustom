const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const liquid = fs.readFileSync('snippets/dc-pdp-customizer.liquid', 'utf8');
const adapter = fs.readFileSync('assets/dc-pdp-customizer.js', 'utf8');
const styles = fs.readFileSync('assets/dc-pdp-customizer.css', 'utf8');

test('modern PDP exposes layer controls but not Patterns or Mounting controls', () => {
  const modern = liquid.slice(liquid.indexOf('<!-- ================= TWO LAYER CUSTOMIZER ================= -->'));
  assert.match(modern, /data-pdp-layer-count="1"/);
  assert.match(modern, /data-pdp-layer-count="2"/);
  assert.doesNotMatch(modern, /data-pdp-finish="patterns"|Mounting Type/);
});

test('retro PDP keeps its font dropdown and Specific Requests', () => {
  const retro = liquid.slice(liquid.indexOf('<!-- ================= SINGLE LAYER RETRO CUSTOMIZER ================= -->'), liquid.indexOf('<!-- ================= TWO LAYER CUSTOMIZER ================= -->'));
  assert.match(retro, /data-pdp-font-select/);
  assert.match(retro, /data-pdp-specific-requests/);
});

test('modern PDP delegates state normalization and property serialization to the shared core', () => {
  assert.match(adapter, /this\.core = window\.DCEmblemCore/);
  assert.match(adapter, /this\.core\.normalizeModernState/);
  assert.match(adapter, /this\.core\.serializeModernProperties/);
  assert.match(adapter, /this\.core\.renderModernCanvas/);
  assert.match(adapter, /this\.core\.getVariantMaxLength/);
  assert.match(adapter, /this\.core\.normalizeModernText/);
});

test('modern PDP maps semantic core properties to the hidden cart inputs', () => {
  const modernSync = adapter.slice(adapter.indexOf('// Two-layer logic'));
  assert.match(modernSync, /'Custom Text': 'dc-pdp-prop-text'/);
  assert.match(modernSync, /'Text Color': 'dc-pdp-prop-face'/);
  assert.doesNotMatch(modernSync, /'properties\[Custom Text\]': 'dc-pdp-prop-text'/);
});

test('one-layer PDP hides the backing tab even when tab styles set a display value', () => {
  assert.match(styles, /\.dc-pdp-layer-tab\[hidden\]\s*\{\s*display:\s*none;/);
});

test('modern one-layer URLs render their restricted controls server-side', () => {
  assert.match(liquid, /assign initial_modern_layers = 2/);
  assert.match(liquid, /if customizer_layers == 2 and request\.params\.layers == '1'/);
  assert.match(liquid, /data-initial-modern-layers="\{\{ initial_modern_layers \}\}"/);
  assert.match(liquid, /data-pdp-layer="back"\{% if initial_modern_layers == 1 %\} hidden disabled\{% endif %\}/);
  assert.match(liquid, /data-pdp-finish="mirror"\{% if initial_modern_layers == 1 %\} hidden disabled\{% endif %\}/);
});

test('PDP instance listeners are aborted on destroy and typing does not scroll product media', () => {
  assert.match(adapter, /this\.controller = new AbortController\(\)/);
  assert.match(adapter, /this\.controller\?\.abort\(\)/);
  assert.match(adapter, /form\.addEventListener\('change', sync, \{ signal: this\.signal \}\)/);
  const textInputBinding = adapter.slice(adapter.indexOf('// Text input'), adapter.indexOf('// Add-to-cart validation'));
  assert.doesNotMatch(textInputBinding, /scrollToFirstMedia/);
});

function pdpApi() {
  const coreSource = fs.readFileSync('assets/dc-emblem-core.js', 'utf8');
  const source = fs.readFileSync('assets/dc-pdp-customizer.js', 'utf8').replace(
    'class DCPdpCustomizer {',
    'window.__dcPdpCustomizerTest = { resolveFontKey };\n  class DCPdpCustomizer {'
  );
  const window = {};
  vm.runInNewContext(coreSource, { window, Map, Set, Number, String, Math, JSON, document: { createElement() { return { getContext() { return null; } }; } } });
  vm.runInNewContext(source, {
    window,
    document: { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} },
    console,
    Promise,
    Map,
    Set,
    Number,
    String,
    Math,
    JSON,
    FontFace: class {}
  });
  return window.__dcPdpCustomizerTest;
}

test('modern PDP resolves display font labels from URL parameters and cart items', () => {
  const { resolveFontKey } = pdpApi();
  assert.equal(resolveFontKey('Strike'), 'electric');
  assert.equal(resolveFontKey('strike'), 'electric');
  assert.equal(resolveFontKey('Slant'), 'lightning');
  assert.equal(resolveFontKey('Edge'), 'aggressive');
  assert.equal(resolveFontKey('Flow'), 'script');
  assert.equal(resolveFontKey('Frost'), 'ice');
  assert.equal(resolveFontKey('Classic'), 'oem');
  assert.equal(resolveFontKey('Bold'), 'bold');
});

test('PDP customizer prevents F5 reload flicker across canvas, swatches, and typography fonts', () => {
  const thumbnailLiquid = fs.readFileSync('snippets/product-thumbnail.liquid', 'utf8');
  assert.match(thumbnailLiquid, /id="dc-pdp-canvas-wrapper"[^>]*class="dc-pdp-media-canvas-overlay"/);
  assert.doesNotMatch(thumbnailLiquid, /id="dc-pdp-canvas-wrapper"[^>]*style="display:\s*none;"/);

  assert.match(liquid, /<link rel="preload" href="\{\{\s*font_file \| asset_url\s*\}\}" as="font" type="font\/woff2" crossorigin>/);
  assert.match(liquid, /data-pdp-swatches[^>]*>[\s\S]*<button[^>]*class="dc-pdp-swatch is-active"/);
  assert.match(liquid, /localStorage\.getItem\('dc_modern_emblem_builder_state_v2'\)/);

  for (const fontKey of ['bold', 'lightning', 'aggressive', 'script', 'electric', 'ice', 'oem']) {
    assert.match(styles, new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*['"]DC Badge ${fontKey}['"]`));
  }
  assert.match(styles, /\.dc-pdp-swatches\s*\{[^}]*min-height:\s*4\.4rem;/);
  assert.match(liquid, /data-pdp-color-name="face"/);
  assert.match(liquid, /data-pdp-chip="face"/);
  assert.match(liquid, /data-pdp-finish/);
  assert.match(adapter, /const canReuse = existingButtons\.length === filtered\.length/);
});


