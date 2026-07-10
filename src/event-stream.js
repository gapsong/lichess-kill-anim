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

    // First scan of a new context: seed every capture already on the board as a
    // silent baseline so entering a game with prior captures fires nothing. Only
    // captures that first appear in a later scan emit. On the analysis board only
    // captures up to the viewed ply are already "on the board", so advancing the
    // cursor to a further capture still fires; on the live/TV board (activePly
    // null) every played capture is baselined.
    if (!this.primed) {
      this.primed = true;
      const baselineLimit = activePly ?? Infinity;
      for (const event of allEvents) {
        if (event.ply <= baselineLimit) this.seen.add(eventKey(event));
      }
      this.lastActivePly = activePly;
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
