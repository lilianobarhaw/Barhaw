// LA RÉGIE de la page des effets (js/obs-effets.js) : elle pilote OBS par sa télécommande intégrée, le serveur WebSocket
// d'OBS (OBS 28 et plus), sur le PC du streamer : ws://127.0.0.1:4455. Le mot de passe est tapé une fois dans l'aide de la page
// (clic droit sur la source → Interagir) et gardé dans le navigateur d'OBS : il ne part nulle part ailleurs.
// Ce qu'elle fait :
//   • « !replay » : le tampon de relecture d'OBS enregistre les dernières secondes, une source cachée (« BARHAW Replay »,
//     glissée juste sous la page) les repasse au ralenti, puis se cache ;
//   • le BONK : elle trouve la cam de la scène en direct (posée telle quelle, dans un groupe ou dans une scène imbriquée,
//     recadrée, en miroir, avec ou sans cadre : la géométrie d'OBS refaite à l'identique) pour que la cible (le haut de la
//     tête) suive la cam d'une scène à l'autre. Elle ne bouge rien.
// Le protocole : obs-websocket 5 (Hello → Identify avec le mot de passe haché → Identified ; requêtes, lots, événements).

const NOMS = { replay: "BARHAW Replay" };
// les sources de cam (Windows, Mac, Linux)
const CAMS = new Set(["dshow_input", "av_capture_input", "av_capture_input_v2", "macos-avcapture", "macos-avcapture-fast", "v4l2_input"]);
const EVENEMENTS = 1 | 64 | 256; // General, Outputs (le replay enregistré), MediaInputs (un média fini)
// la page des effets dans la liste des sources d'OBS (son adresse)
const ADRESSE_PAGE = /\/obs(\.html)?\?(.*&)?(effets|bonk|essai=(effets|bonk|replay))\b/;

async function hache(texte) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  let b = "";
  for (const x of new Uint8Array(d)) b += String.fromCharCode(x);
  return btoa(b);
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
        cacher(NOMS.replay).catch(() => {}); // (un replay coupé en plein milieu : sa source se cache)
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
  // la source de cette page (pour glisser le replay juste en dessous) : dans la scène, ou dans un de ses groupes
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

  // ---------- la cam de la scène en direct (pour la cible du BONK) ----------
  // celle choisie dans l'aide pour cette scène (ou pour toutes), sinon la première cam visible ; dans la scène, ou dans un
  // groupe ou une scène imbriquée (deux niveaux au plus)
  async function chercher(nomScene, items, voulu, profondeur) {
    const visibles = items.filter((x) => x.sceneItemEnabled);
    let cam = voulu ? visibles.find((x) => x.sourceName === voulu) : null;
    if (!cam && !voulu) cam = visibles.find((x) => CAMS.has(x.inputKind));
    if (cam) {
      if (estScene(cam) && profondeur < 2) { // une scène ou un groupe choisis comme « cam » : la vraie cam est dedans
        const sous = await chercher(cam.sourceName, await dedans(cam), "", profondeur + 1);
        if (sous) return [{ scene: nomScene, item: cam }, ...sous];
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
    let total = IDENTITE;
    for (const t of ts) total = composer(total, affine(t));
    const g = affine(ts[ts.length - 1]).g;
    const ecran = vue(total, g);
    if (!(ecran.l > 1 && ecran.h > 1)) return null;
    const inv = inverse(total);
    return {
      scene: nomScene,
      source: chemin[chemin.length - 1].item.sourceName,
      boite: ecran,
      base: await canevas(),
      versEcran: (u, v) => appliquer(total, u * g.sw, v * g.sh), // un point de l'image de la cam (0 à 1) → l'écran
      depuisEcran: (x, y) => { const q = appliquer(inv, x, y); return { u: q.x / (g.sw || 1), v: q.y / (g.sh || 1) }; },
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

  // ---------- la source du replay (créée la première fois, dans la scène en cours) ----------
  async function source(nom, kind, reglagesSource, { activee = true } = {}) {
    const nomScene = await scene();
    const items = await elements(nomScene);
    const item = items.find((x) => x.sourceName === nom);
    const existe = Boolean(item) || (await requete("GetInputSettings", { inputName: nom }).then(() => true).catch(() => false));
    if (!existe) {
      const d = await requete("CreateInput", { sceneName: nomScene, inputName: nom, inputKind: kind, inputSettings: reglagesSource, sceneItemEnabled: activee });
      return { scene: nomScene, id: d.sceneItemId };
    }
    await requete("SetInputSettings", { inputName: nom, inputSettings: reglagesSource });
    if (!item) {
      const d = await requete("CreateSceneItem", { sceneName: nomScene, sourceName: nom, sceneItemEnabled: activee });
      return { scene: nomScene, id: d.sceneItemId };
    }
    if (item.sceneItemEnabled !== activee) await requete("SetSceneItemEnabled", { sceneName: nomScene, sceneItemId: item.sceneItemId, sceneItemEnabled: activee });
    return { scene: nomScene, id: item.sceneItemId };
  }
  async function cacher(nom) {
    const nomScene = await scene();
    const item = (await elements(nomScene)).find((x) => x.sourceName === nom);
    if (item?.sceneItemEnabled) await requete("SetSceneItemEnabled", { sceneName: nomScene, sceneItemId: item.sceneItemId, sceneItemEnabled: false });
  }

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

  return {
    connecter, couper: () => { clearTimeout(minuteur); couper(); changer("eteinte"); },
    etat: () => etat, pret, version: () => version,
    requete, lot, sur, attendreEvenement,
    scene, elements, dedans, canevas, moiDans, camera, sourcesVideo, cacher,
    replay,
    NOMS,
  };
}
