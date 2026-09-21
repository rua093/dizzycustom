const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

function loadCore() {
  const storage = new Map();
  const window = { localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) } };
  vm.runInNewContext(fs.readFileSync('assets/dc-emblem-core.js', 'utf8'), { window, Map, Set, JSON });
  return { core: window.DCEmblemCore, storage };
}

const fonts = [
  { key: 'bold', label: 'Bold' },
  { key: 'lightning', label: 'Slant' }
];

test('one-layer state resets unavailable finishes but preserves a selected solid color', () => {
  const { core } = loadCore();
  const mirrorState = core.normalizeModernState({ layers: 1, face: 'mirror_white', back: 'mf_gold' });
  const whiteState = core.normalizeModernState({ layers: 1, face: 'white' });

  assert.equal(mirrorState.face, 'gloss_black');
  assert.equal(mirrorState.back, 'mf_gold');
  assert.equal(whiteState.face, 'white');
  assert.deepEqual([...core.getFinishGroups(1, 'face')], ['solid']);
});

test('one-layer modern properties omit background color and identify the modern builder', () => {
  const { core } = loadCore();
  const properties = core.serializeModernProperties({ text: 'TEST', font: 'lightning', layers: 1, face: 'gloss_black' }, fonts);

  assert.deepEqual(JSON.parse(JSON.stringify(properties)), {
    'Custom Text': 'TEST',
    Font: 'Slant',
    'Text Color': 'Gloss Black',
    _dc_emblem_mode: 'modern'
  });
});

test('only Mirror White is available for the modern face mirror finish', () => {
  const { core } = loadCore();

  assert.equal(core.isFinishAvailable('mirror_white', 2, 'face'), true);
  assert.equal(core.isFinishAvailable('mirror_red', 2, 'face'), false);
  assert.equal(core.isFinishAvailable('mirror_white', 2, 'back'), false);
});

test('modern text policy uppercases text and enforces the selected variant limit', () => {
  const { core } = loadCore();

  assert.equal(core.getVariantMaxLength('Matte Finishing / 1x6 Inches (Max 12 Letters)'), 12);
  assert.equal(core.getVariantMaxLength('Matte Finishing / 1x4 Inches (Max 8 Letters)'), 8);
  assert.equal(core.normalizeModernText('DizzydddAAZzzzzz', 12), 'DIZZYDDDAAZZ');
});

test('modern cart properties use the normalized text value', () => {
  const { core } = loadCore();
  const properties = core.serializeModernProperties({ text: 'Dizzy', font: 'bold', layers: 1 }, fonts);

  assert.equal(properties['Custom Text'], 'DIZZY');
});

test('legacy modern state migrates without accepting the retro-specific request state', () => {
  const { core } = loadCore();

  assert.deepEqual(JSON.parse(JSON.stringify(core.migrateLegacyModernState({ font: 'lightning', face: 'mirror_white', back: 'gloss_black' }))), {
    layers: 2, font: 'lightning', face: 'mirror_white', back: 'gloss_black'
  });
  assert.equal(core.migrateLegacyModernState({ specificRequests: 'Custom spacing' }), null);
});

test('normalizeModernState resolves font aliases and labels to base font keys', () => {
  const { core } = loadCore();
  assert.equal(core.normalizeModernState({ font: 'strike' }).font, 'electric');
  assert.equal(core.normalizeModernState({ font: 'Slant' }).font, 'lightning');
  assert.equal(core.normalizeModernState({ font: 'BLOCK' }).font, 'bold');
  assert.equal(core.normalizeModernState({ font: 'Flow' }).font, 'script');
  assert.equal(core.normalizeModernState({ font: 'Frost' }).font, 'ice');
  assert.equal(core.normalizeModernState({ font: 'Classic' }).font, 'oem');
  assert.equal(core.normalizeModernState({ font: 'unknown' }).font, 'lightning');
});
