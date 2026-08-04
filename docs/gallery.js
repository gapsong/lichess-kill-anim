(() => {
  // src/packs.js
  var EFFECTS = [
    "nuke",
    "smash",
    "slash",
    "zap",
    "pixel",
    "ascension",
    "splatter",
    "inferno",
    "vortex",
    "shatter"
  ];
  var EFFECT_LABELS = {
    nuke: "Nuke",
    smash: "Smash",
    slash: "Slash",
    zap: "Zap",
    pixel: "Pixel",
    ascension: "Ascension",
    splatter: "Splatter",
    inferno: "Inferno",
    vortex: "Vortex",
    shatter: "Shatter"
  };
  var PACKS = [
    { id: "signature", label: "Signature", kind: "signature" },
    ...EFFECTS.map((effect) => ({ id: effect, label: EFFECT_LABELS[effect], kind: "single", effect })),
    {
      id: "void",
      label: "Void",
      kind: "theme",
      routing: { q: "nuke", r: "vortex", b: "zap", n: "slash", p: "shatter", k: "ascension" },
      fallback: "vortex"
    },
    {
      id: "fire",
      label: "Fire",
      kind: "theme",
      routing: { q: "inferno", r: "smash", b: "inferno", n: "slash", p: "pixel", k: "ascension" },
      fallback: "inferno"
    },
    {
      id: "arcade",
      label: "Arcade",
      kind: "theme",
      routing: { q: "pixel", r: "smash", b: "zap", n: "pixel", p: "pixel", k: "ascension" },
      fallback: "pixel"
    }
  ];

  // gallery/main.js
  var content = document.getElementById("content");
  var status = document.getElementById("status");
  function makeTile(src, alt) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.width = 320;
    img.height = 320;
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    return img;
  }
  var GROUPS = [
    {
      title: "Signature",
      match: (p) => p.kind === "signature",
      desc: "Each piece gets its own effect. A queen capture looks different from a knight or a pawn capture \u2014 the default."
    },
    {
      title: "Themes",
      match: (p) => p.kind === "theme",
      desc: "A curated set where every piece still has its own effect, but they are chosen to share one coordinated look."
    },
    {
      title: "Effects",
      match: (p) => p.kind === "single",
      desc: "Force one single effect for every capture, no matter which piece moves."
    }
  ];
  function makeCard(pack, grid) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.packId = pack.id;
    card.appendChild(makeTile(`webp/pack-${pack.id}.webp`, `${pack.label} capture animation`));
    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = pack.label;
    meta.append(name);
    card.appendChild(meta);
    grid.appendChild(card);
  }
  function renderPackGroups(panel) {
    for (const group of GROUPS) {
      const packs = PACKS.filter(group.match);
      if (!packs.length) continue;
      const section = document.createElement("section");
      const heading = document.createElement("h2");
      heading.className = "section-title";
      heading.textContent = group.title;
      const desc = document.createElement("p");
      desc.className = "section-desc";
      desc.textContent = group.desc;
      const grid = document.createElement("div");
      grid.className = "grid";
      section.append(heading, desc, grid);
      panel.appendChild(section);
      packs.forEach((pack) => makeCard(pack, grid));
    }
  }
  function renderStatus() {
    if (status) status.style.display = "none";
  }
  async function init() {
    renderPackGroups(content);
    renderStatus();
  }
  init();
})();
