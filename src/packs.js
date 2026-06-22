export const EFFECTS = [
  'nuke', 'smash', 'slash', 'zap', 'pixel', 'ascension',
  'splatter', 'inferno', 'vortex', 'shatter'
];

const EFFECT_LABELS = {
  nuke: 'Nuke', smash: 'Smash', slash: 'Slash', zap: 'Zap', pixel: 'Pixel',
  ascension: 'Ascension', splatter: 'Splatter', inferno: 'Inferno',
  vortex: 'Vortex', shatter: 'Shatter'
};

export const PACKS = [
  { id: 'signature', label: 'Signature', kind: 'signature' },
  ...EFFECTS.map((effect) => ({ id: effect, label: EFFECT_LABELS[effect], kind: 'single', effect })),
  {
    id: 'void', label: 'Void', kind: 'theme',
    routing: { q: 'nuke', r: 'vortex', b: 'zap', n: 'slash', p: 'shatter', k: 'ascension' },
    fallback: 'vortex'
  },
  {
    id: 'fire', label: 'Fire', kind: 'theme',
    routing: { q: 'inferno', r: 'smash', b: 'inferno', n: 'slash', p: 'pixel', k: 'ascension' },
    fallback: 'inferno'
  },
  {
    id: 'arcade', label: 'Arcade', kind: 'theme',
    routing: { q: 'pixel', r: 'smash', b: 'zap', n: 'pixel', p: 'pixel', k: 'ascension' },
    fallback: 'pixel'
  }
];

export function getPack(id) {
  return PACKS.find((p) => p.id === id) || null;
}

export function resolvePack(packId) {
  const pack = getPack(packId) || getPack('signature');
  if (pack.kind === 'single') return { mode: pack.effect, routing: null, fallback: 'splatter' };
  if (pack.kind === 'theme') return { mode: 'signature', routing: pack.routing, fallback: pack.fallback };
  return { mode: 'signature', routing: null, fallback: 'splatter' };
}
