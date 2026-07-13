import assert from 'node:assert/strict';
import test from 'node:test';

import { patternColor, PatternOverlay } from '../src/pattern-overlay.js';

test('bottom side is green, top side is red (white orientation)', () => {
  assert.equal(patternColor('w', false), '#3bd17a');
  assert.equal(patternColor('b', false), '#e5564b');
});

test('orientation flips which side is the viewer (black orientation)', () => {
  assert.equal(patternColor('b', true), '#3bd17a');
  assert.equal(patternColor('w', true), '#e5564b');
});

function fakeDoc() {
  return { querySelector: () => null };
}

function outpostPattern() {
  return { type: 'outpost', side: 'w', squares: ['d5'], line: null, label: 'Außenposten' };
}

function batteryPattern() {
  return { type: 'battery', side: 'w', squares: ['d1', 'd5'], line: { from: 'd1', to: 'd5' }, label: 'Batterie' };
}

function fortressPattern() {
  return { type: 'fortress', side: 'w', squares: ['g1', 'f2', 'g2', 'h2'], line: null, label: 'Festung' };
}

function overlayAt(clockRef) {
  return new PatternOverlay({ document: fakeDoc(), now: () => clockRef.t });
}

test('a "state" hint (outpost) is full strength during its intro, then fades to a low steady opacity', () => {
  const clock = { t: 1000 };
  const overlay = overlayAt(clock);
  const pattern = outpostPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 1000), 1); // full strength the instant it appears
  assert.equal(overlay.fadeFor(pattern, 1000 + 899), 1); // still inside the one intro pulse
  const steady = overlay.fadeFor(pattern, 1000 + 900);
  assert.ok(steady > 0 && steady < 0.3); // settled: low, but not fully invisible
});

test('a "connections" hint (battery) follows the same intro-then-faint lifecycle', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = batteryPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 0), 1);
  assert.ok(overlay.fadeFor(pattern, 5000) < 0.3);
});

test('a persisting fade-lifecycle pattern does not re-trigger its intro on later renders', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = outpostPattern();
  overlay.render([pattern]);
  clock.t = 5000; // long past the intro window
  overlay.render([pattern]); // same outpost is still on the board
  assert.ok(overlay.fadeFor(pattern, 5000) < 0.3); // stays faint, not reset to full strength
});

test('a fade-lifecycle pattern that resolves and later reappears gets a fresh intro pulse', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = outpostPattern();
  overlay.render([pattern]);
  clock.t = 5000;
  overlay.render([]); // the outpost resolves and clears
  clock.t = 6000;
  overlay.render([pattern]); // reappears later
  assert.equal(overlay.fadeFor(pattern, 6000), 1);
});

test('the intro-then-faint lifecycle now applies to every pattern type (e.g. fortress)', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = fortressPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 0), 1); // pops at full strength on arrival
  assert.equal(overlay.fadeFor(pattern, 899), 1); // still inside the one intro pulse
  assert.ok(overlay.fadeFor(pattern, 10000) < 0.3); // settles to a faint steady state
});

test('a non-connections pattern (e.g. fork) also gets the fresh-intro-on-reappear behaviour', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = { type: 'fork', side: 'w', squares: ['e5', 'c7', 'g7'], line: null, label: 'Gabel' };
  overlay.render([pattern]);
  assert.ok(overlay.fadeFor(pattern, 5000) < 0.3); // settled after its intro
  clock.t = 5000;
  overlay.render([]); // resolves and clears firstSeen
  clock.t = 6000;
  overlay.render([pattern]); // reappears -> fresh pop
  assert.equal(overlay.fadeFor(pattern, 6000), 1);
});
