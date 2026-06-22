import { EXT_ID } from './config.js';

export function buildPingMessage() {
  return { type: 'ping' };
}

export function buildSetPackMessage(packId) {
  return { type: 'setPack', packId };
}

function sendMessage(message, timeoutMs = 600) {
  return new Promise((resolve) => {
    const runtime = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime : null;
    if (!runtime || !runtime.sendMessage) { resolve(null); return; }
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    try {
      runtime.sendMessage(EXT_ID, message, (response) => {
        if (runtime.lastError) { done(null); return; }
        done(response);
      });
    } catch { done(null); return; }
    setTimeout(() => done(null), timeoutMs);
  });
}

export async function pingExtension() {
  const response = await sendMessage(buildPingMessage());
  return !!(response && response.installed === true);
}

export async function applyPack(packId) {
  const response = await sendMessage(buildSetPackMessage(packId));
  return !!(response && response.ok === true);
}
