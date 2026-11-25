// LES SONS QUI FONT PEUR dans OBS : la page /obs?peur=<chaîne>, une source navigateur rien que pour eux (obs.js la charge et
// s'arrête là). Elle n'affiche rien : quand un viewer prend la récompense de points de chaîne choisie (/peur recompense sur le
// Discord de Barhaw), le bot (lib/peur.js) envoie ici le nom d'un son, et la page le joue. Dans OBS, la surveillance audio de
// cette source part dans un câble audio virtuel (VB-Cable) que le jeu d'horreur prend comme micro : le jeu « entend » le son
// (et le live aussi). Le réglage pas à pas est dans le LISEZMOI du bot.
// Les 6 sons (son/peur/) ont été fabriqués pour Barhaw : libres de droits. Rien n'est gardé, aucun pseudo n'arrive ici.
// Réglages dans l'adresse : ?peur=<la chaîne Twitch> (sans rien : lilianobarhaw) · ?essai=peur (un son toutes les 8 s, sans
// le bot : pour régler le câble). Hors du live (navigateur, ou « Interagir » dans OBS), bouger la souris montre l'état de la
// page et un bouton par son, pour essayer.

export const SONS_PEUR = ["coups", "porte", "cri", "chuchotement", "fracas", "pas"];
const NOMS = { coups: "Coups à la porte", porte: "Porte qui grince", cri: "Cri", chuchotement: "Chuchotement", fracas: "Fracas", pas: "Pas qui courent" };
const CHAINE_DEFAUT = "lilianobarhaw";
const CAPTURE = Boolean(window.__capture);

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };

