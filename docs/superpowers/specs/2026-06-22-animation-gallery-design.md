# Design: Animation-Galerie + Ein-Klick-Apply

**Datum:** 2026-06-22
**Branch (Ausgang):** main
**Status:** Genehmigt (Design), wartet auf Implementierungsplan

## Ziel

Eine Showcase-Website (Stil: gogh-co.github.io/Gogh) zeigt mehrere Kill-Animationen
als Karten mit Live-Vorschau. Der Nutzer klickt eine Animation an → sie ist sofort
in der Chrome-Extension auf Lichess aktiv. Installation so einfach wie Chrome es
erlaubt: einmal „Zu Chrome hinzufügen", danach Galerie→Klick→live, ohne Copy-Paste
oder Reload.

## Entscheidungen / Defaults

- Galerie-URL: **GitHub Pages unter `https://gapsong.github.io/lichess-kill-anim/`**.
- Install-Flow: 1× Web-Store „Zu Chrome hinzufügen", danach Ein-Klick-Apply.
- Galerie-Inhalt: **Signature + 10 Einzeleffekte + 3 Themes** (~14 Karten).
- Themes (Routing zum Start, später im Harness feingetunt):
  - **Void**: q→nuke, r→vortex, b→zap, n→slash, p→shatter, k→ascension, fallback `vortex`
  - **Fire**: q→inferno, r→smash, b→inferno, n→slash, p→pixel, k→ascension, fallback `inferno`
  - **Arcade**: q→pixel, r→smash, b→zap, n→pixel, p→pixel, k→ascension, fallback `pixel`
- Vorschau: **Live mit der echten `ParticleFxRenderer`-Engine** pro Karte.
- Apply-Mechanismus: **`externally_connectable`** (Website → Extension).
- Dev-Reihenfolge: Galerie zuerst gegen lokale Extension (Dev-ID via Manifest-`key`),
  Store-Publish danach.

## Nicht-Ziele (diese Runde)

- Kein Killcount-/Leveling-System (separate, spätere Idee).
- Kein Userscript-Apply (Galerie-Apply zielt nur auf die Extension).
- Keine neuen Partikel-Effekte; nur Komposition vorhandener Effekte zu Packs/Themes.
- Keine eigene Domain; GitHub Pages genügt.
- Kein Server/Backend; die Galerie ist statisch.

## A) Geteilte Pack-Registry (`src/packs.js`) — Single Source of Truth

Eine Datendatei definiert jede wählbare Animation als Pack. Genutzt von der
Extension (id → Renderer-Config), der Galerie (Karten + Vorschau) und den Tests.

```js
// kind: 'signature' | 'single' | 'theme'
export const PACKS = [
  { id: 'signature', label: 'Signature', kind: 'signature' },
  { id: 'nuke', label: 'Nuke', kind: 'single', effect: 'nuke' },
  // … alle 10 Einzeleffekte …
  { id: 'void', label: 'Void', kind: 'theme',
    routing: { q:'nuke', r:'vortex', b:'zap', n:'slash', p:'shatter', k:'ascension' },
    fallback: 'vortex' },
  // … Fire, Arcade …
];

export function resolvePack(packId) {
  // -> { mode, routing, fallback } für die Engine
  // signature -> { mode:'signature', routing:null, fallback:'splatter' }
  // single    -> { mode:effect,      routing:null, fallback:'splatter' }
  // theme     -> { mode:'signature', routing,      fallback }
  // unbekannt -> resolvePack('signature')
}
```

`resolvePack` ist eine reine Funktion und voll testbar. Die Liste der bekannten
Effekt-ids (`nuke`, `smash`, …) lebt weiterhin in der Engine; `packs.js` referenziert
sie nur per String.

## B) Engine-Erweiterung: konfigurierbares Routing

`ParticleFxRenderer.effectFor` nutzt aktuell die feste Modul-Konstante
`SIG = { q:'nuke', n:'slash', b:'zap', r:'smash', p:'pixel', k:'ascension' }`.

