export const defaultAnimationPack = {
  id: 'debug-default-pack',
  version: 1,
  spritesheets: {
    debug: {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAAAgCAYAAABEmHeFAAACBElEQVR4nO2bS2rEMBAF+2A5hNdzppwk65wp1+iQkAbjeMb69Fd+BdqOW1AFHiMR3RzeET2LF/y1sazoWUAwfCB6Hmv28iMA8C+AlSM4yo8AwC93iMBC/o+N+WfpTNgGv7/xq+U5y1KsHIGl/F4RXInvGsL2yXy2TB/qwIoReMhvGUGv+GYhPJN+tRhWisBTfosIZuVXi6BXfq0I+PFgjdX93AUiiJBfMwIt+acjGJVfI4KoAKh4BJHya0SgLf9wBLPyz0YQGQAVjSCD/LMRpAhAS/6ZCKIDoGIRZJJ/NIJRmdUjQAC7OQpEkFH+kQhmBUYABgFQ8ggyy98TgZa807+jLf9oBJkCoKQRVJC/NQIEcNxIsgAoWQSV5G+JQPMLDgIwCoCSRFBR/qsIEMBxE0kDoOAIrE51IoA/EEDjfAERWB9pxisQAuib0TECr/P8t/8TTPgM2jenQwTel1m85ScEcLKRIgGQcQRRN7k85Rdm5dWKCAGMzGsQQfQ1Rk/5KdNRCMJhuLGZFSOIll/wkl9olbl3DQ0TJT8VDYCUIsgiv+AlP2ULgG54IUaDmQiyyS94yC+kkV/wln8FRiLIKr/gIb+QRv4jkL6dngiyyy94yC+kkx/00xJBFfkFD/n3QPzivIqgmvyCl/x7IH5hziKoKj8AQ1wFED0fAOY8CyB6rjvyDXo+HAy4eP9mAAAAAElFTkSuQmCC',
      frameWidth: 32,
      frameHeight: 32,
      frames: 6,
      drawSize: 72
    }
  },
  rules: [
    { when: { attacker: { piece: 'b' } }, timeline: 'bishop-slash' },
    { when: { attacker: { piece: 'p' } }, timeline: 'pawn-attack' },
    { when: { attacker: { piece: '*' } }, timeline: 'default-capture' }
  ],
  timelines: {
    'pawn-attack': {
      maxDurationMs: 300,
      layers: [
        {
          id: 'attacker',
          sheet: 'debug',
          frame: 0,
          keyframes: [
            { t: 0, ref: 'attacker.from', scale: 0.8, alpha: 1 },
            { t: 250, ref: 'attacker.to', scale: 1.1, alpha: 0 }
          ]
        }
      ]
    },
    'bishop-slash': {
      maxDurationMs: 450,
      layers: [
        {
          id: 'slash',
          sheet: 'debug',
          frame: 2,
          keyframes: [
            { t: 180, ref: 'victim.at', rotation: -0.5, scale: 0.6, alpha: 0 },
            { t: 260, ref: 'victim.at', rotation: 0.3, scale: 1.4, alpha: 1 },
            { t: 420, ref: 'victim.at', rotation: 0.8, scale: 1.8, alpha: 0 }
          ]
        }
      ]
    },
    'default-capture': {
      maxDurationMs: 800,
      layers: [
        {
          id: 'victim-break',
          sheet: 'debug',
          frame: 4,
          keyframes: [
            { t: 260, ref: 'victim.at', scale: 0.7, alpha: 0 },
            { t: 450, ref: 'victim.at', scale: 1.2, alpha: 1 },
            { t: 700, ref: 'victim.at', scale: 1.6, alpha: 0 }
          ]
        }
      ]
    }
  }
};
