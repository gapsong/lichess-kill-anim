import { mergeSettings } from './settings.js';

const byId = (id) => document.getElementById(id);

function load() {
  chrome.storage.sync.get(null, (stored) => {
    const s = mergeSettings(stored);
    byId('enabled').checked = s.enabled;
    byId('sound').checked = s.soundOn;
    byId('undefended').checked = s.showUndefended;
    byId('goals').checked = s.showGoals;
    byId('intensity').value = String(s.intensity);
    byId('intensityVal').textContent = String(s.intensity);
  });
}

function save(partial) {
  chrome.storage.sync.set(partial);
}

byId('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
byId('sound').addEventListener('change', (e) => save({ soundOn: e.target.checked }));
byId('undefended').addEventListener('change', (e) => save({ showUndefended: e.target.checked }));
byId('goals').addEventListener('change', (e) => save({ showGoals: e.target.checked }));
byId('intensity').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  byId('intensityVal').textContent = String(v);
  save({ intensity: v });
});

load();