Änderung (klein, abwärtskompatibel):
- Neue setzbare Felder `this.routing` (Map Figur→Effekt, Default `null`) und
  `this.fallback` (Default `'splatter'`), aus den Constructor-Optionen.
- In `effectFor` (signature-Pfad): `const map = this.routing || SIG;` und
  `return map[attacker.piece] || this.fallback;`. Opfer-`k` → `ascension` bleibt
  Vorrang. Single-Effekt und `random` bleiben unverändert.

Damit deckt die Engine alle drei Pack-Arten ab: single = `mode=effektId`,
signature = `routing=null`, theme = `routing=themeMap` + `fallback`.

## C) Auswahl persistieren (`settings.packId`)

- Neues Setting **`packId`** (Default `'signature'`).
- `mergeSettings`: `packId` nur akzeptieren, wenn es in der Registry existiert,
  sonst `'signature'`.
- Runtime: beim Start und bei `applyConfig` `resolvePack(settings.packId)` →
  `renderer.mode/routing/fallback` setzen. Das bestehende `mode`-Setting wird durch
  `packId` abgelöst (single-Pack drückt den alten „fester Effekt"-Fall aus); die
  drei alten `mode`-Werte bleiben über die Single/Signature-Packs erreichbar.
- Popup: bekommt **keine** Pack-Auswahl in dieser Runde (die Galerie ist die
  Auswahl-Oberfläche); An/Aus, Sound, Intensität bleiben.

## D) Apply-Mechanismus (Website → Extension)

`externally_connectable`:
- `extension/manifest.json`:
  - `externally_connectable: { matches: ["https://gapsong.github.io/*"] }`
  - `background: { service_worker: "background.js" }`
- `src/background-entry.js` *(neu, → `background.js`)*: minimaler MV3-Worker mit
  `chrome.runtime.onMessageExternal`:
  - `{ type:'ping' }` → `sendResponse({ installed:true, version })`
  - `{ type:'setPack', packId }` → gegen Registry validieren → gültig:
    `chrome.storage.sync.set({ packId })`, antworten `{ ok:true }`; ungültig:
    `{ ok:false }`.
- Lichess-Tab aktualisiert **live** über den vorhandenen
  `chrome.storage.onChanged`-Listener (Content-Script ruft
  `runtime.applyConfig` mit dem neuen `packId`).
- **Install-Erkennung** (Galerie): `chrome.runtime.sendMessage(EXT_ID, {type:'ping'})`;
  keine/negative Antwort → „Zu Chrome hinzufügen"-Banner.

Verworfene Alternativen: Deep-Link mit URL-Parameter (kein Live-Update, umständlich);
Copy-Paste-Code (genau das, was vermieden werden soll).

## E) Galerie-Website (`gallery/` Quelle → `dist/gallery/` Build → GitHub Pages)

- Statische Single-Page, gebündelt via esbuild. Importiert `packs.js` +
  `particle-fx-renderer.js` (echte Engine).
- **Grid** aus Karten (Gogh-Stil). Jede Karte:
  - Mini-Brett-Canvas, das den Pack-Effekt in Schleife rendert (board-lokales
    Koordinatenmodell wie im Harness; bei Themes rotiert die Vorschau über die
    Figuren, damit man die Vielfalt sieht).
  - Label + „Use this"-Button → `setPack`-Nachricht an die Extension (D).
- **Install-Banner** oben: Status „installiert"/„nicht installiert" (Ping),
  „Zu Chrome hinzufügen"-Link zum Web-Store.
- Vorschau funktioniert **ohne** Extension; nur „Use this" braucht sie.
- Design nach den 5 Prinzipien: dunkel, ein violetter Akzent (Marken-Look),
  echte Live-Previews statt Stock-Bilder, keine Gradient-/Emoji-/Default-Font-Slop.

## F) Build & Deploy

- `scripts/build-gallery.mjs` (esbuild: Galerie-Entry + Engine + Packs →
  `dist/gallery/`, `index.html` kopieren). npm-Script `build:gallery`.
- `scripts/build-extension.mjs` bündelt zusätzlich `src/background-entry.js` →
  `dist/extension/background.js` (analog zur bestehenden bedingten Popup-Bündelung).
- GitHub Pages serviert die Galerie. Empfehlung: Pages-Quelle = `gh-pages`-Branch
  oder `/docs`; der Build kopiert `dist/gallery/` dorthin (genaue Pages-Quelle in
  `store/`/Deploy-Doku festhalten).
- Extension-ID: in Entwicklung feste Dev-ID via Manifest-`key` (lokal generiert);
  die Galerie liest `EXT_ID` aus einer kleinen Config-Konstante. Nach Store-Publish
  wird die echte ID dort eingetragen.

## G) Tests (`node:test`)

- `test/packs.test.js`: `resolvePack` für jede Pack-Art liefert gültige
  `{mode,routing,fallback}`; unbekannte id → Signature; jede Theme-Routing-Map
  referenziert nur bekannte Effekt-ids.
- `test/settings.test.js` (erweitern): `mergeSettings` akzeptiert gültige `packId`,
  klemmt unbekannte auf `'signature'`.
- `test/particle-fx-renderer.test.js` (erweitern): `routing`-Override greift
  (Fire-Theme: q→inferno), `fallback` greift bei unbekannter Figur, Opfer-`k`
  bleibt `ascension`.
- `test/background.test.js`: der `onMessageExternal`-Handler — gültige `packId`
  schreibt Storage + `{ok:true}`; ungültige → `{ok:false}`, kein Schreiben; `ping`
  → `{installed:true}`. (Handler als reine Funktion mit injizierten
  `storage`/`sendResponse`-Doubles, ohne echtes `chrome`.)
- Bestehende Tests bleiben grün. Galerie-DOM/Canvas-Previews und der echte
  `chrome`-Messaging-Pfad werden **nicht** unit-getestet → manuell „Entpackt
  laden" + Galerie lokal.

## H) Phasen (jede für sich grün & baubar)

1. **Packs + Engine-Routing + `settings.packId`** — Registry, `resolvePack`,
   Engine-`routing`/`fallback`, Runtime löst `packId` auf; Tests.
2. **Extension-Apply** — `background-entry.js` (Service-Worker),
   `externally_connectable` + `background` im Manifest, Build bündelt den Worker;
   Handler-Tests; manuell „Entpackt laden".
3. **Galerie-Site** — Grid, Live-Previews, „Use this"/Apply, Install-Banner,
   `build:gallery`; lokal gegen die Dev-Extension getestet.
4. **Deploy** — GitHub-Pages-Quelle einrichten, `externally_connectable`-URL +
   `EXT_ID` verdrahten, Deploy-/Store-Doku aktualisieren.

## Manuelle Verifikation (Phasen 2–4)

- Extension „Entpackt laden", Galerie lokal (`build:gallery` + statischer Server).
- Galerie zeigt animierte Karten ohne Extension; Banner „nicht installiert".
- Mit geladener Extension: Banner „installiert"; „Use this" → offener Lichess-Tab
  wechselt die Animation **live**; Auswahl überlebt Reload (Storage).
- Ungültige/fehlende `packId` fällt sauber auf Signature zurück.

## Risiken / offene Punkte

- **Extension-ID-Henne-Ei:** `externally_connectable` braucht die Galerie-Origin
  (bekannt: GitHub-Pages-URL), die Galerie braucht die Extension-ID (erst nach
  Publish fix). Lösung: Manifest-`key` für stabile Dev-ID; echte ID nach Publish
  eintragen — als expliziter Deploy-Schritt dokumentiert.
- **MV3-Service-Worker-Lebenszyklus:** Worker ist ereignisgesteuert; für
  `onMessageExternal` + `storage.set` ausreichend (kein Dauerzustand nötig).
- **Store-Review:** `externally_connectable` + `background` zusätzlich begründen
  (Einzweck bleibt: Auswahl der Animation von der offiziellen Galerie). Permission
  bleibt `storage`; kein Remote-Code.
- **Performance:** ~14 gleichzeitig animierte Mini-Canvas. Falls zu schwer, später
  auf „Hover/Klick startet Live" drosseln (in dieser Runde erst messen).
