// LES VIDÉOS DU CHAT dans OBS : la page /obs?video, une source navigateur rien que pour elles (obs.js la charge et s'arrête là).
// Un viewer tape « !video <lien YouTube ou TikTok> » dans le chat Twitch ; le bot (lib/videos.js) vérifie le lien, le met dans
// sa file et l'envoie ici par son serveur en direct (wss://…/video, l'adresse est dans /api/public). La vidéo passe avec le son,
// une à la fois, coupée au bout de la durée que donne le bot (90 s sans rien changer), puis la page dit au bot qu'elle a fini
// pour qu'il envoie la suivante. Une vidéo qui ne passe pas (privée, supprimée, bloquée hors de YouTube) : la page le dit au bot,
// qui prévient le chat. Rechargée au milieu d'une vidéo, la page la reprend là où elle en était.
// Les lecteurs : YouTube (youtube-nocookie.com/embed) et TikTok (tiktok.com/player/v1), pilotés par postMessage, sans charger
// leurs scripts (les deux sont dans la règle frame-src de vercel.json). La page ne garde rien : la file vit dans le bot.
// Réglages dans l'adresse : ?coin=haut-gauche|haut-droite|bas-gauche|bas-droite (sans rien : au milieu, en grand) ·
// ?pseudos=non (cacher qui a mis la vidéo) · ?essai=video (des vidéos d'exemple dessinées dans la page, avec une cloche pour
// vérifier que le son arrive dans OBS) · ?fond=oui (un fond sombre, pour régler la page dans un onglet).

