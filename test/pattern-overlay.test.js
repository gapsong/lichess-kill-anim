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

test('a hint blinks at full strength, then goes fully off', () => {
  const clock = { t: 1000 };
  const overlay = overlayAt(clock);
  const pattern = outpostPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 1000), 1); // full strength the instant it appears
  assert.equal(overlay.fadeFor(pattern, 1000 + 899), 1); // still inside the blink
  assert.equal(overlay.fadeFor(pattern, 1000 + 1200), 0); // blink over -> off
  assert.equal(overlay.fadeFor(pattern, 1000 + 3000), 0); // stays off
});

test('every pattern type blinks once then off (e.g. battery)', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = batteryPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 0), 1);
  assert.equal(overlay.fadeFor(pattern, 5000), 0);
});

test('a persisting pattern does not re-trigger its blink on later renders', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = outpostPattern();
  overlay.render([pattern]);
  clock.t = 5000; // long past the blink window
  overlay.render([pattern]); // same outpost is still on the board
  assert.equal(overlay.fadeFor(pattern, 5000), 0); // stays off, not reset to full strength
});

test('a pattern that resolves and later reappears gets a fresh blink', () => {
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

test('the blink-then-off lifecycle applies to every pattern type (e.g. fortress)', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = fortressPattern();
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 0), 1); // pops at full strength on arrival
  assert.equal(overlay.fadeFor(pattern, 899), 1); // still inside the blink
  assert.equal(overlay.fadeFor(pattern, 10000), 0); // then fully off
});

test('a non-connections pattern (e.g. fork) also gets a fresh blink on reappear', () => {
  const clock = { t: 0 };
  const overlay = overlayAt(clock);
  const pattern = { type: 'fork', side: 'w', squares: ['e5', 'c7', 'g7'], line: null, label: 'Gabel' };
  overlay.render([pattern]);
  assert.equal(overlay.fadeFor(pattern, 5000), 0); // off after its blink
  clock.t = 5000;
  overlay.render([]); // resolves and clears firstSeen
  clock.t = 6000;
  overlay.render([pattern]); // reappears -> fresh blink
  assert.equal(overlay.fadeFor(pattern, 6000), 1);
});
