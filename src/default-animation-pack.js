export const defaultAnimationPack = {
  id: 'debug-default-pack',
  version: 1,
  spritesheets: {
    debug: {
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAAgCAYAAAAbrK/lAAAEPElEQVR4nO2czW0bMRBGWZjPOauIFJEi0kE68DlnFaGzz+nAZwYKxAWz3uWSw/kj+T1gYcCWOBRhvGfLkkMAAIBBiTH+tt4DAICB+PkjWu9Bmhjj9I9REwQghPhxuz8v630A0MUzADNHIL6w3sdMrB4AyB9MQwrAjBGIGdZ7mYX79/hYOQCQP5iKPAAzRSDuuLz94/aHfQ8Ca1rylL9VAOLPt8fRpboHyB9IEmNU/YYOBwGYIQJ7+dcGgFPY3OtZk+SfAvD8KD3zTPoWMaiRP+IAungGABHogyL/kAmbQ9qca+15v0X1qOTyzwMgGYFW+UtGoFb+ogH49h7j0SU2MIRwu8dYuiRn73n79RmPLs09SJ9HCgAiQIMq/+3+DOKWln+6uNc+Yy//fQAkIkCVv0QEzOV/Jn7JEFyJTjMEZ+LXDIHmeSACNHrlv63TIXAt+WtF4Ej+RwHgjECv/DkjMIz8OSPQKjupCNSKXzoEFueBCLTBJf9tPYLIteUvHYEz+Z8FgCMCXPLniMBw8ueKgIcAUOUvEQGr80AE6uCW/7Zug9Ct5C8VgZL8SwHoiQBF6FIR4JI/ORBU+fdGgCo7zgj0yp8zAtbngQiUkZL/tn6F2K3lzx2BK/lfBYAagR6JcwZgePn3RMBaeAEB+AIicIy0/Lc5BcF7kT9XBGrkXxMASgR6Bc4RAHP5B8MA9MqOQ3pc8ueIgIfzSCACuz0pyX+bdyB6b/LvjUCt/GsD0BIBjp/ge9dwIf+AACAAJyACr70oy3+bmwnfq/ypEWiRf0sAaiPA9vQN9SkkRflfxgEBQADOWD0CVvLf5g8g/9YItMq/NQA1EbAMgLb8i7fhkj8lAh6EhwBcs2oErOUfFAIQlH4DeArc8vqyH6MAuJJ/YtXfALjl3xsB6/MosVoEPMrfawSoMz3+DaD1MbSs41L+YfFXAXmRv5fzKLFKBLzJv/Q5TlZ6FZDFH4Fdyj8gAAhAA7NHwKv8a77GAd4HoPsy0G0ty1cEWQYgGL8T2FsAgpN3RpeYNQLe5d9ymx405Z/oCQB1Jt4IlmEl/4AAfMF7AMKEERhF/pTbUtCUf4ISgJ55JYmfyZxyn+IePMg/YSH/BEF4H/nVM9uD/PePx7P8E7NEYDT599ynBU35J1oCwDGvRugtV9NsT/JPWMg/p1Z0sweg9TysGD0Co8qf4741aMo/URMAznkW8q/al9V/B7WSfwucAQgO/hso9+PRZNQIjC5/zjVKaMo/UQqAxDzI/wCP4k9ICNP4ef9hAxCyCJjMJkRgFvlLrOWFowBIzoP8wT80xT8TVgEIjRHwIP+QSdvreh7IA6AxD/IHGxD/WFADoLvLbB8Csp4tAOEVAa0A5GhJ/7+ZkD8AdFoDoLs7QMUiAN6A/AGooDYAursCPaweAMgfgAauAqC7G9DLygGA/AEAS7NqALjk/xdRIn4tkIvCOAAAAABJRU5ErkJggg==',
      frameWidth: 32,
      frameHeight: 32,
      frames: 12,
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
          frames: [0, 1, 2, 3],
          frameDurationMs: 80,
          keyframes: [
            { t: 0, ref: 'attacker.from', scale: 0.8, alpha: 1 },
            { t: 320, ref: 'attacker.to', scale: 1.1, alpha: 0 }
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
          frames: [4, 5, 6, 7],
          frameDurationMs: 70,
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
          frames: [8, 9, 10, 11],
          frameDurationMs: 90,
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