export function demarrer({ P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "peur";
  const brut = String(P.get("peur") || "").trim().toLowerCase().replace(/^@/, "");
  const CHAINE = !brut || brut === "oui" ? CHAINE_DEFAUT : /^[a-z0-9_]{3,25}$/.test(brut) ? brut : null;
  const DANS_OBS = Boolean(window.obsstudio);

  // ---------- les sons (chargés d'avance : ils partent tout de suite) ----------
  const essaiFormat = new Audio();
  const EXT = essaiFormat.canPlayType('audio/ogg; codecs="opus"') ? "ogg" : "mp3";
  const audios = new Map(SONS_PEUR.map((s) => {
    const a = new Audio(`/son/peur/${s}.${EXT}`);
    a.preload = "auto";
    return [s, a];
  }));
  let bloque = false; // un navigateur qui attend un clic avant de laisser passer le son (pas OBS)
  let dernier = null; // { son, le }
  let joues = 0;
  function jouer(son) {
    const a = audios.get(son);
    if (!a) return false;
    try { a.pause(); a.currentTime = 0; } catch { /* pas encore chargé */ }
    a.volume = 1;
    const p = a.play();
    if (p && typeof p.catch === "function") p.then(() => { bloque = false; majAide(); }).catch(() => { bloque = true; majAide(); });
    dernier = { son, le: Date.now() };
    joues += 1;
    majAide();
    return true;
  }
  // un clic n'importe où autorise le son dans un navigateur
  window.addEventListener("pointerdown", () => {
    if (!bloque) return;
    bloque = false;
    const a = audios.get(SONS_PEUR[0]);
    try { a.muted = true; a.play().then(() => { a.pause(); a.muted = false; a.currentTime = 0; }).catch(() => { a.muted = false; }); } catch { /* tant pis */ }
    majAide();
  }, { passive: true });

  // ---------- ?essai=peur : un son toutes les 8 s, sans le bot ----------
  function essai() {
    let i = 0;
    const suivant = () => { jouer(SONS_PEUR[i % SONS_PEUR.length]); i += 1; };
    setTimeout(suivant, 1_000);
    setInterval(suivant, 8_000);
  }

  // ---------- la connexion au serveur en direct du bot (l'adresse vient du site) ----------
  let ws = null;
  let adresse = "";
  let lu = false;
  let branche = false;
  let refusee = false; // la chaîne n'est pas (encore) reliée au bot : /peur connecter
  let recompense = "";
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
    if (ws || !CHAINE) return;
    const d = await lire("/api/public");
    if (ws) return;
    if (d && !d.horsLigne) {
      lu = true;
      const x = d.peur?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/peur$/i.test(x) ? x : "";
    }
    majAide();
    if (!adresse) { plusTard(20_000); return; }
    let s = null;
    try { s = new WebSocket(adresse); } catch { s = null; }
    if (!s) { plusTard(20_000); return; }
    ws = s;
    s.onopen = () => { vu = Date.now(); s.send(JSON.stringify({ k: "bonjour", role: "obs", chaine: CHAINE })); };
    s.onmessage = (e) => {
      vu = Date.now();
      let m = null;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m?.k === "etat") { branche = true; refusee = false; essais = 0; recompense = String(m.recompense || "").slice(0, 60); majAide(); }
      else if (m?.k === "son" && typeof m.son === "string") jouer(m.son);
    };
    s.onclose = (e) => {
      if (ws !== s) return;
      debrancher();
      essais += 1;
      refusee = e?.code === 4005;
      majAide();
      plusTard(e?.code === 4005 || e?.code === 4004 ? 60_000 : Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }
  setInterval(() => {
    if (!ws || ws.readyState !== 1) return;
    if (Date.now() - vu > 50_000) { debrancher(); majAide(); plusTard(1_000); return; }
    try { ws.send(JSON.stringify({ k: "p", c: Date.now() })); } catch { /* elle se ferme */ }
  }, 15_000);

  // ---------- un mot d'explication quand on bouge la souris (navigateur, ou « Interagir » dans OBS) ----------
  let aide = null;
  let aideLigne = null;
  let aideMinuteur = null;
  function majAide() {
    if (!aideLigne) return;
    const t = ESSAI ? "Essai : un son toutes les 8 secondes, sans le bot."
      : CHAINE === null ? "⛔ Le nom de chaîne dans l'adresse n'est pas bon : ?peur=<le pseudo Twitch de la chaîne>."
      : !lu ? "Connexion au site…"
      : !adresse ? "⏳ Le bot ne propose pas encore les sons qui font peur (sa mise à jour n'est pas installée)."
      : refusee ? `⛔ La chaîne ${CHAINE} n'est pas encore reliée au bot : /peur connecter chaine:${CHAINE} sur le Discord de Barhaw.`
      : branche ? `✅ Branchée au bot pour ${CHAINE}${recompense ? ` (récompense « ${recompense} »)` : " (récompense pas encore choisie : /peur recompense)"}.`
      : "⏳ Connexion au bot…";
    const plus = bloque ? " 🔇 Clique une fois sur la page pour autoriser le son." : dernier ? ` Dernier son : ${NOMS[dernier.son] || dernier.son}.` : "";
    if (aideLigne.textContent !== t + plus) aideLigne.textContent = t + plus;
  }
  function montrerAide() {
    if (CAPTURE) return;
    if (!aide) {
      aideLigne = el("p", "aide-etat", "");
      const boutons = el("div", "aide-sons", ...SONS_PEUR.map((s) => {
        const b = el("button", "", `▶ ${NOMS[s]}`);
        b.type = "button";
        b.addEventListener("click", () => jouer(s));
        return b;
      }));
      aide = el("div", "aide",
        el("b", "", "Les sons qui font peur"),
        el("p", "", "Quand un viewer prend la récompense de points de chaîne choisie, un son passe ici. Dans OBS, sa surveillance audio va dans le câble audio virtuel que le jeu prend comme micro."),
        el("p", "", "Dans OBS : une source « Navigateur » avec cette adresse, « Contrôler l'audio via OBS » coché ; Surveillance audio : « Surveiller et sortir » ; périphérique de surveillance : CABLE Input. Les boutons ci-dessous font passer un son pour essayer."),
        aideLigne,
        boutons);
      document.body.append(aide);
      majAide();
    }
    aide.hidden = false;
    clearTimeout(aideMinuteur);
    aideMinuteur = setTimeout(() => { if (aide) aide.hidden = true; }, DANS_OBS ? 6_000 : 12_000);
  }
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, montrerAide, { passive: true });

  window.__obsPeur = {
    etat: () => ({ essai: ESSAI, chaine: CHAINE, adresse, lu, branche, refusee, recompense, bloque, ext: EXT, joues, dernier: dernier?.son || "" }),
    jouer: (s) => jouer(s),
  };

  if (ESSAI) essai();
  else brancher();
}
