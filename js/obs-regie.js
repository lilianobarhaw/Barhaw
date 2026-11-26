// LA RÉGIE de la page des effets (js/obs-effets.js) : elle pilote OBS par sa télécommande intégrée, le serveur WebSocket
// d'OBS (OBS 28 et plus), sur le PC du streamer : ws://127.0.0.1:4455. Le mot de passe est tapé une fois dans l'aide de la page
// (clic droit sur la source → Interagir) et gardé dans le navigateur d'OBS : il ne part nulle part ailleurs.
// Ce qu'elle sait faire : trouver la scène en direct, la cam de cette scène (posée telle quelle, dans un groupe ou dans une
// scène imbriquée, recadrée, retournée en miroir, avec ou sans cadre) et les autres sources ; les déplacer, les secouer, les
// tourner, les rapetisser autour du centre de la cam (en gardant leur place de départ, remise à la fin, même si la page est
// rechargée entre-temps) ; créer ses propres sources (un média pour le replay, un pour les sons flippants, une image pour le
// dossier) ; lire les sons et les photos rangés sur le PC (ils ne vont jamais sur le site) ; allumer et éteindre le filtre
// « BARHAW Hélium » des sources audio. Elle agit toujours sur la scène en direct : la scène principale comme la scène jeu.
// Le protocole : obs-websocket 5 (Hello → Identify avec le mot de passe haché → Identified ; requêtes, lots, événements).

const CLE_REMISE = "barhaw-obs-regie-a-remettre";
const NOMS = { replay: "BARHAW Replay", sons: "BARHAW Sons flippants", dossier: "BARHAW Dossier", teinte: "BARHAW Teinte", helium: "BARHAW Hélium" };
// les sources de cam (Windows, Mac, Linux)
const CAMS = new Set(["dshow_input", "av_capture_input", "av_capture_input_v2", "macos-avcapture", "macos-avcapture-fast", "v4l2_input"]);
const EVENEMENTS = 1 | 64 | 256; // General, Outputs (le replay enregistré), MediaInputs (un média fini)
const CHAMPS = ["positionX", "positionY", "rotation", "scaleX", "scaleY", "alignment", "boundsType", "boundsAlignment", "boundsWidth", "boundsHeight", "cropLeft", "cropRight", "cropTop", "cropBottom", "cropToBounds"];
// la page des effets dans la liste des sources d'OBS (son adresse)
const ADRESSE_PAGE = /\/obs(\.html)?\?(.*&)?(effets|bonk|essai=(effets|bonk|emotes|seisme|kraken|veille|dossier|controle|chaos|mini|prison|helium|flippant|replay|pub))\b/;

async function hache(texte) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  let b = "";
  for (const x of new Uint8Array(d)) b += String.fromCharCode(x);
  return btoa(b);
}
// une place qu'on peut redonner à OBS (sans les tailles calculées, et sans cadre quand il n'y en a pas)
export function placePropre(t) {
  const p = {};
  for (const c of CHAMPS) if (t && t[c] !== undefined && t[c] !== null) p[c] = t[c];
  if (!p.boundsType || p.boundsType === "OBS_BOUNDS_NONE") { delete p.boundsWidth; delete p.boundsHeight; delete p.boundsAlignment; }
  if (p.boundsWidth !== undefined && p.boundsWidth < 1) p.boundsWidth = 1;
  if (p.boundsHeight !== undefined && p.boundsHeight < 1) p.boundsHeight = 1;
  return p;
}

