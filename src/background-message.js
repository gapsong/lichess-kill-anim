import { getPack } from './packs.js';

export function handleExternalMessage(msg, deps) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.type === 'ping') return { installed: true, version: deps.getVersion() };
  if (msg.type === 'setPack') {
    if (getPack(msg.packId)) {
      deps.setPack(msg.packId);
      return { ok: true };
    }
    return { ok: false };
  }
  return null;
}
