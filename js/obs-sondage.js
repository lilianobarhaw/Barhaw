// LES SONDAGES TWITCH dans OBS (D.A. Néon) : la page /obs?sondage, une source navigateur rien que pour eux (obs.js la charge
// et s'arrête là). Quand Liliano lance un sondage sur Twitch, il apparaît ici : la question, le temps qui reste, et un choix
// par ligne avec sa barre, son pourcentage et ses votes, qui bougent en direct. Le choix en tête a un contour lumineux.
// À la fin, le gagnant s'illumine (contour doré, couronne, éclats) et les autres s'éteignent un peu ; le résultat reste
// 12 s, puis le panneau s'en va (le néon s'éteint).
// Le bot (lib/sondages.js) reçoit les sondages de la chaîne par Twitch (connexion de la chaîne : /objectif connecter) et les
// envoie en direct par son serveur (wss://…/sondage, l'adresse est dans /api/public). Un sondage n'a que des nombres de
// votes : aucun pseudo, rien n'est gardé.
// Taille conseillée de la source : 600 × 560 (tout suit la largeur). Réglages dans l'adresse : ?essai=sondage (un sondage
// d'exemple en boucle, sans le bot) · ?fond=oui (un fond sombre).

const NBSP = " ";
const CAPTURE = Boolean(window.__capture); // les vidéos d'aperçu : le temps est piloté de l'extérieur
const SVGNS = "http://www.w3.org/2000/svg";
const RESULTAT = 12_000; // le résultat reste 12 s à l'écran
const PERDU = 90_000; // un sondage « en cours » 1 min 30 après sa fin prévue : la fin n'est jamais arrivée, il s'en va

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
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}
const REBOND = "cubic-bezier(.2, 1.35, .4, 1)";
const DOUX = "cubic-bezier(.2, .8, .2, 1)";

// ?essai=sondage : « Quel jeu ce soir ? » sur 30 s, des votes qui arrivent (Valorant passe devant, puis LoL revient), le
// résultat, et ça recommence
const DEMO = {
  periode: 46_000,
  duree: 30_000,
  titre: "Quel jeu ce soir ?",
  choix: ["League of Legends", "Valorant", "Chained Together", "Fortnite"],
  votes: [
    [1_500, [1, 0, 0, 0]], [2_600, [2, 1, 0, 0]], [3_800, [3, 1, 1, 0]], [5_000, [4, 3, 1, 0]], [6_500, [5, 4, 2, 1]],
    [8_000, [7, 5, 2, 1]], [9_800, [8, 7, 3, 1]], [11_500, [9, 10, 3, 2]], [13_000, [10, 12, 4, 2]], [15_000, [12, 13, 5, 2]],
    [17_000, [14, 14, 6, 3]], [19_000, [17, 15, 6, 3]], [21_000, [19, 16, 8, 3]], [23_000, [21, 17, 9, 4]], [25_000, [24, 18, 9, 4]],
    [27_000, [26, 19, 10, 4]], [28_800, [28, 20, 11, 5]],
  ],
};

