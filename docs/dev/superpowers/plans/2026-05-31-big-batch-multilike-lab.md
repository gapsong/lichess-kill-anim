# Big-Batch Multi-Like Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the animation lab from a fixed 2×2 single-pick tournament to a large-batch multi-like flow: Claude generates 8–12 variants per round, the user hearts multiple they like, and all liked variants seed the next generation.

**Architecture:** Extend `tournament.js` to accept multiple liked IDs per round instead of one winner; update the lab UI from a 2×2 instant-click grid to a responsive scrollable grid with per-cell Like buttons and a Confirm button; bump default batch size in both `/lab-generate` and `variant-loader`. No production code changes — lab stays isolated.

**Tech Stack:** Vanilla JS (ES modules), Vite, `node:test` for unit tests on `tournament.js`.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lab/src/tournament.js` | Replace `pickWinner` with `pickFavorites(state, likedIds[])`, update history format and `nextRound` seeds |
| Create | `test/tournament.test.js` | Unit tests for all tournament state transitions including multi-like |
| Modify | `lab/src/variant-loader.js` | `pickActiveIds` default count: 4 → 12 |
| Modify | `lab/index.html` | Responsive CSS grid, Like button styles, Confirm button, liked-count badge |
| Modify | `lab/src/main.js` | Multi-like click logic, Confirm flow, updated modal copy |
| Modify | `.claude/commands/lab-generate.md` | Default `--count` in examples: 3 → 8 |

---

## Task 1: Extend tournament state machine for multi-like

**Files:**
- Modify: `lab/src/tournament.js`

### What changes

`pickWinner(state, winnerId)` becomes `pickFavorites(state, likedIds)`.
`likedIds` is an array of ≥1 IDs all from `state.candidates`.
History entries now record `{ round, liked: [...], disliked: [...], startedAt, pickedAt }`.
`nextRound` seeds from all liked IDs (winner is the first liked).
`overallWinner` stays: returns the first liked ID of the last round.

- [ ] **Step 1.1: Replace `pickWinner` with `pickFavorites`**

In `lab/src/tournament.js`, replace:

```js
export function pickWinner(state, winnerId, { now = () => new Date() } = {}) {
  if (state.status !== STATUS.VOTING) {
    throw new Error(`pickWinner called in non-voting status: ${state.status}`);
  }
  if (!state.candidates.includes(winnerId)) {
    throw new Error(`unknown candidate: ${winnerId}`);
  }

  const losers = state.candidates.filter((id) => id !== winnerId);
  const pickedAt = now().toISOString();

  return {
    ...state,
    status: STATUS.BETWEEN,
    winnerOfRound: winnerId,
    history: [
      ...state.history,
      {
        round: state.round,
        winner: winnerId,
        losers,
        startedAt: state.roundStartedAt,
        pickedAt
      }
    ]
  };
}
```

with:

```js
export function pickFavorites(state, likedIds, { now = () => new Date() } = {}) {
  if (state.status !== STATUS.VOTING) {
    throw new Error(`pickFavorites called in non-voting status: ${state.status}`);
  }
  if (!Array.isArray(likedIds) || likedIds.length === 0) {
    throw new Error('likedIds must be a non-empty array');
  }
  for (const id of likedIds) {
    if (!state.candidates.includes(id)) {
      throw new Error(`unknown candidate: ${id}`);
    }
  }

  const likedSet = new Set(likedIds);
  const disliked = state.candidates.filter((id) => !likedSet.has(id));
  const pickedAt = now().toISOString();

  return {
    ...state,
    status: STATUS.BETWEEN,
    winnerOfRound: likedIds[0],
    likedOfRound: [...likedIds],
    history: [
      ...state.history,
      {
        round: state.round,
        liked: [...likedIds],
        disliked,
        startedAt: state.roundStartedAt,
        pickedAt
      }
    ]
  };
}
```

- [ ] **Step 1.2: Update `nextRound` to seed from all liked IDs**

Replace the `winner` + `fresh` seed logic in `nextRound`:

```js
export function nextRound(state, mode, seeds = [], { now = () => new Date() } = {}) {
  if (state.status !== STATUS.BETWEEN) {
    throw new Error(`nextRound called in non-between status: ${state.status}`);
  }
  if (mode === 'done') {
    return { ...state, status: STATUS.DONE };
  }
  if (mode !== 'refine' && mode !== 'pool') {
    throw new Error(`unknown mode: ${mode}`);
  }

  const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
  if (liked.length === 0) throw new Error('no liked IDs recorded for previous round');

  const fresh = seeds.filter((id) => !liked.includes(id));
  const candidates = dedupe([...liked, ...fresh]).slice(0, 12);

  if (candidates.length < 2) {
    throw new Error('need at least 2 candidates for a new round');
  }

  const roundStartedAt = now().toISOString();
  return {
    ...state,
    round: state.round + 1,
    candidates,
    status: STATUS.VOTING,
    winnerOfRound: null,
    likedOfRound: null,
    roundStartedAt
  };
}
```

- [ ] **Step 1.3: Verify the file looks right**

```bash
node --check lab/src/tournament.js
```

Expected: no output (syntax OK).

---

## Task 2: Write tournament unit tests

**Files:**
- Create: `test/tournament.test.js`

- [ ] **Step 2.1: Create the test file**

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createTournament,
  pickFavorites,
  nextRound,
  overallWinner,
  STATUS
} from '../lab/src/tournament.js';

const CLOCK = () => new Date('2026-01-01T00:00:00Z');

function makeTournament(candidates = ['v001', 'v002', 'v003', 'v004']) {
  return createTournament({ piece: 'queen', candidates, now: CLOCK });
}

test('createTournament initialises in VOTING status', () => {
  const s = makeTournament();
  assert.equal(s.status, STATUS.VOTING);
  assert.deepEqual(s.candidates, ['v001', 'v002', 'v003', 'v004']);
  assert.equal(s.round, 1);
});

test('pickFavorites with one liked ID sets winnerOfRound and likedOfRound', () => {
  const s = pickFavorites(makeTournament(), ['v002'], { now: CLOCK });
  assert.equal(s.status, STATUS.BETWEEN);
  assert.equal(s.winnerOfRound, 'v002');
  assert.deepEqual(s.likedOfRound, ['v002']);
});

test('pickFavorites with multiple liked IDs records all in likedOfRound', () => {
  const s = pickFavorites(makeTournament(), ['v001', 'v003'], { now: CLOCK });
  assert.deepEqual(s.likedOfRound, ['v001', 'v003']);
  assert.equal(s.winnerOfRound, 'v001');
});

test('pickFavorites history entry has liked and disliked arrays', () => {
  const s = pickFavorites(makeTournament(), ['v002', 'v004'], { now: CLOCK });
  assert.deepEqual(s.history[0].liked, ['v002', 'v004']);
  assert.deepEqual(s.history[0].disliked, ['v001', 'v003']);
});

test('pickFavorites rejects unknown candidate', () => {
  assert.throws(
    () => pickFavorites(makeTournament(), ['vXXX'], { now: CLOCK }),
    /unknown candidate/
  );
});

test('pickFavorites rejects empty likedIds', () => {
  assert.throws(
    () => pickFavorites(makeTournament(), [], { now: CLOCK }),
    /non-empty array/
  );
});

test('pickFavorites rejects call outside VOTING status', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  assert.throws(
    () => pickFavorites(between, ['v001'], { now: CLOCK }),
    /non-voting status/
  );
});

test('nextRound seeds from all liked IDs plus fresh seeds', () => {
  const between = pickFavorites(makeTournament(), ['v001', 'v002'], { now: CLOCK });
  const next = nextRound(between, 'refine', ['v005', 'v006'], { now: CLOCK });
  assert.equal(next.status, STATUS.VOTING);
  assert.equal(next.round, 2);
  assert.deepEqual(next.candidates, ['v001', 'v002', 'v005', 'v006']);
});

test('nextRound deduplicates liked IDs appearing in seeds', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  const next = nextRound(between, 'pool', ['v001', 'v007', 'v008'], { now: CLOCK });
  assert.equal(next.candidates.filter((c) => c === 'v001').length, 1);
});

test('nextRound done transitions to DONE', () => {
  const between = pickFavorites(makeTournament(), ['v001'], { now: CLOCK });
  const done = nextRound(between, 'done', [], { now: CLOCK });
  assert.equal(done.status, STATUS.DONE);
});

test('overallWinner returns first liked ID of last round', () => {
  const between = pickFavorites(makeTournament(), ['v003', 'v001'], { now: CLOCK });
  assert.equal(overallWinner(between), 'v003');
});

test('overallWinner returns null on fresh tournament', () => {
  assert.equal(overallWinner(makeTournament()), null);
});
```

