// LES OBJECTIFS DU LIVE dans OBS (D.A. Néon) : la page /obs?objectifs, une source navigateur rien que pour eux (obs.js la
// charge et s'arrête là). L'objectif sub (« 10 / 20 », débloque « TOURNOI BARHAW ») et l'objectif follow, dans un petit
// panneau sombre. Le bot (lib/objectifs.js) compte et envoie tout en direct par son serveur (wss://…/objectifs, l'adresse
// est dans /api/public). Ils se règlent sur Discord (/objectif) ou dans le chat (!objectif, toi et tes modos).
// Les animations : un sub ou un follow fait sauter le chiffre et filer la barre (avec « +1 » et le pseudo) ; un objectif
// atteint lance la fête (la barre s'illumine, le cadenas s'ouvre, des éclats, « OBJECTIF ATTEINT ! » et la récompense), puis
// la ligne reste dorée. Au repos, un reflet passe de temps en temps sur les barres.
// Taille conseillée de la source : 600 × 440 (tout suit la taille). Réglages dans l'adresse : ?objectifs=sub ou
// ?objectifs=follow (un seul des deux) · ?essai=objectifs (une démo en boucle, sans le bot) · ?fond=oui (un fond sombre).
// La page ne garde rien.

const NBSP = " ";
// les vidéos d'aperçu : le temps est piloté de l'extérieur (window.__capture), les animations sont posées image par image
const CAPTURE = Boolean(window.__capture);
const SVGNS = "http://www.w3.org/2000/svg";

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const svg = (balise, attributs = {}, ...enfants) => {
  const n = document.createElementNS(SVGNS, balise);
  for (const [k, v] of Object.entries(attributs)) n.setAttribute(k, v);
  for (const e of enfants) n.append(e);
  return n;
};
const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };
const fmt = (n) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
const hasard = (a, b) => a + Math.random() * (b - a);
// une animation (Web Animations) ; pendant une capture, elle attend que le temps soit posé de l'extérieur
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}
const REBOND = "cubic-bezier(.2, 1.35, .4, 1)";
const DOUX = "cubic-bezier(.2, .8, .2, 1)";

// ?essai=objectifs : deux objectifs d'exemple qui avancent tout seuls (un sub, deux subs offerts qui atteignent l'objectif,
// puis des follows), en boucle
const DEMO = {
  periode: 26_000,
  depart: { sub: { but: 20, actuel: 17, texte: "TOURNOI BARHAW" }, follow: { but: 1250, actuel: 1246, texte: "BLIND TEST" } },
  etapes: [[3_800, "sub", 1, "Bigorneau_TV"], [8_000, "sub", 2, "Krakenito"], [16_200, "follow", 1, "zebulon"], [19_600, "follow", 1, "LaMouetteRieuse"], [21_800, "follow", 1, "moussaillon_42"]],
};

