import { squareCenterFromDocument } from './board-geometry.js';
import { CaptureEventStream } from './event-stream.js';
import { readSnapshot } from './move-feed.js';

const PIECE_NAMES = {
  p: 'Bauer',
  n: 'Springer',
  b: 'Läufer',
  r: 'Turm',
  q: 'Dame',
  k: 'König'
};

const ANIMATIONS = {
  cssInjected: false,

  injectCSS() {
    if (this.cssInjected) return;

    const style = document.createElement('style');

    style.textContent =
      '.ka{position:fixed;pointer-events:none}'
      + '@keyframes ka-blast{0%{transform:scale(0);opacity:1;border-width:6px}50%{transform:scale(2.5);opacity:.8}100%{transform:scale(4.5);opacity:0;border-width:1px}}'
      + '@keyframes ka-vaporize{0%{transform:scale(1);opacity:1;filter:brightness(1)}30%{transform:scale(1.4);opacity:1;filter:brightness(4)}100%{transform:scale(.3);opacity:0;filter:brightness(6)}}'
      + '@keyframes ka-ram-v{0%{transform:translate(var(--kx),var(--ky)) scale(.8);opacity:0}20%{opacity:1}60%{transform:translate(0,0) scale(1.15);opacity:1}80%{transform:translate(0,0) scale(1);opacity:.8}100%{transform:translate(0,0) scale(.8);opacity:0}}'
      + '@keyframes ka-ram-a{0%{transform:translate(var(--kx),var(--ky));opacity:0}20%{opacity:.5}50%{transform:translate(0,0) scale(1.25);opacity:.8}70%{transform:translate(0,0) scale(1);opacity:.5}100%{transform:translate(0,0);opacity:0}}'
      + '@keyframes ka-slash-L{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(-60px,-50px) rotate(-35deg);opacity:0}}'
      + '@keyframes ka-slash-R{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(60px,50px) rotate(35deg);opacity:0}}'
      + '@keyframes ka-stab{0%{transform:translate(0,0) scale(.8)}25%{transform:translate(var(--sx),var(--sy)) scale(1.4)}50%{transform:translate(var(--sx),var(--sy)) scale(1.2)}100%{transform:translate(0,0) scale(1);opacity:0}}'
      + '@keyframes ka-fall{0%{transform:scale(1) rotate(0);opacity:1}100%{transform:scale(.4) rotate(45deg) translateY(15px);opacity:0}}'
      + '@keyframes ka-stomp{0%{transform:translateY(-90px) scale(.6)}40%{transform:translateY(5px) scale(1.5)}50%{transform:translateY(0) scale(1)}100%{transform:translateY(0) scale(1);opacity:0}}'
      + '@keyframes ka-crush{0%{transform:scaleY(1) scaleX(1);opacity:1}100%{transform:scaleY(.03) scaleX(1.8);opacity:0}}'
      + '@keyframes ka-flash{0%{opacity:.2;transform:scale(.3)}25%{opacity:1;transform:scale(1.3)}100%{opacity:0;transform:scale(1)}}'
      + '@keyframes ka-bomb{0%{transform:scale(1.1);opacity:1}10%{transform:scale(1.8)}25%{transform:scale(.85) rotate(-10deg)}40%{transform:scale(1.15) rotate(5deg)}55%{transform:scale(1) rotate(0)}75%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.8)}}';

    document.head.appendChild(style);
    this.cssInjected = true;
  },

  el(styles, duration) {
    this.injectCSS();

    const element = document.createElement('div');
    element.className = 'ka';

    Object.assign(element.style, styles);
    document.body.appendChild(element);

    if (duration) {
      setTimeout(() => element.remove(), duration);
    } else {
      element.addEventListener('animationend', () => element.remove(), { once: true });
    }

    return element;
  },

  center(square) {
    const center = squareCenterFromDocument(document, square);
    if (!center) return null;

    return {
      x: center.x,
      y: center.y,
      sz: center.size
    };
  },

  q(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;

    this.el({
      left: `${c.x - s / 2}px`,
      top: `${c.y - s / 2}px`,
      width: `${s}px`,
      height: `${s}px`,
      borderRadius: '50%',
      border: '5px solid #a855f7',
      zIndex: '99998',
      boxShadow: '0 0 40px rgba(168,85,247,.9)',
      animation: 'ka-blast .6s ease-out forwards'
    });

    this.el({
      left: `${c.x - s / 2}px`,
      top: `${c.y - s / 2}px`,
      width: `${s}px`,
      height: `${s}px`,
      background: 'radial-gradient(circle, #fff, #a855f7)',
      zIndex: '99997',
      animation: 'ka-vaporize .5s ease-out forwards'
    });
  },

  r(event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;
    const d = dirFromMove(event.from, event.to);
    const kx = -d.x * s * 1.8;
    const ky = -d.y * s * 1.8;

    const v = this.el({
      left: `${c.x - s * .4}px`,
      top: `${c.y - s * .4}px`,
      width: `${s * .8}px`,
      height: `${s * .8}px`,
      background: 'rgba(255,50,50,.7)',
      zIndex: '99997',
      animation: 'ka-ram-v .55s ease-in forwards'
    });

    v.style.setProperty('--kx', `${kx}px`);
    v.style.setProperty('--ky', `${ky}px`);

    const a = this.el({
      left: `${c.x - s * .4}px`,
      top: `${c.y - s * .4}px`,
      width: `${s * .8}px`,
      height: `${s * .8}px`,
      background: 'rgba(255,255,255,.5)',
      zIndex: '99998',
      animation: 'ka-ram-a .5s ease-out forwards'
    });

    a.style.setProperty('--kx', `${kx}px`);
    a.style.setProperty('--ky', `${ky}px`);
  },

  b(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;

    this.el({
      left: `${c.x - s * .35}px`,
      top: `${c.y - s * .35}px`,
      width: `${s * .35}px`,
      height: `${s * .7}px`,
      background: 'rgba(255,255,255,.7)',
      zIndex: '99997',
      animation: 'ka-slash-L .5s ease-out forwards'
    });

    this.el({
      left: `${c.x}px`,
      top: `${c.y - s * .35}px`,
      width: `${s * .35}px`,
      height: `${s * .7}px`,
      background: 'rgba(255,255,255,.7)',
      zIndex: '99997',
      animation: 'ka-slash-R .5s ease-out forwards'
    });
  },

  p(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;
    const sx = (Math.random() > .5 ? 1 : -1) * s * .5;
    const sy = (Math.random() > .5 ? 1 : -1) * s * .3;

    const st = this.el({
      left: `${c.x - s * .3}px`,
      top: `${c.y - s * .3}px`,
      width: `${s * .6}px`,
      height: `${s * .6}px`,
      background: 'radial-gradient(circle, #fff, transparent)',
      zIndex: '99998',
      animation: 'ka-stab .4s ease-out forwards'
    });

    st.style.setProperty('--sx', `${sx}px`);
    st.style.setProperty('--sy', `${sy}px`);

    this.el({
      left: `${c.x - s * .4}px`,
      top: `${c.y - s * .4}px`,
      width: `${s * .8}px`,
      height: `${s * .8}px`,
      background: 'rgba(255,70,70,.6)',
      zIndex: '99997',
      animation: 'ka-fall .4s ease-in forwards'
    });
  },

  n(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;

    this.el({
      left: `${c.x - s * .45}px`,
      top: `${c.y - s * .8}px`,
      width: `${s * .9}px`,
      height: `${s * .9}px`,
      borderRadius: '50%',
      background: 'radial-gradient(ellipse, rgba(140,140,255,.7), transparent)',
      zIndex: '99998',
      animation: 'ka-stomp .6s ease-out forwards'
    });

    this.el({
      left: `${c.x - s * .35}px`,
      top: `${c.y + s * .25}px`,
      width: `${s * .7}px`,
      height: `${s * .12}px`,
      background: 'rgba(255,90,90,.7)',
      zIndex: '99997',
      animation: 'ka-crush .5s ease-in forwards'
    });
  },

  k(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;

    this.el({
      left: `${c.x - s / 2}px`,
      top: `${c.y - s / 2}px`,
      width: `${s}px`,
      height: `${s}px`,
      background: 'white',
      zIndex: '99999',
      animation: 'ka-flash .45s ease-out forwards'
    });
  },

  '*'(_event, square) {
    const c = this.center(square);
    if (!c) return;

    const s = c.sz;

    const element = this.el({
      left: `${c.x - s / 2}px`,
      top: `${c.y - s / 2}px`,
      width: `${s}px`,
      height: `${s}px`,
      fontSize: `${s * .9}px`,
      lineHeight: `${s}px`,
      textAlign: 'center',
      zIndex: '99998',
      animation: 'ka-bomb .5s ease-out forwards'
    });

    element.textContent = '💣';
  }
};