- [ ] **Step 2.2: Run the new tests**

```bash
node --test test/tournament.test.js
```

Expected: all 11 tests pass.

- [ ] **Step 2.3: Run full test suite to ensure no regressions**

```bash
npm test
```

Expected: ≥45 tests pass, none fail.

- [ ] **Step 2.4: Commit**

```bash
git add lab/src/tournament.js test/tournament.test.js
git commit -m "feat(lab): replace pickWinner with multi-like pickFavorites"
```

---

## Task 3: Increase default batch size

**Files:**
- Modify: `lab/src/variant-loader.js`
- Modify: `.claude/commands/lab-generate.md`

- [ ] **Step 3.1: Bump `pickActiveIds` default to 12**

In `lab/src/variant-loader.js`, change:

```js
export function pickActiveIds(manifest, count = 4) {
```

to:

```js
export function pickActiveIds(manifest, count = 12) {
```

- [ ] **Step 3.2: Update the `/lab-generate` default count reference**

In `.claude/commands/lab-generate.md`, change:

```
- `--count N` — optional, defaults to 3
```

to:

```
- `--count N` — optional, defaults to 8
```

And the example at the bottom:

```
/lab-generate queen v003 --count 3
```

to:

```
/lab-generate queen v003 --count 8
```

And update the "Should end with three new files" sentence to say eight.

