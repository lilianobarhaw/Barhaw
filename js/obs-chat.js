// LE CHAT TWITCH SUR LE LIVE (D.A. Néon) : la page /obs?chat, une source navigateur rien que pour lui (obs.js la charge et
// s'arrête là). La page se branche toute seule sur le chat de la chaîne, comme un spectateur sans compte (lecture seule :
// elle ne peut rien écrire, et le bot n'y est pour rien), montre chaque message qui arrive, puis le laisse partir.
// Rien n'est gardé, ni ici ni ailleurs. Cachés : les commandes (« !… ») et les bots (BarhawBot, StreamElements, Nightbot…).
// Un message supprimé par un modo (ou tous ceux de quelqu'un mis en timeout ou banni) disparaît aussi de l'écran.
// Les emotes : celles de Twitch, et celles de la chaîne sur 7TV, BTTV et FFZ. Les liens sont remplacés par « lien ».
// Les animations : le message arrive en glissant avec un reflet, le dernier arrivé garde un contour lumineux, les autres
// montent en douceur ; au bout de 10 s, le néon s'éteint (le contour clignote, le texte s'efface, la carte glisse à gauche) ;
// un message supprimé se brouille puis s'efface ; le premier message de quelqu'un sur la chaîne a un contour doré, un
// message mis en avant (points de chaîne) brille plus fort.
// Taille conseillée de la source : 560 × 1000 (tout suit la taille). Réglages dans l'adresse : ?chat=<chaîne> (sans rien :
// lilianobarhaw) · ?duree=<secondes> (le temps qu'un message reste : 10 ; 0 = toujours) · ?max=<nombre> (10 à la fois) ·
// ?bots=oui (montrer aussi les bots) · ?commandes=oui (montrer aussi les « !… ») · ?essai=chat (une démo en boucle, sans
// Twitch) · ?fond=oui (un fond sombre, pour régler la page dans un onglet).

const IRC = "wss://irc-ws.chat.twitch.tv:443";
const CHAINE_DEFAUT = "lilianobarhaw";
const BOTS = new Set(["barhawbot", "streamelements", "nightbot", "moobot", "fossabot", "wizebot", "streamlabs", "sery_bot", "soundalerts", "commanderroot", "botrixoficial", "kofistreambot", "pokemoncommunitygame", "own3d", "blerp", "frostytoolsdotcom", "lumiastream", "tangiabot", "creatisbot", "streamstickers", "stay_hydrated_bot", "playwithviewersbot"]);
const COULEURS = ["#d1a6ff", "#5ee6d0", "#ff8fcb", "#ffcf5c", "#8fd3ff", "#b8f28c", "#ffb38a", "#f7a8ff"];
const MAX_CARACTERES = 220;
const CAPTURE = Boolean(window.__capture); // les vidéos d'aperçu : le temps est piloté de l'extérieur

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}
const DOUX = "cubic-bezier(.2, .8, .2, 1)";
const REBOND = "cubic-bezier(.2, 1.35, .4, 1)";
const couleurDe = (nom) => {
  let h = 2166136261;
  for (const c of String(nom).toLowerCase()) h = Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0;
  return COULEURS[h % COULEURS.length];
};

