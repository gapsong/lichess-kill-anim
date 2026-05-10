import { deriveEvents } from './chess-state.js';

export class CaptureEventStream {
  constructor() {
    this.snapshotId = null;
    this.seen = new Set();
  }

  next(snapshot) {
    if (!snapshot) return [];

    if (snapshot.id !== this.snapshotId) {
      this.snapshotId = snapshot.id;
      this.seen = new Set();
    }

    return deriveEvents(snapshot).filter((event) => {
      const key = `${event.ply}:${event.san}:${event.from}:${event.to}`;
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      return true;
    });
  }
}