- [ ] **Step 3.3: Commit**

```bash
git add lab/src/variant-loader.js .claude/commands/lab-generate.md
git commit -m "feat(lab): increase default batch size to 8-12 variants"
```

---

## Task 4: Responsive grid + Like button CSS

**Files:**
- Modify: `lab/index.html`

- [ ] **Step 4.1: Replace the hardcoded 2×2 grid with a responsive auto-fill grid**

In `lab/index.html`, replace the `main` CSS rule:

```css
main {
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
```

with:

```css
main {
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  align-content: start;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}
```

- [ ] **Step 4.2: Add Like button styles and liked-cell highlight**

Add these rules right after the `.cell:hover` rule:

```css
.cell.liked {
  border-color: #ff6b9d;
  box-shadow: 0 0 0 2px rgba(255, 107, 157, 0.25);
}
.cell-like {
  background: transparent;
  border: 1px solid #3a3d45;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12px;
  padding: 4px 8px;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
  align-self: start;
  justify-self: end;
}
.cell-like.active {
  color: #ff6b9d;
  border-color: #ff6b9d;
}
.cell-like:hover { filter: brightness(1.2); }
```

- [ ] **Step 4.3: Update `<header>` to include a confirm bar**

Replace:

```html
<header>
  <h1>Kill Animation Lab &mdash; Queen</h1>
  <span class="status" id="status">loading...</span>
</header>
```

with:

```html
<header>
  <h1>Kill Animation Lab &mdash; Queen</h1>
  <div class="header-right">
    <span class="status" id="status">loading...</span>
    <span class="liked-count" id="liked-count" style="display:none">0 liked</span>
    <button id="btn-confirm" type="button" class="primary" disabled>Confirm Selection</button>
  </div>
</header>
```

- [ ] **Step 4.4: Add `header-right` and `liked-count` CSS**

Add after the existing `h1` rule:

```css
.header-right { display: flex; gap: 12px; align-items: center; }
.liked-count { color: #ff6b9d; font-size: 13px; font-weight: 600; }
```

- [ ] **Step 4.5: Commit**

```bash
git add lab/index.html
git commit -m "feat(lab): responsive grid layout + like button CSS"
```

---

## Task 5: Multi-like UI logic in main.js

**Files:**
- Modify: `lab/src/main.js`

