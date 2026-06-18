import { deriveEvents } from './chess-state.js';

function eventKey(e) {
  return `${e.ply}:${e.san}:${e.from}:${e.to}`;
}

export class CaptureEventStream {
  constructor() {
    this.snapshotId = null;
    this.seen = new Set();
    this.lastActivePly = null;
  }

  next(snapshot) {
    if (!snapshot) return [];

    if (snapshot.id !== this.snapshotId) {
      this.snapshotId = snapshot.id;
      this.seen = new Set();
      this.lastActivePly = null;
    }

    const allEvents = deriveEvents(snapshot);
    const activePly = snapshot.activePly ?? null;

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
