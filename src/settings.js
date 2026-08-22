import { getPack } from './packs.js';

export const KNOWN_PIECES = ['p', 'n', 'b', 'r', 'q', 'k'];

export const DEFAULT_SETTINGS = {
  enabled: true,
  packId: 'signature',
  intensity: 5,
  soundOn: true,
  buildupMs: 0,
  shakePieces: ['q'],
  // Undefended-piece overlay. OFF by default here so the published extension
  // keeps its "cosmetic only" default behaviour (the overlay is position
  // analysis and only ever renders in fair-play-safe contexts — see
  // play-context.js). The userscript opts itself in (userscript-entry.js).
  showUndefended: false
};

export function mergeSettings(stored) {
  const s = stored && typeof stored === 'object' ? stored : {};
  const intensity = Number(s.intensity);
  const buildupMs = Number(s.buildupMs);
  return {
    enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SETTINGS.enabled,
    packId: (typeof s.packId === 'string' && getPack(s.packId)) ? s.packId : DEFAULT_SETTINGS.packId,
    intensity: Number.isFinite(intensity)
      ? Math.max(1, Math.min(10, Math.round(intensity)))
      : DEFAULT_SETTINGS.intensity,
    soundOn: typeof s.soundOn === 'boolean' ? s.soundOn : DEFAULT_SETTINGS.soundOn,
    showUndefended: typeof s.showUndefended === 'boolean' ? s.showUndefended : DEFAULT_SETTINGS.showUndefended,
    buildupMs: Number.isFinite(buildupMs) ? Math.max(0, buildupMs) : DEFAULT_SETTINGS.buildupMs,
    shakePieces: Array.isArray(s.shakePieces)
      ? s.shakePieces.filter((p) => KNOWN_PIECES.includes(p))
      : [...DEFAULT_SETTINGS.shakePieces]
  };
}