// ---------- le protocole du chat Twitch (IRC sur WebSocket) ----------
const deTag = (v) => v.replace(/\\(.)?/g, (_, c) => ({ s: " ", ":": ";", "\\": "\\", r: "\r", n: "\n" })[c] ?? (c || ""));
export function lireLigne(ligne) {
  const m = { tags: {}, prefixe: "", commande: "", params: [] };
  let i = 0;
  if (ligne[0] === "@") {
    const fin = ligne.indexOf(" ");
    if (fin < 0) return m;
    for (const p of ligne.slice(1, fin).split(";")) {
      const e = p.indexOf("=");
      m.tags[e < 0 ? p : p.slice(0, e)] = e < 0 ? "" : deTag(p.slice(e + 1));
    }
    i = fin + 1;
  }
  if (ligne[i] === ":") {
    const fin = ligne.indexOf(" ", i);
    if (fin < 0) return m;
    m.prefixe = ligne.slice(i + 1, fin);
    i = fin + 1;
  }
  const reste = ligne.slice(i);
  const deux = reste.indexOf(" :");
  const avant = deux >= 0 ? reste.slice(0, deux) : reste;
  const morceaux = avant.split(" ").filter(Boolean);
  m.commande = morceaux.shift() || "";
  m.params = morceaux;
  if (deux >= 0) m.params.push(reste.slice(deux + 2));
  return m;
}
// les badges qu'on montre (trois au plus) : capitaine (la chaîne), modo, VIP, sub (avec ses mois), premier message
export function lesBadges(tags) {
  const b = new Set(String(tags.badges || "").split(",").map((x) => x.split("/")[0]).filter(Boolean));
  const mois = Number(/(?:^|,)(?:subscriber|founder)\/(\d+)/.exec(String(tags["badge-info"] || ""))?.[1]) || 0;
  const res = [];
  if (tags["first-msg"] === "1") res.push(["premier", "PREMIER MESSAGE"]);
  if (b.has("broadcaster")) res.push(["capitaine", "CAPITAINE"]);
  if (b.has("moderator")) res.push(["modo", "MODO"]);
  if (b.has("vip")) res.push(["vip", "VIP"]);
  if (b.has("subscriber") || b.has("founder")) res.push(["sub", mois > 1 ? `SUB ${mois} MOIS` : "SUB"]);
  return res.slice(0, 3);
}
const LIEN = /^(?:https?:\/\/|www\.)\S+$|^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|fr|net|org|gg|tv|io|be|co|me|ly|xyz|app|biz|info|shop|live|link|site|store|online)(?:\/\S*)?$/i;
// le texte en morceaux : du texte, des emotes (Twitch d'après les positions données, puis 7TV / BTTV / FFZ par leur nom),
// des liens (remplacés par « lien »), des @mentions. Les positions Twitch comptent en caractères Unicode.
export function morceaux(texte, emotesTag, tiers = new Map(), chaine = "", decalage = 0) {
  const cps = Array.from(String(texte));
  const places = [];
  for (const bloc of String(emotesTag || "").split("/")) {
    const [id, pos] = bloc.split(":");
    if (!id || !pos || !/^[\w-]{1,64}$/.test(id)) continue;
    for (const r of pos.split(",")) {
      const [a, b] = r.split("-").map((x) => Number(x) - decalage);
      if (Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= a && b < cps.length) places.push({ a, b, id });
    }
  }
  places.sort((x, y) => x.a - y.a);
  const bruts = [];
  let i = 0;
  for (const p of places) {
    if (p.a < i) continue;
    if (p.a > i) bruts.push({ t: cps.slice(i, p.a).join("") });
    bruts.push({ emote: `https://static-cdn.jtvnw.net/emoticons/v2/${p.id}/default/dark/2.0`, nom: cps.slice(p.a, p.b + 1).join("") });
    i = p.b + 1;
  }
  if (i < cps.length) bruts.push({ t: cps.slice(i).join("") });
  const res = [];
  for (const m of bruts) {
    if (!m.t) { res.push(m); continue; }
    for (const mot of m.t.split(/(\s+)/)) {
      if (!mot) continue;
      if (/^\s+$/.test(mot)) res.push({ t: " " });
      else if (tiers.has(mot)) res.push({ emote: tiers.get(mot), nom: mot });
      else if (LIEN.test(mot)) res.push({ lien: true });
      else if (/^@\w{2,25}[,.!?:]*$/.test(mot)) res.push({ mention: mot, moi: mot.replace(/[^\w]/g, "").toLowerCase() === chaine });
      else res.push({ t: mot });
    }
  }
  return res;
}