function dirFromMove(from, to) {
  const fx = from.charCodeAt(0) - 97;
  const fy = 8 - Number.parseInt(from[1], 10);
  const tx = to.charCodeAt(0) - 97;
  const ty = 8 - Number.parseInt(to[1], 10);
  const dxRaw = tx - fx;
  const dyRaw = ty - fy;

  if (Math.abs(dxRaw) > Math.abs(dyRaw)) return { x: Math.sign(dxRaw), y: 0 };
  if (Math.abs(dyRaw) > Math.abs(dxRaw)) return { x: 0, y: Math.sign(dyRaw) };

  return { x: 1, y: 0 };
}

function toast(text) {
  const old = document.getElementById('k-toast');
  if (old) old.remove();

  const element = document.createElement('div');
  element.id = 'k-toast';
  element.textContent = `${text} 💥`;

  Object.assign(element.style, {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '99999',
    background: '#1a1a2e',
    color: '#ff6b6b',
    padding: '10px 20px',
    borderRadius: '8px',
    border: '2px solid #ff6b6b'
  });

  document.body.appendChild(element);
  setTimeout(() => element.remove(), 2000);
}

function renderCapture(event) {
  const piece = event.movingPiece;
  const square = event.capturedAt;
  const animation = ANIMATIONS[piece] || ANIMATIONS['*'];

  toast(`${PIECE_NAMES[piece] || 'Figur'} schlägt`);
  requestAnimationFrame(() => animation.call(ANIMATIONS, event, square));
}

const stream = new CaptureEventStream();

function scan() {
  const snapshot = readSnapshot(document, location);
  const events = stream.next(snapshot);

  events.forEach(renderCapture);
}

const observer = new MutationObserver(scan);

observer.observe(document.body, {
  childList: true,
  subtree: true
});

scan();
