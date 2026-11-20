// GRAND LINE dans le live : les alertes pour OBS (la page /obs, à poser en « source navigateur »).
// Rien ne s'affiche en dehors des alertes :
//   · « Terre en vue » quand l'équipage accoste (et le trésor, au bout de la route) ;
//   · le vote du carrefour : à l'ouverture, un petit rappel de temps en temps, puis la route choisie ;
//   · ce qui arrive en mer (tempête, monstre marin, vent arrière, bouteille, vaisseau fantôme, maître des lieux) ;
//   · le BOSS LIVE : son réveil, une barre de vie pendant le combat, puis la fin ;
//   · la sortie de la VF 1.0 : une barre les dix dernières minutes, les dix dernières secondes en grand, puis l'annonce.
// Les données sont celles du site (/api/public, /api/bosslive) : rien de plus que ce que tout le monde y voit déjà, et aucun
// pseudo n'est affiché. La page ne garde que l'heure de ce qu'elle a déjà annoncé (dans le navigateur d'OBS), pour ne pas
// le redire quand on la recharge. Avant l'ouverture de la VF, les îles gardent leur image d'avant (img/iles) : les cartes
// postales de la nouvelle carte (img/obs) ne se montrent qu'après, comme sur le site.
// Réglages dans l'adresse : ?commu=<id> (l'équipage suivi ; sans rien : barhaw) · ?place=haut|milieu|bas · ?son=non ·
// ?rappel=<minutes> (le rappel du vote : 15 sans rien, 0 pour aucun) · ?fond=oui (un fond sombre, pour régler la page dans
// un onglet) · ?essai=terre|tresor|vote|rappel|choisi|mer|monstre|boss|vaincu|fui|bientot|compte|sortie|tout (des alertes d'exemple
// en boucle, sans rien demander au bot, pour placer la source).
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

  // les îles qui ont leur carte postale (img/obs/<id>.webp, tirée de la nouvelle carte) ; les autres montrent leur maquette
  const CARTES = new Set(["moussaillons", "recif", "braise", "givre", "lucioles", "champignons", "engloutie", "vents", "marche", "arbre", "ambre", "phare", "tonnerre", "tresor", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants"]);
  const BOSS = new Set(["morghast", "voraxia", "krakor"]);
  const SONS = { cloche: "/son/cloche.m4a", taiko: "/son/taiko.m4a", victoire: "/son/victoire.m4a", carte: "/son/carte.m4a", pop: "/son/pop.m4a" };

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
  const adresseIle = (id) => (vf() && CARTES.has(id) ? `/img/obs/${id}.webp` : `/img/iles/${id}.webp`);
  function imageIle(ile, classe) {
    const id = propre(ile?.id);
    const cadre = el("div", classe);
    if (!id) { cadre.hidden = true; return cadre; }
    const maquette = `/img/iles/${id}.webp`;
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
    i.src = `/img/boss/${BOSS.has(id) ? id : "morghast"}.webp`;
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

  // ---------- la barre : la vie du boss pendant le combat, le compte à rebours avant la sortie ----------
  function majBarre() {
    const genre = enCours ? "" : combat ? "boss" : attente > 10_000 ? "attente" : "";
    if (barre && barre.genre !== genre) { barre.zone.remove(); barre = null; }
    if (!genre || barre) return;
    const noeud = genre === "boss"
      ? el("div", "barre", imageBoss(combat, ""), el("div", "barre-nom", String(combat.nom || "LE BOSS")), jauge(vieBoss(combat)), el("div", "barre-temps", ""))
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
    if (!vote || !RAPPEL || enCours || file.length || combat || attente) return;
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
    };
    const suite = ESSAI === "tout" ? ["terre", "vote", "rappel", "choisi", "mer", "boss", "vaincu", "compte", "tresor"] : [ESSAI];
    if (!suite.every((n) => jeux[n])) return false;
    let k = 0;
    const tour = () => {
      if (enCours || file.length || combat || attente) return setTimeout(tour, 600);
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
      el("p", "", "Cette page reste vide tant qu'il ne se passe rien : elle montre une alerte quand l'équipage accoste, quand un vote s'ouvre, quand le BOSS LIVE se réveille."),
      el("p", "", "Dans OBS : ajoute une source « Navigateur » avec cette adresse, en 1920 × 1080 (ou 1080 × 1920 pour un live vertical)."),
      lien);
    document.body.append(carte);
    setTimeout(() => carte.remove(), 20_000);
  }

  window.__obs = {
    etat: () => ({ commu: COMMU, enCours: enCours?.nom || null, file: file.map((a) => a.nom), barre: barre?.genre || null, combat: Boolean(combat), vote: Boolean(vote), attente, chiffre: chiffre?.valeur || 0, ouverture, depart, vf: vf(), decal, lu: dejaLu, memoire: { ...memoire } }),
    relire: () => Promise.all([chargerPublic(), chargerBoss()]),
    passer: () => enCours?.partir(),
  };
  if (ESSAI && essais()) return;
  sortieLe = ouverture;
  chargerPublic();
  chargerBoss();
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, aide, { once: true, passive: true });
})();