// ---------- la géométrie d'OBS (libobs/obs-scene.c : update_item_transform, calculate_bounds_data, add_alignment) ----------
// Un point de l'image de la source (en pixels, avant le recadrage) va dans la scène par :
//   position + rotation · (échelle · (point − recadrage) − origine)
const nombre = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
function decale(alignement, cx, cy) { // 1 gauche, 2 droite, 4 haut, 8 bas, 0 centre
  return { x: alignement & 2 ? cx : alignement & 1 ? 0 : cx / 2, y: alignement & 8 ? cy : alignement & 4 ? 0 : cy / 2 };
}
const encadre = (t) => Boolean(t?.boundsType) && t.boundsType !== "OBS_BOUNDS_NONE";
export function geometrie(t) {
  const sw = nombre(t.sourceWidth);
  const sh = nombre(t.sourceHeight);
  const cl = nombre(t.cropLeft);
  const cr = nombre(t.cropRight);
  const ct = nombre(t.cropTop);
  const cb = nombre(t.cropBottom);
  const cw = cl + cr > sw ? 2 : sw - cl - cr;
  const ch = ct + cb > sh ? 2 : sh - ct - cb;
  let sx = nombre(t.scaleX, 1) || 1;
  let sy = nombre(t.scaleY, 1) || 1;
  let ox = 0;
  let oy = 0;
  let bx;
  let by;
  if (encadre(t) && cw > 0 && ch > 0) {
    const BW = Math.max(1, nombre(t.boundsWidth, 1));
    const BH = Math.max(1, nombre(t.boundsHeight, 1));
    const w = cw * Math.abs(sx);
    const h = ch * Math.abs(sy);
    let type = t.boundsType;
    if (type === "OBS_BOUNDS_MAX_ONLY" && (w > BW || h > BH)) type = "OBS_BOUNDS_SCALE_INNER";
    if (type === "OBS_BOUNDS_SCALE_INNER" || type === "OBS_BOUNDS_SCALE_OUTER") {
      let largeur = BW / BH < w / h;
      if (t.boundsType === "OBS_BOUNDS_SCALE_OUTER") largeur = !largeur;
      const m = largeur ? BW / w : BH / h;
      sx *= m; sy *= m;
    } else if (type === "OBS_BOUNDS_SCALE_TO_WIDTH") { const m = BW / w; sx *= m; sy *= m; }
    else if (type === "OBS_BOUNDS_SCALE_TO_HEIGHT") { const m = BH / h; sx *= m; sy *= m; }
    else if (type === "OBS_BOUNDS_STRETCH") { sx = Math.sign(sx) * (BW / cw); sy = Math.sign(sy) * (BH / ch); }
    const o = decale(nombre(t.boundsAlignment), -(BW - cw * sx), -(BH - ch * sy));
    ox = o.x; oy = o.y;
    bx = BW; by = BH;
  } else { bx = cw * sx; by = ch * sy; }
  const a = decale(nombre(t.alignment), bx, by);
  return { sw, sh, cl, ct, cw, ch, sx, sy, ox: ox + a.x, oy: oy + a.y, rot: nombre(t.rotation), px: nombre(t.positionX), py: nombre(t.positionY) };
}
// la transformation d'une source : de l'image de la source vers sa scène (x' = a·x + c·y + e, y' = b·x + d·y + f)
export function affine(t) {
  const g = geometrie(t);
  const r = (g.rot * Math.PI) / 180;
  const co = Math.cos(r);
  const si = Math.sin(r);
  const lx = g.sx * g.cl + g.ox;
  const ly = g.sy * g.ct + g.oy;
  return { a: co * g.sx, b: si * g.sx, c: -si * g.sy, d: co * g.sy, e: g.px - (co * lx - si * ly), f: g.py - (si * lx + co * ly), g };
}
export const appliquer = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
export const composer = (m1, m2) => ({ // m1 après m2
  a: m1.a * m2.a + m1.c * m2.b, b: m1.b * m2.a + m1.d * m2.b, c: m1.a * m2.c + m1.c * m2.d, d: m1.b * m2.c + m1.d * m2.d,
  e: m1.a * m2.e + m1.c * m2.f + m1.e, f: m1.b * m2.e + m1.d * m2.f + m1.f, g: m2.g,
});
export function inverse(m) {
  const det = m.a * m.d - m.b * m.c || 1e-9;
  return { a: m.d / det, b: -m.b / det, c: -m.c / det, d: m.a / det, e: (m.c * m.f - m.d * m.e) / det, f: (m.b * m.e - m.a * m.f) / det };
}
const IDENTITE = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
// ce qu'on voit d'une source (dans sa scène) : son centre, sa largeur, sa hauteur
function vue(m, g) {
  const c = appliquer(m, g.cl + g.cw / 2, g.ct + g.ch / 2);
  return { cx: c.x, cy: c.y, l: g.cw * Math.hypot(m.a, m.b), h: g.ch * Math.hypot(m.c, m.d) };
}
export function boite(t) {
  const m = affine(t);
  return { ...vue(m, m.g), encadre: encadre(t) };
}
// la nouvelle place d'une source quand on bouge ce qu'elle montre autour d'un point (le centre de la cam) : déplacée de
// (dx, dy), grossie ou rapetissée, tournée. L'alignement ne change pas : remettre la place de départ suffit, à la fin.
// `pivot` est dans la scène de la source ; `versScene` change un déplacement de l'écran en déplacement dans cette scène.
export function placeAutour(t0, { dx = 0, dy = 0, echelle = 1, rotation = 0 } = {}, pivot = null, versScene = null, sens = 1) {
  const p0 = pivot || (() => { const b = boite(t0); return { x: b.cx, y: b.cy }; })();
  const r = (rotation * sens * Math.PI) / 180;
  const co = Math.cos(r);
  const si = Math.sin(r);
  const d = versScene ? { x: versScene.a * dx + versScene.c * dy, y: versScene.b * dx + versScene.d * dy } : { x: dx, y: dy };
  const vx = (nombre(t0.positionX) - p0.x) * echelle;
  const vy = (nombre(t0.positionY) - p0.y) * echelle;
  let rot = (nombre(t0.rotation) + rotation * sens) % 360;
  if (rot < 0) rot += 360;
  const p = { positionX: p0.x + d.x + co * vx - si * vy, positionY: p0.y + d.y + si * vx + co * vy, rotation: rot };
  if (encadre(t0)) { p.boundsWidth = Math.max(1, nombre(t0.boundsWidth, 1) * echelle); p.boundsHeight = Math.max(1, nombre(t0.boundsHeight, 1) * echelle); }
  else { p.scaleX = (nombre(t0.scaleX, 1) || 1) * echelle; p.scaleY = (nombre(t0.scaleY, 1) || 1) * echelle; }
  return p;
}
const estScene = (x) => x && (x.isGroup || x.sourceType === "OBS_SOURCE_TYPE_SCENE");