export function demarrer({ scene, P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "sondage";
  const DANS_OBS = Boolean(window.obsstudio);

  const panneau = el("section", "so");
  panneau.setAttribute("aria-label", "Sondage Twitch");
  panneau.setAttribute("aria-live", "polite");
  const zone = el("div", "so-zone");
  zone.setAttribute("aria-hidden", "true");
  scene.append(panneau, zone);

  let courant = null; // { id, etat, fin, duree, lignes, total, ... }
  const montres = new Set(); // les résultats déjà montrés
  let finMinuteur = null;

  const icone = (d) => svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" }, ...d.map((x) => svg("path", { d: x })));
  const couronne = () => svg("svg", { viewBox: "0 0 24 24", class: "so-couronne", "aria-hidden": "true" },
    svg("path", { d: "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z", fill: "#ffcf5c", stroke: "#12050d", "stroke-width": "1.6", "stroke-linejoin": "round" }),
    svg("circle", { cx: "12", cy: "15", r: "1.6", fill: "#ff4f9a" }));

  // ---------- construire le panneau d'un sondage ----------
  function construire(s) {
    panneau.replaceChildren();
    panneau.classList.remove("fini");
    const titreTexte = el("span", "", "SONDAGE");
    const titre = el("div", "so-titre", icone(["M5 20V11", "M12 20V5", "M19 20v-7"]), titreTexte);
    const chronoTexte = el("span", "", "");
    const chrono = el("div", "so-chrono", icone(["M12 7v5l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"]), chronoTexte);
    const question = el("div", "so-question", s.titre);
    const jauge = el("i", "");
    const temps = el("div", "so-temps", jauge);
    const liste = el("div", "so-choix");
    const lignes = s.choix.map((c) => {
      const eclat = el("i", "so-eclat");
      const rempli = el("i", "so-rempli", eclat);
      const pct = el("span", "so-pct", "0 %");
      const votes = el("span", "so-votes", "0 vote");
      const ligne = el("div", "so-ligne", el("div", "so-fond", rempli), el("i", "so-anneau"), couronne(), el("span", "so-nom", c.titre), votes, pct);
      liste.append(ligne);
      return { ligne, rempli, eclat, pct, votes, couronne: ligne.querySelector(".so-couronne"), anneau: ligne.querySelector(".so-anneau"), v: 0, part: 0, montre: 0, jeton: 0 };
    });
    panneau.append(el("div", "so-haut", titre, chrono), question, temps, liste);
    courant = { id: s.id, etat: "en cours", fin: s.fin, duree: s.duree, lignes, total: 0, titreTexte, chrono, chronoTexte, jauge, question, tete: [] };
  }
  // le pourcentage d'une ligne compte jusqu'à sa nouvelle valeur
  function compter(L, a, ms = 650) {
    const jeton = (L.jeton += 1);
    const de = L.montre;
    const t0 = performance.now();
    const pas = () => {
      if (L.jeton !== jeton) return;
      const p = Math.min(1, (performance.now() - t0) / ms);
      L.montre = de + (a - de) * (1 - (1 - p) ** 3);
      L.pct.textContent = `${fmt(L.montre)}${NBSP}%`;
      if (p < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }
  // les votes : barres, pourcentages, et le contour lumineux sur le choix en tête
  function majVotes(choix, { doux = true } = {}) {
    const total = choix.reduce((s, c) => s + (Number(c.votes) || 0), 0);
    courant.total = total;
    courant.lignes.forEach((L, i) => {
      const v = Math.max(0, Number(choix[i]?.votes) || 0);
      const part = total ? (v / total) * 100 : 0;
      const avant = L.part;
      const monte = v > L.v;
      L.v = v;
      L.part = part;
      L.votes.textContent = `${fmt(v)} vote${v > 1 ? "s" : ""}`;
      L.rempli.style.width = `${part}%`;
      if (doux && Math.abs(part - avant) > 0.05) anime(L.rempli, [{ width: `${avant}%` }, { width: `${part}%` }], { duration: 700, easing: DOUX });
      compter(L, part, doux ? 650 : 1);
      if (doux && monte) {
        anime(L.ligne, [{ filter: "brightness(1)" }, { filter: "brightness(1.35)", offset: 0.3 }, { filter: "brightness(1)" }], { duration: 550, easing: "ease-out" });
        anime(L.eclat, [{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }], { duration: 750, easing: "ease-in-out" });
      }
    });
    if (courant.etat !== "en cours") return;
    // en tête (à égalité : tous ceux d'en haut) ; rien tant que personne n'a voté
    const max = Math.max(...courant.lignes.map((L) => L.v));
    const tete = max > 0 ? courant.lignes.filter((L) => L.v === max) : [];
    for (const L of courant.lignes) {
      const etait = L.ligne.classList.contains("tete");
      const est = tete.includes(L);
      if (est === etait) continue;
      L.ligne.classList.toggle("tete", est);
      if (!doux) continue;
      anime(L.anneau, est ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { duration: est ? 350 : 500, easing: "ease-out" });
      if (est) anime(L.ligne, [{ transform: "scale(1)" }, { transform: "scale(1.035)", offset: 0.4 }, { transform: "scale(1)" }], { duration: 450, easing: REBOND });
    }
    courant.tete = tete;
  }
  // le temps qui reste : le chrono (et la barre qui rétrécit)
  function majChrono() {
    if (!courant || courant.etat !== "en cours") return;
    if (Date.now() - courant.fin > PERDU) { partir(); return; } // la fin n'est jamais arrivée
    const reste = Math.max(0, Math.ceil((courant.fin - Date.now()) / 1000));
    const t = `${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, "0")}`;
    if (courant.chronoTexte.textContent !== t) {
      courant.chronoTexte.textContent = t;
      const vite = reste <= 10 && reste > 0;
      courant.chrono.classList.toggle("vite", vite);
      if (vite) anime(courant.chrono, [{ transform: "scale(1)" }, { transform: "scale(1.14)", offset: 0.25 }, { transform: "scale(1)" }], { duration: 420, easing: "ease-out" });
    }
  }
  function lancerJauge() {
    const reste = Math.max(0, courant.fin - Date.now());
    const total = Math.max(reste, courant.duree || 0, 1);
    for (const a of courant.jauge.getAnimations()) a.cancel();
    courant.jauge.style.transform = "scaleX(0)";
    if (reste > 0) anime(courant.jauge, [{ transform: `scaleX(${reste / total})` }, { transform: "scaleX(0)" }], { duration: reste, easing: "linear" });
  }

  // ---------- entrer, finir, partir ----------
  function entrer() {
    for (const a of panneau.getAnimations()) a.cancel();
    panneau.classList.add("vu");
    anime(panneau, [{ opacity: 0, transform: "translateY(-1.6rem) scale(0.95)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 700, easing: REBOND, fill: "backwards" });
    anime(panneau, [
      { boxShadow: "0 0 3.4rem rgba(155, 77, 255, 0.4)" },
      { boxShadow: "0 0 7rem rgba(255, 79, 154, 0.75)", offset: 0.35 },
      { boxShadow: "0 0 3.4rem rgba(155, 77, 255, 0.4)" },
    ], { duration: 1_200, easing: "ease-in-out" });
    anime(courant.question, [{ opacity: 0, transform: "translateY(0.8rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 500, delay: 180, easing: DOUX, fill: "backwards" });
    courant.lignes.forEach((L, i) => anime(L.ligne, [{ opacity: 0, transform: "translateX(-2.4rem)" }, { opacity: 1, transform: "translateX(0)" }], { duration: 520, delay: 300 + i * 90, easing: "cubic-bezier(.2, 1.2, .35, 1)", fill: "backwards" }));
    lancerJauge();
    majChrono();
  }
  function eclats(L, nombre) {
    const r = L.ligne.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 10;
    const couleurs = ["#ffe48a", "#ffcf5c", "#ff8fcb", "#ff4f9a", "#9b4dff", "#fff0f7"];
    for (let i = 0; i < nombre; i++) {
      const p = el("i", Math.random() < 0.4 ? "ob-p rond" : "ob-p");
      p.style.background = couleurs[i % couleurs.length];
      zone.append(p);
      const x0 = r.left - z.left + Math.random() * r.width;
      const y0 = r.top - z.top + r.height / 2;
      const angle = hasard(-Math.PI * 0.95, -Math.PI * 0.05);
      const elan = hasard(7, 19) * rem;
      const dx = Math.cos(angle) * elan;
      const dy = Math.sin(angle) * elan;
      const chute = hasard(8, 16) * rem;
      const tour = hasard(-540, 540);
      const duree = hasard(1_300, 2_100);
      anime(p, [
        { transform: `translate(${x0}px, ${y0}px) rotate(0deg) scale(1.2)`, opacity: 1, easing: "cubic-bezier(.15, .75, .35, 1)" },
        { transform: `translate(${x0 + dx * 0.85}px, ${y0 + dy}px) rotate(${tour / 2}deg) scale(1)`, opacity: 1, offset: 0.38, easing: "cubic-bezier(.45, 0, .85, .5)" },
        { transform: `translate(${x0 + dx}px, ${y0 + dy + chute}px) rotate(${tour}deg) scale(0.6)`, opacity: 0 },
      ], { duration: duree, fill: "both" });
      setTimeout(() => p.remove(), duree + 60);
    }
  }
  function changerTitre(texte) {
    const t = courant.titreTexte;
    anime(t, [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-0.8rem)" }], { duration: 200, easing: "ease-in", fill: "forwards" });
    setTimeout(() => {
      if (!courant || courant.titreTexte !== t) return;
      for (const a of t.getAnimations()) a.cancel();
      t.textContent = texte;
      anime(t, [{ opacity: 0, transform: "translateY(0.8rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: DOUX });
    }, 210);
  }
  // la fin : RÉSULTAT, les autres s'éteignent un peu, le gagnant s'illumine (couronne, éclats), puis le panneau s'en va
  function finir() {
    const C = courant;
    C.etat = "fini";
    montres.add(C.id);
    if (montres.size > 20) montres.delete(montres.values().next().value);
    panneau.classList.add("fini");
    for (const L of C.lignes) L.ligne.classList.remove("tete");
    C.tete = [];
    const max = Math.max(...C.lignes.map((L) => L.v));
    const gagnants = max > 0 ? C.lignes.filter((L) => L.v === max) : [];
    changerTitre(gagnants.length > 1 ? "ÉGALITÉ" : gagnants.length ? "RÉSULTAT" : "AUCUN VOTE");
    C.chronoTexte.textContent = "FINI";
    C.chrono.classList.remove("vite");
    anime(C.chrono, [{ transform: "scale(0.6)", opacity: 0 }, { transform: "scale(1.12)", opacity: 1, offset: 0.6 }, { transform: "scale(1)", opacity: 1 }], { duration: 500, easing: "ease-out" });
    setTimeout(() => {
      if (courant !== C) return;
      for (const L of C.lignes) {
        if (gagnants.includes(L)) continue;
        L.ligne.classList.add("perdant");
        anime(L.ligne, [{ opacity: 1 }, { opacity: 0.45 }], { duration: 600, easing: "ease-out" });
      }
      for (const L of gagnants) {
        L.ligne.classList.add("gagnant");
        anime(L.anneau, [{ opacity: 0, filter: "brightness(1)" }, { opacity: 1, filter: "brightness(1.9)", offset: 0.3 }, { opacity: 1, filter: "brightness(1)" }], { duration: 900, easing: "ease-out" });
        anime(L.ligne, [{ transform: "scale(1)" }, { transform: "scale(1.05)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 700, easing: REBOND });
        anime(L.couronne, [{ opacity: 0, transform: "scale(0.2) rotate(-35deg)" }, { opacity: 1, transform: "scale(1.3) rotate(8deg)", offset: 0.6 }, { opacity: 1, transform: "scale(1) rotate(0deg)" }], { duration: 650, delay: 150, easing: "ease-out", fill: "backwards" });
        anime(L.eclat, [{ transform: "translateX(-100%)" }, { transform: "translateX(100%)" }], { duration: 900, delay: 250, easing: "ease-in-out", fill: "backwards" });
        anime(L.anneau, [{ filter: "brightness(1)" }, { filter: "brightness(1.6)", offset: 0.5 }, { filter: "brightness(1)" }], { duration: 1_400, delay: 1_000, iterations: 3, easing: "ease-in-out" });
        eclats(L, gagnants.length > 1 ? 22 : 40);
      }
      if (gagnants.length) {
        anime(panneau, [
          { boxShadow: "0 0 3.4rem rgba(155, 77, 255, 0.4)" },
          { boxShadow: "0 0 8rem rgba(255, 207, 92, 0.7)", offset: 0.35 },
          { boxShadow: "0 0 3.4rem rgba(155, 77, 255, 0.4)" },
        ], { duration: 1_100, iterations: 3, easing: "ease-in-out" });
      }
    }, 350);
    clearTimeout(finMinuteur);
    finMinuteur = setTimeout(() => { if (courant === C) partir(); }, RESULTAT);
  }
  // partir : le néon s'éteint (le contour clignote), puis le panneau remonte et s'efface
  function partir(vite = false) {
    const C = courant;
    if (!C) return;
    courant = null;
    clearTimeout(finMinuteur);
    const duree = vite ? 250 : 800;
    if (!vite) {
      anime(panneau, [
        { borderColor: "rgba(255, 110, 180, 0.35)" },
        { borderColor: "rgba(255, 200, 230, 1)", offset: 0.08 },
        { borderColor: "rgba(255, 110, 180, 0.1)", offset: 0.15 },
        { borderColor: "rgba(255, 200, 230, 0.9)", offset: 0.22 },
        { borderColor: "rgba(255, 110, 180, 0)", offset: 0.35 },
        { borderColor: "rgba(255, 110, 180, 0)" },
      ], { duration: duree, fill: "forwards" });
    }
    anime(panneau, [
      { opacity: 1, transform: "translateY(0) scale(1)" },
      { opacity: 1, transform: "translateY(0.4rem) scale(1.01)", offset: vite ? 0.01 : 0.22 },
      { opacity: 0, transform: "translateY(-2rem) scale(0.95)" },
    ], { duration: duree, easing: "cubic-bezier(.5, 0, .9, .5)", fill: "forwards" });
    setTimeout(() => {
      if (courant) return; // un autre sondage est déjà là
      panneau.classList.remove("vu", "fini");
      for (const a of panneau.getAnimations()) a.cancel();
      panneau.replaceChildren();
    }, duree + 20);
  }

  // ---------- ce que le bot envoie : { k: "sondage", sondage: { id, titre, choix: [{ titre, votes }], fin, etat } | null } ----------
  // (reste : le temps qui reste selon l'horloge du bot, plus sûr que celle du PC ; fin : l'heure de fin, pour l'essai)
  function normaliser(s) {
    if (!s || typeof s !== "object" || !s.id || !Array.isArray(s.choix) || s.choix.length < 2) return null;
    const reste = Number(s.reste);
    return {
      id: String(s.id),
      titre: String(s.titre || "Sondage").slice(0, 60),
      choix: s.choix.slice(0, 5).map((c) => ({ titre: String(c?.titre || "?").slice(0, 25), votes: Math.max(0, Math.floor(Number(c?.votes) || 0)) })),
      fin: Number.isFinite(reste) && reste >= 0 ? Date.now() + reste : Number(s.fin) || Date.now(),
      duree: Math.max(0, Number(s.duree) || 0),
      etat: s.etat === "fini" ? "fini" : "en cours",
    };
  }
  function appliquer(m) {
    let s = normaliser(m);
    if (s && s.etat !== "fini" && Date.now() - s.fin > PERDU) s = null; // la fin n'est jamais arrivée
    if (!s) {
      // plus de sondage : celui en cours s'en va ; un résultat à l'écran finit ses 12 s
      if (courant && courant.etat !== "fini") partir();
      return;
    }
    if (!courant || courant.id !== s.id) {
      // un résultat déjà montré (la page s'est rebranchée juste après) : pas une deuxième fois
      if (s.etat === "fini" && montres.has(s.id)) return;
      clearTimeout(finMinuteur);
      courant = null;
      construire(s);
      majVotes(s.choix, { doux: false });
      entrer();
      // (un sondage déjà fini quand la page arrive : il entre, puis le résultat s'illumine)
      if (s.etat === "fini") setTimeout(() => { if (courant?.id === s.id && courant.etat !== "fini") finir(); }, 900);
      return;
    }
    if (courant.etat === "fini") return;
    if (Math.abs(s.fin - courant.fin) > 1_500) { courant.fin = s.fin; lancerJauge(); majChrono(); }
    if (s.duree) courant.duree = s.duree;
    majVotes(s.choix);
    if (s.etat === "fini") finir();
  }
  setInterval(majChrono, 250);

  // ---------- ?essai=sondage : la démo ----------
  function demo() {
    const id = `demo-${Date.now()}`;
    const fin = Date.now() + DEMO.duree;
    const choix = (v) => DEMO.choix.map((titre, i) => ({ titre, votes: v[i] }));
    const envoyer = (v, etat = "en cours") => appliquer({ id, titre: DEMO.titre, choix: choix(v), fin, duree: DEMO.duree, etat });
    envoyer([0, 0, 0, 0]);
    for (const [t, v] of DEMO.votes) setTimeout(() => envoyer(v), t);
    setTimeout(() => envoyer(DEMO.votes.at(-1)[1], "fini"), DEMO.duree);
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
      const x = d.sondage?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/sondage$/i.test(x) ? x : "";
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
      if (m?.k === "sondage") { branche = true; appliquer(m.sondage); majAide(); }
    };
    s.onclose = (e) => {
      if (ws !== s) return;
      debrancher();
      essais += 1;
      majAide();
      plusTard(e?.code === 4004 ? 60_000 : Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }
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
    const t = ESSAI ? "Essai : un sondage d'exemple en boucle, sans le bot."
      : !lu ? "Connexion au site…"
      : !adresse ? "⏳ Le bot ne propose pas encore les sondages (sa mise à jour n'est pas installée)."
      : branche ? (courant ? "✅ Branchée au bot : le sondage en cours s'affiche ici." : "✅ Branchée au bot. Lance un sondage sur Twitch : il s'affichera ici.")
      : "⏳ Connexion au bot…";
    if (aideLigne.textContent !== t) aideLigne.textContent = t;
  }
  function montrerAide() {
    if (DANS_OBS || CAPTURE) return;
    if (!aide) {
      const exemple = new URLSearchParams(location.search);
      exemple.set("essai", "sondage");
      exemple.set("fond", "oui");
      const lien = el("a", "", "Voir un exemple");
      lien.href = `${location.pathname}?${exemple}`;
      aideLigne = el("p", "aide-etat", "");
      aide = el("div", "aide",
        el("b", "", "Les sondages Twitch pour OBS"),
        el("p", "", "Quand tu lances un sondage sur Twitch, il s'affiche ici avec des barres qui bougent en direct, puis le gagnant s'illumine. Il faut avoir relié ta chaîne une fois au bot : /objectif connecter sur Discord."),
        el("p", "", "Dans OBS : une nouvelle source « Navigateur » avec cette adresse, en 600 × 560. Tout grandit ou rapetisse avec la largeur de la source."),
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

  window.__obsSondage = {
    etat: () => ({ essai: ESSAI, adresse, lu, branche, courant: courant ? { id: courant.id, etat: courant.etat, total: courant.total, tete: courant.tete.map((L) => courant.lignes.indexOf(L)), gagnants: courant.lignes.map((L, i) => (L.ligne.classList.contains("gagnant") ? i : -1)).filter((i) => i >= 0), pct: courant.lignes.map((L) => L.pct.textContent), chrono: courant.chronoTexte.textContent, titre: courant.titreTexte.textContent } : null, visible: panneau.classList.contains("vu") }),
    appliquer: (m) => appliquer(m),
  };

  if (ESSAI) demo();
  else brancher();
}