const YT = "https://www.youtube-nocookie.com";
const TT = "https://www.tiktok.com";
const COINS = ["haut-gauche", "haut-droite", "bas-gauche", "bas-droite"];
const MUETTE_APRES = 3500; // hors d'OBS, le navigateur bloque souvent le son : la vidéo repart muette (un clic le rend)
const SANS_REPONSE = 15_000; // un lecteur qui ne répond pas du tout en 15 s : la vidéo ne passera pas
const SANS_DEPART = 30_000; // un lecteur qui répond mais ne démarre jamais
const MARGE = 12; // les secondes de chargement tolérées en plus de la durée (le bot, lui, coupe à + 15 s)
const MONTRER_ERREUR = 2500; // « elle ne peut pas passer » reste ce temps-là à l'écran

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };
const minSec = (s) => { const x = Math.max(0, Math.ceil(s)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, "0")}`; };
const cadre = (src, titre) => {
  const f = document.createElement("iframe");
  f.title = titre;
  f.allow = "autoplay; encrypted-media; picture-in-picture";
  f.referrerPolicy = "strict-origin-when-cross-origin"; // YouTube refuse de jouer sans savoir quel site l'affiche
  f.setAttribute("tabindex", "-1");
  f.src = src;
  return f;
};

// ---------- YouTube : le lecteur intégré, piloté comme le fait son API (des messages JSON, canal « widget ») ----------
function lecteurYouTube(v, { depart, rappel }) {
  const id = `barhaw-${v.n}`;
  const q = new URLSearchParams({ autoplay: "1", controls: "0", enablejsapi: "1", origin: location.origin, rel: "0", playsinline: "1", iv_load_policy: "3", disablekb: "1", fs: "0" });
  if (depart >= 1) q.set("start", String(Math.floor(depart)));
  const f = cadre(`${YT}/embed/${encodeURIComponent(v.id)}?${q}`, "La vidéo YouTube du chat");
  let repondu = false;
  const poster = (x) => { try { f.contentWindow?.postMessage(JSON.stringify(x), YT); } catch { /* le lecteur n'est pas encore là */ } };
  const commande = (func, args = []) => poster({ event: "command", func, args, id, channel: "widget" });
  // « j'écoute » toutes les 250 ms, jusqu'à ce que le lecteur réponde
  const ecouter = setInterval(() => { if (repondu) clearInterval(ecouter); else poster({ event: "listening", id, channel: "widget" }); }, 250);
  const surMessage = (e) => {
    if (e.source !== f.contentWindow || !/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    let m = null;
    try { m = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    if (!m || typeof m !== "object") return;
    if (!repondu) {
      repondu = true;
      clearInterval(ecouter);
      for (const x of ["onReady", "onStateChange", "onError"]) commande("addEventListener", [x]);
    }
    rappel.vivant();
    const info = m.info;
    if (m.event === "onReady") rappel.pret();
    else if (m.event === "onStateChange") rappel.etat(Number(info));
    else if (m.event === "onError") rappel.erreur(`youtube ${info}`);
    else if ((m.event === "infoDelivery" || m.event === "initialDelivery") && info && typeof info === "object") {
      if (typeof info.playerState === "number") rappel.etat(info.playerState);
      if (Number.isFinite(info.currentTime) || Number.isFinite(info.duration)) rappel.temps(Number(info.currentTime), Number(info.duration));
      if (typeof info.muted === "boolean") rappel.muet(info.muted);
    }
  };
  window.addEventListener("message", surMessage);
  return {
    noeud: f,
    jouer: () => commande("playVideo"),
    son: (oui) => { commande(oui ? "unMute" : "mute"); if (oui) commande("setVolume", [100]); },
    volume: (x) => commande("setVolume", [x]),
    aller: () => {}, // YouTube part déjà au bon endroit (start=)
    detruire: () => { clearInterval(ecouter); commande("stopVideo"); window.removeEventListener("message", surMessage); f.remove(); },
  };
}

// ---------- TikTok : le lecteur « player/v1 », piloté par ses messages ({ type, value, "x-tiktok-player": true }) ----------
function lecteurTikTok(v, { depart, rappel }) {
  const q = new URLSearchParams({ autoplay: "1", controls: "0", progress_bar: "0", play_button: "0", volume_control: "0", fullscreen_button: "0", timestamp: "0", loop: "0", music_info: "0", description: "0", rel: "0", native_context_menu: "0", closed_caption: "0" });
  const f = cadre(`${TT}/player/v1/${encodeURIComponent(v.id)}?${q}`, "La vidéo TikTok du chat");
  const poster = (type, value) => { try { f.contentWindow?.postMessage({ type, value, "x-tiktok-player": true }, TT); } catch { /* pas encore là */ } };
  let plusLoin = 0; // la plus grande position vue : une vidéo qui repart du début au lieu de s'arrêter est finie
  const surMessage = (e) => {
    if (e.source !== f.contentWindow || e.origin !== TT) return;
    let m = e.data;
    if (typeof m === "string") { try { m = JSON.parse(m); } catch { return; } }
    if (!m || typeof m !== "object" || !m["x-tiktok-player"]) return;
    rappel.vivant();
    const x = m.value;
    if (m.type === "onPlayerReady") rappel.pret();
    else if (m.type === "onStateChange") rappel.etat(Number(x));
    else if (m.type === "onCurrentTime" && x && typeof x === "object") {
      const t = Number(x.currentTime), d = Number(x.duration);
      if (d > 0 && plusLoin > d - 1.5 && t < plusLoin - 2) { rappel.etat(0); return; }
      if (t > plusLoin) plusLoin = t;
      rappel.temps(t, d);
    } else if (m.type === "onMute") rappel.muet(Boolean(x));
    else if (m.type === "onPlayerError") {
      const code = Number(x?.errorCode);
      if (code === 3002) rappel.bloque(); // le navigateur bloque la lecture avec le son : elle repart muette
      else rappel.erreur(`tiktok ${code || x?.errorType || "?"}`);
    }
  };
  window.addEventListener("message", surMessage);
  return {
    noeud: f,
    jouer: () => poster("play"),
    son: (oui) => poster(oui ? "unMute" : "mute"),
    volume: (x) => { if (x <= 0) poster("mute"); }, // TikTok n'a pas de volume, seulement couper le son
    aller: (s) => { if (s >= 1) poster("seekTo", Math.floor(s)); }, // (après le départ : avant, TikTok ignore les ordres)
    detruire: () => { poster("pause"); window.removeEventListener("message", surMessage); f.remove(); },
  };
}

// ---------- ?essai=video : une fausse vidéo dessinée dans la page (pas de lecteur, pas de bot), avec une cloche ----------
function lecteurEssai(v, { rappel }) {
  const n = el("div", `vid-faux ${v.site}`, el("div", "vid-faux-icone", v.site === "tiktok" ? "♪" : "▶"), el("div", "vid-faux-texte", "Vidéo d'exemple"));
  const duree = 14;
  let t0 = 0, fini = false;
  const minuteurs = [
    setTimeout(() => { rappel.vivant(); rappel.pret(); }, 300),
    setTimeout(() => { t0 = Date.now(); rappel.etat(1); try { const a = new Audio("/son/cloche.m4a"); a.volume = 0.8; a.play().catch(() => {}); } catch { /* pas de son */ } }, 700),
  ];
  const tic = setInterval(() => {
    if (!t0) return;
    const t = (Date.now() - t0) / 1000;
    rappel.temps(t, duree);
    if (t >= duree && !fini) { fini = true; rappel.etat(0); }
  }, 250);
  return { noeud: n, jouer() {}, son() {}, volume() {}, aller() {}, detruire() { clearInterval(tic); for (const x of minuteurs) clearTimeout(x); n.remove(); } };
}
const EXEMPLES = [
  { site: "youtube", id: "essai", vertical: false, titre: "Le plus beau coucher de soleil de GRAND LINE (vidéo d'exemple)", auteur: "Une chaîne YouTube", par: "Moussaillon" },
  { site: "tiktok", id: "essai", vertical: true, titre: "Une vidéo TikTok d'exemple, debout comme sur le téléphone", auteur: "@exemple", par: "Vigie" },
];

export function demarrer({ scene, P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "video";
  const COIN = COINS.includes(P.get("coin")) ? P.get("coin") : "centre";
  const PSEUDOS = P.get("pseudos") !== "non";
  const DANS_OBS = Boolean(window.obsstudio || window.streamlabsOBS);
  document.title = "Les vidéos du chat pour OBS · Barhaw";

  let ws = null;
  let adresse = "";
  let lu = false; // le site a répondu au moins une fois
  let branche = false; // le bot a dit bonjour
  let essais = 0;
  let minuteur = null;
  let vu = 0; // le dernier message du bot
  let attente = 0;
  let ouvert = true;
  let ici = null; // la vidéo à l'écran
  let nEssai = 0;
  const finies = new Map(); // n → raison : les dernières vidéos finies ici (on ne les rejoue pas, on redit au bot qu'elles sont finies)
  const envoyes = []; // (pour les essais : ce que la page a dit au bot)

  const dire = (x) => {
    envoyes.push(x);
    if (envoyes.length > 50) envoyes.shift();
    try { if (ws?.readyState === 1) ws.send(JSON.stringify(x)); } catch { /* la connexion revient : le bot redemande */ }
  };

  // ---------- la carte : la vidéo, qui l'a mise, son titre, le temps qu'il lui reste ----------
  function carte(v) {
    const vertical = Boolean(v.vertical) || v.site === "tiktok";
    const nomSite = v.site === "tiktok" ? "TikTok" : "YouTube";
    const c = {
      cadre: el("div", "vid-cadre"),
      temps: el("b", "vid-temps", ""),
      jauge: el("i", ""),
      note: el("div", "vid-note", "🔇 Clique sur la page pour le son (OBS n'en a pas besoin)"),
      file: el("span", "vid-file", ""),
    };
    c.note.hidden = true;
    const qui = el("div", "vid-qui", PSEUDOS && v.par ? `La vidéo de @${String(v.par).slice(0, 30)}` : "Une vidéo du chat");
    const info = el("div", "vid-info",
      el("div", "vid-haut", el("span", "vid-clap", "🎬"), qui, c.temps),
      el("div", "vid-titre", String(v.titre || `Une vidéo ${nomSite}`).slice(0, 140)),
      el("div", "vid-auteur", el("span", `vid-site ${v.site}`, nomSite), v.auteur ? ` ${String(v.auteur).slice(0, 60)}` : ""),
      el("div", "vid-jauge", c.jauge),
      c.note);
    const pied = el("div", "vid-pied", "Mets la tienne dans le chat : ", el("b", "", "!video + lien"), c.file);
    c.boite = el("div", `vid coin-${COIN}${vertical ? " vertical" : ""}`, c.cadre, el("div", "vid-cote", info, pied));
    return c;
  }
  const majFile = () => {
    if (!ici) return;
    const t = attente ? ` · ${attente} en attente` : "";
    if (ici.c.file.textContent !== t) ici.c.file.textContent = t;
  };
  const majNote = (a) => { a.c.note.hidden = DANS_OBS || !(a.muet || !a.veutSon); };

  // ---------- une vidéo arrive ----------
  function jouer(v, deja = 0) {
    if (!v || typeof v !== "object" || !["youtube", "tiktok"].includes(v.site) || typeof v.id !== "string" || !v.id) return;
    v.n = Number(v.n) || 0;
    if (ici && ici.v.n === v.n && !ici.fini) return; // déjà à l'écran (la connexion est revenue)
    if (finies.has(v.n)) { dire({ k: "fin", n: v.n, raison: finies.get(v.n) }); return; } // finie pendant une coupure
    enlever(ici, { vite: true });
    const total = Math.max(5, Number(v.dureeMax) || 90);
    deja = Math.max(0, Number(deja) || 0);
    const reste = total - deja;
    if (reste < 3) { finies.set(v.n, "coupe"); dire({ k: "fin", n: v.n, raison: "coupe" }); return; }
    const recu = Date.now();
    const a = ici = { v, c: carte(v), recu, reste, limite: recu + (reste + MARGE) * 1000, depart: (v.site === "tiktok" ? 0 : Number(v.debut) || 0) + deja, lecture: 0, coupeA: 0, vivant: false, demarre: false, muet: false, veutSon: true, essaisSon: 0, temps: NaN, duree: NaN, fini: false, coupe: false, minuteurs: [] };
    const rappel = {
      vivant: () => { a.vivant = true; },
      pret: () => { if (a.fini) return; a.lecteur.son(a.veutSon); a.lecteur.jouer(); },
      etat: (e) => {
        if (a.fini || a.coupe) return;
        if (e === 1 || e === 3) a.demarre = true;
        if (e === 1 && !a.lecture) {
          a.lecture = Date.now();
          a.coupeA = Math.min(a.lecture + a.reste * 1000, a.limite);
          if (v.site === "tiktok" && a.depart >= 1) a.lecteur.aller(a.depart); // reprise au milieu (YouTube y est déjà)
          if (a.veutSon) a.lecteur.son(true);
          a.c.boite.classList.add("lit");
        }
        if (e === 0 && a.lecture) finir(a, "fini");
      },
      temps: (t, d) => { if (Number.isFinite(t)) a.temps = t; if (d > 0) a.duree = d; },
      muet: (m) => {
        a.muet = m;
        // dans OBS, le son doit passer : on le redemande (trois fois au plus)
        if (m && a.veutSon && a.lecture && a.essaisSon < 3) { a.essaisSon += 1; a.lecteur.son(true); }
        majNote(a);
      },
      bloque: () => { if (a.fini) return; a.veutSon = false; a.lecteur.son(false); a.lecteur.jouer(); majNote(a); },
      erreur: () => finir(a, "erreur"),
    };
    const fabrique = ESSAI ? lecteurEssai : v.site === "tiktok" ? lecteurTikTok : lecteurYouTube;
    a.lecteur = fabrique(v, { depart: a.depart, rappel });
    a.c.cadre.append(a.lecteur.noeud);
    scene.append(a.c.boite);
    void a.c.boite.offsetWidth; // (la carte est posée : elle peut entrer)
    a.c.boite.classList.add("entre");
    a.minuteurs.push(
      setTimeout(() => { if (!a.fini && !a.vivant) finir(a, "erreur"); }, SANS_REPONSE),
      setTimeout(() => { if (!a.fini && !a.lecture) finir(a, "erreur"); }, SANS_DEPART),
      setTimeout(() => { if (!a.fini && !a.demarre && !DANS_OBS) rappel.bloque(); }, MUETTE_APRES),
    );
    majFile();
    majTemps(a, Date.now());
  }

  // ---------- le temps qu'il reste (avant la fin de la vidéo ou la coupure), et la coupure ----------
  function majTemps(a, t) {
    if (!a.lecture) { if (a.c.temps.textContent !== "…") a.c.temps.textContent = "…"; return; }
    const coupure = (a.coupeA - t) / 1000;
    const finVideo = a.duree > 0 && Number.isFinite(a.temps) ? a.duree - a.temps : Infinity;
    const reste = Math.max(0, Math.min(coupure, finVideo));
    const passe = (t - a.lecture) / 1000;
    const texte = minSec(reste);
    if (a.c.temps.textContent !== texte) a.c.temps.textContent = texte;
    a.c.jauge.style.width = `${Math.min(100, (100 * passe) / Math.max(0.1, passe + reste)).toFixed(1)}%`;
  }
  function couper(a) {
    if (a.coupe || a.fini) return;
    a.coupe = true;
    // le son baisse en moins d'une seconde (YouTube ; TikTok coupe d'un coup), puis la vidéo s'en va
    [70, 45, 25, 10, 0].forEach((x, k) => a.minuteurs.push(setTimeout(() => { if (!a.fini) a.lecteur.volume(x); }, 160 * (k + 1))));
    a.minuteurs.push(setTimeout(() => finir(a, "coupe"), 950));
  }
  setInterval(() => {
    const a = ici;
    if (!a || a.fini) return;
    const t = Date.now();
    if ((a.lecture && t >= a.coupeA) || t >= a.limite) { couper(a); return; }
    majTemps(a, t);
  }, 200);

  // ---------- la fin d'une vidéo : la page le dit au bot (qui envoie la suivante 2,5 s plus tard) ----------
  function finir(a, raison) {
    if (!a || a.fini) return;
    a.fini = true;
    finies.set(a.v.n, raison);
    if (finies.size > 20) finies.delete(finies.keys().next().value);
    // (le bot ignore un « fini » dans la toute première seconde : on attend qu'elle soit passée)
    const plusTard = raison === "erreur" ? 0 : Math.max(0, 1700 - (Date.now() - a.recu));
    setTimeout(() => dire({ k: "fin", n: a.v.n, raison }), plusTard);
    if (raison === "erreur") {
      // la carte dit pourquoi rien ne passe, le temps que le chat le lise
      for (const x of a.minuteurs) clearTimeout(x);
      a.lecteur.detruire();
      a.c.cadre.append(el("div", "vid-rate", el("b", "", "⚠️"), el("span", "", "Cette vidéo ne peut pas passer"), el("small", "", "privée, supprimée ou bloquée hors du site")));
      a.c.temps.textContent = "";
      a.minuteurs.push(setTimeout(() => enlever(a), MONTRER_ERREUR));
    } else enlever(a);
    if (ESSAI) setTimeout(essaiSuivant, 2500);
  }
  function enlever(a, { vite = false } = {}) {
    if (!a) return;
    if (ici === a) ici = null;
    a.fini = true;
    for (const x of a.minuteurs) clearTimeout(x);
    try { a.lecteur?.detruire(); } catch { /* déjà parti */ }
    const b = a.c.boite;
    b.classList.remove("entre");
    b.classList.add("sort");
    setTimeout(() => b.remove(), vite ? 0 : 450);
  }

  // ---------- ce que dit le bot ----------
  function surBot(m) {
    if (!m || typeof m !== "object") return;
    if (m.k === "etat") {
      branche = true;
      lireFile(m);
      if (m.v) jouer(m.v, m.v.deja);
      else if (ici && !ici.fini) enlever(ici); // le bot n'a plus rien en cours (il a redémarré)
    } else if (m.k === "joue") jouer(m.v);
    else if (m.k === "stop") { if (ici && ici.v.n === Number(m.n)) { finies.set(ici.v.n, "passee"); enlever(ici); } }
    else if (m.k === "file") lireFile(m);
    majAide();
  }
  function lireFile(m) {
    attente = Math.max(0, Number(m.attente) || 0);
    ouvert = m.ouvert !== false;
    majFile();
  }

  // ---------- la connexion au serveur en direct du bot (l'adresse vient du site) ----------
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
      const x = d.video?.adresse;
      adresse = typeof x === "string" && /^wss:\/\/[a-z0-9.-]+(:\d{1,5})?\/video$/i.test(x) ? x : "";
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
      surBot(m);
    };
    s.onclose = (e) => {
      if (ws !== s) return;
      debrancher();
      majAide();
      essais += 1;
      // 4004 : les vidéos du chat sont coupées dans le bot (VIDEO=non) ; sinon on revient vite, puis de moins en moins souvent
      plusTard(e?.code === 4004 ? 60_000 : Math.min(30_000, 1500 * 2 ** Math.min(essais, 5)));
    };
  }
  // un petit signe toutes les 15 s ; sans nouvelles du bot depuis 50 s, la connexion est morte : on en refait une
  setInterval(() => {
    if (!ws || ws.readyState !== 1) return;
    if (Date.now() - vu > 50_000) { debrancher(); majAide(); plusTard(1000); return; }
    try { ws.send(JSON.stringify({ k: "p", c: Date.now() })); } catch { /* elle se ferme */ }
  }, 15_000);

  // ---------- hors d'OBS : un clic rend le son ; un mot d'explication quand on bouge la souris ----------
  window.addEventListener("pointerdown", () => {
    const a = ici;
    if (!a || a.fini || (a.veutSon && !a.muet)) return;
    a.veutSon = true;
    a.essaisSon = 0;
    a.lecteur.son(true);
    a.muet = false;
    majNote(a);
  });
  let aide = null;
  let aideLigne = null;
  let aideMinuteur = null;
  function majAide() {
    if (!aideLigne) return;
    const t = ESSAI ? "Essai : des vidéos d'exemple, sans le bot (avec une cloche, pour vérifier le son)."
      : !lu ? "Connexion au site…"
      : !adresse ? "⏳ Le bot ne propose pas encore les vidéos du chat (sa mise à jour n'est pas installée, ou VIDEO=non dans ses réglages)."
      : branche ? `✅ Branchée au bot : les vidéos du chat passeront ici${ouvert ? "" : " (fermées pour l'instant : !video on)"}.${attente ? ` ${attente} en attente.` : ""}`
      : "⏳ Connexion au bot…";
    if (aideLigne.textContent !== t) aideLigne.textContent = t;
  }
  function montrerAide() {
    if (DANS_OBS) return;
    if (!aide) {
      const exemple = new URLSearchParams(location.search);
      exemple.set("essai", "video");
      exemple.set("fond", "oui");
      const lien = el("a", "", "Voir un exemple");
      lien.href = `${location.pathname}?${exemple}`;
      aideLigne = el("p", "aide-etat", "");
      aide = el("div", "aide",
        el("b", "", "Les vidéos du chat pour OBS"),
        el("p", "", "Cette page reste vide tant qu'aucune vidéo ne passe. Quand un viewer tape « !video » et un lien YouTube ou TikTok dans le chat Twitch, la vidéo passe ici avec le son, coupée au bout de 90 s."),
        el("p", "", "Dans OBS : une nouvelle source « Navigateur » avec cette adresse, en 1920 × 1080, et « Contrôler l'audio via OBS » coché. Dans un navigateur, clique une fois sur la page pour entendre le son."),
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

  // ---------- ?essai=video ----------
  function essaiSuivant() {
    if (ici) return;
    const x = EXEMPLES[nEssai % EXEMPLES.length];
    nEssai += 1;
    attente = nEssai % 3;
    jouer({ ...x, n: nEssai, debut: 0, dureeMax: 90 });
  }

  window.__obsVideo = {
    etat: () => ({ essai: ESSAI, adresse, lu, branche, attente, ouvert, coin: COIN, obs: DANS_OBS, ici: ici ? { n: ici.v.n, site: ici.v.site, lecture: Boolean(ici.lecture), coupeA: ici.coupeA, reste: ici.reste, depart: ici.depart, muet: ici.muet, veutSon: ici.veutSon, fini: ici.fini, temps: ici.c.temps.textContent } : null, envoyes: envoyes.slice() }),
  };
  if (ESSAI) { setTimeout(essaiSuivant, 800); return; }
  brancher();
}