// ---------- ?essai=chat : des messages d'exemple (pseudos inventés) et des emotes dessinées pour l'occasion ----------
const dessin = (s) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${s}</svg>`)}`;
const EMOTES_DEMO = new Map([
  [":hype:", dessin('<circle cx="32" cy="33" r="27" fill="#ff8fcb" stroke="#12050d" stroke-width="4"/><path d="M21 18l2.6 5.4 5.9.9-4.3 4.1 1 5.9L21 31.5l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" fill="#ffe14d" stroke="#12050d" stroke-width="2" stroke-linejoin="round"/><path d="M43 18l2.6 5.4 5.9.9-4.3 4.1 1 5.9L43 31.5l-5.2 2.8 1-5.9-4.3-4.1 5.9-.9z" fill="#ffe14d" stroke="#12050d" stroke-width="2" stroke-linejoin="round"/><path d="M20 40q12 13 24 0z" fill="#12050d"/>')],
  [":rire:", dessin('<circle cx="32" cy="33" r="27" fill="#ffcf5c" stroke="#12050d" stroke-width="4"/><path d="M17 27q5-6 10 0M37 27q5-6 10 0" fill="none" stroke="#12050d" stroke-width="3.5" stroke-linecap="round"/><path d="M18 37q14 16 28 0z" fill="#12050d"/><path d="M10 29q-4 6 0 10q4-4 0-10zM54 29q-4 6 0 10q4-4 0-10z" fill="#8fd3ff" stroke="#12050d" stroke-width="1.5"/>')],
  [":coeur:", dessin('<path d="M32 55C14 42 7 33 7 23a12 12 0 0 1 25-5 12 12 0 0 1 25 5c0 10-7 19-25 32z" fill="#ff4f9a" stroke="#12050d" stroke-width="4" stroke-linejoin="round"/><path d="M16 21a7 7 0 0 1 9-5" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>')],
  [":regard:", dessin('<circle cx="32" cy="33" r="27" fill="#d1a6ff" stroke="#12050d" stroke-width="4"/><ellipse cx="22" cy="28" rx="7" ry="6" fill="#fff" stroke="#12050d" stroke-width="2.5"/><ellipse cx="42" cy="28" rx="7" ry="6" fill="#fff" stroke="#12050d" stroke-width="2.5"/><circle cx="26" cy="29" r="3" fill="#12050d"/><circle cx="46" cy="29" r="3" fill="#12050d"/><path d="M24 44h16" stroke="#12050d" stroke-width="4" stroke-linecap="round"/>')],
]);
const DEMO = {
  // (assez espacés pour voir chaque message partir au bout de 10 s ; synchronisés avec la démo des objectifs)
  periode: 28_000,
  etapes: [
    [500, { nom: "LaMouetteRieuse", badges: "moderator/1", texte: "Soyez sages, je vous surveille :regard:" }],
    [2_400, { nom: "capitaine_frites", badges: "vip/1", texte: "il a pas vu le mec derrière lui MDRR :rire:" }],
    [4_300, { nom: "Bigorneau_TV", badges: "subscriber/0", info: "subscriber/1", texte: "LET'S GO je viens de sub :hype:" }],
    [6_000, { nom: "LilianoBarhaw", badges: "broadcaster/1", texte: "merci pour le sub Bigorneau !!" }],
    [8_700, { nom: "Krakenito", badges: "subscriber/12", info: "subscriber/14", texte: "TOURNOI BARHAW DÉBLOQUÉ :hype:" }],
    [11_000, { nom: "moussaillon_42", premier: true, texte: "première fois ici, la D.A. est trop propre" }],
    [12_800, { nom: "pub_bot_23", id: "pub", texte: "achetez des followers pas chers sur viewers-pas-chers.biz" }],
    [14_400, { supprimer: "pub" }],
    [15_800, { nom: "capitaine_frites", badges: "vip/1", mise: true, texte: "on veut le blind test ce soir !!" }],
    [17_600, { nom: "zebulon", texte: "\u0001ACTION vient de follow la chaîne\u0001" }],
    [19_800, { nom: "moussaillon_42", texte: "@LilianoBarhaw tu le lances quand le blind test ?" }],
    [21_600, { nom: "LilianoBarhaw", badges: "broadcaster/1", texte: "à 1 250 follows on le lance :coeur:" }],
    [23_200, { nom: "Bigorneau_TV", badges: "subscriber/0", info: "subscriber/1", texte: ":coeur: :coeur:" }],
  ],
  vider: 26_600,
};