- [ ] **Step 5.1: Update imports — add `pickFavorites`, remove `pickWinner`**

Replace:

```js
import {
  createTournament,
  pickWinner,
  nextRound,
  STATUS,
  overallWinner
} from './tournament.js';
```

with:

```js
import {
  createTournament,
  pickFavorites,
  nextRound,
  STATUS,
  overallWinner
} from './tournament.js';
```

- [ ] **Step 5.2: Add `likedIds` Set and wire up new elements**

After `let stopPlayground = null;`, add:

```js
let likedIds = new Set();
```

After the existing `btnDone` declaration, add:

```js
const btnConfirm = document.getElementById('btn-confirm');
const likedCountEl = document.getElementById('liked-count');
```

- [ ] **Step 5.3: Update `bootstrap` to use full pool size**

Change:

```js
state = createTournament({ piece: PIECE, candidates: pickActiveIds(manifest, 4) });
```

to:

```js
state = createTournament({ piece: PIECE, candidates: pickActiveIds(manifest) });
```

- [ ] **Step 5.4: Replace `handlePick` with Like toggle + `updateLikeUI`**

Delete the `handlePick` function entirely. Add in its place:

```js
function handleLike(variantId) {
  if (state.status !== STATUS.VOTING) return;
  if (likedIds.has(variantId)) {
    likedIds.delete(variantId);
  } else {
    likedIds.add(variantId);
  }
  updateLikeUI();
}

function updateLikeUI() {
  const count = likedIds.size;
  likedCountEl.textContent = `${count} liked`;
  likedCountEl.style.display = count > 0 ? 'inline' : 'none';
  btnConfirm.disabled = count === 0;

  document.querySelectorAll('.cell').forEach((cell) => {
    const id = cell.dataset.variantId;
    const btn = cell.querySelector('.cell-like');
    const isLiked = likedIds.has(id);
    cell.classList.toggle('liked', isLiked);
    if (btn) {
      btn.classList.toggle('active', isLiked);
      btn.textContent = isLiked ? '♥ Liked' : '♡ Like';
    }
  });
}
```

- [ ] **Step 5.5: Update `renderCell` to include a Like button**

In `renderCell`, replace:

```js
cell.append(header, canvas, hypothesis);
return { cell, canvas };
```

with:

```js
const likeBtn = document.createElement('button');
likeBtn.className = 'cell-like';
likeBtn.type = 'button';
likeBtn.textContent = '♡ Like';
likeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleLike(variant.id);
});

cell.append(header, canvas, hypothesis, likeBtn);
return { cell, canvas };
```

- [ ] **Step 5.6: Remove the old per-cell click handler in `renderRound`**

Delete this line from `renderRound`:

```js
wrapper.cell.addEventListener('click', () => handlePick(variant.id));
```

- [ ] **Step 5.7: Add Confirm button handler**

After the `btnDone` listener, add:

```js
btnConfirm.addEventListener('click', () => {
  if (state.status !== STATUS.VOTING || likedIds.size === 0) return;
  state = pickFavorites(state, [...likedIds]);
  save(PIECE, state);
  likedIds.clear();
  updateLikeUI();
  openModal();
});
```

- [ ] **Step 5.8: Reset `likedIds` at start of each round**

At the top of `renderRound` (after the `stopPlayground` guard), add:

```js
likedIds.clear();
updateLikeUI();
```

- [ ] **Step 5.9: Update `openModal` copy**

Replace the `modalBodyEl.innerHTML` string in `openModal` with:

```js
const liked = state.likedOfRound ?? [state.winnerOfRound];
const likedList = liked.map((id) => `<strong>${id}</strong>`).join(', ');
modalBodyEl.innerHTML = `
  Round ${state.round} done. Liked: ${likedList}.
  <br><br>
  <em>Refine</em>: have Claude generate a new batch seeded from your picks:
  <br>
  <code>/lab-generate ${PIECE} ${liked[0]} --count 8</code>
  <br>
  Then click <em>Refine</em> — the lab reloads and shows the fresh variants.
  <br><br>
  <em>From Pool</em>: seed from unused variants already in the manifest.
  <br>
  <em>Done</em>: freeze the tournament and export the result.
`;
```

