// GRAND LINE dans le live : les alertes pour OBS (la page /obs, à poser en « source navigateur »).
// Rien ne s'affiche en dehors des alertes :
//   · « Terre en vue » quand l'équipage accoste (et le trésor, au bout de la route) ;
//   · le vote du carrefour : à l'ouverture, un petit rappel de temps en temps, puis la route choisie ;
//   · ce qui arrive en mer (tempête, monstre marin, vent arrière, bouteille, vaisseau fantôme, maître des lieux) ;
//   · le BOSS LIVE : son réveil, une barre de vie pendant le combat, puis la fin ;
//   · la sortie de la VF 1.0 : une barre les dix dernières minutes, les dix dernières secondes en grand, puis l'annonce ;
//   · la Guerre des commus : « bataille dans 5 minutes », une barre la dernière minute (puis « la bataille fait rage »),
//     les résultats de chaque bataille de 21 h, la commu qui règne à la fin de la saison, et de temps en temps, pendant le
//     live du capitaine, « vos troupes comptent double ». Seulement des noms de commus et d'îles, jamais de joueurs.
// Les données sont celles du site (/api/public, /api/bosslive) : rien de plus que ce que tout le monde y voit déjà, et aucun
// pseudo n'est affiché. La page ne garde que l'heure de ce qu'elle a déjà annoncé (dans le navigateur d'OBS), pour ne pas
// le redire quand on la recharge. Avant l'ouverture de la VF, les îles gardent leur image d'avant (img/iles) : les cartes
// postales de la nouvelle carte (img/obs) ne se montrent qu'après, comme sur le site (une île sans carte postale prend alors
// son image du niveau 5, img/iles/<id>-v5.webp ; un boss, img/boss/<id>-v5.webp).
// Réglages dans l'adresse : ?commu=<id> (l'équipage suivi ; sans rien : barhaw) · ?place=haut|milieu|bas · ?son=non ·
// ?rappel=<minutes> (le rappel du vote : 15 sans rien, 0 pour aucun rappel, ni celui du vote ni le « ×2 » de la guerre) ·
// ?fond=oui (un fond sombre, pour régler la page dans un onglet) · ?guerre=essai (montrer aussi la saison d'essai de la Guerre :
// sans ça, elle ne passe jamais à l'écran, pour ne rien dévoiler pendant un live) ·
// ?essai=terre|tresor|vote|rappel|choisi|mer|monstre|boss|vaincu|fui|bientot|compte|sortie|guerre|derniere|bataille|regne|x2|tout
// (des alertes d'exemple en boucle, sans rien demander au bot, pour placer la source).
// LA MER EN DIRECT : ?mer (la mer de l'équipage suivi) ou ?mer=<commu> : pendant une course, la mer vue de haut, le top 5 et
// les alertes (la mer ouvre, le vainqueur, le coffre). Le top 5 montre les pseudos Discord, comme le site ; ?pseudos=non pour
// montrer la commu à la place. ?coin=bas-gauche|bas-droite|haut-gauche|haut-droite (bas-gauche sans rien) ·
// ?essai=course : une course d'exemple en boucle, jouée dans la page, avec des barques aux noms inventés.
// LES VIDÉOS DU CHAT : ?video, une source navigateur à part, rien que pour elles (« !video <lien> » dans le chat Twitch ; pas
// d'alertes dans cette source-là) : tout est dans js/obs-video.js. ?essai=video : des vidéos d'exemple, pour placer la source.
// LES WIDGETS NÉON (VF 1.0), chacun dans sa source navigateur, sans alertes : ?chat (le chat Twitch à l'écran, branché
// directement sur Twitch : js/obs-chat.js), ?objectifs (l'objectif sub et l'objectif follow, envoyés par le bot :
// js/obs-objectifs.js) et ?sondage (les sondages Twitch de la chaîne, envoyés par le bot : js/obs-sondage.js).
// ?essai=chat, ?essai=objectifs et ?essai=sondage : une démo en boucle, pour placer la source.
// LA FÊTE : ?party (« !party » du streamer ou d'un modo dans le chat : 2 min de confettis et de lumières de boîte de nuit
// par-dessus la cam ; js/obs-party.js). ?essai=party : une fête de 9 s toutes les 14 s.
// LE BONK : ?bonk (une récompense de points de chaîne → un marteau gonflable tombe sur la tête du streamer, « BONK ! » et
// des étoiles ; envoyé par le bot : js/obs-bonk.js). ?essai=bonk : un bonk toutes les 6 s, pour viser la tête.
// LES SONS QUI FONT PEUR : ?peur=<chaîne> (une récompense de points de chaîne → un son dans le micro du jeu, par OBS et un
// câble audio virtuel : js/obs-peur.js) ; rien à l'écran. ?essai=peur : un son toutes les 8 s, pour régler le câble.
(() => {
  "use strict";
  const P = new URLSearchParams(location.search);
  const COMMU = (P.get("commu") || "barhaw").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "barhaw";
  const ESSAI = (P.get("essai") || "").toLowerCase();
  const SON = P.get("son") !== "non";
  const RAPPEL = (/^\d{1,3}$/.test(P.get("rappel") || "") ? Math.min(180, Number(P.get("rappel"))) : 15) * 60_000;
  const PLACE = ["haut", "milieu", "bas"].includes(P.get("place")) ? P.get("place") : "haut";
  const FRAIS = 180_000; // on n'annonce que ce qui vient d'arriver (la page a pu rester fermée des heures)
  const OUVERTURE_VF = Date.parse("2026-12-22T20:30:00Z"); // la VF 1.0 : mardi 22 décembre 2026 à 21 h 30 (Paris) ; le bot peut dire une autre heure
  const scene = document.getElementById("obs");
  document.body.classList.add(`place-${PLACE}`);
  if (P.get("fond") === "oui") document.body.classList.add("fond");
  if (P.has("video") || ESSAI === "video") {
    import("/js/obs-video.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  // (1rem = 10 px d'une source large de 560 px pour le chat, de 600 px pour les objectifs : voir obs.html)
  if (P.has("chat") || ESSAI === "chat") {
    document.documentElement.classList.add("w-chat");
    import("/js/obs-chat.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  if (P.has("party") || ESSAI === "party") {
    // la fête (!party dans le chat) : confettis, lumières de boîte de nuit, boule à facettes, par-dessus la cam
    import("/js/obs-party.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  if (P.has("bonk") || ESSAI === "bonk") {
    // le BONK (points de chaîne) : un marteau gonflable sur la tête, par-dessus la cam
    import("/js/obs-bonk.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  if (P.has("peur") || ESSAI === "peur") {
    // les sons qui font peur : rien à l'écran, seulement le son (vers le micro du jeu, par le câble audio virtuel)
    import("/js/obs-peur.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  // LES SONDAGES TWITCH (D.A. Néon) : envoyés par le bot (js/obs-sondage.js) ; 1rem = 10 px d'une source large de 600 px
  if (P.has("sondage") || ESSAI === "sondage") {
    document.documentElement.classList.add("w-sondage");
    import("/js/obs-sondage.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }
  if (P.has("objectifs") || ESSAI === "objectifs") {
    document.documentElement.classList.add("w-objectifs");
    import("/js/obs-objectifs.js").then((m) => m.demarrer({ scene, P })).catch(() => { /* le module viendra au prochain chargement */ });
    return;
  }

  // les îles qui ont leur carte postale (img/obs/<id>.webp, tirée de la nouvelle carte) ; les autres montrent leur maquette
  const CARTES = new Set(["moussaillons", "recif", "braise", "givre", "lucioles", "champignons", "engloutie", "vents", "marche", "arbre", "ambre", "phare", "tonnerre", "tresor", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"]);
  const BOSS = new Set(["morghast", "voraxia", "krakor"]);
  const SONS = { cloche: "/son/cloche.m4a", taiko: "/son/taiko.m4a", victoire: "/son/victoire.m4a", carte: "/son/carte.m4a", pop: "/son/pop.m4a", fanfare: "/son/br-fanfare.m4a", roulement: "/son/br-roulement.m4a" };
  const RAPPEL_GUERRE = RAPPEL ? Math.max(RAPPEL, 45 * 60_000) : 0; // « vos troupes comptent double » : toutes les 45 min au plus
  const GUERRE_ESSAI = P.get("guerre") === "essai"; // la saison d'essai (/guerre essai) : seulement si on la demande

  // ---------- ce que la page sait ----------
  let decal = 0; // l'heure du bot moins celle de ce PC
  let equipage = ""; // le nom de l'équipage suivi (la flotte le donne)
  let ouverture = OUVERTURE_VF; // l'heure d'ouverture de la VF 1.0
  let vfBot = null; // ce qu'en dit le bot : ouverte (true), pas encore (false) ; sans réponse, c'est l'heure qui compte
  let sortieLe = 0; // l'instant que vise le compte à rebours (0 : aucun)
  let depart = 0; // le départ de la course, quand la flotte est en mer
  let attente = 0; // ce qu'il reste avant la sortie, quand c'est moins de dix minutes
  let bientotPour = 0; // la sortie pour laquelle « dans 10 minutes » a déjà été dit
  let chiffre = null; // { zone, valeur } : les dix dernières secondes, en grand
  let combat = null; // le BOSS LIVE en cours
  let barre = null; // { genre, zone, noeud } : la vie du boss, ou le compte à rebours
  let vote = null; // le vote ouvert
  let guerre = null; // la Guerre des commus, telle que le site la montre (/api/public)
  let avantBataille = 0; // ce qu'il reste avant la bataille de 21 h, la dernière minute
  let rage = false; // 21 h est passé et les résultats ne sont pas encore là
  let rageDepuis = 0;
  let dernierX2 = 0; // le dernier « vos troupes comptent double »
  let dernierRappel = 0;
  let dejaLu = false; // le site a déjà répondu une fois
  const file = []; // les alertes qui attendent leur tour
  let enCours = null;
  const maintenant = () => Date.now() + decal;
  const vf = () => vfBot === true || (vfBot !== false && maintenant() >= ouverture);

  // ce que la page a déjà annoncé (gardé d'une fois sur l'autre ; jamais pendant un essai)
  const CLE = `barhaw-obs-${COMMU}`;
  let memoire = {};
  if (!ESSAI) { try { memoire = JSON.parse(localStorage.getItem(CLE) || "{}") || {}; } catch { memoire = {}; } }
  const retenir = () => { if (ESSAI) return; try { localStorage.setItem(CLE, JSON.stringify(memoire)); } catch { /* pas de stockage : on s'en passe */ } };

  // ---------- les petites pièces ----------
  const el = (balise, classe, ...enfants) => {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    // du texte ou des nœuds, jamais de HTML venu d'ailleurs ; le texte garde ses espaces insécables (« ! », « : », « % »)
    for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(typeof e === "string" ? e.replace(/ ([!?:;%»])/g, "\u00a0$1").replace(/« /g, "«\u00a0") : e);
    return n;
  };
  const propre = (id) => String(id || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  const fr = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR");
  const titre = (texte) => el("div", `al-titre${texte.length > 18 ? " long" : ""}`, texte);
  const nomIle = (ile) => `${ile?.emoji ? `${ile.emoji} ` : ""}${ile?.nom || "une île inconnue"}`;
  const maquetteIle = (id) => `/img/iles/${id}${vf() ? "-v5" : ""}.webp`; // l'image de l'île (au niveau 5 une fois la VF ouverte)
  const adresseIle = (id) => (vf() && CARTES.has(id) ? `/img/obs/${id}.webp` : maquetteIle(id));
  function imageIle(ile, classe) {
    const id = propre(ile?.id);
    const cadre = el("div", classe);
    if (!id) { cadre.hidden = true; return cadre; }
    const maquette = maquetteIle(id);
    const i = el("img");
    i.alt = "";
    i.decoding = "async";
    i.addEventListener("error", () => { // pas de carte postale : la maquette ; pas de maquette : pas d'image
      if (cadre.classList.contains("maquette")) cadre.hidden = true;
      else { cadre.classList.add("maquette"); i.src = maquette; }
    });
    i.src = adresseIle(id);
    if (i.getAttribute("src") === maquette) cadre.classList.add("maquette");
    cadre.append(i);
    return cadre;
  }
  const precharger = (ile) => { const id = propre(ile?.id); if (id) new Image().src = adresseIle(id); };
  function imageBoss(c, classe) {
    const id = propre(c?.boss);
    const i = el("img", classe);
    i.alt = "";
    i.addEventListener("error", () => { i.hidden = true; });
    i.src = `/img/boss/${BOSS.has(id) ? id : "morghast"}${vf() ? "-v5" : ""}.webp`;
    return i;
  }
  const jauge = (part, classe = "") => { const j = el("div", `jauge${classe ? ` ${classe}` : ""}`, el("i")); j.firstChild.style.width = `${(Math.max(0, Math.min(1, part)) * 100).toFixed(1)}%`; return j; };
  const duree = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`;
    if (s >= 60) return `${Math.floor(s / 60)} min`;
    return `${s} s`;
  };
  const chrono = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
  const jouer = (nom) => { if (!SON || !SONS[nom]) return; try { const a = new Audio(SONS[nom]); a.volume = 0.8; a.play().catch(() => {}); } catch { /* pas de son : tant pis */ } };
  const montrer = (noeud) => { void noeud.offsetWidth; noeud.classList.add("entre"); }; // le départ est posé : l'entrée peut s'animer

  // L'heure du bot (il la donne avec le BOSS LIVE), pour que le compte à rebours tombe juste même si l'horloge du PC avance
  // ou retarde. Vercel peut rendre une réponse vieille de quelques secondes : de toutes les mesures des cinq dernières
  // minutes, on garde la plus fraîche (le plus grand écart).
  const mesures = [];
  function mesurer(heureBot) {
    const t = Date.now();
    if (!(heureBot > 1.6e12)) return;
    mesures.push({ t, d: heureBot - t });
    while (mesures.length > 1 && Math.abs(t - mesures[0].t) > 300_000) mesures.shift();
    decal = Math.max(...mesures.map((m) => m.d));
  }

  // ---------- les alertes : une à la fois, chacune son tour ----------
  const retenue = () => attente > 0 && attente <= 26_000; // juste avant la sortie de la VF : la place est gardée pour le compte à rebours
  function annoncer(alerte, devant = false) { // { nom, duree, son, faire() → nœud, suivre?(nœud) : 4 fois par seconde tant qu'elle est là }
    if (!alerte) return;
    if (devant) file.unshift(alerte);
    else if (file.length < 6) file.push(alerte);
    suivante();
  }
  function suivante() {
    if (enCours || !file.length || retenue()) return;
    const a = file.shift();
    let noeud = null;
    try { noeud = a.faire(); } catch { noeud = null; }
    if (!noeud) return suivante();
    const zone = el("div", "zone", noeud);
    scene.append(zone);
    const moi = { ...a, noeud, zone, parti: false };
    moi.partir = () => {
      if (moi.parti) return;
      moi.parti = true;
      clearTimeout(moi.minuteur);
      noeud.classList.add("sort");
      setTimeout(() => { zone.remove(); if (enCours === moi) enCours = null; majBarre(); suivante(); }, 450);
    };
    moi.minuteur = setTimeout(moi.partir, a.duree);
    enCours = moi;
    majBarre();
    montrer(noeud);
    jouer(a.son);
  }

  // ---------- chaque alerte ----------
  const entete = () => `GRAND LINE${equipage ? ` · ${equipage}` : ""}`;
  const alTerre = (e) => ({
    nom: e.tresor ? "tresor" : "terre", duree: 12_000, son: e.tresor ? "victoire" : "cloche",
    faire: () => el("div", `al al-papier${e.tresor ? " al-or" : ""}`,
      imageIle(e, "al-image"),
      el("div", "al-texte",
        el("div", "al-sur", entete()),
        titre(e.tresor ? "LE TRÉSOR EST TROUVÉ !" : "TERRE EN VUE !"),
        el("div", "al-nom", nomIle(e)),
        el("div", "al-info", e.tresor ? "L'équipage est allé au bout de la route" : e.etape && e.etapes ? `Étape ${e.etape} sur ${e.etapes}` : "L'équipage accoste"))),
  });
  function cartesVote(v) {
    const choix = v.choix.slice(0, 3);
    const total = Math.max(0, Number(v.total) || 0);
    const grille = el("div", `vote-choix${choix.length > 2 ? " trois" : ""}`, ...choix.map((c) => {
      const part = total ? (Number(c.voix) || 0) / total : 0;
      return el("div", "choix", imageIle(c, "choix-image"), el("div", "choix-corps",
        el("div", "choix-ligne", el("div", "choix-nom", nomIle(c)), el("div", "choix-pct", `${Math.round(part * 100)} %`)), jauge(part)));
    }));
    grille.style.setProperty("--n", String(choix.length || 2));
    return grille;
  }
  const tempsVote = (v) => { const r = v.fin - maintenant(); return r > 0 ? `Encore ${duree(r)}` : "Dernières secondes"; };
  const alVote = (v, rappel = false) => ({
    nom: rappel ? "rappel" : "vote", duree: rappel ? 10_000 : 15_000, son: rappel ? "" : "carte",
    faire: () => el("div", `al al-nuit vote${rappel ? " rappel" : ""}`,
      el("div", "vote-tete", el("div", "pastille", rappel ? "LE CARREFOUR : VOTEZ !" : "CARREFOUR : LA COMMU VOTE !"), el("div", "vote-temps", tempsVote(v))),
      cartesVote(v),
      el("div", "vote-pied", `${entete()} · Pour voter : ${location.host} ou le Discord`)),
    suivre: (n) => { const t = n.querySelector(".vote-temps"); if (t) t.textContent = tempsVote(v); },
  });
  const alChoisi = (ile) => ({
    nom: "choisi", duree: 11_000, son: "cloche",
    faire: () => el("div", "al al-papier",
      imageIle(ile, "al-image"),
      el("div", "al-texte", el("div", "al-sur", entete()), titre("LA COMMU A CHOISI"), el("div", "al-nom", `Cap sur ${nomIle(ile)}`))),
  });
  // ce que le bot demande à l'équipage pendant chaque événement (les mêmes règles que ses annonces sur le Discord)
  const CONSIGNES = {
    tempete: (ev) => (ev.objectif ? `Ramez ${fr(ev.objectif)} milles pour la traverser !` : "Ramez pour la traverser !"),
    monstre: () => "Chaque mille ramé est un coup : repoussez-le !",
    vent: () => "Tout ce que vous faites compte une fois et demie !",
    bouteille: () => `Le premier qui l'ouvre gagne son contenu : ${location.host} ou le Discord`,
    fantome: (ev) => (ev.objectif ? `Ramez ${fr(ev.objectif)} milles pour le semer !` : "Ramez pour le semer !"),
    maitre: () => "Chaque mille ramé est un coup : battez-le pour son trésor !",
  };
  const alMer = (ev, ile) => ({
    nom: "mer", duree: 11_000, son: ev.type === "vent" || ev.type === "bouteille" ? "cloche" : "taiko",
    faire: () => el("div", "al al-nuit",
      el("div", "al-emoji", String(ev.emoji || "🌊")),
      el("div", "al-texte",
        el("div", "al-sur", ev.type === "maitre" && ile?.nom ? `${entete()} · ${ile.nom}` : entete()),
        titre(ev.type === "maitre" ? "LE MAÎTRE DES LIEUX !" : String(ev.titre || "Du nouveau en mer !").toUpperCase()),
        ev.type === "maitre" && ev.nom ? el("div", "al-nom", String(ev.nom)) : null,
        el("div", "al-info", (CONSIGNES[ev.type] || (() => `Ça se passe sur ${location.host}`))(ev)))),
  });
  const vieBoss = (c) => Math.max(0, Math.min(1, (Number(c?.pv) || 0) / Math.max(1, Number(c?.pvMax) || 1)));
  const alBoss = (c) => ({
    nom: "boss", duree: 9000, son: "taiko",
    faire: () => el("div", "al al-nuit boss",
      imageBoss(c, "boss-image"),
      el("div", "boss-corps",
        el("div", "pastille rose", "BOSS LIVE"),
        el("div", "boss-nom", String(c.nom || "LE BOSS")),
        c.titre ? el("div", "boss-titre", String(c.titre)) : null,
        el("div", "boss-vie", el("span", "", "Sa vie"), el("b", "", `${Math.round(vieBoss(c) * 100)} %`)),
        jauge(vieBoss(c), "grande"),
        el("div", "al-info", "Chaque message du chat le frappe !"),
        el("div", "al-info", "!frappe : un coup lourd"))),
    suivre: (n) => {
      const v = vieBoss(combat || c);
      n.querySelector(".jauge i").style.width = `${(v * 100).toFixed(1)}%`;
      n.querySelector(".boss-vie b").textContent = `${Math.round(v * 100)} %`;
    },
  });
  const alBossFin = (c) => ({
    nom: c.gagne ? "vaincu" : "fui", duree: 11_000, son: c.gagne ? "victoire" : "",
    faire: () => el("div", `al ${c.gagne ? "al-papier al-or" : "al-nuit"} boss fin`,
      imageBoss(c, "boss-image"),
      el("div", "boss-corps",
        el("div", "pastille rose", "BOSS LIVE"),
        titre(c.gagne ? `${c.nom || "LE BOSS"} EST VAINCU !` : `${c.nom || "LE BOSS"} S'ENFUIT…`),
        el("div", "al-info", c.gagne ? "Des berrys et des milles pour tous ceux qui ont frappé" : "Il reviendra : la prochaine fois sera la bonne"))),
  });
  const alBientot = () => ({
    nom: "bientot", duree: 9000, son: "cloche",
    faire: () => el("div", "al al-nuit",
      el("div", "al-emoji", "⏳"),
      el("div", "al-texte", el("div", "al-sur", "Barhaw"), titre("LA VF 1.0 SORT DANS 10 MINUTES !"), el("div", "al-info", `Ça se passe sur ${location.host}`))),
  });
  const alSortie = () => ({
    nom: "sortie", duree: 28_000, son: "victoire",
    faire: () => el("div", "al al-papier sortie",
      el("div", "sortie-vf", "VF 1.0"),
      el("div", "sortie-titre", "C'EST PARTI !"),
      // le détail de la VF ne se dit qu'une fois sortie (un essai avant l'heure reste discret)
      el("div", "sortie-ligne", vfBot === true || maintenant() >= ouverture ? "GRAND LINE : la course des équipages est lancée" : "La grande mise à jour du site est en ligne"),
      el("div", "sortie-site", location.host)),
  });

  // ---------- la Guerre des commus ----------
  const nomCommu = (id) => String((guerre?.commus || []).find((c) => c.id === id)?.nom || id || "").slice(0, 40);
  const ileDans = (n) => String(n || "").replace(/^(L'|Le |La |Les )/, (m) => m.toLowerCase()); // « prend le Jardin de Cristal »
  const aCommu = (n) => (/^Les /.test(n) ? `aux ${n.slice(4)}` : /^Le /.test(n) ? `au ${n.slice(3)}` : `à ${n}`); // « aux Navigateurs »
  const liste = (l) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`); // « A, B et C »
  const surGuerre = () => `LA GUERRE DES COMMUS${guerre?.essai ? " · ESSAI" : guerre?.saison ? ` · SAISON ${guerre.saison}` : ""}`;
  const heureCourte = (t) => { const [h, mi] = new Date(t).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).split(":"); return `${Number(h)} h${mi !== "00" ? ` ${mi}` : ""}`; };
  const evenements = (b) => (b?.iles || []).filter((y) => y.attaques?.length || y.renfort);
  function ligneBataille(y) {
    if (y.prise) return `🏴 ${nomCommu(y.apres?.commu)} prend ${ileDans(y.nom)}${y.avant?.commu ? ` ${aCommu(nomCommu(y.avant.commu))}` : ""}`;
    if (y.attaques?.length) return `🛡️ ${y.nom} tient face ${aCommu(liste(y.attaques.map((a) => nomCommu(a.commu))))}`;
    return `🧱 ${nomCommu(y.apres?.commu)} renforce ${ileDans(y.nom)}`;
  }
  const compteIles = () => {
    const l = [...(guerre?.commus || [])].sort((a, b) => (Number(b.iles) || 0) - (Number(a.iles) || 0)).map((c) => `${c.nom} ${Number(c.iles) || 0}`);
    const libres = (guerre?.iles || []).filter((i) => !i.port && !i.commu).length;
    return l.length ? `Les îles : ${l.join(" · ")}${libres ? ` · libres ${libres}` : ""}` : "";
  };
  const alAvantBataille = (reste) => {
    const c = (guerre?.commus || []).find((x) => x.id === COMMU);
    const min = Math.max(1, Math.round(reste / 60_000));
    return {
      nom: "guerre", duree: 12_000, son: "roulement",
      faire: () => el("div", "al al-nuit guerre",
        el("div", "al-emoji", "⚔️"),
        el("div", "al-texte",
          el("div", "al-sur", `${surGuerre()} · BATAILLE ${guerre?.bataille || ""}${guerre?.batailles ? ` SUR ${guerre.batailles}` : ""}`),
          titre(`BATAILLE DANS ${min} MINUTE${min > 1 ? "S" : ""} !`),
          c ? el("div", "al-nom", `${c.nom} : ${fr(c.armee)} troupes${c.live ? " (×2 pendant le live)" : ""}`) : null,
          el("div", "al-info", `Dernières minutes pour voter : ${location.host}`))),
    };
  };
  const alBataille = (b) => {
    const evts = evenements(b);
    const prises = evts.filter((y) => y.prise && y.apres?.commu === COMMU);
    const perdues = evts.filter((y) => y.prise && y.avant?.commu === COMMU);
    const tenues = evts.filter((y) => !y.prise && y.attaques?.length && y.avant?.commu === COMMU);
    const nous = nomCommu(COMMU).toUpperCase();
    const grand = prises.length === 1 ? `${nous} PREND ${ileDans(prises[0].nom).toUpperCase()} !` : prises.length > 1 ? `${nous} PREND ${prises.length} ÎLES !`
      : perdues.length ? `${nous} PERD ${ileDans(perdues[0].nom).toUpperCase()}…` : tenues.length ? `${nous} TIENT BON !` : evts.length ? "LA BATAILLE EST FINIE" : "LA MER EST RESTÉE CALME";
    const derniere = guerre?.batailles && b.n >= guerre.batailles;
    return {
      nom: "bataille", duree: 16_000, son: prises.length ? "fanfare" : "taiko",
      faire: () => el("div", `al ${prises.length ? "al-papier al-or" : "al-nuit"} guerre resultats`,
        el("div", "al-texte",
          el("div", "al-sur", `${surGuerre()} · BATAILLE ${b.n}${guerre?.batailles ? ` SUR ${guerre.batailles}` : ""}`),
          titre(grand),
          evts.length ? el("ul", "gu-lignes", ...evts.slice(0, 4).map((y) => el("li", y.prise ? "prise" : "", ligneBataille(y)))) : null,
          el("div", "al-info", compteIles()),
          el("div", "al-info", derniere ? `C'était la dernière bataille ${guerre?.essai ? "de l'essai" : "de la saison"} !` : guerre?.essai && guerre?.prochaine ? `Prochaine bataille à ${heureCourte(guerre.prochaine)}` : `Prochaine bataille demain à ${guerre?.heure || "21 h"}`))),
    };
  };
  const alRegne = (f) => {
    const g = f?.gagnant || "";
    // (chaque commu d'un seul tenant : la ligne ne se coupe qu'entre deux commus)
    const classement = (f?.classement || []).slice(0, 4).map((x, k) => `${k + 1}. ${x.nom || nomCommu(x.id)} (${Number(x.iles) || 0} île${Number(x.iles) > 1 ? "s" : ""})`.replace(/ /g, "\u00a0")).join(" · ");
    return {
      nom: "regne", duree: 20_000, son: "victoire",
      faire: () => el("div", `al ${g === COMMU ? "al-papier al-or" : "al-nuit"} guerre regne`,
        el("div", "al-emoji", "👑"),
        el("div", "al-texte",
          el("div", "al-sur", `${surGuerre()} · C'EST FINI`),
          titre(g ? `${nomCommu(g).toUpperCase()} ${guerre?.essai ? "AURAIT RÉGNÉ" : "RÈGNE SUR GRAND LINE"} !` : "LA PAIX REVIENT SUR GRAND LINE"),
          classement ? el("div", "al-nom", classement) : null,
          el("div", "al-info", guerre?.essai ? "C'était un essai : rien ne compte pour de vrai" : g ? "Une couronne sur son navire, des milles et le titre de Conquérant pour ses soldats" : "Aucune commu n'a gardé d'île cette fois"))),
    };
  };
  const alX2 = (c) => ({
    nom: "x2", duree: 11_000, son: "cloche",
    faire: () => el("div", "al al-nuit guerre",
      el("div", "al-emoji", "⚔️"),
      el("div", "al-texte",
        el("div", "al-sur", `${surGuerre()} · ${c.nom}`),
        titre("VOS TROUPES COMPTENT DOUBLE !"),
        el("div", "al-info", "Pendant le live du capitaine : vos games, vos messages et votre temps ici font deux fois plus de troupes"),
        el("div", "al-info", `Engagez-vous et votez pour l'île de ce soir : ${location.host}`))),
  });
  // 21 h est passé et le journal n'a pas encore la bataille (le bot la compte dans la minute)
  function enRage(g) {
    if (g?.phase !== "en-cours") return false;
    const faites = Number(g.journal?.[0]?.n) || 0;
    const attendues = g.bataille ? g.bataille - 1 : g.batailles;
    return attendues > faites || Boolean(g.prochaine && maintenant() >= g.prochaine);
  }
  function lireGuerre(g) {
    guerre = g && typeof g === "object" && g.phase && g.phase !== "bientot" && (!g.essai || GUERRE_ESSAI) ? g : null;
    if (!guerre) { rage = false; return; }
    // une nouvelle bataille dans le journal : ses résultats (si elle vient de se jouer)
    const b = guerre.journal?.[0];
    const cle = b ? `${guerre.saison}:${b.n}` : "";
    if (b && memoire.bataille !== cle) {
      memoire.bataille = cle;
      retenir();
      if (maintenant() - (Number(b.t) || 0) < FRAIS) annoncer(alBataille(b));
    }
    // la fin de la saison (après les résultats de la dernière bataille)
    const f = guerre.fini;
    if (f && memoire.regne !== guerre.saison) {
      memoire.regne = guerre.saison;
      retenir();
      if (maintenant() - (Number(f.t) || 0) < FRAIS + 600_000) annoncer(alRegne(f));
    }
    const r = enRage(guerre);
    if (r && !rage) rageDepuis = maintenant();
    rage = r;
  }
  function surveillerGuerre() {
    const g = guerre;
    // la bataille approche : « dans 5 minutes » (une fois par bataille), puis la barre la dernière minute
    const reste = g?.phase === "en-cours" && g.prochaine ? g.prochaine - maintenant() : 0;
    const cle = g ? `${g.saison}:${g.bataille}` : "";
    if (reste > 30_000 && reste <= 300_000 && memoire.avantBataille !== cle) {
      memoire.avantBataille = cle;
      retenir();
      annoncer(alAvantBataille(reste));
    }
    const avant = avantBataille;
    avantBataille = reste > 0 && reste <= 60_000 ? reste : 0;
    // 21 h pile : la bataille fait rage tout de suite (sans attendre la prochaine réponse du site) ; 5 minutes au plus
    if (avant && !avantBataille && reste <= 0 && g?.phase === "en-cours") { rage = true; rageDepuis = maintenant(); }
    if (rage && maintenant() - rageDepuis > 300_000) rage = false;
    if (Boolean(avant) !== Boolean(avantBataille) || (barre?.genre === "rage") !== rage) majBarre();
    // pendant le live du capitaine : « vos troupes comptent double », une minute après l'arrivée puis toutes les 45 min
    const c = g?.phase === "en-cours" ? (g.commus || []).find((x) => x.id === COMMU) : null;
    if (!c?.live || !RAPPEL_GUERRE || enCours || file.length || combat || attente || avantBataille || rage) return;
    if (!dernierX2) { dernierX2 = Date.now() - RAPPEL_GUERRE + 60_000; return; }
    if (Date.now() - dernierX2 < RAPPEL_GUERRE) return;
    dernierX2 = Date.now();
    annoncer(alX2(c));
  }

  // ---------- la barre : la vie du boss pendant le combat, le compte à rebours avant la sortie ----------
  function majBarre() {
    const genre = enCours ? "" : combat ? "boss" : attente > 10_000 ? "attente" : avantBataille > 0 ? "guerre" : rage ? "rage" : "";
    if (barre && barre.genre !== genre) { barre.zone.remove(); barre = null; }
    if (!genre || barre) return;
    const noeud = genre === "boss"
      ? el("div", "barre", imageBoss(combat, ""), el("div", "barre-nom", String(combat.nom || "LE BOSS")), jauge(vieBoss(combat)), el("div", "barre-temps", ""))
      : genre === "guerre" ? el("div", "barre attente guerre", el("div", "barre-nom", "⚔️ LA BATAILLE COMMENCE"), el("div", "barre-temps", ""))
      : genre === "rage" ? el("div", "barre attente guerre rage", el("div", "barre-nom", "⚔️ LA BATAILLE FAIT RAGE…"))
      : el("div", "barre attente", el("div", "barre-nom", "LA VF 1.0 ARRIVE"), el("div", "barre-temps", ""));
    const zone = el("div", "zone", noeud);
    scene.append(zone);
    barre = { genre, zone, noeud };
    suivreBarre();
    montrer(noeud);
  }
  function suivreBarre() {
    if (!barre) return;
    const temps = barre.noeud.querySelector(".barre-temps");
    if (barre.genre === "boss" && combat) {
      const j = barre.noeud.querySelector(".jauge");
      j.firstChild.style.width = `${(vieBoss(combat) * 100).toFixed(1)}%`;
      j.classList.toggle("rage", Boolean(combat.rage));
      temps.textContent = chrono((Number(combat.fin) || 0) - maintenant());
    } else if (barre.genre === "attente") temps.textContent = chrono(attente);
    else if (barre.genre === "guerre") temps.textContent = chrono(avantBataille);
  }

  // ---------- la sortie de la VF 1.0 : dix minutes de barre, dix secondes en grand, puis l'annonce ----------
  function rangerCompte() {
    if (chiffre) { chiffre.zone.remove(); chiffre = null; }
    if (attente) { attente = 0; majBarre(); }
  }
  function sortir(instant, annonce) {
    memoire.sortie = instant;
    retenir();
    rangerCompte();
    if (annonce) annoncer(alSortie(), true); // elle passe devant tout le reste
    else suivante();
  }
  function surveillerSortie() {
    if (!sortieLe || memoire.sortie === sortieLe) return rangerCompte();
    const reste = sortieLe - maintenant();
    // à l'heure dite : l'annonce (sauf si la course était déjà partie bien avant, ouverte en avance)
    if (reste <= 0) return sortir(sortieLe, reste > -FRAIS && !(depart && depart < sortieLe - 60_000));
    if (reste > 600_000 || vfBot === true) return rangerCompte(); // trop tôt, ou déjà ouverte en avance
    if (bientotPour !== sortieLe && reste > 570_000) annoncer(alBientot());
    bientotPour = sortieLe;
    attente = reste;
    majBarre();
    if (reste > 10_000 || enCours) return;
    const valeur = Math.ceil(reste / 1000);
    if (chiffre?.valeur === valeur) return;
    chiffre?.zone.remove();
    chiffre = { valeur, zone: el("div", "zone zone-compte", el("div", "compte", String(valeur))) };
    scene.append(chiffre.zone);
    jouer(valeur <= 3 ? "cloche" : "pop");
  }

  // ---------- le vote : un rappel de temps en temps tant qu'il est ouvert ----------
  function surveillerVote() {
    if (!vote || !RAPPEL || enCours || file.length || combat || attente || avantBataille || rage) return;
    if (vote.fin - maintenant() < 20_000 || Date.now() - dernierRappel < RAPPEL) return;
    dernierRappel = Date.now();
    annoncer(alVote(vote, true));
  }

  // ---------- ce que dit le site ----------
  function surPublic(d) {
    if (!d || d.horsLigne) return;
    // la VF 1.0 : son heure, et si le bot l'a déjà ouverte
    const avant = vfBot;
    if (typeof d.v4?.ouvert === "boolean") vfBot = d.v4.ouvert;
    if (Number(d.v4?.ouverture) > 0) ouverture = Number(d.v4.ouverture);
    sortieLe = ouverture;
    depart = Number(d.flotte?.depart) || 0;
    try { lireGuerre(d.guerre); } catch { guerre = null; }
    try { surMerPublic(d.mer); } catch { /* la mer attendra le prochain tour */ }
    majBarre();
    if (avant === false && vfBot === true && memoire.sortie !== ouverture) sortir(ouverture, true); // ouverte en avance, sous nos yeux
    else if (vfBot === false && memoire.sortie === ouverture && maintenant() < ouverture - 5000) { delete memoire.sortie; retenir(); } // refermée après un essai : la vraie sortie sera annoncée
    // le navire de l'équipage suivi
    const c = d.flotte?.commus?.find((x) => x?.id === COMMU);
    const g = c?.navire || (COMMU === "barhaw" ? d.grandline : null);
    if (c?.nom) equipage = String(c.nom).slice(0, 40);
    if (!g || !Array.isArray(g.route)) { vote = null; dejaLu = true; return; }
    precharger(g.cible);
    for (const x of g.vote?.choix || []) precharger(x);
    // l'équipage vient d'accoster
    const e = (g.escales || []).reduce((m, x) => (x?.arrivee && (!m || x.arrivee > m.arrivee) ? x : m), null);
    if (e && e.arrivee !== memoire.arrivee) {
      memoire.arrivee = e.arrivee;
      retenir();
      if (maintenant() - e.arrivee < FRAIS) annoncer(alTerre({ ...e, etapes: g.etapes }));
    }
    // il se passe quelque chose en mer
    const ev = g.evenement;
    if (ev?.debut && ev.debut !== memoire.evenement) {
      memoire.evenement = ev.debut;
      retenir();
      if (maintenant() - ev.debut < FRAIS) annoncer(alMer(ev, g.cible));
    }
    // le carrefour : le vote s'ouvre, puis la route est choisie
    const v = g.vote?.choix?.length ? g.vote : null;
    if (v && !dejaLu) dernierRappel = Date.now() - RAPPEL + 60_000; // la page arrive en plein vote : un premier rappel dans une minute
    if (v && memoire.vote !== v.fin) {
      memoire.vote = v.fin;
      retenir();
      if (dejaLu) { dernierRappel = Date.now(); annoncer(alVote(v)); } // ouvert sous nos yeux
    }
    if (!v && vote && dejaLu && g.cible && vote.choix.some((x) => x.id === g.cible.id)) annoncer(alChoisi(g.cible));
    vote = v;
    dejaLu = true;
  }
  function surBoss(d) {
    if (!d || d.horsLigne) return;
    mesurer(Number(d.maintenant));
    const c = d.combat;
    // pour une autre commu que Barhaw : seulement le boss auquel elle est invitée (le VS)
    const pourNous = Boolean(c) && (COMMU === "barhaw" || (c.vs?.equipes || []).some((x) => x?.id === COMMU));
    if (pourNous && d.actif && !c.fini) {
      if (memoire.combat !== c.id) {
        memoire.combat = c.id;
        memoire.combatFini = false;
        retenir();
        if (maintenant() - (Number(c.debut) || 0) < 90_000) annoncer(alBoss(c));
      }
      combat = c;
    } else {
      if (pourNous && c.fini && memoire.combat === c.id && !memoire.combatFini) {
        memoire.combatFini = true;
        retenir();
        if (maintenant() - (Number(c.finiLe) || 0) < FRAIS) annoncer(alBossFin(c));
      }
      combat = null;
    }
    majBarre();
  }
  const lire = async (adresse) => { try { const r = await fetch(adresse, { headers: { Accept: "application/json" }, cache: "no-store" }); return await r.json(); } catch { return null; } };
  let tours = 0;
  let minuteurPublic = null;
  let minuteurBoss = null;
  async function chargerPublic() {
    clearTimeout(minuteurPublic);
    try { surPublic(await lire("/api/public")); } catch { /* une réponse inattendue : on réessaie au prochain tour */ }
    minuteurPublic = setTimeout(chargerPublic, 20_000);
  }
  async function chargerBoss() {
    clearTimeout(minuteurBoss);
    try { surBoss(await lire("/api/bosslive")); } catch { /* pareil */ }
    tours += 1;
    // pendant un combat : toutes les 2,5 s ; sinon toutes les 6 s. Un tour sur dix (et le deuxième) attend 13 s : Vercel n'a
    // alors plus rien en réserve, la réponse vient droit du bot et son heure est juste (voir mesurer).
    minuteurBoss = setTimeout(chargerBoss, combat ? 2500 : tours % 10 === 1 ? 13_000 : 6000);
  }

  // ---------- toutes les 250 ms : ce qui bouge ----------
  setInterval(() => {
    if (enCours?.suivre) { try { enCours.suivre(enCours.noeud); } catch { /* l'alerte s'en va */ } }
    surveillerSortie();
    surveillerVote();
    surveillerGuerre();
    suivreBarre();
    suivante();
  }, 250);

  // ---------- ?essai=… : des alertes d'exemple, en boucle, pour placer la source dans OBS ----------
  function essais() {
    equipage = COMMU === "barhaw" ? "Barhaw" : COMMU;
    const choixV = () => ({ fin: Date.now() + 4 * 3600_000 + 12 * 60_000, total: 12, choix: [{ id: "arbre", emoji: "🌳", nom: "L'Île du Grand Arbre", voix: 7 }, { id: "ambre", emoji: "🏜️", nom: "Le Désert d'Ambre", voix: 5 }] });
    const bossE = (plus = {}) => ({ id: "essai", boss: "krakor", nom: "KRAKOR", titre: "le Colosse de Lave", pv: 6400, pvMax: 10_000, debut: Date.now(), fin: Date.now() + 5 * 60_000, ...plus });
    const jeux = {
      terre: () => annoncer(alTerre({ id: "tonnerre", emoji: "⛈️", nom: "L'Île Tonnerre", etape: 10, etapes: 11 })),
      tresor: () => annoncer(alTerre({ id: "tresor", emoji: "💰", nom: "L'Île au Trésor de Barhaw", tresor: true })),
      vote: () => annoncer(alVote(choixV())),
      rappel: () => annoncer(alVote(choixV(), true)),
      choisi: () => annoncer(alChoisi({ id: "arbre", emoji: "🌳", nom: "L'Île du Grand Arbre" })),
      mer: () => annoncer(alMer({ type: "tempete", emoji: "🌪️", titre: "Tempête !", objectif: 480 })),
      monstre: () => annoncer(alMer({ type: "monstre", emoji: "🐙", titre: "Un monstre marin barre la route !" })),
      boss: () => {
        const c = bossE();
        annoncer(alBoss(c));
        combat = c;
        const t = setInterval(() => { c.pv = Math.max(0, c.pv - 90); c.rage = c.pv / c.pvMax < 0.25; }, 400);
        setTimeout(() => { clearInterval(t); if (combat === c) { combat = null; majBarre(); } }, 24_000);
      },
      vaincu: () => annoncer(alBossFin(bossE({ gagne: true, fini: true }))),
      fui: () => annoncer(alBossFin(bossE({ gagne: false, fini: true }))),
      bientot: () => annoncer(alBientot()),
      compte: () => { delete memoire.sortie; sortieLe = Date.now() + 16_000; },
      sortie: () => annoncer(alSortie()),
      guerre: () => { guerre = guerreE(); annoncer(alAvantBataille(5 * 60_000)); },
      // la dernière minute (en 14 s), puis « la bataille fait rage » quelques secondes
      derniere: () => {
        guerre = { ...guerreE(), prochaine: Date.now() + 14_000 };
        setTimeout(() => { rage = false; guerre = guerreE(); majBarre(); }, 22_000);
      },
      bataille: () => { guerre = guerreE(); annoncer(alBataille(batailleE())); },
      regne: () => { guerre = { ...guerreE(), phase: "fini" }; annoncer(alRegne({ gagnant: "barhaw", classement: [{ id: "barhaw", nom: "Barhaw", iles: 5 }, { id: "veyzo", nom: "Veyzo Family", iles: 3 }, { id: "kikso", nom: "Squirt.exe", iles: 1 }] })); },
      x2: () => { guerre = guerreE(); annoncer(alX2(guerre.commus[0])); },
    };
    // (des commus et des îles d'exemple, comme sur la carte : aucun joueur)
    const guerreE = () => ({
      saison: 1, phase: "en-cours", bataille: 7, batailles: 21, heure: "21 h", prochaine: Date.now() + 3 * 3600_000, journal: [],
      commus: [{ id: "barhaw", nom: "Barhaw", iles: 3, armee: 1240, live: true }, { id: "veyzo", nom: "Veyzo Family", iles: 1, armee: 980 }, { id: "kikso", nom: "Squirt.exe", iles: 1, armee: 760 }],
      iles: [{ id: "port-barhaw", port: "barhaw" }, { id: "vents", commu: "barhaw" }, { id: "arbre", commu: "barhaw" }, { id: "ambre", commu: "barhaw" }, { id: "marais", commu: "veyzo" }, { id: "cristal", commu: "kikso" }, { id: "horloge" }, { id: "geants" }, { id: "tonnerre" }, { id: "forteresse" }],
    });
    const batailleE = () => ({ n: 6, t: Date.now(), iles: [
      { ile: "marais", nom: "Le Marais des Lanternes", avant: { commu: "veyzo", garnison: 674 }, renfort: 621, attaques: [], apres: { commu: "veyzo", garnison: 1295 }, prise: false },
      { ile: "ambre", nom: "Le Désert d'Ambre", avant: { commu: "kikso", garnison: 493 }, renfort: 0, attaques: [{ commu: "barhaw", troupes: 708 }], apres: { commu: "barhaw", garnison: 215 }, prise: true },
      { ile: "cristal", nom: "Le Jardin de Cristal", avant: { commu: null, garnison: 450 }, renfort: 0, attaques: [{ commu: "kikso", troupes: 465 }], apres: { commu: "kikso", garnison: 15 }, prise: true },
    ] });
    const suite = ESSAI === "tout" ? ["terre", "vote", "rappel", "choisi", "mer", "boss", "vaincu", "compte", "tresor", "guerre", "derniere", "bataille", "x2", "regne"] : [ESSAI];
    dernierX2 = Date.now() + 86_400_000; // (pendant les essais, pas de « ×2 » tout seul)
    if (!suite.every((n) => jeux[n])) return false;
    let k = 0;
    const tour = () => {
      if (enCours || file.length || combat || attente || avantBataille || rage) return setTimeout(tour, 600);
      jeux[suite[k++ % suite.length]]();
      setTimeout(tour, 2500);
    };
    tour();
    return true;
  }

  // ---------- ouverte dans un navigateur (et pas dans OBS) : un mot d'explication dès qu'on bouge la souris ----------
  function aide() {
    if (window.obsstudio || window.streamlabsOBS || document.querySelector(".aide")) return;
    const exemple = new URLSearchParams(location.search);
    exemple.set("essai", "tout");
    exemple.set("fond", "oui");
    const lien = el("a", "", "Voir un exemple");
    lien.href = `${location.pathname}?${exemple}`;
    const carte = el("div", "aide",
      el("b", "", "Les alertes de GRAND LINE pour OBS"),
      el("p", "", "Cette page reste vide tant qu'il ne se passe rien : elle montre une alerte quand l'équipage accoste, quand un vote s'ouvre, quand le BOSS LIVE se réveille, et pendant la Guerre des commus, avant et après chaque bataille de 21 h. Avec ?mer dans l'adresse, elle montre aussi la course de la mer en direct, vue de haut, et son top 5."),
      el("p", "", "Dans OBS : ajoute une source « Navigateur » avec cette adresse, en 1920 × 1080 (ou 1080 × 1920 pour un live vertical)."),
      lien);
    document.body.append(carte);
    setTimeout(() => carte.remove(), 20_000);
  }

  // ---------- la mer en direct : la course vue de haut, le top 5 et ses alertes (?mer) ----------
  const MER_SALLE = P.has("mer") || ESSAI === "course" ? ((P.get("mer") || COMMU).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || COMMU) : "";
  const MER_PSEUDOS = P.get("pseudos") !== "non";
  const MER_COIN = ["bas-gauche", "bas-droite", "haut-gauche", "haut-droite"].includes(P.get("coin")) ? P.get("coin") : "bas-gauche";
  let mer = null; // la course à l'écran
  let merMods = null;
  let merCommus = {}; // id → { nom, c1, c2, embleme }
  const modulesMer = () => (merMods ||= Promise.all([import("/js/mer-jeu.js"), import("/js/mer-2d.js")]).then(([jeu, d2]) => ({ jeu, d2 })));
  const rangMer = (n) => (n === 1 ? "1er" : `${n}e`);
  const tempsMer = (s) => { const m = Math.floor(s / 60); const x = (s - m * 60).toFixed(2).replace(".", ","); return m ? `${m} min ${x} s` : `${x} s`; };
  const nomMer = (j) => (MER_PSEUDOS ? j?.nom : merCommus[j?.commu]?.nom) || "Une barque";
  const alMerOuverte = (nom) => ({
    nom: "mer", duree: 12_000, son: "cloche",
    faire: () => el("div", "al al-nuit al-mer",
      el("div", "al-emoji", "⛵"),
      el("div", "al-texte",
        el("div", "al-sur", `La mer en direct${nom ? ` · ${nom}` : ""}`),
        titre("MONTEZ À BORD !"),
        el("div", "al-nom", `${location.host}/#mer`),
        el("div", "al-info", "Course dans une minute · connectez-vous avec Discord"))),
  });
  const alMerGagnant = (j, temps, parcours) => ({
    nom: "mer-gagnant", duree: 9000, son: "victoire",
    faire: () => el("div", "al al-papier al-or",
      el("div", "al-emoji", "🏆"),
      el("div", "al-texte",
        el("div", "al-sur", `La mer en direct · ${parcours || "la course"}`),
        titre(`${nomMer(j)} GAGNE !`),
        el("div", "al-info", `en ${tempsMer(temps)}`))),
  });
  function fermerMer() {
    if (!mer) return;
    const m = mer;
    mer = null;
    cancelAnimationFrame(m.raf);
    try { m.source?.fermer(); } catch { /* déjà fermée */ }
    m.panneau.classList.remove("entre");
    setTimeout(() => m.panneau.remove(), 500);
  }
  async function ouvrirMer({ adresse = "", essai = false } = {}) {
    if (mer) return;
    const { jeu, d2 } = await modulesMer();
    if (mer) return;
    const toile = el("canvas", "mer-toile");
    const top = el("ol", "mer-top");
    const etat = el("div", "mer-etat");
    // la carte de la course, et le top 5 à côté (pour ne rien cacher de la course)
    const panneau = el("div", `mer-obs coin-${MER_COIN}`, el("div", "mer-carte", toile, etat), top);
    scene.append(panneau);
    const m = mer = { source: null, suivi: jeu.creerSuivi(), rendu: d2.creerMer2D(toile, { commus: merCommus, suivre: false }), joueurs: new Map(), p: null, phase: "", arrivees: [], panneau, top, etat, raf: 0, numero: 0, essai, jeu };
    const surMessage = (x) => { if (mer === m) messageMer(m, x); };
    m.source = essai
      ? jeu.entrainement({ sansMoi: true, faux: 12, commus: merCommus, surMessage })
      : jeu.connecter({ adresse, salle: MER_SALLE, surMessage, surEtat: (e) => { if (e === "ferme" && mer === m) fermerMer(); } });
    let dernier = 0;
    const image = (t) => {
      if (mer !== m) return;
      m.raf = requestAnimationFrame(image);
      const vue = m.suivi.vue(t);
      if (!vue || !m.p) return;
      if (t - dernier > 250) { dernier = t; topMer(m, vue); }
      m.rendu.maj(vue, { moi: 0, joueurs: MER_PSEUDOS ? m.joueurs : new Map(), tete: new Set(m.classement || []) });
      m.rendu.rendre();
    };
    m.raf = requestAnimationFrame(image);
    requestAnimationFrame(() => { m.rendu.taille(); montrer(panneau); });
  }
  function messageMer(m, x) {
    if (x.k === "s") { m.suivi.rtt = m.source?.rtt || 120; m.suivi.recevoir(x); return; }
    const parcours = (q) => { if (q?.id && (!m.p || m.p.id !== q.id || m.p.miroir !== q.miroir)) { m.p = m.jeu.parcours(q.id, q.miroir); m.suivi.parcours = m.p; m.rendu.parcours(m.p); } };
    if (x.k === "salut") {
      for (const [id, c] of Object.entries(x.commus || {})) merCommus[id] = { nom: c.nom, c1: c.c1, c2: c.c2, embleme: c.embleme };
      m.rendu.commus = merCommus;
      m.joueurs = new Map((x.joueurs || []).map(([n, nom, commu]) => [n, { nom, commu }]));
      Object.assign(m, { phase: x.phase, numero: x.numero, arrivees: [] });
      parcours(x.parcours);
      return;
    }
    if (x.k === "arrive") { m.joueurs.set(x.j[0], { nom: x.j[1], commu: x.j[2] }); return; }
    if (x.k === "parti") { m.joueurs.delete(x.n); return; }
    if (x.k === "phase") {
      const avant = m.phase;
      Object.assign(m, { phase: x.phase, numero: x.numero });
      parcours(x.parcours);
      if (x.phase === "depart") m.arrivees = [];
      // la mer ouvre (ou une nouvelle course) : l'alerte, une fois par course
      if (x.phase === "embarquement" && avant !== "embarquement" && !m.essai) annoncer(alMerOuverte(equipage));
      return;
    }
    if (x.k === "arrivee") { if (!m.arrivees.includes(x.n)) m.arrivees.push(x.n); return; }
    if (x.k === "resultats") {
      const [n, , temps] = x.classement?.[0] || [];
      if (n && temps !== null && temps !== undefined) annoncer(alMerGagnant(m.joueurs.get(n), temps, x.parcours));
      if (m.essai) setTimeout(() => { if (mer === m) m.source?.relancer?.(); }, 9000);
      return;
    }
    if (x.k === "ferme") fermerMer();
  }
  // le haut du panneau (la phase, le chrono) et le top 5
  function topMer(m, vue) {
    const pos = new Map(m.arrivees.map((n, k) => [n, k]));
    const cible = (b) => (b.prochaine < m.p.bouees.length ? m.p.bouees[b.prochaine] : m.p.centre);
    const dist = (b) => { const c = cible(b); return Math.hypot(c.x - b.x, c.z - b.z); };
    const enCourse = m.phase === "course" || m.phase === "resultats";
    const ordre = enCourse ? [...vue.barques].sort((a, b) => {
      const fa = pos.has(a.id), fb = pos.has(b.id);
      if (fa !== fb) return fa ? -1 : 1;
      if (fa) return pos.get(a.id) - pos.get(b.id);
      return b.prochaine - a.prochaine || dist(a) - dist(b);
    }).map((b) => b.id) : [];
    m.classement = ordre.slice(0, 3);
    const texte = { embarquement: `⛵ Montez à bord : ${location.host}/#mer`, depart: "🚩 3, 2, 1…", course: `🏁 Course ${m.numero} · ${m.p?.nom || ""}`, resultats: "🏆 Les résultats", libre: vue.coffre ? "🪙 Le coffre est sur la mer !" : "⛵ Entre deux courses" }[m.phase] || "";
    if (m.etat.textContent !== texte) m.etat.textContent = texte;
    const lignes = ordre.slice(0, 5).map((n, k) => `${k + 1}|${nomMer(m.joueurs.get(n))}`);
    const cle = lignes.join(",");
    if (m.top.dataset.cle === cle) return;
    m.top.dataset.cle = cle;
    m.top.replaceChildren(...lignes.map((l) => { const [k, nom] = l.split("|"); return el("li", "", el("b", "", k), el("span", "", nom)); }));
    m.top.hidden = !lignes.length;
  }
  function surMerPublic(d) {
    if (!MER_SALLE || !d?.adresse) return;
    const s = (d.salles || []).find((x) => x.id === MER_SALLE && !x.essai);
    if (s && !mer) ouvrirMer({ adresse: d.adresse });
  }

  window.__obs = {
    mer: () => (mer ? { phase: mer.phase, numero: mer.numero, joueurs: mer.joueurs.size, parcours: mer.p?.id || "", top: mer.top.textContent } : null),
    etat: () => ({ commu: COMMU, enCours: enCours?.nom || null, file: file.map((a) => a.nom), barre: barre?.genre || null, combat: Boolean(combat), vote: Boolean(vote), attente, chiffre: chiffre?.valeur || 0, ouverture, depart, vf: vf(), decal, lu: dejaLu, guerre: guerre ? { phase: guerre.phase, bataille: guerre.bataille, rage, avantBataille } : null, memoire: { ...memoire } }),
    relire: () => Promise.all([chargerPublic(), chargerBoss()]),
    passer: () => enCours?.partir(),
  };
  if (ESSAI === "course") { equipage = COMMU === "barhaw" ? "Barhaw" : COMMU; merCommus = { barhaw: { nom: "Barhaw", c1: "#ff5aae", c2: "#55ccff", embleme: "B" }, veyzo: { nom: "Veyzo Family", c1: "#3fd0c9", c2: "#2f6fe0", embleme: "V" }, squirt: { nom: "Squirt.exe", c1: "#ffb300", c2: "#7a3cff", embleme: "S" } }; ouvrirMer({ essai: true }); setTimeout(() => annoncer(alMerOuverte(equipage)), 1500); return; }
  if (ESSAI && essais()) return;
  sortieLe = ouverture;
  chargerPublic();
  chargerBoss();
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, aide, { once: true, passive: true });
})();