export function demarrer({ scene, P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "chat";
  const brut = String(P.get("chat") || "").trim().toLowerCase().replace(/^@/, "");
  const CHAINE = !brut || brut === "oui" ? CHAINE_DEFAUT : /^[a-z0-9_]{3,25}$/.test(brut) ? brut : null;
  const DUREE = /^\d{1,4}$/.test(P.get("duree") || "") ? Number(P.get("duree")) * 1_000 : 10_000;
  const MAX = /^\d{1,2}$/.test(P.get("max") || "") ? Math.max(1, Math.min(30, Number(P.get("max")))) : 10;
  const MONTRER_BOTS = P.get("bots") === "oui";
  const MONTRER_COMMANDES = P.get("commandes") === "oui";
  const DANS_OBS = Boolean(window.obsstudio);

  const liste = el("div", "ch");
  liste.setAttribute("role", "log");
  liste.setAttribute("aria-label", "Chat Twitch");
  scene.append(liste);
  const tiers = ESSAI ? new Map(EMOTES_DEMO) : new Map(); // les emotes 7TV / BTTV / FFZ de la chaîne (en mémoire, le temps de la page)
  let dernier = null;

  // ---------- les cartes : arriver, monter, partir ----------
  const presentes = () => [...liste.children].filter((c) => !c.__part);
  // les cartes qui bougent quand la liste change glissent depuis leur ancienne place (au lieu de sauter)
  function glisser(changer) {
    const avant = new Map();
    for (const c of liste.children) avant.set(c, c.getBoundingClientRect().top);
    changer();
    for (const [c, haut] of avant) {
      if (!c.isConnected) continue;
      const d = haut - c.getBoundingClientRect().top;
      if (Math.abs(d) > 0.5) anime(c, [{ transform: `translateY(${d}px)` }, { transform: "translateY(0)" }], { duration: 480, easing: DOUX, composite: "add" });
    }
  }
  function entrer(carte) {
    const special = carte.classList.contains("mise") || carte.classList.contains("premier");
    anime(carte, [
      { opacity: 0, transform: "translateX(-3.4rem) scale(0.94)" },
      { opacity: 1, offset: 0.4 },
      { opacity: 1, transform: "translateX(0) scale(1)" },
    ], { duration: 680, easing: "cubic-bezier(.2, 1.25, .35, 1)" });
    anime(carte.__reflet, [{ transform: "translateX(-140%)" }, { transform: "translateX(260%)" }], { duration: special ? 1_100 : 900, delay: 140, easing: "ease-in-out", fill: "backwards" });
    const tete = [...carte.__tete.children];
    tete.forEach((n, i) => anime(n, [{ opacity: 0, transform: "translateY(0.7rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay: 70 + i * 55, easing: DOUX, fill: "backwards" }));
    anime(carte.__texte, [{ opacity: 0, transform: "translateY(0.5rem)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 460, delay: 150, easing: DOUX, fill: "backwards" });
    [...carte.__texte.querySelectorAll(".ch-emote")].forEach((e, i) => anime(e, [
      { transform: "scale(0.3) rotate(-14deg)" },
      { transform: "scale(1.2) rotate(5deg)", offset: 0.6 },
      { transform: "scale(1) rotate(0deg)" },
    ], { duration: 520, delay: 240 + i * 70, easing: "ease-out", fill: "backwards" }));
    // le dernier arrivé garde le contour lumineux ; l'ancien le perd doucement
    if (dernier && dernier.isConnected && dernier !== carte) {
      const ancien = dernier;
      if (ancien.__lueur) ancien.__lueur.cancel();
      const ombreAvant = getComputedStyle(ancien).boxShadow;
      ancien.classList.remove("dernier");
      const ombreApres = getComputedStyle(ancien).boxShadow;
      if (!ancien.classList.contains("moi") && !ancien.classList.contains("mise") && !ancien.classList.contains("premier")) anime(ancien.__anneau, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: "ease-out" });
      if (ombreAvant !== ombreApres) anime(ancien, [{ boxShadow: ombreAvant }, { boxShadow: ombreApres }], { duration: 600, easing: "ease-out" });
    }
    carte.classList.add("dernier");
    dernier = carte;
    anime(carte.__anneau, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 80, fill: "backwards" });
    const lueur = carte.classList.contains("premier") ? "rgba(255, 207, 92," : carte.classList.contains("mise") ? "rgba(155, 77, 255," : "rgba(255, 79, 154,";
    carte.__lueur = anime(carte, [
      { boxShadow: `0 0 0 ${lueur} 0)` },
      { boxShadow: `0 0 ${special ? 6 : 4.4}rem ${lueur} ${special ? 0.85 : 0.75})`, offset: 0.3 },
      { boxShadow: `0 0 2.8rem ${lueur} 0.45)` },
    ], { duration: special ? 1_500 : 1_100, easing: "ease-out" });
    if (carte.classList.contains("mise")) anime(carte.__anneau, [{ filter: "brightness(1)" }, { filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 1_200, delay: 600, iterations: 2, easing: "ease-in-out" });
  }
  function ajouter(carte) {
    glisser(() => liste.append(carte));
    entrer(carte);
    if (DUREE > 0) carte.__minuteur = setTimeout(() => partir(carte), DUREE);
    // trop de messages : les plus anciens s'en vont ; ceux qui sont sortis par le haut sont enlevés sans bruit
    const ici = presentes();
    for (const c of ici.slice(0, Math.max(0, ici.length - MAX))) partir(c);
    const haut = liste.getBoundingClientRect().top;
    for (const c of presentes()) if (c !== carte && c.getBoundingClientRect().bottom < haut - 20) { c.__part = true; clearTimeout(c.__minuteur); c.remove(); }
  }
  // partir : le temps est passé → le néon s'éteint (le contour se rallume, clignote et s'éteint, le texte s'efface, puis la
  // carte glisse à gauche en rapetissant) ; supprimé par un modo → il se brouille
  function partir(carte, supprime = false) {
    if (!carte || carte.__part || !carte.isConnected) return;
    carte.__part = true;
    clearTimeout(carte.__minuteur);
    if (carte.__lueur) carte.__lueur.cancel();
    const duree = supprime ? 460 : 800;
    if (supprime) {
      anime(carte, [
        { opacity: 1, transform: "translateX(0)", filter: "none" },
        { opacity: 1, transform: "translateX(0.6rem) skewX(-9deg)", filter: "hue-rotate(-50deg) saturate(2.2)", offset: 0.2 },
        { opacity: 0.85, transform: "translateX(-0.5rem) skewX(7deg)", filter: "hue-rotate(30deg) saturate(1.6)", offset: 0.42 },
        { opacity: 0, transform: "translateX(-2.6rem) scaleY(0.55)", filter: "blur(4px)" },
      ], { duration: duree, easing: "ease-in", fill: "forwards" });
    } else {
      const allume = Number(getComputedStyle(carte.__anneau).opacity) || 0;
      const ombre = getComputedStyle(carte).boxShadow;
      const eteinte = "0 0 0 rgba(255, 79, 154, 0)";
      anime(carte.__anneau, [
        { opacity: allume },
        { opacity: 1, offset: 0.07 },
        { opacity: 0.2, offset: 0.13 },
        { opacity: 0.95, offset: 0.19 },
        { opacity: 0.1, offset: 0.27 },
        { opacity: 0.6, offset: 0.32 },
        { opacity: 0, offset: 0.4 },
        { opacity: 0 },
      ], { duration: duree, fill: "forwards" });
      anime(carte, [
        { boxShadow: ombre === "none" ? eteinte : ombre },
        { boxShadow: "0 0 3.6rem rgba(255, 79, 154, 0.6)", offset: 0.07 },
        { boxShadow: eteinte, offset: 0.4 },
        { boxShadow: eteinte },
      ], { duration: duree, fill: "forwards" });
      anime(carte.__reflet, [{ transform: "translateX(260%)" }, { transform: "translateX(-140%)" }], { duration: duree * 0.45, easing: "ease-in-out" });
      anime(carte.__tete, [{ opacity: 1 }, { opacity: 1, offset: 0.3 }, { opacity: 0, offset: 0.8 }, { opacity: 0 }], { duration: duree, fill: "forwards" });
      anime(carte.__texte, [{ opacity: 1 }, { opacity: 1, offset: 0.34 }, { opacity: 0, offset: 0.85 }, { opacity: 0 }], { duration: duree, fill: "forwards" });
      anime(carte, [
        { opacity: 1, transform: "translateX(0) scale(1)", easing: "cubic-bezier(.3, 0, .6, 1)" },
        { opacity: 1, transform: "translateX(0.5rem) scale(1.015)", offset: 0.22, easing: "cubic-bezier(.55, 0, .9, .4)" },
        { opacity: 0, transform: "translateX(-3.6rem) scale(0.92)" },
      ], { duration: duree, fill: "forwards" });
    }
    setTimeout(() => {
      if (carte === dernier) dernier = null;
      glisser(() => carte.remove());
    }, duree);
  }
  const retirerSi = (test, supprime = true) => { for (const c of presentes()) if (test(c)) partir(c, supprime); };

  // ---------- un message → une carte ----------
  function carteDe({ id = "", userId = "", login = "", nom = "", texte = "", tags = {} }) {
    let action = false;
    const a = /^\u0001ACTION (.*?)\u0001?$/.exec(texte);
    if (a) { action = true; texte = a[1]; }
    const badges = lesBadges(tags);
    const moi = login === CHAINE;
    const couleur = moi ? "#ff8fcb" : couleurDe(login || nom);
    const carte = el("div", "ch-msg");
    if (moi) carte.classList.add("moi");
    if (action) carte.classList.add("action");
    if (tags["first-msg"] === "1") carte.classList.add("premier");
    if (tags["msg-id"] === "highlighted-message") carte.classList.add("mise");
    carte.dataset.id = id;
    carte.dataset.user = userId;
    carte.dataset.login = login;
    const anneau = el("i", "ch-anneau");
    const reflet = el("i", "ch-reflet");
    const nomEl = el("span", "ch-nom", nom || login);
    nomEl.style.color = couleur;
    const tete = el("div", "ch-tete", ...badges.map(([c, t]) => el("span", `ch-badge ${c}`, t)), nomEl);
    const reponse = tags["reply-parent-display-name"] ? el("div", "ch-reponse", `↪ en réponse à @${String(tags["reply-parent-display-name"]).slice(0, 25)}`) : null;
    // une réponse commence par « @pseudo » : on ne le répète pas (et les positions des emotes se décalent d'autant)
    let decalage = 0;
    if (reponse) {
      const debut = /^@\w+\s*/.exec(texte)?.[0] || "";
      decalage = Array.from(debut).length;
      texte = texte.slice(debut.length);
    }
    const corps = el("div", "ch-texte");
    if (action) corps.style.color = couleur;
    let longueur = 0;
    let rien = true; // que des emotes ?
    for (const m of morceaux(texte, tags.emotes, tiers, CHAINE, decalage)) {
      if (longueur >= MAX_CARACTERES) { corps.append("…"); break; }
      if (m.emote) {
        const img = el("img", "ch-emote");
        img.src = m.emote;
        img.alt = m.nom;
        img.decoding = "async";
        corps.append(img);
        longueur += 2;
      } else if (m.lien) { corps.append(el("span", "ch-lien", "lien")); longueur += 4; rien = false; }
      else if (m.mention) { corps.append(el("span", m.moi ? "ch-mention moi" : "ch-mention", m.mention)); longueur += m.mention.length; rien = false; }
      else {
        const t = m.t.length + longueur > MAX_CARACTERES ? `${m.t.slice(0, MAX_CARACTERES - longueur)}…` : m.t;
        corps.append(t);
        longueur += t.length;
        if (t.trim()) rien = false;
      }
    }
    if (rien && corps.querySelector(".ch-emote")) carte.classList.add("emotes");
    carte.append(...[anneau, el("i", "ch-reflets", reflet), tete, reponse, corps].filter(Boolean));
    carte.__anneau = anneau;
    carte.__reflet = reflet;
    carte.__tete = tete;
    carte.__texte = corps;
    return carte;
  }
  function surMessage({ id, userId, login, nom, texte, tags }) {
    if (!texte) return;
    if (!MONTRER_COMMANDES && /^\s*!/.test(texte)) return;
    if (!MONTRER_BOTS && BOTS.has(login)) return;
    ajouter(carteDe({ id, userId, login, nom, texte, tags }));
  }

  // ---------- les emotes 7TV / BTTV / FFZ de la chaîne (gardées en mémoire, le temps que la page est ouverte) ----------
  const prendre = async (url) => {
    try {
      const r = await fetch(url, { cache: "force-cache" });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  };
  const sure = (u) => (typeof u === "string" && u.length < 300 ? (u.startsWith("//") ? `https:${u}` : u) : "");
  let emotesDe = "";
  async function chargerEmotes(idChaine) {
    if (!/^\d{1,20}$/.test(idChaine) || emotesDe === idChaine) return;
    emotesDe = idChaine;
    const [g7, c7, gB, cB, gF, cF] = await Promise.all([
      prendre("https://7tv.io/v3/emote-sets/global"),
      prendre(`https://7tv.io/v3/users/twitch/${idChaine}`),
      prendre("https://api.betterttv.net/3/cached/emotes/global"),
      prendre(`https://api.betterttv.net/3/cached/users/twitch/${idChaine}`),
      prendre("https://api.frankerfacez.com/v1/set/global"),
      prendre(`https://api.frankerfacez.com/v1/room/id/${idChaine}`),
    ]);
    const n = new Map();
    const septTV = (set) => {
      for (const e of set?.emotes || []) {
        const h = e?.data?.host;
        const f = (h?.files || []).find((x) => x?.name === "2x.webp") || (h?.files || [])[0];
        const u = h?.url && f?.name ? sure(`${h.url}/${f.name}`) : "";
        if (e?.name && /^https:\/\/cdn\.7tv\.app\//.test(u)) n.set(e.name, u);
      }
    };
    const bttv = (liste2) => { for (const e of liste2 || []) if (e?.code && /^[\w]{1,40}$/.test(e.id || "")) n.set(e.code, `https://cdn.betterttv.net/emote/${e.id}/2x`); };
    const ffz = (sets) => {
      for (const s of Object.values(sets || {})) {
        for (const e of s?.emoticons || []) {
          const u = sure(e?.urls?.["2"] || e?.urls?.["1"]);
          if (e?.name && /^https:\/\/cdn\.frankerfacez\.com\//.test(u)) n.set(e.name, u);
        }
      }
    };
    // d'abord les globales, puis celles de la chaîne (qui passent devant) : FFZ, BTTV, puis 7TV
    if (gF) ffz(Object.fromEntries(Object.entries(gF.sets || {}).filter(([k]) => (gF.default_sets || []).map(String).includes(k))));
    bttv(Array.isArray(gB) ? gB : []);
    septTV(g7);
    ffz(cF?.sets);
    bttv([...(cB?.channelEmotes || []), ...(cB?.sharedEmotes || [])]);
    septTV(c7?.emote_set);
    for (const [k, v] of n) tiers.set(k, v);
  }

  // ---------- la connexion au chat (lecture seule, sans compte) ----------
  let ws = null;
  let branche = false;
  let essais = 0;
  let vu = 0;
  let minuteur = null;
  let recus = 0;
  function debrancher() {
    const s = ws;
    ws = null;
    branche = false;
    if (s) { s.onopen = s.onmessage = s.onclose = s.onerror = null; try { s.close(); } catch { /* déjà fermée */ } }
  }
  function plusTard(ms) { clearTimeout(minuteur); minuteur = setTimeout(brancher, ms); }
  function brancher() {
    clearTimeout(minuteur);
    if (ws || !CHAINE) return;
    let s = null;
    try { s = new WebSocket(IRC); } catch { s = null; }
    if (!s) { plusTard(10_000); return; }
    ws = s;
    s.onopen = () => {
      vu = Date.now();
      s.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      s.send("PASS SCHMOOPIIE");
      s.send(`NICK justinfan${10_000 + Math.floor(Math.random() * 80_000)}`);
      s.send(`JOIN #${CHAINE}`);
    };
    s.onmessage = (e) => {
      vu = Date.now();
      for (const ligne of String(e.data).split("\r\n")) if (ligne) lire(lireLigne(ligne), s);
    };
    s.onclose = () => {
      if (ws !== s) return;
      debrancher();
      majAide();
      essais += 1;
      plusTard(Math.min(30_000, 1_000 * 2 ** Math.min(essais, 5)));
    };
  }
  function lire(m, s) {
    switch (m.commande) {
      case "PING": try { s.send(`PONG :${m.params[0] || "tmi.twitch.tv"}`); } catch { /* elle se ferme */ } return;
      case "RECONNECT": debrancher(); plusTard(500); return;
      case "JOIN": branche = true; essais = 0; majAide(); return;
      case "ROOMSTATE": if (m.tags["room-id"]) chargerEmotes(m.tags["room-id"]); return;
      case "PRIVMSG": {
        if (String(m.params[0] || "").toLowerCase() !== `#${CHAINE}`) return;
        // un message d'un chat partagé (une autre chaîne) n'est pas pour nous
        if (m.tags["source-room-id"] && m.tags["room-id"] && m.tags["source-room-id"] !== m.tags["room-id"]) return;
        recus += 1;
        const login = m.prefixe.split("!")[0].toLowerCase();
        surMessage({ id: m.tags.id || "", userId: m.tags["user-id"] || "", login, nom: m.tags["display-name"] || login, texte: m.params[1] || "", tags: m.tags });
        return;
      }
      case "CLEARMSG": { const id = m.tags["target-msg-id"]; if (id) retirerSi((c) => c.dataset.id === id); return; }
      case "CLEARCHAT": {
        const qui = m.tags["target-user-id"];
        if (qui) retirerSi((c) => c.dataset.user === qui);
        else if (!m.params[1]) retirerSi(() => true);
        return;
      }
      default:
    }
  }
  // sans rien recevoir depuis 6 min (Twitch envoie un PING toutes les 5 min), la connexion est morte : on en refait une
  setInterval(() => {
    if (ws && ws.readyState === 1 && Date.now() - vu > 360_000) { debrancher(); plusTard(500); }
  }, 30_000);

  // ---------- ?essai=chat : la démo ----------
  function demo() {
    for (const [t, x] of DEMO.etapes) {
      setTimeout(() => {
        if (x.supprimer) { retirerSi((c) => c.dataset.id === x.supprimer); return; }
        const login = x.nom.toLowerCase();
        const tags = { badges: x.badges || "", "badge-info": x.info || "", "first-msg": x.premier ? "1" : "0", ...(x.mise ? { "msg-id": "highlighted-message" } : {}) };
        surMessage({ id: x.id || `d${t}`, userId: login, login, nom: x.nom, texte: x.texte, tags });
      }, t);
    }
    setTimeout(() => presentes().forEach((c, i) => setTimeout(() => partir(c), i * 60)), DEMO.vider);
    setTimeout(demo, DEMO.periode);
  }

  // ---------- hors d'OBS : un mot d'explication quand on bouge la souris ----------
  let aide = null;
  let aideLigne = null;
  let aideMinuteur = null;
  function majAide() {
    if (!aideLigne) return;
    const t = ESSAI ? "Essai : des messages d'exemple, sans Twitch."
      : !CHAINE ? "⛔ Le nom de chaîne dans l'adresse n'est pas bon : ?chat=<le pseudo Twitch de la chaîne>."
      : branche ? `✅ Branchée au chat de ${CHAINE}${recus ? ` (${recus} message${recus > 1 ? "s" : ""} reçu${recus > 1 ? "s" : ""})` : " : les messages s'afficheront ici"}.`
      : "⏳ Connexion au chat Twitch…";
    if (aideLigne.textContent !== t) aideLigne.textContent = t;
  }
  function montrerAide() {
    if (DANS_OBS || CAPTURE) return;
    if (!aide) {
      const exemple = new URLSearchParams(location.search);
      exemple.set("essai", "chat");
      exemple.set("fond", "oui");
      const lien = el("a", "", "Voir un exemple");
      lien.href = `${location.pathname}?${exemple}`;
      aideLigne = el("p", "aide-etat", "");
      aide = el("div", "aide",
        el("b", "", "Le chat Twitch pour OBS"),
        el("p", "", "Les messages du chat s'affichent ici quand ils arrivent, restent 10 secondes, puis s'en vont. Les commandes (!…) et les bots sont cachés ; un message supprimé par un modo disparaît aussi."),
        el("p", "", "Dans OBS : une nouvelle source « Navigateur » avec cette adresse, en 560 × 1000. Tout grandit ou rapetisse avec la source."),
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

  window.__obsChat = {
    etat: () => ({ essai: ESSAI, chaine: CHAINE, branche, recus, duree: DUREE, max: MAX, cartes: presentes().map((c) => ({ id: c.dataset.id, login: c.dataset.login, texte: c.__texte.textContent, classes: c.className })), emotes: tiers.size }),
    lire: (ligne) => lire(lireLigne(ligne), { send() {} }),
  };

  if (ESSAI) demo();
  else brancher();
}