- [ ] **Step 5.10: Update `btnRefine` handler**

Replace the `usedIds` + `fresh` slice block in `btnRefine`:

```js
const usedIds = new Set(state.history.flatMap((h) => [h.winner, ...h.losers]));
const fresh = manifest.variants
  .map((v) => v.id)
  .filter((id) => !usedIds.has(id) && id !== state.winnerOfRound && !id.startsWith('_'))
  .slice(-3);

if (fresh.length === 0) {
  statusEl.textContent =
    `no fresh variants in manifest — run: npm run lab:generate -- ${PIECE} ${state.winnerOfRound}`;
  return;
}

state = nextRound(state, 'refine', fresh);
```

with:

```js
const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
const usedIds = new Set(state.history.flatMap((h) => [
  ...(h.liked ?? [h.winner]),
  ...(h.disliked ?? h.losers ?? [])
]));
const fresh = manifest.variants
  .map((v) => v.id)
  .filter((id) => !usedIds.has(id) && !liked.includes(id) && !id.startsWith('_'))
  .slice(-(12 - liked.length));

if (fresh.length === 0 && liked.length === 0) {
  statusEl.textContent = `no fresh variants — run: /lab-generate ${PIECE} ${state.winnerOfRound} --count 8`;
  return;
}

state = nextRound(state, 'refine', fresh);
```

- [ ] **Step 5.11: Update `btnFromPool` handler**

Replace the `used` set construction:

```js
const used = new Set([state.winnerOfRound, ...state.history.flatMap((h) => [h.winner, ...h.losers])]);
```

with:

```js
const liked = state.likedOfRound ?? (state.winnerOfRound ? [state.winnerOfRound] : []);
const used = new Set([
  ...liked,
  ...state.history.flatMap((h) => [
    ...(h.liked ?? [h.winner]),
    ...(h.disliked ?? h.losers ?? [])
  ])
]);
```

- [ ] **Step 5.12: Verify syntax**

```bash
node --check lab/src/main.js
```

Expected: no output.

- [ ] **Step 5.13: Commit**

```bash
git add lab/src/main.js
git commit -m "feat(lab): multi-like picker with Confirm button"
```

---

## Task 6: Smoke-test the full flow

- [ ] **Step 6.1: Start the lab**

```bash
npm run lab
```

Open `http://localhost:5173`. Expected: lab loads without console errors, all available queen variants render in a responsive multi-column grid (no fixed 2×2).

- [ ] **Step 6.2: Test Like toggle**

Click "♡ Like" on 2–3 cells. Expected:
- Cell border turns pink, button reads "♥ Liked"
- Header shows "N liked" badge
- "Confirm Selection" button becomes clickable

Click a liked cell again. Expected: reverts to unliked.

- [ ] **Step 6.3: Test Confirm flow**

Like 2 variants, click "Confirm Selection". Expected: modal opens showing both IDs and the `/lab-generate` command with `--count 8`.

- [ ] **Step 6.4: Test From Pool**

In the modal, click "From Pool". Expected: grid reloads with the liked variants still present plus fresh unused ones.

- [ ] **Step 6.5: Run full test suite**

```bash
npm test
```

Expected: ≥56 tests pass (45 original + 11 tournament), none fail.

- [ ] **Step 6.6: Final commit if any fixup needed**

```bash
git add -p
git commit -m "fix(lab): smoke-test fixups"
```

---

## Self-Review

**Spec coverage:**
- Bigger batch (8–12): ✅ Task 3 bumps defaults, Task 5.3 removes hardcoded 4
- Multi-like picker: ✅ Tasks 1 + 5
- All liked seed next round: ✅ Task 1.2 + 5.10
- Responsive scrollable grid: ✅ Task 4
- Dislike tracking in history: ✅ Task 1.1 (disliked array in history entry)
- No production code change: ✅ only `lab/` and `test/tournament.test.js` touched

**Placeholder scan:** None found.

**Type consistency:** `likedOfRound` added in Task 1.1 and read in Tasks 1.2, 5.9, 5.10, 5.11. `pickFavorites` defined Task 1.1, imported Task 5.1, called Task 5.7. History entries use `liked`/`disliked` throughout. All consistent.