export function creerRegie({ reglages = () => ({}), surEtat = () => {}, journal = console, WS = window.WebSocket } = {}) {
  let ws = null;
  let etat = "eteinte"; // eteinte | connexion | reliee | refusee | absente
  let version = "";
  let essais = 0;
  let minuteur = null;
  let numero = 0;
  const attentes = new Map();
  const ecouteurs = new Map();
  let cache = { base: null }; // la taille du canevas d'OBS

  const changer = (e) => { if (etat !== e) { etat = e; try { surEtat(e); } catch { /* rien */ } } };
  const pret = () => etat === "reliee" && ws && ws.readyState === 1;

  function couper() {
    const s = ws;
    ws = null;
    if (s) { s.onopen = s.onmessage = s.onclose = s.onerror = null; try { s.close(); } catch { /* déjà fermée */ } }
    for (const [, a] of attentes) a.ko(new Error("OBS n'est plus relié"));
    attentes.clear();
  }
  function plusTard(ms) { clearTimeout(minuteur); minuteur = setTimeout(connecter, ms); }

  function connecter() {
    clearTimeout(minuteur);
    const r = reglages() || {};
    if (!r.mdp && !r.sansMdp) { couper(); changer("eteinte"); return; } // (sansMdp : la télécommande d'OBS sans mot de passe)
    couper();
    changer("connexion");
    const port = /^\d{2,5}$/.test(String(r.port || "")) ? Number(r.port) : 4455;
    let s;
    try { s = new WS(`ws://127.0.0.1:${port}`); } catch { changer("absente"); plusTard(15_000); return; }
    ws = s;
    s.onmessage = async (ev) => {
      let m = null;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || typeof m !== "object") return;
      const d = m.d || {};
      if (m.op === 0) { // Hello : on s'identifie (avec le mot de passe haché, s'il en faut un)
        const ident = { rpcVersion: 1, eventSubscriptions: EVENEMENTS };
        if (d.authentication) ident.authentication = await hache((await hache(String(r.mdp) + d.authentication.salt)) + d.authentication.challenge);
        version = String(d.obsWebSocketVersion || "");
        try { s.send(JSON.stringify({ op: 1, d: ident })); } catch { /* elle se ferme */ }
      } else if (m.op === 2) { // Identified
        essais = 0;
        cache = { base: null };
        changer("reliee");
        remettre().catch(() => {});
      } else if (m.op === 5) {
        for (const f of ecouteurs.get(d.eventType) || []) { try { f(d.eventData || {}); } catch { /* rien */ } }
      } else if (m.op === 7 || m.op === 9) {
        const a = attentes.get(d.requestId);
        if (!a) return;
        attentes.delete(d.requestId);
        clearTimeout(a.t);
        if (m.op === 9) a.ok(d.results || []);
        else if (d.requestStatus?.result) a.ok(d.responseData || {});
        else { const e = new Error(d.requestStatus?.comment || `OBS refuse ${d.requestType}`); e.code = d.requestStatus?.code; a.ko(e); }
      }
    };
    s.onclose = (e) => {
      if (ws !== s) return;
      couper();
      if (e?.code === 4009) { changer("refusee"); return; } // mot de passe refusé : on attend qu'il soit changé
      changer("absente");
      essais += 1;
      plusTard(Math.min(30_000, 2_000 * 2 ** Math.min(essais, 4)));
    };
  }

  function envoyer(op, d, ms = 8_000) {
    return new Promise((ok, ko) => {
      if (!pret()) { ko(new Error("OBS n'est pas relié")); return; }
      const id = `b${++numero}`;
      const t = setTimeout(() => { attentes.delete(id); ko(new Error("OBS ne répond pas")); }, ms);
      attentes.set(id, { ok, ko, t });
      try { ws.send(JSON.stringify({ op, d: { ...d, requestId: id } })); } catch (e) { clearTimeout(t); attentes.delete(id); ko(e); }
    });
  }
  const requete = (requestType, requestData = {}) => envoyer(6, { requestType, requestData });
  const lot = (requetes) => (requetes.length ? envoyer(8, { haltOnFailure: false, executionType: 0, requests: requetes.map(([requestType, requestData]) => ({ requestType, requestData: requestData || {} })) }) : Promise.resolve([]));
  function sur(type, f) {
    if (!ecouteurs.has(type)) ecouteurs.set(type, new Set());
    ecouteurs.get(type).add(f);
    return () => ecouteurs.get(type)?.delete(f);
  }
  const attendreEvenement = (type, filtre = () => true, ms = 10_000) => new Promise((ok, ko) => {
    const t = setTimeout(() => { arret(); ko(new Error(`pas de ${type}`)); }, ms);
    const arret = sur(type, (d) => { if (!filtre(d)) return; clearTimeout(t); arret(); ok(d); });
  });

  // ---------- les scènes, les sources ----------
  async function scene() {
    const d = await requete("GetCurrentProgramScene");
    return String(d.currentProgramSceneName || d.sceneName || "");
  }
  async function elements(nomScene) {
    const d = await requete("GetSceneItemList", { sceneName: nomScene });
    return Array.isArray(d.sceneItems) ? d.sceneItems : [];
  }
  // ce qu'il y a dans un groupe ou dans une scène imbriquée
  async function dedans(x) {
    if (x.isGroup) return requete("GetGroupSceneItemList", { sceneName: x.sourceName }).then((d) => (Array.isArray(d.sceneItems) ? d.sceneItems : [])).catch(() => []);
    return elements(x.sourceName).catch(() => []);
  }
  async function canevas() {
    if (!cache.base) {
      const v = await requete("GetVideoSettings");
      cache.base = { l: Number(v.baseWidth) || 1920, h: Number(v.baseHeight) || 1080 };
    }
    return cache.base;
  }
  // la source de cette page (pour ne pas la secouer, glisser le replay juste en dessous, et savoir qu'elle est à l'écran) :
  // dans la scène, ou dans un de ses groupes ou scènes imbriquées
  async function moiDans(nomScene, liste = null) {
    const items = liste || await elements(nomScene);
    const essayer = async (sc, lst) => {
      const nav = lst.filter((x) => x.inputKind === "browser_source" && x.sceneItemEnabled);
      if (!nav.length) return null;
      const r = await lot(nav.map((x) => ["GetInputSettings", { inputName: x.sourceName }])).catch(() => []);
      for (let i = 0; i < nav.length; i++) if (ADRESSE_PAGE.test(String(r[i]?.responseData?.inputSettings?.url || ""))) return { ...nav[i], scene: sc };
      return null;
    };
    const ici = await essayer(nomScene, items);
    if (ici) return ici;
    for (const x of items.filter((y) => estScene(y) && y.sceneItemEnabled)) {
      const trouve = await essayer(x.sourceName, await dedans(x));
      if (trouve) return { ...trouve, parent: x };
    }
    return null;
  }

  // ---------- la cam de la scène en direct ----------
  // celle choisie dans l'aide pour cette scène (ou pour toutes), sinon la première cam visible ; dans la scène, ou dans un
  // groupe ou une scène imbriquée (deux niveaux au plus). Renvoie de quoi la bouger : si elle est dans un petit groupe ou une
  // petite scène (la cam et son cadre), c'est ce groupe qu'on bouge ; dans une grande (tout un habillage), la cam seule.
  async function chercher(nomScene, items, voulu, profondeur) {
    const visibles = items.filter((x) => x.sceneItemEnabled);
    let cam = voulu ? visibles.find((x) => x.sourceName === voulu) : null;
    if (!cam && !voulu) cam = visibles.find((x) => CAMS.has(x.inputKind));
    if (cam) {
      // une scène ou un groupe choisis comme « cam » : on cherche la vraie cam dedans pour savoir où elle est
      if (estScene(cam) && profondeur < 2) {
        const sous = await chercher(cam.sourceName, await dedans(cam), "", profondeur + 1);
        if (sous) return [{ scene: nomScene, item: cam, choisi: true }, ...sous];
      }
      return [{ scene: nomScene, item: cam }];
    }
    if (profondeur >= 2) return null;
    for (const x of visibles) {
      if (!estScene(x)) continue;
      const sous = await chercher(x.sourceName, await dedans(x), voulu, profondeur + 1);
      if (sous) return [{ scene: nomScene, item: x }, ...sous];
    }
    return null;
  }
  async function camera() {
    const nomScene = await scene();
    const items = await elements(nomScene);
    const r = reglages() || {};
    const voulu = String((r.cams && typeof r.cams === "object" && r.cams[nomScene]) || r.cam || "");
    let chemin = await chercher(nomScene, items, voulu, 0);
    if (!chemin && voulu) chemin = await chercher(nomScene, items, "", 0); // la cam choisie n'est pas dans cette scène
    if (!chemin) return null;
    const res = await lot(chemin.map((n) => ["GetSceneItemTransform", { sceneName: n.scene, sceneItemId: n.item.sceneItemId }]));
    const ts = chemin.map((n, i) => res[i]?.responseData?.sceneItemTransform);
    if (ts.some((t) => !t)) return null;
    const ms = ts.map((t) => affine(t));
    let total = IDENTITE;
    for (const m of ms) total = composer(total, m);
    const g = ms[ms.length - 1].g;
    const ecran = vue(total, g);
    if (!(ecran.l > 1 && ecran.h > 1)) return null;
    const base = await canevas();
    // ce qu'on bouge : la cam, ou le groupe (ou la scène imbriquée) du dessus quand il n'est pas beaucoup plus grand qu'elle
    let k = chemin.length - 1;
    if (chemin.length > 1) {
      const haut = vue(ms[0], ms[0].g);
      if (chemin[0].choisi || haut.l * haut.h <= 2.5 * ecran.l * ecran.h) k = 0;
    }
    let audessus = IDENTITE;
    for (let i = 0; i < k; i++) audessus = composer(audessus, ms[i]);
    const versScene = k ? inverse(audessus) : null;
    const pivot = k ? appliquer(versScene, ecran.cx, ecran.cy) : { x: ecran.cx, y: ecran.cy };
    const sens = k && audessus.a * audessus.d - audessus.b * audessus.c < 0 ? -1 : 1;
    const camItem = chemin[chemin.length - 1].item;
    const versEcran = (u, v) => appliquer(total, u * g.sw, v * g.sh); // un point de l'image de la cam (0 à 1) → l'écran
    const inv = inverse(total);
    return {
      scene: nomScene,
      source: camItem.sourceName,
      cible: { scene: chemin[k].scene, id: chemin[k].item.sceneItemId },
      dansScene: k > 0,
      boite: ecran,
      base,
      versEcran,
      depuisEcran: (x, y) => { const q = appliquer(inv, x, y); return { u: q.x / (g.sw || 1), v: q.y / (g.sh || 1) }; },
      place: (t0, o) => placeAutour(t0, o, pivot, versScene, sens),
      items,
    };
  }
  // pour la liste « ta cam » de l'aide : les sources d'image de la scène en direct (et de ses groupes)
  async function sourcesVideo() {
    const nomScene = await scene();
    const items = await elements(nomScene);
    const liste = [];
    const voir = (x) => { if (x.inputKind && x.inputKind !== "browser_source" && !/^BARHAW /.test(x.sourceName) && !liste.some((y) => y.nom === x.sourceName)) liste.push({ nom: x.sourceName, cam: CAMS.has(x.inputKind) }); };
    for (const x of items) {
      if (estScene(x)) { liste.push({ nom: x.sourceName, cam: false, scene: true }); for (const y of await dedans(x)) voir(y); }
      else voir(x);
    }
    return { scene: nomScene, liste };
  }

  // ---------- garder les places de départ (et les remettre, même après un rechargement de la page) ----------
  function noterRemise(places) {
    try { localStorage.setItem(CLE_REMISE, JSON.stringify({ places: places.map((p) => ({ scene: p.scene, id: p.id, t: p.t })) })); } catch { /* pas de stockage */ }
  }
  async function remettre(places = null) {
    let liste = places;
    if (!liste) {
      try { const a = JSON.parse(localStorage.getItem(CLE_REMISE) || "null"); liste = Array.isArray(a?.places) ? a.places : null; } catch { liste = null; }
    }
    if (liste?.length && pret()) {
      await lot(liste.map((p) => ["SetSceneItemTransform", { sceneName: p.scene, sceneItemId: p.id, sceneItemTransform: placePropre(p.t) }])).catch(() => {});
    }
    try { localStorage.removeItem(CLE_REMISE); } catch { /* rien */ }
    // un effet coupé en plein milieu : la teinte et l'hélium s'éteignent, le replay se cache
    if (!places && pret()) {
      await eteindreHelium().catch(() => {});
      await enleverTeintes().catch(() => {});
      await cacher(NOMS.replay).catch(() => {});
    }
  }
  // un effet qui bouge des sources : items = [{ scene, id }] ; leurs places de départ sont notées, `etape(ms, places)` est
  // appelée ~30 fois par seconde et renvoie [[place, nouvelle transformation]] ; tout est remis à la fin
  async function animer({ items, duree, etape, fin = null }) {
    const res = await lot(items.map((x) => ["GetSceneItemTransform", { sceneName: x.scene, sceneItemId: x.id }]));
    const places = [];
    items.forEach((x, i) => { const t = res[i]?.responseData?.sceneItemTransform; if (t) places.push({ ...x, t }); });
    if (!places.length) return;
    noterRemise(places);
    const debut = performance.now();
    let enVol = false;
    await new Promise((ok) => {
      const tic = () => {
        const ms = performance.now() - debut;
        if (ms >= duree || !pret()) { clearInterval(boucle); ok(); return; }
        if (enVol) return;
        let poses = [];
        try { poses = etape(ms, places) || []; } catch (e) { journal.warn?.(`[régie] ${e.message}`); poses = []; }
        if (!poses.length) return;
        enVol = true;
        lot(poses.map(([p, tr]) => ["SetSceneItemTransform", { sceneName: p.scene, sceneItemId: p.id, sceneItemTransform: tr }])).catch(() => {}).finally(() => { enVol = false; });
      };
      const boucle = setInterval(tic, 33);
      tic();
    });
    if (fin) { try { await fin(places); } catch { /* rien */ } }
    await remettre(places);
  }

  // ---------- les sources de la régie (créées la première fois, dans la scène en cours) ----------
  async function source(nom, kind, reglagesSource, { activee = true } = {}) {
    const nomScene = await scene();
    const items = await elements(nomScene);
    let item = items.find((x) => x.sourceName === nom);
    let existe = Boolean(item);
    if (!existe) existe = (await requete("GetInputSettings", { inputName: nom }).then(() => true).catch(() => false));
    if (!existe) {
      const d = await requete("CreateInput", { sceneName: nomScene, inputName: nom, inputKind: kind, inputSettings: reglagesSource, sceneItemEnabled: activee });
      return { scene: nomScene, id: d.sceneItemId, cree: true, items };
    }
    await requete("SetInputSettings", { inputName: nom, inputSettings: reglagesSource });
    if (!item) {
      const d = await requete("CreateSceneItem", { sceneName: nomScene, sourceName: nom, sceneItemEnabled: activee });
      return { scene: nomScene, id: d.sceneItemId, cree: false, items };
    }
    if (item.sceneItemEnabled !== activee) await requete("SetSceneItemEnabled", { sceneName: nomScene, sceneItemId: item.sceneItemId, sceneItemEnabled: activee });
    return { scene: nomScene, id: item.sceneItemId, cree: false, items };
  }
  async function cacher(nom) {
    const nomScene = await scene();
    const item = (await elements(nomScene)).find((x) => x.sourceName === nom);
    if (item?.sceneItemEnabled) await requete("SetSceneItemEnabled", { sceneName: nomScene, sceneItemId: item.sceneItemId, sceneItemEnabled: false });
  }
  const chemin = (dossier, fichier) => `${String(dossier || "").replace(/[\\/]+$/, "").replace(/\\/g, "/")}/${fichier}`;

  // ---------- le replay : les dernières secondes, au ralenti, juste sous la page des effets ----------
  async function replay({ secondes = 20, vitesse = 65, surDebut = () => {} } = {}) {
    const statut = await requete("GetReplayBufferStatus").catch((e) => { throw Object.assign(new Error("tampon"), { code: "tampon", cause: e }); });
    if (!statut.outputActive) {
      await requete("StartReplayBuffer").catch(() => { throw Object.assign(new Error("tampon"), { code: "tampon" }); });
      throw Object.assign(new Error("le tampon de relecture démarre : le prochain !replay marchera"), { code: "demarre" });
    }
    const sauve = attendreEvenement("ReplayBufferSaved", () => true, 10_000);
    await requete("SaveReplayBuffer");
    let fichier = "";
    try { fichier = String((await sauve).savedReplayPath || ""); } catch { /* ancienne version : on demande */ }
    if (!fichier) fichier = String((await requete("GetLastReplayBufferReplay").catch(() => ({}))).savedReplayPath || "");
    if (!fichier) throw Object.assign(new Error("tampon"), { code: "tampon" });
    const base = await canevas();
    const s = await source(NOMS.replay, "ffmpeg_source", { local_file: fichier, is_local_file: true, speed_percent: vitesse, restart_on_activate: true, close_when_inactive: true, clear_on_media_end: true, looping: false, hw_decode: false }, { activee: false });
    await requete("SetInputMute", { inputName: NOMS.replay, inputMuted: true }).catch(() => {});
    await requete("SetSceneItemTransform", { sceneName: s.scene, sceneItemId: s.id, sceneItemTransform: { positionX: 0, positionY: 0, alignment: 5, rotation: 0, boundsType: "OBS_BOUNDS_SCALE_INNER", boundsAlignment: 0, boundsWidth: base.l, boundsHeight: base.h } }).catch(() => {});
    // juste sous la page des effets (le cadre « REPLAY » reste par-dessus)
    const items = await elements(s.scene);
    const moi = await moiDans(s.scene, items).catch(() => null);
    const lui = items.find((x) => x.sceneItemId === s.id);
    if (moi && moi.scene === s.scene && lui) {
      const voulu = lui.sceneItemIndex < moi.sceneItemIndex ? moi.sceneItemIndex - 1 : moi.sceneItemIndex;
      await requete("SetSceneItemIndex", { sceneName: s.scene, sceneItemId: s.id, sceneItemIndex: Math.max(0, voulu) }).catch(() => {});
    }
    const fini = attendreEvenement("MediaInputPlaybackEnded", (d) => d.inputName === NOMS.replay, (secondes / (vitesse / 100) + 25) * 1000);
    await requete("SetSceneItemEnabled", { sceneName: s.scene, sceneItemId: s.id, sceneItemEnabled: true });
    await requete("TriggerMediaInputAction", { inputName: NOMS.replay, mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" }).catch(() => {});
    // seulement les dernières `secondes`
    await new Promise((ok) => setTimeout(ok, 300));
    const st = await requete("GetMediaInputStatus", { inputName: NOMS.replay }).catch(() => ({}));
    const duree = Number(st.mediaDuration) || 0;
    if (duree > secondes * 1000 + 500) await requete("SetMediaInputCursor", { inputName: NOMS.replay, mediaCursor: duree - secondes * 1000 }).catch(() => {});
    surDebut(Math.min(duree || secondes * 1000, secondes * 1000) / (vitesse / 100));
    await fini.catch(() => {});
    await requete("SetSceneItemEnabled", { sceneName: s.scene, sceneItemId: s.id, sceneItemEnabled: false }).catch(() => {});
  }

  // ---------- un son rangé sur le PC (les sons flippants d'Artlist) ----------
  async function jouerFichier(dossier, fichier) {
    const s = await source(NOMS.sons, "ffmpeg_source", { local_file: chemin(dossier, fichier), is_local_file: true, restart_on_activate: false, close_when_inactive: false, clear_on_media_end: true, looping: false });
    await requete("SetInputAudioMonitorType", { inputName: NOMS.sons, monitorType: "OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT" }).catch(() => {});
    await requete("TriggerMediaInputAction", { inputName: NOMS.sons, mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" }).catch(() => {});
    await new Promise((ok) => setTimeout(ok, 600));
    const st = await requete("GetMediaInputStatus", { inputName: NOMS.sons }).catch(() => ({}));
    if (!(Number(st.mediaDuration) > 0) || st.mediaState === "OBS_MEDIA_STATE_ERROR") throw Object.assign(new Error("son introuvable"), { code: "sons" });
    return { scene: s.scene, duree: Number(st.mediaDuration) };
  }

  // ---------- une photo rangée sur le PC (le dossier) : lue par OBS, renvoyée en image à la page ----------
  async function photo(dossier, fichier) {
    await source(NOMS.dossier, "image_source", { file: chemin(dossier, fichier), unload: false }, { activee: false });
    await new Promise((ok) => setTimeout(ok, 150));
    const d = await requete("GetSourceScreenshot", { sourceName: NOMS.dossier, imageFormat: "jpg", imageWidth: 1280, imageCompressionQuality: 88 }).catch(() => null);
    const img = String(d?.imageData || "");
    return /^data:image\/(jpe?g|png);base64,/.test(img) && img.length > 1500 ? img : "";
  }
  // une image fixe de la cam (le gel, la météorite…) : pour les prochains effets
  async function instantane(nomSource, largeur = 1280) {
    const d = await requete("GetSourceScreenshot", { sourceName: nomSource, imageFormat: "jpg", imageWidth: largeur, imageCompressionQuality: 85 }).catch(() => null);
    return String(d?.imageData || "");
  }

  // ---------- les filtres : la teinte de la cam (l'écran de veille), la voix d'hélium ----------
  async function teinte(sourceCam, reglagesTeinte) {
    const f = await requete("GetSourceFilter", { sourceName: sourceCam, filterName: NOMS.teinte }).catch(() => null);
    if (!f) await requete("CreateSourceFilter", { sourceName: sourceCam, filterName: NOMS.teinte, filterKind: "color_filter_v2", filterSettings: reglagesTeinte });
    else await requete("SetSourceFilterSettings", { sourceName: sourceCam, filterName: NOMS.teinte, filterSettings: reglagesTeinte, overlay: true });
  }
  async function enleverTeintes() {
    const { inputs = [] } = await requete("GetInputList");
    const res = await lot(inputs.map((x) => ["GetSourceFilter", { sourceName: x.inputName, filterName: NOMS.teinte }]));
    const avec = inputs.filter((x, i) => res[i]?.requestStatus?.result);
    await lot(avec.map((x) => ["RemoveSourceFilter", { sourceName: x.inputName, filterName: NOMS.teinte }])).catch(() => {});
  }
  async function sourcesHelium() {
    const { inputs = [] } = await requete("GetInputList");
    const res = await lot(inputs.map((x) => ["GetSourceFilter", { sourceName: x.inputName, filterName: NOMS.helium }]));
    return inputs.filter((x, i) => res[i]?.requestStatus?.result).map((x) => x.inputName);
  }
  async function helium(allume) {
    const sources = await sourcesHelium();
    if (!sources.length) throw Object.assign(new Error("pas de filtre hélium"), { code: "helium" });
    await lot(sources.map((s) => ["SetSourceFilterEnabled", { sourceName: s, filterName: NOMS.helium, filterEnabled: Boolean(allume) }]));
    return sources.length;
  }
  async function eteindreHelium() { const s = await sourcesHelium(); if (s.length) await lot(s.map((x) => ["SetSourceFilterEnabled", { sourceName: x, filterName: NOMS.helium, filterEnabled: false }])); }

  return {
    connecter, couper: () => { clearTimeout(minuteur); couper(); changer("eteinte"); },
    etat: () => etat, pret, version: () => version,
    requete, lot, sur, attendreEvenement,
    scene, elements, dedans, canevas, moiDans, camera, sourcesVideo,
    animer, remettre, source, cacher,
    replay, jouerFichier, photo, instantane, teinte, enleverTeintes, sourcesHelium, helium,
    NOMS,
  };
}