export function demarrer({ scene, P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "objectifs";
  const SEUL = ["sub", "follow"].includes(P.get("objectifs")) ? P.get("objectifs") : "";
  const QUOI = SEUL ? [SEUL] : ["sub", "follow"];
  const DANS_OBS = Boolean(window.obsstudio);

  const panneau = el("section", "ob");
  panneau.setAttribute("aria-label", "Objectifs du live");
  const zone = el("div", "ob-zone");
  zone.setAttribute("aria-hidden", "true");
  scene.append(panneau, zone);

  const lignes = { sub: null, follow: null };
  let visible = false;

  // ---------- une ligne : « OBJECTIF SUB · 10 / 20 », la barre, le cadenas et la récompense ----------
  function creerLigne(quoi) {
    const n = el("b", "ob-n", "0");
    const but = document.createTextNode("");
    const chiffres = el("span", "ob-chiffres", n, but);
    const ok = svg("svg", { viewBox: "0 0 24 24", class: "ob-ok", "aria-hidden": "true" },
      svg("circle", { cx: "12", cy: "12", r: "11", fill: "#ffcf5c" }),
      svg("path", { d: "M7 12.5l3.2 3.2L17 9", fill: "none", stroke: "#12050d", "stroke-width": "2.6", "stroke-linecap": "round", "stroke-linejoin": "round" }));
    const nombre = el("span", "ob-nombre", chiffres, ok);
    const haut = el("div", "ob-haut", el("span", "ob-titre", quoi === "sub" ? "OBJECTIF SUB" : "OBJECTIF FOLLOW"), nombre);
    const eclat = el("i", "ob-eclat");
    const flash = el("i", "ob-flash");
    const rempli = el("div", "ob-rempli", eclat, flash);
    const barre = el("div", "ob-barre", rempli);
    const anse = svg("path", { class: "ob-anse", d: "M8 11V8a4 4 0 0 1 8 0v3" });
    const cadenas = svg("svg", { viewBox: "0 0 24 24", class: "ob-cadenas", "aria-hidden": "true" }, svg("rect", { x: "5", y: "11", width: "14", height: "10", rx: "2.5" }), anse);
    const texte = el("span", "ob-texte", "");
    const reste = el("span", "ob-reste", "");
    const bas = el("div", "ob-bas", cadenas, texte, reste);
    const feteSur = el("span", "ob-fete-sur", "OBJECTIF ATTEINT !");
    const feteTexte = el("span", "ob-fete-texte", "");
    const feteEclat = el("i", "ob-eclat");
    const fete = el("div", "ob-fete", feteEclat, feteSur, feteTexte);
    const ligne = el("div", `ob-ligne ob-${quoi}`, haut, barre, bas, fete);
    return { quoi, ligne, haut, nombre, n, but, ok, rempli, eclat, flash, barre, cadenas, anse, texte, reste, bas, fete, feteSur, feteTexte, feteEclat, val: null, affiche: 0, pct: 0, jeton: 0, puce: null, boucle: null, battement: null };
  }
  const pct = (v) => (v.actuel <= 0 ? 0 : Math.max(3, Math.min(100, (v.actuel / v.but) * 100)));
  const atteint = (v) => v.actuel >= v.but;
  function majReste(L) {
    const v = L.val;
    L.reste.textContent = atteint(v) ? "DÉBLOQUÉ" : `encore ${fmt(v.but - v.actuel)}`;
  }
  // un reflet passe sur la barre de temps en temps (plus souvent quand l'objectif est atteint)
  function boucleEclat(L) {
    if (L.boucle) L.boucle.cancel();
    const fait = atteint(L.val);
    L.boucle = anime(L.eclat, [
      { transform: "translateX(-130%)" },
      { transform: "translateX(260%)", offset: fait ? 0.32 : 0.13 },
      { transform: "translateX(260%)" },
    ], { duration: fait ? 3_400 : 9_000, delay: 1_500, iterations: Infinity, easing: "ease-in-out" });
  }
  // au repos : le reflet, et quand il ne manque presque plus rien (85 % et plus), la barre bat doucement comme un cœur
  function boucleRepos(L) {
    boucleEclat(L);
    if (L.battement) { L.battement.cancel(); L.battement = null; }
    const v = L.val;
    if (!atteint(v) && v.actuel / v.but >= 0.85) {
      L.battement = anime(L.rempli, [
        { filter: "brightness(1)" },
        { filter: "brightness(1.5)", offset: 0.16 },
        { filter: "brightness(1)", offset: 0.4 },
        { filter: "brightness(1)" },
      ], { duration: 1_700, delay: 1_000, iterations: Infinity, easing: "ease-in-out" });
    }
  }
  // sans animation : les chiffres, la barre, l'état
  function poser(L, v) {
    L.val = v;
    L.jeton += 1;
    L.affiche = v.actuel;
    L.n.textContent = fmt(v.actuel);
    L.but.textContent = `${NBSP}/${NBSP}${fmt(v.but)}`;
    L.texte.textContent = v.texte || (L.quoi === "sub" ? "SUBS" : "FOLLOWS");
    L.ligne.classList.toggle("atteint", atteint(v));
    majReste(L);
    L.pct = pct(v);
    L.rempli.style.width = `${L.pct}%`;
    boucleRepos(L);
  }
  // le chiffre compte jusqu'au nouveau total
  function compter(L, de, a, ms) {
    const jeton = (L.jeton += 1);
    const t0 = performance.now();
    const pas = () => {
      if (L.jeton !== jeton) return;
      const p = Math.min(1, (performance.now() - t0) / ms);
      L.affiche = de + (a - de) * (1 - (1 - p) ** 3);
      L.n.textContent = fmt(L.affiche);
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  function barreVers(L, avant, apres, ms = 950) {
    L.rempli.style.width = `${apres}%`;
    // près du bout, pas de rebond (la barre déborderait)
    anime(L.rempli, [{ width: `${avant}%` }, { width: `${apres}%` }], { duration: ms, easing: apres > 92 ? DOUX : "cubic-bezier(.25, 1.25, .4, 1)" });
  }

  // ---------- les animations ----------
  // le panneau brille (une ou plusieurs fois)
  function lueur(fois = 1, fort = false) {
    const repos = { boxShadow: "0 0 3.4rem rgba(155, 77, 255, 0.4)", borderColor: "rgba(255, 110, 180, 0.35)" };
    anime(panneau, [repos, { boxShadow: `0 0 ${fort ? 8 : 6}rem rgba(255, 79, 154, ${fort ? 0.85 : 0.7})`, borderColor: "rgba(255, 170, 215, 0.95)", offset: 0.35 }, repos], { duration: fort ? 1_000 : 1_100, iterations: fois, easing: "ease-in-out" });
  }
  // « +1 · Bigorneau_TV » à côté du chiffre, qui monte et s'efface
  function puce(L, n, qui) {
    if (L.puce) L.puce.remove();
    const p = el("span", "ob-plus", el("b", "", `+${fmt(n)}`), qui ? el("span", "", String(qui).slice(0, 25)) : null);
    L.nombre.append(p);
    L.puce = p;
    anime(p, [
      { opacity: 0, transform: "translateX(1.2rem) scale(0.55)" },
      { opacity: 1, transform: "translateX(0) scale(1.1)", offset: 0.1 },
      { opacity: 1, transform: "translateX(0) scale(1)", offset: 0.18 },
      { opacity: 1, transform: "translateY(0)", offset: 0.8 },
      { opacity: 0, transform: "translateY(-1.8rem)" },
    ], { duration: 2_700, easing: "ease-out", fill: "both" });
    setTimeout(() => { if (L.puce === p) L.puce = null; p.remove(); }, 2_750);
  }
  // des éclats qui jaillissent de la barre, puis retombent
  function eclats(L, nombre, depuis = L.barre) {
    const r = depuis.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    const couleurs = L.quoi === "sub" ? ["#ff8fcb", "#ff4f9a", "#9b4dff", "#ffcf5c", "#fff0f7"] : ["#d1a6ff", "#9b4dff", "#ff8fcb", "#ffcf5c", "#fff0f7"];
    for (let i = 0; i < nombre; i++) {
      const p = el("i", Math.random() < 0.4 ? "ob-p rond" : "ob-p");
      p.style.background = couleurs[i % couleurs.length];
      zone.append(p);
      const x0 = r.left - z.left + Math.random() * r.width;
      const y0 = r.top - z.top + r.height / 2;
      const angle = hasard(-Math.PI * 0.94, -Math.PI * 0.06);
      const elan = hasard(8, 21) * rem;
      const dx = Math.cos(angle) * elan;
      const dy = Math.sin(angle) * elan;
      const chute = hasard(9, 17) * rem;
      const tour = hasard(-560, 560);
      const duree = hasard(1_300, 2_100);
      anime(p, [
        { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(1.2)`, opacity: 1, easing: "cubic-bezier(.15, .75, .35, 1)" },
        { transform: `translate(${x0 + dx * 0.85}px, ${y0 + dy}px) rotate(${tour / 2}deg) scale(1)`, opacity: 1, offset: 0.38, easing: "cubic-bezier(.45, 0, .85, .5)" },
        { transform: `translate(${x0 + dx}px, ${y0 + dy + chute}px) rotate(${tour}deg) scale(0.6)`, opacity: 0 },
      ], { duration: duree, fill: "both" });
      setTimeout(() => p.remove(), duree + 60);
    }
  }
  // un sub (ou un follow) : la puce, le chiffre qui saute, la barre qui file, un reflet, le panneau qui brille
  function monter(L, v, ev) {
    const avant = L.val;
    const pctAvant = L.pct;
    L.val = v;
    L.pct = pct(v);
    puce(L, v.actuel - avant.actuel, ev.qui);
    compter(L, L.affiche, v.actuel, 800);
    const couleur = L.quoi === "sub" ? "#ff8fcb" : "#d1a6ff";
    anime(L.n, [
      { transform: "scale(1)", color: "#fff0f7" },
      { transform: "scale(1.26)", color: couleur, offset: 0.28 },
      { transform: "scale(1)", color: "#fff0f7" },
    ], { duration: 700, easing: "cubic-bezier(.2, .9, .3, 1)" });
    barreVers(L, pctAvant, L.pct);
    anime(L.eclat, [{ transform: "translateX(-130%)" }, { transform: "translateX(260%)" }], { duration: 850, delay: 150, easing: "ease-in-out", fill: "backwards" });
    anime(L.rempli, [{ filter: "brightness(1)" }, { filter: "brightness(1.7)", offset: 0.25 }, { filter: "brightness(1)" }], { duration: 800 });
    lueur(1);
    if (atteint(v) && !atteint(avant)) setTimeout(() => feter(L), 700); // (la fête change aussi « encore … »)
    else { setTimeout(() => majReste(L), 380); boucleRepos(L); }
  }
  // l'objectif est atteint : la barre s'illumine, le cadenas s'ouvre, des éclats, puis la bannière « OBJECTIF ATTEINT ! »
  function feter(L) {
    L.ligne.classList.add("atteint");
    majReste(L);
    boucleRepos(L);
    anime(L.flash, [{ opacity: 0 }, { opacity: 0.9, offset: 0.18 }, { opacity: 0 }], { duration: 750, easing: "ease-out" });
    anime(L.barre, [{ transform: "scaleY(1)" }, { transform: "scaleY(1.7)", offset: 0.25 }, { transform: "scaleY(1)" }], { duration: 700, easing: REBOND });
    anime(L.anse, [
      { transform: "translateY(0) rotate(0deg)" },
      { transform: "translateY(-3px) rotate(-40deg)", offset: 0.55 },
      { transform: "translateY(-2px) rotate(-30deg)" },
    ], { duration: 750, easing: "cubic-bezier(.2, 1.1, .3, 1)" });
    anime(L.cadenas, [{ transform: "scale(1) rotate(0deg)" }, { transform: "scale(1.4) rotate(-10deg)", offset: 0.4 }, { transform: "scale(1) rotate(0deg)" }], { duration: 750, easing: REBOND });
    anime(L.ok, [
      { opacity: 0, transform: "scale(0.2) rotate(-40deg)" },
      { opacity: 1, transform: "scale(1.25) rotate(8deg)", offset: 0.6 },
      { opacity: 1, transform: "scale(1) rotate(0deg)" },
    ], { duration: 650, delay: 120, easing: "ease-out", fill: "backwards" });
    anime(L.reste, [{ opacity: 0, transform: "scale(0.4)" }, { opacity: 1, transform: "scale(1.18)", offset: 0.6 }, { opacity: 1, transform: "scale(1)" }], { duration: 600, delay: 220, easing: "ease-out", fill: "backwards" });
    eclats(L, 42);
    setTimeout(() => eclats(L, 26, L.fete), 1_000);
    lueur(3, true);
    setTimeout(() => banniere(L), 380);
  }
  function banniere(L) {
    const f = L.fete;
    const DUREE = 3_700;
    L.feteTexte.textContent = L.val.texte || "OBJECTIF ATTEINT";
    f.style.visibility = "visible";
    anime(f, [
      { clipPath: "inset(0 100% 0 0 round 1.6rem)", easing: "cubic-bezier(.2, .8, .2, 1)" },
      { clipPath: "inset(0 0% 0 0 round 1.6rem)", offset: 0.12 },
      { clipPath: "inset(0 0% 0 0% round 1.6rem)", offset: 0.88, easing: "cubic-bezier(.6, 0, .8, .4)" },
      { clipPath: "inset(0 0% 0 100% round 1.6rem)" },
    ], { duration: DUREE, fill: "both" });
    anime(L.feteSur, [
      { opacity: 0, transform: "translateX(-2.4rem)", letterSpacing: "0.5em" },
      { opacity: 1, transform: "translateX(0)", letterSpacing: "0.22em" },
    ], { duration: 650, delay: 260, easing: DOUX, fill: "backwards" });
    anime(L.feteTexte, [
      { opacity: 0, transform: "scale(0.35)" },
      { opacity: 1, transform: "scale(1.16)", offset: 0.55 },
      { opacity: 1, transform: "scale(1)" },
    ], { duration: 800, delay: 400, easing: "cubic-bezier(.2, .9, .3, 1)", fill: "backwards" });
    anime(L.feteTexte, [{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.5 }, { transform: "scale(1)" }], { duration: 900, delay: 1_300, iterations: 2, easing: "ease-in-out" });
    anime(L.feteEclat, [{ transform: "translateX(-130%)" }, { transform: "translateX(360%)" }], { duration: 1_000, delay: 900, easing: "ease-in-out", fill: "backwards" });
    setTimeout(() => { f.style.visibility = ""; }, DUREE + 40);
  }
  // une correction faite à la main (/objectif) : les chiffres glissent, sans fête
  function glisser(L, v) {
    const avant = L.pct;
    L.val = v;
    L.pct = pct(v);
    compter(L, L.affiche, v.actuel, 600);
    barreVers(L, avant, L.pct, 700);
    L.ligne.classList.toggle("atteint", atteint(v));
    majReste(L);
    boucleRepos(L);
  }
  // un nouvel objectif (autre nombre ou autre récompense) : l'ancien s'en va par le haut, le nouveau arrive et se remplit
  function nouvelObjectif(L, v) {
    const blocs = [L.haut, L.barre, L.bas];
    const sorties = blocs.map((b) => anime(b, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-1.2rem)" }], { duration: 280, easing: "ease-in", fill: "forwards" }));
    setTimeout(() => {
      for (const a of sorties) a?.cancel();
      poser(L, v);
      L.n.textContent = "0";
      compter(L, 0, v.actuel, 900);
      barreVers(L, 0, L.pct, 1_000);
      blocs.forEach((b, i) => anime(b, [{ opacity: 0, transform: "translateY(1.2rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 480, delay: i * 70, easing: DOUX, fill: "backwards" }));
    }, 300);
  }
  function entrerLigne(L) {
    anime(L.ligne, [{ opacity: 0, transform: "translateY(1.4rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 520, easing: DOUX, fill: "backwards" });
    barreVers(L, 0, L.pct, 1_000);
  }
  function enleverLigne(L) {
    anime(L.ligne, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" });
    setTimeout(() => L.ligne.remove(), 280);
  }
  function majPanneau() {
    const veut = QUOI.some((q) => lignes[q]);
    if (veut === visible) return;
    visible = veut;
    if (veut) {
      panneau.classList.add("vu");
      anime(panneau, [{ opacity: 0, transform: "translateY(-1.4rem) scale(0.96)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 650, easing: REBOND });
      lueur(1);
    } else {
      anime(panneau, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.97)" }], { duration: 300, easing: "ease-in", fill: "forwards" });
      setTimeout(() => { if (!visible) panneau.classList.remove("vu"); for (const a of panneau.getAnimations()) a.cancel(); }, 320);
    }
  }

  // ---------- ce que le bot envoie : { k: "objectifs", sub, follow, evt: { quoi, n, qui } } ----------
  function normaliser(x) {
    if (!x || typeof x !== "object") return null;
    const but = Math.floor(Number(x.but));
    const actuel = Math.floor(Number(x.actuel));
    if (!(but > 0) || !(actuel >= 0)) return null;
    return { but: Math.min(but, 9_999_999), actuel: Math.min(actuel, 9_999_999), texte: String(x.texte || "").replace(/\s+/g, " ").trim().slice(0, 40) };
  }
  function appliquer(m, { forcer = false } = {}) {
    const evt = m && typeof m.evt === "object" && m.evt ? m.evt : null;
    let change = false;
    for (const quoi of QUOI) {
      const v = normaliser(m?.[quoi]);
      const L = lignes[quoi];
      if (!v) {
        if (L) { enleverLigne(L); lignes[quoi] = null; change = true; }
        continue;
      }
      if (!L) {
        const N = (lignes[quoi] = creerLigne(quoi));
        // l'ordre : le sub d'abord, puis le follow
        if (quoi === "sub" && lignes.follow?.ligne.isConnected) panneau.insertBefore(N.ligne, lignes.follow.ligne);
        else panneau.append(N.ligne);
        poser(N, v);
        if (visible) entrerLigne(N);
        else barreVers(N, 0, N.pct, 1_100);
        change = true;
        continue;
      }
      if (forcer || L.val.but !== v.but || L.val.texte !== v.texte) { nouvelObjectif(L, v); continue; }
      if (v.actuel === L.val.actuel) continue;
      if (evt && evt.quoi === quoi && v.actuel > L.val.actuel) monter(L, v, evt);
      else glisser(L, v);
    }
    if (change) majPanneau();
  }

  // ---------- ?essai=objectifs : la démo ----------
  function demo() {
    const etat = JSON.parse(JSON.stringify(DEMO.depart));
    appliquer(JSON.parse(JSON.stringify(etat)), { forcer: Boolean(lignes.sub || lignes.follow) });
    for (const [t, quoi, n, qui] of DEMO.etapes) {
      setTimeout(() => {
        etat[quoi].actuel += n;
        appliquer({ ...JSON.parse(JSON.stringify(etat)), evt: { quoi, n, qui } });
      }, t);
    }
    setTimeout(demo, DEMO.periode);
  }

  // ---------- la connexion au serveur en direct du bot (l'adresse vient du site) ----------
  let ws = null;
  let adresse = "";
  let lu = false;
  let branche = false;
  let essais = 0;
  let vu = 0;
  let minuteur = null;
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
      const x = d.objectifs?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/objectifs$/i.test(x) ? x : "";
    }
    majAide();
    if (!adresse) { plusTard(20_000); return; }
    let s = null;
    try { s = new WebSocket(adresse); } catch { s = null; }
    if (!s) { plusTard(20_000); return; }
    ws = s;
    s.onopen = () => { vu = Date.now(); s.send(JSON.stringify({ k: "bonjour", role: "obs" })); };
    s.onmessage = (e) => {
      vu = Date.now();
      essais = 0;
      let m = null;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m?.k === "objectifs") { branche = true; appliquer(m); majAide(); }
    };
    s.onclose = (e) => {
      if (ws !== s) return;
      debrancher();
      essais += 1;
      majAide();
      // 4004 : les objectifs sont coupés dans le bot ; sinon on revient vite, puis de moins en moins souvent
      plusTard(e?.code === 4004 ? 60_000 : Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }
  // un petit signe toutes les 15 s ; sans nouvelles du bot depuis 50 s, la connexion est morte : on en refait une
  setInterval(() => {
    if (!ws || ws.readyState !== 1) return;
    if (Date.now() - vu > 50_000) { debrancher(); majAide(); plusTard(1_000); return; }
    try { ws.send(JSON.stringify({ k: "p", c: Date.now() })); } catch { /* elle se ferme */ }
  }, 15_000);

  // ---------- hors d'OBS : un mot d'explication quand on bouge la souris ----------
  let aide = null;
  let aideLigne = null;
  let aideMinuteur = null;
  function majAide() {
    if (!aideLigne) return;
    const t = ESSAI ? "Essai : deux objectifs d'exemple qui avancent tout seuls, sans le bot."
      : !lu ? "Connexion au site…"
      : !adresse ? "⏳ Le bot ne propose pas encore les objectifs (sa mise à jour n'est pas installée)."
      : branche ? (QUOI.some((q) => lignes[q]) ? "✅ Branchée au bot : les objectifs s'affichent ici." : "✅ Branchée au bot. Aucun objectif pour l'instant : /objectif sur Discord, ou !objectif dans le chat.")
      : "⏳ Connexion au bot…";
    if (aideLigne.textContent !== t) aideLigne.textContent = t;
  }
  function montrerAide() {
    if (DANS_OBS || CAPTURE) return;
    if (!aide) {
      const exemple = new URLSearchParams(location.search);
      exemple.set("essai", "objectifs");
      exemple.set("fond", "oui");
      const lien = el("a", "", "Voir un exemple");
      lien.href = `${location.pathname}?${exemple}`;
      aideLigne = el("p", "aide-etat", "");
      aide = el("div", "aide",
        el("b", "", "Les objectifs du live pour OBS"),
        el("p", "", "L'objectif sub et l'objectif follow, en direct. Sur Discord : /objectif sub (le nombre visé, la récompense, et ton nombre de subs du moment), /objectif follow. Dans le chat : !objectif (toi et tes modos pour les changer)."),
        el("p", "", "Dans OBS : une nouvelle source « Navigateur » avec cette adresse, en 600 × 440. Tout grandit ou rapetisse avec la source."),
        aideLigne,
        lien);
      document.body.append(aide);
      majAide();
    }
    aide.hidden = false;
    clearTimeout(aideMinuteur);
    aideMinuteur = setTimeout(() => { if (aide) aide.hidden = true; }, 12_000);
  }
  if (!DANS_OBS) for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, montrerAide, { passive: true });

  window.__obsObjectifs = {
    etat: () => ({ essai: ESSAI, quoi: QUOI, adresse, lu, branche, visible, sub: lignes.sub ? { ...lignes.sub.val, atteint: lignes.sub.ligne.classList.contains("atteint"), affiche: lignes.sub.n.textContent } : null, follow: lignes.follow ? { ...lignes.follow.val, atteint: lignes.follow.ligne.classList.contains("atteint"), affiche: lignes.follow.n.textContent } : null }),
    appliquer: (m) => appliquer(m),
  };

  if (ESSAI) demo();
  else brancher();
}
