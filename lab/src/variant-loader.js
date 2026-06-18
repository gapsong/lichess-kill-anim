// Loads a piece's variant pool from `lab/variants/<piece>/`.
//
// Variants are ES modules that export `recipe` (always) and `timeline`
// (optional). Metadata lives in `manifest.json` next to them.

const MANIFEST_PATH = (piece) => `/variants/${piece}/manifest.json`;
const VARIANT_PATH = (piece, id) => `/variants/${piece}/${id}.mjs`;

export async function loadManifest(piece) {
  const response = await fetch(MANIFEST_PATH(piece));
  if (!response.ok) throw new Error(`Manifest missing for piece ${piece}`);
  return response.json();
}

export async function loadVariant(piece, id) {
  const module = await import(/* @vite-ignore */ VARIANT_PATH(piece, id));
  if (!module.recipe) throw new Error(`Variant ${piece}/${id} has no recipe export`);
  return {
    id,
    recipe: module.recipe,
    timeline: module.timeline ?? null
  };
}

export async function loadVariants(piece, ids) {
  return Promise.all(ids.map((id) => loadVariant(piece, id)));
}

export function pickActiveIds(manifest, count = 12) {
  // Default Phase 1 pool: take the first N from the manifest in order.
  // Skip any id starting with '_' unless we run short.
  const visible = manifest.variants.filter((v) => !v.id.startsWith('_')).map((v) => v.id);
  if (visible.length >= count) return visible.slice(0, count);
  const baselines = manifest.variants.filter((v) => v.id.startsWith('_')).map((v) => v.id);
  return [...baselines, ...visible].slice(0, count);
}

export function metadataFor(manifest, id) {
  return manifest.variants.find((v) => v.id === id) ?? null;
}
