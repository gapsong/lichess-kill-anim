// goal-panel.js
// A small fixed HUD that lists the current goals (see goals.js) in the script's
// dark neon aesthetic. Unlike the board overlays this content is text and not
// board-aligned, so a fixed corner panel is the right home (the same approach as
// the capture toast in the runtime). It never blocks moves — pointer-events:none
// — and shows nothing when there are no goals.

const PANEL_ID = 'lichess-goal-panel';

const PANEL_STYLE = {
  position: 'fixed',
  left: '12px',
  top: '92px',
  zIndex: '99998',
  maxWidth: '260px',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid #b98cff',
  borderLeft: '4px solid #b98cff',
  background: 'rgba(21, 19, 31, 0.92)',
  color: '#ece8f5',
  font: "13px/1.4 'Segoe UI', system-ui, sans-serif",
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
  pointerEvents: 'none'
};

export class GoalPanel {
  constructor({ document: doc } = {}) {
    this.doc = doc ?? (typeof document !== 'undefined' ? document : null);
    this.goals = [];
  }

  // Replace the listed goals. An empty list hides the panel entirely — the panel
  // is only ever visible when there is something concrete to do.
  render(goals) {
    this.goals = goals ?? [];
    if (!this.doc || this.goals.length === 0) {
      this.clear();
      return;
    }
    const panel = this._ensurePanel();
    panel.replaceChildren(this._header(), ...this.goals.map((g) => this._item(g)));
  }

  // Remove the panel (feature off, unsafe context, or no goals).
  clear() {
    this.goals = [];
    this.doc?.getElementById(PANEL_ID)?.remove();
  }

  _ensurePanel() {
    let panel = this.doc.getElementById(PANEL_ID);
    if (!panel) {
      panel = this.doc.createElement('div');
      panel.id = PANEL_ID;
      Object.assign(panel.style, PANEL_STYLE);
      this.doc.body.appendChild(panel);
    }
    return panel;
  }

  _header() {
    const header = this.doc.createElement('div');
    header.textContent = '🎯 Ziele';
    Object.assign(header.style, {
      fontWeight: '600',
      marginBottom: '6px',
      color: '#b98cff',
      letterSpacing: '.02em'
    });
    return header;
  }

  _item(goal) {
    const row = this.doc.createElement('div');
    row.textContent = goal.text;
    Object.assign(row.style, { margin: '3px 0' });
    return row;
  }
}
