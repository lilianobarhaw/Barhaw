// LA PAGE DES EFFETS (VF 1.0) : /obs?effets, UNE SEULE source navigateur pour le BONK (une récompense de points de chaîne) et
// « !replay » (une commande du streamer et de ses modos). obs.js la charge et s'arrête là ; l'ancienne adresse ?bonk mène ici.
//   • le BONK (js/obs-bonk.js) : un marteau gonflable tombe sur la tête du streamer ;
//   • « !replay » (js/obs-replay.js) : avec la régie (la télécommande d'OBS, js/obs-regie.js), les dernières secondes
//     repassent au ralenti sous un cadre « REPLAY ».
// Le bot (lib/recompenses.js) envoie chaque effet à UNE seule page : celle qui est à l'écran. Dans OBS, la même source va
// dans toutes les scènes (Ajouter → Navigateur → « Ajouter une source existante ») ; avec la régie, le BONK vise la tête dans
// la cam de la scène en direct (la grande cam de la scène principale, la petite cam de la scène jeu). Un BONK à la fois.
// Hors du live (navigateur, ou « Interagir » dans OBS) : bouger la souris montre l'aide (l'état, la régie, ta cam, un bouton
// pour essayer) ; un clic hors de l'aide vise le haut de ta tête pour le BONK.
// Rien n'est gardé au nom des viewers : seulement le pseudo de celui qui a pris le BONK, le temps de l'afficher.
// Réglages dans l'adresse : ?son=non · ?pseudo=non · ?taille=<%> (le marteau : 100 sans rien) · ?x= ?y= (la cible du BONK,
// imposée) · ?essai=effets (le BONK et le replay à tour de rôle, sans le bot) ou ?essai=bonk, ?essai=replay.
import { creerBonk } from "./obs-bonk.js";
import { creerRegie } from "./obs-regie.js";
import { creerReplay } from "./obs-replay.js";

const CAPTURE = Boolean(window.__capture);
const CLE_CIBLE = "barhaw-obs-bonk-cible";
const CLE_REGLAGES = "barhaw-obs-regie";
const DEFAUT = { x: 65, y: 42.5 };
const NOMS = { bonk: "BONK", replay: "Replay" };
const ACTIONS = Object.keys(NOMS);
const AVEC_REGIE = new Set(["replay"]);
const RAISONS = {
  obs: "la régie n'est pas reliée à OBS",
  tampon: "le tampon de relecture n'est pas activé dans OBS",
  demarre: "le tampon de relecture vient de démarrer : réessaie dans 20 secondes",
  plein: "trop d'effets attendent déjà leur tour",
  page: "la page des effets n'a pas pu le jouer",
};

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };
const pourcent = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return String(v ?? "").trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 10) / 10 : null; };
const borne = (x, a, b) => Math.max(a, Math.min(b, x));
const virgule = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

