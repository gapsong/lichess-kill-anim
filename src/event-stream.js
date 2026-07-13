import { deriveEvents } from './chess-state.js';

function eventKey(e) {
  return `${e.ply}:${e.san}:${e.from}:${e.to}`;
}

export class CaptureEventStream {
  constructor() {
    this.snapshotId = null;
    this.seen = new Set();
    this.lastActivePly = null;
    this.primed = false;
  }

  next(snapshot) {
    if (!snapshot) return [];

    if (snapshot.id !== this.snapshotId) {
      this.snapshotId = snapshot.id;
      this.seen = new Set();
      this.lastActivePly = null;
      this.primed = false;
    }

    const allEvents = deriveEvents(snapshot);
    const activePly = snapshot.activePly ?? null;

    // First scan of a new context: silently baseline so entering a game with
    // prior captures fires nothing — but ONLY on the live/TV board (activePly
    // null), where animations are arrival-driven and seeding all played captures
    // is what stops the whole game re-animating on entry. On the analysis board
    // (activePly != null) animations are NAVIGATION-driven: every click onto a
    // capture ply must fire, including captures earlier than the entry cursor.
    // Seeding there (the cursor usually sits at the game's end) would pre-mark
    // EVERY capture as seen, so navigating onto one would never animate. So don't
    // seed on the analysis path — leave `seen` empty and let the activePly branch
    // fire on navigation. The activePly === lastActivePly guard still prevents
    // re-firing the same ply across repeated scans.
    if (!this.primed) {
      this.primed = true;
      this.lastActivePly = activePly;
      if (activePly == null) {
        for (const event of allEvents) this.seen.add(eventKey(event));
      }
      return [];
    }

    if (activePly != null) {
      if (activePly === this.lastActivePly) return [];
      this.lastActivePly = activePly;

      const activeEvent = allEvents.find((e) => e.ply === activePly);
      if (!activeEvent) return [];

      const key = eventKey(activeEvent);
      if (this.seen.has(key)) return [];
      this.seen.add(key);
      return [activeEvent];
    }

    return allEvents.filter((event) => {
      const key = eventKey(event);
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      return true;
    });
  }
}
