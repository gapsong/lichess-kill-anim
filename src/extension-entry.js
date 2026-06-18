import { createRuntime } from './runtime.js';
import { DEFAULT_SETTINGS, mergeSettings } from './settings.js';

const runtime = createRuntime({ config: DEFAULT_SETTINGS });

function loadAndApply(then) {
  chrome.storage.sync.get(null, (stored) => {
    runtime.applyConfig(mergeSettings(stored));
    if (then) then();
  });
}

loadAndApply(() => runtime.start());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  loadAndApply();
});
