import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

import { GoalPanel } from '../src/goal-panel.js';

function setup() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  return dom.window.document;
}

const PANEL = '#lichess-goal-panel';

test('render lists each goal text and mounts one panel', () => {
  const doc = setup();
  const panel = new GoalPanel({ document: doc });
  panel.render([
    { id: 'a', text: 'Rochiere jetzt.' },
    { id: 'b', text: 'Bring einen Turm auf die 7. Reihe.' }
  ]);
  const el = doc.querySelector(PANEL);
  assert.ok(el, 'panel should exist');
  assert.match(el.textContent, /Rochiere jetzt\./);
  assert.match(el.textContent, /7\. Reihe/);
  assert.equal(el.style.pointerEvents, 'none'); // never blocks moves
});

test('re-render replaces the goals without stacking panels', () => {
  const doc = setup();
  const panel = new GoalPanel({ document: doc });
  panel.render([{ id: 'a', text: 'Erst dies.' }]);
  panel.render([{ id: 'b', text: 'Dann das.' }]);
  assert.equal(doc.querySelectorAll(PANEL).length, 1, 'only one panel');
  const el = doc.querySelector(PANEL);
  assert.doesNotMatch(el.textContent, /Erst dies/);
  assert.match(el.textContent, /Dann das/);
});

test('an empty goal list hides the panel', () => {
  const doc = setup();
  const panel = new GoalPanel({ document: doc });
  panel.render([{ id: 'a', text: 'Etwas.' }]);
  panel.render([]);
  assert.equal(doc.querySelector(PANEL), null, 'panel removed when there is nothing to do');
});

test('clear removes the panel', () => {
  const doc = setup();
  const panel = new GoalPanel({ document: doc });
  panel.render([{ id: 'a', text: 'Etwas.' }]);
  panel.clear();
  assert.equal(doc.querySelector(PANEL), null);
});