export function demarrer({ P }) {
  const brut = (P.get("essai") || "").toLowerCase();
  const ESSAI = brut === "effets" ? "tout" : ACTIONS.includes(brut) ? brut : "";
  const SON = P.get("son") !== "non";
  const PSEUDO = P.get("pseudo") !== "non";
  const t = Number(P.get("taille"));
  const TAILLE = /^\d{2,3}$/.test(P.get("taille") || "") ? Math.min(250, Math.max(40, t)) / 100 : 1;
  const DANS_OBS = Boolean(window.obsstudio);
  let aide = null; // l'aide (hors du live), sa cible rose, et ses lignes qui changent
  let mire = null;
  let aideMinuteur = null;
  const L = {};

  // ---------- les réglages de la régie (gardés dans le navigateur d'OBS : ils ne partent nulle part) ----------
  let R = { mdp: "", port: "4455", cams: {} };
  try { const m = JSON.parse(localStorage.getItem(CLE_REGLAGES) || "null"); if (m && typeof m === "object") R = { ...R, ...m, cams: m.cams && typeof m.cams === "object" ? m.cams : {} }; } catch { /* pas de stockage */ }
  const garder = () => { try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(R)); } catch { /* pas de stockage */ } };

  // ---------- les sons (son/bonk/, son/effets/replay) : chargés d'avance, un nouveau lecteur à chaque fois ----------
  const EXT = new Audio().canPlayType('audio/ogg; codecs="opus"') ? "ogg" : "mp3";
  const modeles = new Map();
  let bloque = false; // un navigateur qui attend un clic avant de laisser passer le son (pas OBS)
  function modele(nom) {
    let a = modeles.get(nom);
    if (!a) { a = new Audio(`/son/${nom}.${EXT}`); a.preload = "auto"; modeles.set(nom, a); }
    return a;
  }
  if (SON && !CAPTURE) { for (const s of ["bonk/bonk-1", "bonk/bonk-2", "bonk/bonk-3", "effets/replay"]) modele(s); }
  function sonner(nom, { vitesse = 1, volume = 1, boucle = false } = {}) {
    if (!/^[a-z]+\/[a-z0-9-]+$/.test(nom)) return null;
    if (CAPTURE) { // (les vidéos d'aperçu : la liste des sons, mixés ensuite)
      const n = (window.__sons ||= []).push({ nom, t: performance.now(), vitesse, volume, boucle }) - 1;
      return { arreter() { window.__sons[n].fin = performance.now(); } };
    }
    if (!SON) return null;
    const a = modele(nom).cloneNode(true);
    a.volume = borne(volume, 0, 1);
    a.loop = boucle;
    try { a.preservesPitch = false; a.playbackRate = borne(vitesse, 0.5, 2); } catch { /* ancien navigateur */ }
    const p = a.play();
    if (p && typeof p.catch === "function") p.then(() => { if (bloque) { bloque = false; majAide(); } }).catch(() => { bloque = true; majAide(); });
    return { arreter() { try { a.pause(); } catch { /* rien */ } } };
  }

  // ---------- la régie, le replay, le BONK ----------
  const soucisVus = new Map();
  const regie = creerRegie({
    reglages: () => R,
    surEtat: (e) => {
      majAide();
      dire({ k: "regie", ok: e === "reliee" });
      if (e === "reliee") { preparer().catch(() => {}); }
      if (e === "refusee") signaler("obs");
    },
  });
  const replay = creerReplay({ regie, sonner });
  const bonk = creerBonk({ cible: () => cible, taille: TAILLE, pseudo: PSEUDO, sonner });
  let camVue = null; // { scene, nom, l, h }
  async function preparer() { await voirCam(); } // (en arrière-plan : la cam de la scène en direct)
  // la cam de la scène en direct, et sa boîte à l'écran en %
  async function laCam() {
    if (!regie.pret()) return null;
    const cam = await regie.camera().catch(() => null);
    if (!cam) return null;
    const { base, boite: b } = cam;
    return { cam, base, b, pct: { x: ((b.cx - b.l / 2) / base.l) * 100, y: ((b.cy - b.h / 2) / base.h) * 100, l: (b.l / base.l) * 100, h: (b.h / base.h) * 100 } };
  }
  async function voirCam() {
    const c = await laCam();
    camVue = c ? { scene: c.cam.scene, nom: c.cam.source, l: Math.round(c.b.l), h: Math.round(c.b.h) } : { scene: await regie.scene().catch(() => ""), nom: "" };
    majAide();
    return c;
  }

  // ---------- la cible du BONK : le haut de la tête ----------
  // Avec la régie, elle est gardée dans l'image de la cam : elle suit la cam dans toutes les scènes (et rapetisse avec elle).
  const imposee = pourcent(P.get("x")) !== null && pourcent(P.get("y")) !== null;
  let cible = { ...DEFAUT };
  if (imposee) cible = { x: pourcent(P.get("x")), y: pourcent(P.get("y")) };
  else {
    try {
      const m = JSON.parse(localStorage.getItem(CLE_CIBLE) || "null");
      if (m && pourcent(m.x) !== null && pourcent(m.y) !== null) {
        cible = { x: pourcent(m.x), y: pourcent(m.y) };
        if (Number.isFinite(m.u) && Number.isFinite(m.v)) { cible.u = m.u; cible.v = m.v; }
      }
    } catch { /* la cible de départ */ }
  }
  const garderCible = () => { if (imposee) return; try { localStorage.setItem(CLE_CIBLE, JSON.stringify(cible)); } catch { /* pas de stockage */ } };
  async function viser(x, y, garde = true) {
    cible = { x: Math.round(borne(x, 2, 98) * 10) / 10, y: Math.round(borne(y, 2, 98) * 10) / 10 };
    if (regie.pret()) {
      const c = await laCam();
      if (c) {
        const q = c.cam.depuisEcran((cible.x / 100) * c.base.l, (cible.y / 100) * c.base.h);
        if (q.u > -0.25 && q.u < 1.25 && q.v > -0.4 && q.v < 1.25) { cible.u = Math.round(q.u * 10000) / 10000; cible.v = Math.round(q.v * 10000) / 10000; }
      }
    }
    if (garde) garderCible();
    placerMire();
    majAide();
  }
  async function cibleMaintenant() {
    if (!imposee && Number.isFinite(cible.u) && regie.pret()) {
      const c = await laCam();
      if (c) {
        const p = c.cam.versEcran(cible.u, cible.v);
        return { x: borne((p.x / c.base.l) * 100, 1, 99), y: borne((p.y / c.base.h) * 100, 1, 99), taille: TAILLE * borne(c.pct.h / 100, 0.42, 1) };
      }
    }
    return { x: cible.x, y: cible.y, taille: TAILLE };
  }

  // ---------- les files : un BONK à la fois, un replay à la fois ----------
  const files = { bonk: [], replay: [] };
  const occupe = { bonk: false, replay: false };
  const vus = new Set(); // les numéros déjà reçus (le bot ne renvoie jamais deux fois le même, mais on ne rejoue rien)
  let joues = 0;
  let dernierRate = "";
  function demander(effet) {
    if (!effet || !ACTIONS.includes(effet.action)) return;
    if (effet.n) { if (vus.has(effet.n)) return; vus.add(effet.n); if (vus.size > 500) vus.clear(); }
    const f = effet.action;
    if (files[f].length >= 20) { rate(effet, "plein"); return; }
    files[f].push(effet);
    suivant(f);
  }
  async function suivant(f) {
    if (occupe[f] || !files[f].length) return;
    occupe[f] = true;
    const e = files[f].shift();
    majAide();
    try { await jouer(e); joues += 1; }
    catch (err) { rate(e, err?.code && RAISONS[err.code] ? err.code : "page"); if (!err?.code) console.warn("[effets]", err); }
    finally { occupe[f] = false; majAide(); setTimeout(() => suivant(f), 250); }
  }
  async function jouer(e) {
    const par = typeof e.par === "string" ? e.par : "";
    if (e.action === "bonk") return bonk.jouer(par, await cibleMaintenant());
    return replay.jouer(borne(Number(e.secondes) || 20, 5, 30));
  }
  // un effet qui n'a pas pu passer : le bot le dit dans le chat (à celui qui l'a pris), l'aide le montre
  function rate(e, code) {
    dernierRate = `${NOMS[e.action] || e.action} : ${RAISONS[code] || RAISONS.page}`;
    if (e.n && !e.essai) dire({ k: "rate", n: e.n, code });
    majAide();
  }
  function signaler(code) { // (un souci de réglage, une fois toutes les 10 minutes au plus : le bot le dit au streamer)
    if (Date.now() - (soucisVus.get(code) || 0) < 10 * 60_000) return;
    soucisVus.set(code, Date.now());
    dire({ k: "souci", code });
  }

  // ---------- à l'écran ou pas : le bot n'envoie les effets qu'à une page qu'on voit ----------
  let visible = document.visibilityState !== "hidden";
  let actif = true;
  const vue = () => visible && actif;
  let vueDite = null;
  function changerVue() {
    if (vueDite === vue()) return;
    vueDite = vue();
    dire({ k: "vue", vue: vue() });
    majAide();
  }
  document.addEventListener("visibilitychange", () => { visible = document.visibilityState !== "hidden"; changerVue(); });
  window.addEventListener("obsSourceVisibleChanged", (e) => { visible = e?.detail?.visible !== false; changerVue(); });
  window.addEventListener("obsSourceActiveChanged", (e) => { actif = e?.detail?.active !== false; changerVue(); });
  window.addEventListener("obsSceneChanged", () => { if (regie.pret()) setTimeout(() => voirCam().catch(() => {}), 400); });

  // ---------- la connexion au serveur en direct du bot (l'adresse vient du site) ----------
  let ws = null;
  let adresse = "";
  let lu = false;
  let branche = false;
  let droit = true;
  let titres = {};
  let essais = 0;
  let vu = 0;
  let minuteur = null;
  function dire(m) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(m)); } catch { /* elle se ferme */ } } }
  function debrancher() {
    const s = ws;
    ws = null;
    branche = false;
    if (s) { s.onopen = s.onmessage = s.onclose = s.onerror = null; try { s.close(); } catch { /* déjà fermée */ } }
  }
  function plusTard(ms) { clearTimeout(minuteur); minuteur = setTimeout(brancher, ms); }
  async function brancher() {
    clearTimeout(minuteur);
    if (ws) return;
    const d = await lire("/api/public");
    if (ws) return;
    if (d && !d.horsLigne) {
      lu = true;
      const x = d.effets?.adresse || d.bonk?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/(effets|bonk)$/i.test(x) ? x : "";
    }
    majAide();
    if (!adresse) { plusTard(20_000); return; }
    let s = null;
    try { s = new WebSocket(adresse); } catch { s = null; }
    if (!s) { plusTard(20_000); return; }
    ws = s;
    s.onopen = () => { vu = Date.now(); vueDite = vue(); s.send(JSON.stringify({ k: "bonjour", role: "obs", regie: regie.pret(), vue: vue(), obs: DANS_OBS })); };
    s.onmessage = (ev) => {
      vu = Date.now();
      let m = null;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (!m || typeof m !== "object") return;
      if (m.k === "etat") {
        branche = true;
        essais = 0;
        droit = m.droit !== false;
        titres = m.recompenses && typeof m.recompenses === "object" ? m.recompenses : (m.recompense ? { bonk: String(m.recompense) } : {});
        majAide();
      } else if (m.k === "effet") demander({ n: Number(m.n) || 0, action: String(m.action || ""), par: typeof m.par === "string" ? m.par : "", secondes: m.secondes });
      else if (m.k === "bonk") demander({ action: "bonk", par: typeof m.par === "string" ? m.par : "" }); // (le bot d'avant)
    };
    s.onclose = () => {
      if (ws !== s) return;
      debrancher();
      essais += 1;
      majAide();
      plusTard(Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }
  setInterval(() => {
    if (!ws || ws.readyState !== 1) return;
    if (Date.now() - vu > 50_000) { debrancher(); majAide(); plusTard(1_000); return; }
    try { ws.send(JSON.stringify({ k: "p", c: Date.now() })); } catch { /* elle se ferme */ }
  }, 15_000);

  // ---------- hors du live : l'aide ----------
  function ligne(cle, classe = "") { L[cle] = el("p", classe, ""); return L[cle]; }
  const ecrire = (n, texte) => { if (n && n.textContent !== texte) n.textContent = texte; };
  function etatBot() {
    if (ESSAI) return "Essai : les effets passent à tour de rôle, sans le bot.";
    if (!lu) return "Connexion au site…";
    if (!adresse) return "⏳ Le bot ne propose pas encore la page des effets (sa mise à jour 1.28 n'est pas installée).";
    if (!branche) return "⏳ Connexion au bot…";
    if (!droit) return "⛔ Le bot ne voit pas encore tes récompenses : refais /objectif connecter sur le Discord de Barhaw.";
    return `✅ Branchée au bot : ${titres.bonk ? `la récompense du BONK est « ${titres.bonk} »` : "pas encore de récompense du BONK trouvée (sur Twitch : « bonk » dans son titre)"}.`;
  }
  function etatRegie() {
    const e = regie.etat();
    if (e === "reliee") return `✅ Régie reliée à OBS${regie.version() ? ` (obs-websocket ${regie.version()})` : ""}.`;
    if (e === "connexion") return "⏳ Connexion à OBS…";
    if (e === "refusee") return "⛔ OBS refuse le mot de passe : retape-le (Outils → Paramètres du serveur WebSocket → Afficher les informations de connexion).";
    if (e === "absente") return "⏳ OBS ne répond pas : dans OBS, Outils → Paramètres du serveur WebSocket → coche « Activer le serveur WebSocket ».";
    return "La régie n'est pas reliée : tape le mot de passe ci-dessus, puis « Relier à OBS » (sans mot de passe dans OBS : clique seulement « Relier à OBS »).";
  }
  function majAide() {
    if (!aide) return;
    ecrire(L.bot, etatBot() + (bloque ? " 🔇 Clique une fois sur la page pour autoriser le son." : ""));
    ecrire(L.vue, vue() ? "" : "⚠️ Cette page n'est pas dans la scène en direct : ajoute la même source dans toutes tes scènes (Ajouter → Navigateur → « Ajouter une source existante »).");
    L.vue.hidden = vue();
    ecrire(L.regie, etatRegie());
    const camTexte = !regie.pret() ? "" : !camVue ? "Je cherche ta cam…" : camVue.nom ? `🎥 Dans la scène « ${camVue.scene} », ta cam : « ${camVue.nom} » (${camVue.l} × ${camVue.h}).` : `⚠️ Je ne trouve pas de cam dans la scène « ${camVue.scene} » : choisis-la ci-dessous.`;
    ecrire(L.cam, camTexte);
    L.cam.hidden = !camTexte;
    const enCours = Object.values(occupe).filter(Boolean).length + Object.values(files).reduce((a, f) => a + f.length, 0);
    ecrire(L.file, dernierRate ? `⚠️ Dernier raté : ${dernierRate}.` : enCours ? `▶ ${enCours} effet${enCours > 1 ? "s" : ""} en cours ou en attente.` : "");
    L.file.hidden = !L.file.textContent;
    const ou = imposee ? "imposée par l'adresse (?x= et ?y=)" : Number.isFinite(cible.u) ? "dans ta cam : elle suit ta cam dans toutes tes scènes" : "sur l'écran (relie la régie puis revise, pour qu'elle suive ta cam dans la scène jeu)";
    ecrire(L.cible, `🎯 Cible du BONK : ${virgule(cible.x)} % depuis la gauche, ${virgule(cible.y)} % depuis le haut, ${ou}.`);
    if (L.relier) L.relier.textContent = regie.pret() ? "↻ Relier encore" : "Relier à OBS";
    if (L.mdp) L.mdp.placeholder = R.mdp ? "•••••••• (gardé)" : "le mot de passe";
  }
  async function placerMire() {
    if (!mire) return;
    const c = !imposee && Number.isFinite(cible.u) ? await cibleMaintenant() : cible;
    mire.style.left = `${c.x}%`;
    mire.style.top = `${c.y}%`;
  }
  function bouton(texte, f, classe = "") {
    const b = el("button", classe, texte);
    b.type = "button";
    b.addEventListener("click", (e) => { e.stopPropagation(); f(); });
    return b;
  }
  function champ(type, valeur, place, change) {
    const i = el("input", "");
    i.type = type;
    i.value = valeur;
    i.placeholder = place;
    i.autocomplete = "off";
    i.spellcheck = false;
    i.addEventListener("change", () => change(i.value));
    return i;
  }
  async function remplirCams(select) {
    select.textContent = "";
    select.append(el("option", "", "Automatique (la première cam de la scène)"));
    select.firstChild.value = "";
    if (!regie.pret()) return;
    const { scene, liste } = await regie.sourcesVideo().catch(() => ({ scene: "", liste: [] }));
    for (const s of liste) {
      const o = el("option", "", `${s.nom}${s.cam ? " (cam)" : s.scene ? " (scène ou groupe)" : ""}`);
      o.value = s.nom;
      select.append(o);
    }
    select.value = R.cams[scene] || "";
    select.dataset.scene = scene;
  }
  function essayer(action) {
    dernierRate = "";
    demander({ action, par: "Moussaillon", essai: true, ...(action === "replay" ? { secondes: 10 } : {}) });
  }
  function montrerAide() {
    if (CAPTURE) return;
    if (!aide) {
      const mdp = champ("password", "", "le mot de passe", (v) => { if (v) { R.mdp = v; garder(); mdp.value = ""; regie.connecter(); } });
      L.mdp = mdp;
      const port = champ("text", R.port || "4455", "4455", (v) => { R.port = /^\d{2,5}$/.test(v) ? v : "4455"; garder(); });
      port.className = "court";
      L.relier = bouton("Relier à OBS", () => { if (mdp.value) { R.mdp = mdp.value; mdp.value = ""; } R.sansMdp = !R.mdp; garder(); regie.connecter(); });
      const oublier = bouton("Oublier le mot de passe", () => { R.mdp = ""; R.sansMdp = false; garder(); regie.couper(); majAide(); }, "discret");
      const cams = el("select", "");
      remplirCams(cams);
      cams.addEventListener("focus", () => remplirCams(cams));
      cams.addEventListener("change", () => { const sc = cams.dataset.scene || ""; if (cams.value) R.cams[sc] = cams.value; else delete R.cams[sc]; garder(); voirCam(); });
      const essaisBoutons = el("div", "aide-sons", ...ACTIONS.map((a) => bouton(`▶ ${NOMS[a]}`, () => essayer(a), AVEC_REGIE.has(a) ? "regie" : "")));
      aide = el("div", "aide aide-effets",
        el("b", "", "La page des effets : le BONK et « !replay »"),
        el("p", "", "Dans OBS : une source « Navigateur » avec cette adresse, en 1920 × 1080, tout en haut de la liste des sources, « Contrôler l'audio via OBS » coché. Dans ta scène jeu (et les autres) : Ajouter → Navigateur → « Ajouter une source existante », la même."),
        ligne("bot", "aide-etat"),
        ligne("vue", "aide-alerte"),
        el("b", "aide-titre", "La régie (pour « !replay », et pour que le BONK suive ta cam)"),
        el("p", "", "Dans OBS : Outils → Paramètres du serveur WebSocket → coche « Activer le serveur WebSocket », puis « Afficher les informations de connexion » et tape ici le mot de passe. Il reste dans OBS (dans cette source) : il ne part nulle part."),
        el("div", "aide-ligne", mdp, port, L.relier, oublier),
        ligne("regie", "aide-etat"),
        ligne("cam"),
        el("label", "aide-champ", el("span", "", "Ta cam dans la scène en direct"), cams),
        el("p", "aide-petit", "Pour « !replay » : OBS → Paramètres → Sortie → coche « Activer le tampon de relecture ». La régie crée elle-même une source cachée, « BARHAW Replay » : laisse-la."),
        el("b", "aide-titre", "Le BONK"),
        el("p", "", "Viser ta tête : clique ici là où est le haut de ta tête (la cible rose), dans ta scène principale. Les flèches du clavier l'ajustent."),
        ligne("cible"),
        el("b", "aide-titre", "Essayer (rien n'est dit dans le chat ; en violet : il faut la régie)"),
        essaisBoutons,
        ligne("file", "aide-alerte"),
        el("div", "aide-sons", bouton("↺ Cible de départ", () => { try { localStorage.removeItem(CLE_CIBLE); } catch { /* rien */ } cible = { ...DEFAUT }; placerMire(); majAide(); }, "discret")));
      aide.addEventListener("input", () => montrerAide());
      mire = el("div", "bonk-mire", el("i"), el("span", "", "le haut de ta tête"));
      document.body.append(mire, aide);
      placerMire();
      majAide();
    }
    aide.hidden = false;
    mire.hidden = false;
    clearTimeout(aideMinuteur);
    aideMinuteur = setTimeout(() => { if (aide && !aide.contains(document.activeElement)) { aide.hidden = true; mire.hidden = true; } else montrerAide(); }, DANS_OBS ? 20_000 : 30_000);
  }
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, montrerAide, { passive: true });
  window.addEventListener("pointerdown", (e) => {
    if (CAPTURE) return;
    if (bloque) {
      bloque = false;
      const a = modele("bonk/bonk-1");
      try { a.muted = true; a.play().then(() => { a.pause(); a.muted = false; a.currentTime = 0; }).catch(() => { a.muted = false; }); } catch { /* tant pis */ }
    }
    if (aide && aide.contains(e.target)) return;
    viser((e.clientX / Math.max(1, window.innerWidth)) * 100, (e.clientY / Math.max(1, window.innerHeight)) * 100);
  }, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (e.target && e.target.closest && e.target.closest("input, select, textarea, button")) return;
    const pas = e.shiftKey ? 2 : 0.5;
    const dx = e.key === "ArrowLeft" ? -pas : e.key === "ArrowRight" ? pas : 0;
    const dy = e.key === "ArrowUp" ? -pas : e.key === "ArrowDown" ? pas : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    viser(cible.x + dx, cible.y + dy);
  });

  window.__obsEffets = {
    etat: () => ({ essai: ESSAI, adresse, lu, branche, droit, titres: { ...titres }, bloque, ext: EXT, joues, cible: { ...cible }, imposee, taille: TAILLE, vue: vue(), regie: regie.etat(), camVue, files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.length])), occupe: { ...occupe }, dernierRate }),
    jouer: (action, d = {}) => demander({ ...d, action }),
    viser: (x, y) => viser(x, y, false),
    cibleMaintenant,
    regie,
    reglages: (r) => { R = { ...R, ...r }; garder(); regie.connecter(); },
  };

  if (R.mdp || R.sansMdp) regie.connecter();
  if (ESSAI) {
    const tour = ESSAI === "tout" ? ACTIONS : [ESSAI];
    let i = 0;
    const suivantEssai = () => { const a = tour[i++ % tour.length]; essayer(a); setTimeout(suivantEssai, a === "bonk" ? 6_000 : 20_000); };
    setTimeout(suivantEssai, 600);
  } else if (!CAPTURE) brancher();
}
