// Barhaw · le site de la commu, sur une seule page qui se dévoile au défilement.
// Les données viennent du bot (via /api/public) : ta chaîne, la rediff, les potes, YouTube, le Discord, les événements, Chopper.
// Tout le texte venu de l'extérieur est écrit avec textContent, jamais comme du HTML.
"use strict";

(() => {
  document.documentElement.classList.remove("sans-js");

  const MA_CHAINE = "lilianobarhaw";
  const TYPES = { osiris: "Osiris", tournoi: "Tournoi", show: "Show", bahriot: "Bahriot", guerre: "Guerre", live: "Live", video: "Vidéo", autre: "Event" };
  const HOTE = location.hostname || "localhost";
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");

  // si le bot ne répond pas : les événements déjà prévus (les mêmes que dans le bot)
  const SECOURS = [
    // (avec la VF 1.0, l'agenda ajoute la SEMAINE BAHRIOT et le Barhaw Show : agendaVF ; avant, il peut rester vide)
    // reportés le 21/11/2026 (le tournoi n'a pas lieu en février 2027, ni le casting d'Osiris à sa finale), puis tout Osiris
    // et le live 12 h le 23/11/2026 ; pour les remettre : décommenter, et les rajouter dans le bot avec /evenement ajouter
    // { id: "live12h", type: "live", titre: "Live 12 h · Chained Together", debut: "2026-12-26T00:00:00+01:00", heure: false, description: "12 heures de live sur Chained Together, duo contre duo : le duo le plus haut au bout des 12 h gagne.", lien: "https://www.twitch.tv/lilianobarhaw" },
    // { id: "osiris-ouverture", type: "osiris", titre: "Osiris · ouverture du site et du Discord", debut: "2026-12-26T21:00:00+01:00", heure: true, description: "Le site et le Discord d'Osiris ouvrent enfin, avec le premier teaser « On vous regarde ».", lien: "https://osiriswl.vercel.app" },
    // { id: "tournoi", type: "tournoi", titre: "TOURNOI BARHAW", debut: "2027-02-04T00:00:00+01:00", heure: false, fin: "2027-02-20T00:00:00+01:00", description: "6 équipes de 3 sur Valorant, 1 000 € de cashprize sur le tournoi, tous les matchs en BO3 et en direct. Finale le samedi 20 février.", lien: "https://www.twitch.tv/lilianobarhaw" },
    // { id: "osiris-casting", type: "osiris", titre: "Osiris · ouverture du casting", debut: "2027-02-20T23:30:00+01:00", heure: true, fin: "2027-03-20T23:59:00+01:00", finHeure: true, description: "Le casting du Programme 01 s'ouvre en direct à la finale du TOURNOI BARHAW. Candidatures jusqu'au 20 mars, 17 ans minimum et un bon micro.", lien: "https://osiriswl.vercel.app/casting" },
    // { id: "osiris-selection", type: "osiris", titre: "Osiris · la Sélection", debut: "2027-04-24T21:00:00+02:00", heure: true, description: "Les 35 candidats retenus pour le Programme 01 sont annoncés en direct.", lien: "https://osiriswl.vercel.app" },
    // { id: "osiris-programme01", type: "osiris", titre: "Osiris · Programme 01, L'Hiver de Ludendorff", debut: "2027-05-15T20:30:00+02:00", heure: true, fin: "2027-06-26T00:00:00+02:00", description: "35 candidats, 18 soirées, un hiver dont tout le monde ne sortira pas. Les mercredis, vendredis et samedis, de 20 h 30 à 1 h.", lien: "https://osiriswl.vercel.app" },
  ];

  // ce que Chopper dit selon son humeur, et son onomatopée (comme dans un manga)
  const HUMEURS = {
    "aux anges": { bulle: "Je suis trop content, vous êtes les meilleurs !", sfx: "キラキラ" },
    content: { bulle: "Hihi, tout va super bien aujourd'hui !", sfx: "ワクワク" },
    tranquille: { bulle: "Tranquille… Tu veux jouer avec moi ?", sfx: "ドキドキ" },
    "un peu triste": { bulle: "C'est un peu calme ici, non ?", sfx: "シーン" },
    triste: { bulle: "Personne ne vient me voir…", sfx: "シーン" },
    "affamé": { bulle: "J'ai faaaim… Tu m'apportes un truc ?", sfx: "グゥ〜" },
    "déprimé": { bulle: "…", sfx: "ズーン" },
  };
  // l'onomatopée en coin du prochain event, selon son type
  const SFX_TYPES = { osiris: ["ゴゴゴ", "violet tremble"], tournoi: ["ドドド", "tremble"], show: ["ジャーン", "tremble"], bahriot: ["バーン", "tremble"], guerre: ["ドーン", "tremble"], live: ["ワクワク", ""], video: ["キラッ", ""], autre: ["キラッ", ""] };
  // la musique du site : « The World's Number One Oden Store » (bande originale de One Piece), un fichier du site
  const MUSIQUE = "/musique/oden.mp3";
  // les vidéos des events (dossier videos/) : le teaser s'affiche avec l'event qui a cet identifiant (/evenement)
  const VIDEOS = {
    live12h: { src: "/videos/live-12h.mp4", affiche: "/videos/live-12h.jpg", titre: "Le teaser du live 12 h sur Chained Together" },
    tournoi: { src: "/videos/teaser-tournoi.mp4", affiche: "/videos/teaser-tournoi.jpg", titre: "Le teaser du TOURNOI BARHAW" },
  };
  // les mèmes, posés au hasard sur la page à chaque visite (img/memes)
  const MEMES = [
    { id: "meme-01", src: "/img/memes/meme-01.jpg", l: 135, h: 185 },
    { id: "meme-02", src: "/img/memes/meme-02.jpg", l: 439, h: 272 },
    { id: "meme-03", src: "/img/memes/meme-03.jpg", l: 272, h: 246 },
    { id: "meme-04", src: "/img/memes/meme-04.jpg", l: 560, h: 447 },
    { id: "meme-05", src: "/img/memes/meme-05.jpg", l: 560, h: 483 },
    { id: "meme-06", src: "/img/memes/meme-06.jpg", l: 560, h: 550 },
    { id: "meme-07", src: "/img/memes/meme-07.jpg", l: 560, h: 154 },
    { id: "meme-08", src: "/img/memes/meme-08.jpg", l: 560, h: 317 },
    { id: "meme-09", src: "/img/memes/meme-09.jpg", l: 560, h: 386 },
    { id: "meme-10", src: "/img/memes/meme-10.jpg", l: 393, h: 433 },
    { id: "meme-11", src: "/img/memes/meme-11.jpg", l: 342, h: 460 },
    { id: "meme-12", src: "/img/memes/meme-12.jpg", l: 340, h: 460 },
    { id: "meme-13", src: "/img/memes/meme-13.jpg", l: 427, h: 460 },
  ];

  let donnees = null;
  let moi = null; // { connecte, nom, avatar }
  let chopperMoi = null; // { nourri, joue, pause } ou { pasMembre: true }
  let cleLecteur = "";
  let cleYoutube = "";
  let occupe = false;
  let erreurConnexion = false;
  let chaineProche = false; // le lecteur Twitch ne se charge qu'en arrivant près de « Ma chaîne »
  let chaineVue = false;
  let cleJauges = "";
  let messageActions = null; // { texte, erreur, jusqua } : reste affiché un moment, même après un rafraîchissement

  // ---------- petits outils ----------
  const $ = (id) => document.getElementById(id);
  function el(tag, attrs = {}, ...enfants) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : String(v));
    }
    for (const c of enfants.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return e;
  }
  const vider = (e, ...enfants) => { e.replaceChildren(...enfants.flat().filter(Boolean)); return e; };
  // vrai si l'élément est dans une partie en veille (loin de l'écran, content-visibility) : le mesurer forcerait sa mise en page
  const enVeille = (e) => typeof e?.checkVisibility === "function" && !e.checkVisibility({ contentVisibilityAuto: true });
  const lienSur = (u) => (/^https:\/\/[^\s<>"]+$/i.test(String(u || "")) ? String(u) : "");
  const nombre = (n) => (Number(n) || 0).toLocaleString("fr-FR");
  const ms = (x) => (typeof x === "number" ? x : Date.parse(x));
  const externe = { target: "_blank", rel: "noopener" };
  const majuscule = (t) => (t ? t[0].toUpperCase() + t.slice(1) : "");

  const fmtJour = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtHeure = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  const fmtNum = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric" });
  const fmtMois = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "short" });
  const fmtAn = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric" });
  const fmtCourt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" });
  function heure(t) {
    const [h, mi] = fmtHeure.format(new Date(t)).split(":");
    return `${Number(h)} h${mi !== "00" ? ` ${mi}` : ""}`;
  }
  const dateLongue = (t, avecHeure) => fmtJour.format(new Date(t)) + (avecHeure ? ` à ${heure(t)}` : "");
  const dateCourte = (t) => `${fmtCourt.format(new Date(t))} à ${heure(t)}`; // « 22 décembre à 0 h »
  function dansCombien(t) {
    const d = ms(t) - Date.now();
    if (d <= 0) return "maintenant";
    const h = d / 3_600_000;
    if (h < 1) return `dans ${Math.max(1, Math.round(d / 60_000))} min`;
    if (h < 24) return `dans ${Math.round(h)} h`;
    const j = Math.ceil(h / 24);
    return j === 1 ? "demain" : `dans ${j} jours`;
  }
  function depuis(t) {
    const m = Math.max(1, Math.round((Date.now() - ms(t)) / 60_000));
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
  }
  const finDe = (e) => (e.fin ? ms(e.fin) + (e.finHeure ? 0 : 86_400_000 - 1) : ms(e.debut) + (e.heure ? 6 * 3_600_000 : 86_400_000 - 1));

  function evenementsSecours() {
    const t = Date.now();
    const l = SECOURS.map((e) => ({ ...e, debut: ms(e.debut), fin: e.fin ? ms(e.fin) : null }));
    return {
      aVenir: l.filter((e) => finDe(e) >= t).map((e) => ({ ...e, enCours: e.debut <= t })),
      passes: l.filter((e) => finDe(e) < t).reverse().slice(0, 3),
    };
  }

  function onomatopee(e, texte, force = false) {
    if (!e || (!force && e.textContent === texte)) return;
    e.textContent = texte;
    e.classList.remove("eclat");
    void e.offsetWidth;
    e.classList.add("eclat");
  }

  // ---------- les apparitions au défilement ----------
  const enAttente = new Set();
  function montrer(cible) {
    cible.classList.add("vu");
    enAttente.delete(cible);
    observateur?.unobserve(cible);
    // une fois apparue, la carte retrouve des transitions sans retard (pour le survol)
    setTimeout(() => { cible.style.transitionDelay = ""; }, 1400);
  }
  const observateur = "IntersectionObserver" in window
    ? new IntersectionObserver((entrees) => {
      for (const e of entrees) if (e.isIntersecting) montrer(e.target);
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 })
    : null;
  // filet de sécurité : un défilement très rapide peut sauter un bloc sans qu'il soit « vu » ; on le montre quand même.
  // On regarde d'abord où est chaque partie : un bloc d'une partie encore sous l'écran n'est pas mesuré (le mesurer
  // forcerait le navigateur à mettre en page cette partie en veille), un bloc d'une partie déjà passée est montré.
  // Toutes les mesures d'abord, puis toutes les apparitions : une seule mise en page.
  let verification = 0;
  function verifierApparitions() {
    verification = 0;
    const bas = window.innerHeight;
    const parties = new Map();
    const aMontrer = [];
    for (const e of enAttente) {
      if (!e.isConnected) { enAttente.delete(e); continue; }
      const partie = e.closest("[data-section]");
      let haut;
      if (partie) {
        if (!parties.has(partie)) parties.set(partie, partie.getBoundingClientRect());
        const r = parties.get(partie);
        if (r.top >= bas) continue;
        haut = r.bottom > 0 ? e.getBoundingClientRect().top : -1;
      } else haut = e.getBoundingClientRect().top;
      if (haut < bas) aMontrer.push(e);
    }
    for (const e of aMontrer) montrer(e);
  }
  window.addEventListener("scroll", () => {
    if (verification || !enAttente.size) return;
    verification = setTimeout(verifierApparitions, 250);
  }, { passive: true });

  // à appeler AVANT de remplacer le contenu : s'il était déjà apparu, le nouveau s'affiche tout de suite (rafraîchissement)
  const dejaVu = (conteneur) => Boolean(conteneur.querySelector(".revele.vu"));

  // fait apparaître une liste d'éléments, l'un après l'autre, quand on arrive dessus
  function apparaitre(elements, tout = false) {
    const direct = tout || !observateur || reduit.matches;
    elements.forEach((e, i) => {
      if (!e) return;
      e.classList.add("revele");
      if (direct) { e.classList.add("vu"); return; }
      e.style.transitionDelay = `${Math.min(i, 8) * 80}ms`;
      enAttente.add(e);
      observateur.observe(e);
    });
  }

  function apparitionsFixes() {
    const groupes = new Map();
    for (const e of document.querySelectorAll(".revele")) {
      const g = e.closest("section, .chopper-grille, .chopper-bas, .discord-plus, footer") || document.body;
      if (!groupes.has(g)) groupes.set(g, []);
      groupes.get(g).push(e);
    }
    for (const liste of groupes.values()) apparaitre(liste);
  }

  // ---------- le fond : des étincelles de manga et des traits de vitesse ----------
  function ciel() {
    const c = $("ciel");
    if (!c || !c.getContext) return;
    const ctx = c.getContext("2d");
    const teintes = ["255,143,203", "255,79,154", "209,166,255", "255,240,247"];
    let eclats = [];
    let traits = [];
    let l = 0;
    let h = 0;
    let boucle = 0;
    let dernier = 0;
    let prochainTrait = 0;

    function taille() {
      const dpr = 1; // un décor doux : la résolution normale suffit, même sur les écrans de téléphone
      const largeur = window.innerWidth;
      const hauteur = window.innerHeight;
      if (largeur === l && hauteur === h) return;
      // sur téléphone, la barre d'adresse qui se cache ou revient change seulement la hauteur : les étincelles restent en place
      const garder = largeur === l && eclats.length > 0;
      l = largeur;
      h = hauteur;
      c.width = Math.round(l * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (garder) return;
      const n = Math.max(10, Math.min(30, Math.round((l * h) / 45000)));
      eclats = Array.from({ length: n }, () => ({
        x: Math.random() * l,
        y: Math.random() * h,
        r: 3 + Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        vitesse: 0.4 + Math.random() * 1.1,
        teinte: teintes[Math.floor(Math.random() * teintes.length)],
      }));
    }

    // l'étincelle à quatre branches des mangas
    function etincelle(x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }

    function dessiner(t, dt) {
      ctx.clearRect(0, 0, l, h);
      for (const e of eclats) {
        const lueur = reduit.matches ? 0.35 : 0.5 + 0.5 * Math.sin((t / 1000) * e.vitesse + e.phase);
        if (lueur < 0.05) continue;
        ctx.fillStyle = `rgba(${e.teinte},${(0.12 + 0.5 * lueur).toFixed(3)})`;
        etincelle(e.x, e.y, e.r * (0.5 + 0.6 * lueur));
      }
      if (reduit.matches) return;
      // de temps en temps, un trait de vitesse traverse l'écran
      if (t > prochainTrait) {
        const n = 1 + Math.floor(Math.random() * 3);
        const y0 = Math.random() * h;
        for (let k = 0; k < n; k++) {
          traits.push({ x: -400 - Math.random() * 200, y: y0 + (k - 1) * (10 + Math.random() * 14), long: 180 + Math.random() * 320, v: 1.4 + Math.random() * 1.2, ep: 1 + Math.random() * 1.5, teinte: teintes[Math.floor(Math.random() * 3)] });
        }
        prochainTrait = t + 2200 + Math.random() * 3200;
      }
      for (const tr of traits) {
        tr.x += tr.v * dt;
        const g = ctx.createLinearGradient(tr.x, 0, tr.x + tr.long, 0);
        g.addColorStop(0, `rgba(${tr.teinte},0)`);
        g.addColorStop(0.7, `rgba(${tr.teinte},0.32)`);
        g.addColorStop(1, `rgba(${tr.teinte},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(tr.x, tr.y, tr.long, tr.ep);
      }
      traits = traits.filter((tr) => tr.x < l + 50);
    }

    let defile = 0;
    let minuteur = 0;
    function image(t) {
      boucle = 0;
      if (document.hidden || defile) return;
      if (!document.body.classList.contains("vision-ouverte")) { const dt = dernier ? Math.min(90, t - dernier) : 16; dernier = t; dessiner(t, dt); }
      if (!reduit.matches) planifier();
    }
    // les étincelles scintillent lentement : 12 images par seconde leur suffisent ; 30 quand un trait de vitesse passe.
    // Entre deux images, une simple minuterie : le navigateur n'est pas réveillé à chaque rafraîchissement de l'écran.
    function planifier() {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => { minuteur = 0; boucle = requestAnimationFrame(image); }, traits.length ? 21 : 68);
    }
    const relancer = () => {
      if (boucle) cancelAnimationFrame(boucle);
      clearTimeout(minuteur);
      minuteur = 0;
      dernier = 0;
      boucle = requestAnimationFrame(image);
    };

    taille();
    relancer();
    let attente = 0;
    window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(() => { taille(); relancer(); }, 150); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) relancer(); });
    reduit.addEventListener?.("change", relancer);
    // pendant le défilement, le navigateur a mieux à faire : le fond attend la fin du geste
    window.addEventListener("scroll", () => {
      if (boucle) { cancelAnimationFrame(boucle); boucle = 0; }
      if (minuteur) { clearTimeout(minuteur); minuteur = 0; }
      clearTimeout(defile);
      defile = setTimeout(() => { defile = 0; if (!document.hidden) relancer(); }, 160);
    }, { passive: true });
  }

  // ---------- les animations des parties qu'on ne voit pas sont mises en pause ----------
  function animationsHorsVue() {
    if (!("IntersectionObserver" in window)) return;
    const parties = document.querySelectorAll("[data-section], footer");
    // au départ, toutes les parties sont « hors de vue » (en pause) jusqu'à la première réponse de l'observateur : une partie
    // mise en page un instant puis mise en veille (content-visibility) gardait sinon ses animations en marche sans qu'on
    // les voie, et le navigateur recalculait la page 60 fois par seconde
    for (const p of parties) p.classList.add("hors-vue");
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) e.target.classList.toggle("hors-vue", !e.isIntersecting);
    }, { rootMargin: "300px 0px" });
    for (const p of parties) io.observe(p);
  }

  // ---------- la fluidité : les parties loin de l'écran ne sont pas dessinées (content-visibility, dans site.css) ----------
  // Avant d'aller vers une ancre (le menu, un lien « #… »), on les met toutes en page un instant : sans ça, le
  // navigateur viserait avec des tailles estimées et s'arrêterait trop haut ou trop bas. Il retient ensuite leur
  // vraie taille, et les parties lointaines repassent en veille sans rien faire bouger.
  let minuteurRendu = 0;
  function rendreToutesLesParties(duree = 1800) {
    document.documentElement.classList.add("tout-rendre");
    void document.body.offsetHeight; // la mise en page, tout de suite
    clearTimeout(minuteurRendu);
    minuteurRendu = setTimeout(() => document.documentElement.classList.remove("tout-rendre"), duree);
  }
  function anciennesTailles() {
    document.addEventListener("click", (ev) => {
      const a = ev.target.closest?.('a[href^="#"]');
      if (a && a.getAttribute("href").length > 1) rendreToutesLesParties();
    }, true);
    if (location.hash.length > 1) rendreToutesLesParties(3000);
    for (const t of ["wheel", "touchmove", "keydown", "mousedown"]) window.addEventListener(t, () => { ancreFaite = true; }, { once: true, passive: true });
  }
  // arrivée avec une ancre (barhaw.vercel.app/#faille) : le navigateur y va avant que les parties soient remplies ;
  // une fois les données là, on y retourne (sauf si le visiteur a déjà bougé)
  let ancreFaite = false;
  function retourAncre() {
    if (ancreFaite) return;
    ancreFaite = true;
    const id = decodeURIComponent(location.hash.slice(1));
    const cible = id && (document.getElementById(id) || (/^grandline-[a-z0-9]{2,20}$/.test(id) ? document.getElementById("grandline") : null));
    if (!cible) return;
    rendreToutesLesParties(2500);
    requestAnimationFrame(() => cible.scrollIntoView({ block: "start", behavior: "instant" }));
  }

  // ---------- l'en-tête et le menu ----------
  function entete() {
    const tete = $("entete");
    if (!tete) return;
    let attente = false;
    const maj = () => { attente = false; tete.classList.toggle("defile", window.scrollY > 10); };
    maj();
    window.addEventListener("scroll", () => { if (!attente) { attente = true; requestAnimationFrame(maj); } }, { passive: true });

    const burger = $("burger");
    const nav = $("nav");
    if (!burger || !nav) return;
    const menu = (ouvert) => {
      nav.classList.toggle("ouvert", ouvert);
      tete.classList.toggle("menu", ouvert);
      burger.setAttribute("aria-expanded", String(ouvert));
      burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
      document.body.style.overflow = ouvert ? "hidden" : "";
    };
    burger.addEventListener("click", () => menu(!nav.classList.contains("ouvert")));
    nav.addEventListener("click", (ev) => { if (ev.target.closest("a")) menu(false); });
    window.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && nav.classList.contains("ouvert")) { menu(false); burger.focus(); } });
    window.matchMedia("(min-width: 1321px)").addEventListener?.("change", (m) => { if (m.matches) menu(false); });
  }

  // ---------- la VF 1.0 : le menu en 4 rubriques (le Live, l'Aventure, les Jeux, la Commu) ----------
  // Avant la VF 1.0, le menu reste celui d'aujourd'hui (14 liens, le burger sur téléphone). Une fois la VF 1.0 ouverte,
  // les mêmes liens (avec leurs pastilles « Live », compteurs…) sont rangés dans 4 rubriques : un menu déroulant en haut
  // sur ordinateur, une barre en bas de l'écran sur téléphone. Si la VF 1.0 se referme (le bot la retient), tout revient.
  const RUBRIQUES_VF = [
    { id: "live", nom: "Le Live", court: "Live", icone: "camera", liens: ["chaine", "boss-live", "mer", "barhaw-show", "evenements"] },
    { id: "aventure", nom: "L'Aventure", court: "Aventure", icone: "bouteille", liens: ["grandline", "guerre", "creatures", "chasse", "battle", "chopper"] },
    { id: "jeux", nom: "Les Jeux", court: "Jeux", icone: "borne", liens: ["jeux", "cartes", "faille"] },
    { id: "commu", nom: "La Commu", court: "Commu", icone: "chopes", liens: ["bahriot", "potes", "youtube", "discord"] },
  ];
  const LIENS_VF = {
    chaine: ["camera", "Le live, le tchat, le planning"], "boss-live": ["casque", "Le boss du live, tous ensemble"], mer: ["bouteille", "La course de barques du live"], tournoi: ["trophee", "Le TOURNOI BARHAW"], "barhaw-show": ["micro", "4 équipes, 4 jeux, en février"],
    evenements: ["lanterne", "Ce qui arrive bientôt"], grandline: ["bouteille", "La course des navires, La Traversée"], creatures: ["lanterne", "Les attraper, les collectionner, les faire évoluer"], chasse: ["panneau", "Les primes WANTED, le boss de la semaine"], battle: ["epees", "L'Île sans retour, une fois par mois"],
    chopper: ["gamelle", "La mascotte à faire vivre"], jeux: ["borne", "Les mini-jeux et leurs records"], cartes: ["coffre", "La collection de la commu"],
    faille: ["epees", "Les games de LoL entre potes"], bahriot: ["trophee", "Toute la flotte sur les jeux Riot"], potes: ["chopes", "Les streamers potes"], youtube: ["clap", "Les vidéos"], discord: ["cloche", "Rejoindre le serveur"],
  };
  const TAILLES_OBJETS = { micro: 92, camera: 84, bouteille: 203, borne: 100, chopes: 106, casque: 177, trophee: 112, lanterne: 99, panneau: 126, gamelle: 244, coffre: 150, epees: 144, clap: 187, cloche: 159 };
  const objetMenu = (nom, classe) => el("img", { class: classe, src: `/img/objets/${nom}.webp`, alt: "", width: Math.round((TAILLES_OBJETS[nom] || 120) / 4), height: 40, loading: "lazy", decoding: "async" });
  const menuVF = { fait: false, places: new Map() };
  function rendreMenuVF() {
    const nav = $("nav");
    if (!nav) return;
    const vf = document.documentElement.classList.contains("v4");
    if (vf && !menuVF.fait) {
      menuVF.fait = true;
      nav.classList.add("vf");
      nav.setAttribute("aria-label", "Les rubriques du site");
      for (const r of RUBRIQUES_VF) {
        const bouton = el("button", { class: "rubrique-bouton", type: "button", "aria-expanded": "false", "aria-controls": `rubrique-${r.id}` },
          objetMenu(r.icone, "rubrique-icone"), el("span", { class: "rubrique-nom", text: r.nom }), el("span", { class: "rubrique-court", text: r.court }), el("i", { class: "rubrique-point", hidden: true }));
        const panneau = el("div", { class: "rubrique-panneau", id: `rubrique-${r.id}`, role: "group", "aria-label": r.nom });
        for (const id of r.liens) {
          const a = nav.querySelector(`a[data-lien="${id}"]`);
          if (!a) continue;
          // une place gardée dans le menu d'origine, pour l'y remettre si la VF 1.0 se referme
          const place = el("span", { hidden: true });
          a.before(place);
          menuVF.places.set(a, place);
          const [objet, desc] = LIENS_VF[id] || [];
          if (!a.querySelector(".lien-icone") && objet) a.prepend(objetMenu(objet, "lien-icone"));
          if (!a.querySelector(".lien-desc") && desc) a.append(el("small", { class: "lien-desc", text: desc }));
          panneau.append(a);
        }
        nav.append(el("div", { class: "rubrique", "data-rubrique": r.id }, bouton, panneau));
        bouton.addEventListener("click", (e) => {
          e.stopPropagation();
          const ouvre = bouton.getAttribute("aria-expanded") !== "true";
          if (ouvre) jouerSon("souffle");
          ouvrirRubrique(ouvre ? r.id : null);
        });
      }
      const accueil = nav.querySelector(".nav-accueil");
      if (accueil && !accueil.querySelector(".lien-icone")) accueil.prepend(el("img", { class: "lien-icone accueil-icone", src: "/img/chopper-visage.jpg", alt: "", width: 28, height: 28, loading: "lazy", decoding: "async" }));
    } else if (!vf && menuVF.fait) {
      menuVF.fait = false;
      ouvrirRubrique(null);
      for (const [a, place] of menuVF.places) { place.replaceWith(a); }
      menuVF.places.clear();
      nav.querySelectorAll(".rubrique").forEach((r) => r.remove());
      nav.classList.remove("vf");
      nav.setAttribute("aria-label", "Sections du site");
    }
    if (!menuVF.fait) return;
    // un point rose sur la rubrique quand quelque chose y est en direct (le live, le boss, un pote, une game)
    for (const r of nav.querySelectorAll(".rubrique")) {
      const vivant = [...r.querySelectorAll(".pastille-live, .compteur")].some((b) => !b.hidden && !b.classList.contains("compteur-v3"));
      r.querySelector(".rubrique-point").hidden = !vivant;
    }
  }
  function ouvrirRubrique(id) {
    for (const b of document.querySelectorAll("#nav .rubrique-bouton")) {
      const oui = b.getAttribute("aria-controls") === `rubrique-${id}`;
      b.setAttribute("aria-expanded", String(oui));
      b.parentElement.classList.toggle("ouverte", oui);
    }
    document.documentElement.classList.toggle("rubrique-ouverte", Boolean(id));
  }
  document.addEventListener("click", (e) => {
    if (!menuVF.fait) return;
    const lien = e.target.closest?.("#nav .rubrique-panneau a, #nav > a.nav-accueil");
    if (lien) { ouvrirRubrique(null); signalerArrivee(lien); return; }
    if (!e.target.closest?.("#nav .rubrique")) ouvrirRubrique(null);
  });
  // en arrivant sur une partie depuis le menu, son titre fait un petit « pop » (une tache d'encre rose derrière)
  function signalerArrivee(lien) {
    if (reduit.matches) return;
    const id = (lien.getAttribute("href") || "").split("#")[1];
    const titre = id && document.getElementById(id)?.querySelector(".titre-section");
    if (!titre) return;
    let fait = false;
    const pop = () => {
      if (fait) return;
      fait = true;
      titre.classList.remove("arrivee");
      void titre.offsetWidth;
      titre.classList.add("arrivee");
      setTimeout(() => titre.classList.remove("arrivee"), 1100);
    };
    addEventListener("scrollend", pop, { once: true });
    setTimeout(pop, 1000);
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !menuVF.fait) return;
    const ouverte = document.querySelector("#nav .rubrique.ouverte .rubrique-bouton");
    if (ouverte) { ouvrirRubrique(null); ouverte.focus(); }
  });

  // ---------- la VF 1.0 : l'accueil, une carte postale vivante de Port Barhaw (rendue dans Blender, 6 s qui bouclent) ----------
  // L'image fixe d'abord ; la vidéo (moins de 400 ko) ne se charge qu'après la page, et jamais avec « réduire les animations »
  // ou en économie de données, ni sur une connexion lente (3G ou moins).
  function rendreAccueilVF() {
    const carte = $("carte-postale");
    if (!carte || carte.dataset.video || !document.documentElement.classList.contains("v4")) return;
    if (reduit.matches || navigator.connection?.saveData || /2g$|^3g$/.test(navigator.connection?.effectiveType || "")) return;
    carte.dataset.video = "1";
    const lancer = () => {
      // la même image que celle déjà affichée (le téléphone a pu prendre la petite) : rien à retélécharger
      const image = carte.querySelector(".carte-postale-image");
      const v = el("video", { class: "carte-postale-video", muted: true, loop: true, playsinline: true, autoplay: true, preload: "auto", poster: image?.currentSrc || "/img/accueil-vf.webp", "aria-hidden": "true", tabindex: "-1" },
        el("source", { src: "/videos/accueil-vf.webm", type: "video/webm" }), el("source", { src: "/videos/accueil-vf.mp4", type: "video/mp4" }));
      v.muted = true;
      v.addEventListener("playing", () => carte.classList.add("joue"), { once: true });
      image?.after(v);
      v.play?.().catch(() => {});
      // la carte postale ne tourne que quand on la voit : plus bas dans la page, la vidéo se met en pause
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(([e]) => {
          if (!e) return;
          if (e.isIntersecting) { if (v.paused) v.play?.().catch(() => {}); }
          else if (!v.paused) v.pause();
        }).observe(carte);
      }
    };
    if (document.readyState === "complete") setTimeout(lancer, 300);
    else window.addEventListener("load", () => setTimeout(lancer, 300), { once: true });
  }

  // ---------- l'aperçu de la VF 1.0 : pour Liliano seul, avant le 22 décembre à 21 h 30 ----------
  // Le bot dit « apercuVF » seulement au propriétaire du serveur Barhaw connecté avec Discord, et seulement avant l'ouverture.
  // Un bouton 見 dans l'en-tête bascule entre le site d'aujourd'hui et la VF 1.0 ; le choix est retenu sur cet appareil.
  // Rien ne change pour les autres visiteurs. La Traversée se joue, mais ses parties ne comptent qu'à l'ouverture.
  const CLE_APERCU_VF = "barhaw-apercu-vf";
  const apercuVF = { permis: false, actif: false };
  function majApercuVF(permis) {
    if (permis === apercuVF.permis) return;
    apercuVF.permis = permis;
    let voulu = false;
    try { voulu = localStorage.getItem(CLE_APERCU_VF) === "1"; } catch {}
    const avant = apercuVF.actif;
    apercuVF.actif = permis && voulu;
    rendreBoutonApercuVF();
    if (avant !== apercuVF.actif) appliquerApercuVF();
  }
  function appliquerApercuVF() {
    if (donnees) rendreTout();
    else {
      document.documentElement.classList.toggle("v4", v4Ouverte());
      rendreMenuVF();
      rendreAccueilVF();
    }
  }
  function basculerApercuVF() {
    if (!apercuVF.permis) return;
    apercuVF.actif = !apercuVF.actif;
    try { localStorage.setItem(CLE_APERCU_VF, apercuVF.actif ? "1" : "0"); } catch {}
    rendreBoutonApercuVF();
    appliquerApercuVF();
    bulleApercuVF(apercuVF.actif
      ? "Tu vois la VF 1.0 en avance : toi seul la vois. La Traversée se joue, mais tes parties ne comptent qu'à partir du 22 décembre à 21 h 30."
      : "Retour au site d'aujourd'hui, celui que tout le monde voit.");
  }
  function rendreBoutonApercuVF() {
    let b = $("apercu-vf");
    if (!apercuVF.permis) { b?.remove(); $("apercu-vf-bulle")?.remove(); return; }
    if (!b) {
      b = el("button", { class: "apercu-vf", id: "apercu-vf", type: "button", onclick: basculerApercuVF });
      document.querySelector(".entete-droite")?.prepend(b);
    }
    vider(b,
      el("span", { class: "apercu-vf-oeil", "aria-hidden": "true", text: "見" }),
      el("span", { class: "apercu-vf-texte", text: apercuVF.actif ? "Quitter l'aperçu" : "Aperçu VF 1.0" }),
    );
    b.classList.toggle("actif", apercuVF.actif);
    b.setAttribute("aria-pressed", String(apercuVF.actif));
    b.setAttribute("aria-label", apercuVF.actif ? "Quitter l'aperçu de la VF 1.0" : "Voir la VF 1.0 en avance (toi seul la vois)");
    b.title = apercuVF.actif ? "Revenir au site d'aujourd'hui" : "Voir la VF 1.0 en avance (toi seul la vois)";
  }
  let minuteurBulleVF = 0;
  function bulleApercuVF(texte) {
    let p = $("apercu-vf-bulle");
    if (!p) {
      p = el("p", { class: "apercu-vf-bulle", id: "apercu-vf-bulle", role: "status" });
      document.body.append(p);
    }
    p.textContent = texte;
    p.hidden = false;
    clearTimeout(minuteurBulleVF);
    minuteurBulleVF = setTimeout(() => { p.hidden = true; }, 7000);
  }

  // ---------- V4 : l'événement caritatif du week-end (M_oo_de pour Les P'tits Doudous) ----------
  // Du vendredi 6 novembre 18 h au lundi 9 novembre 3 h (Paris) : une animation à l'arrivée (une fois par jour et par
  // appareil), puis un bandeau en haut de la page, qui dit si M_oo_de est en live. Le bot donne l'état du live
  // (lib/caritatif.js) ; si le bot est en pause ou pas encore à jour, la date suffit pour montrer l'événement.
  const CARITATIF = {
    debut: Date.parse("2026-11-06T17:00:00Z"), fin: Date.parse("2026-11-09T02:00:00Z"),
    chaine: "m_oo_de", nom: "M_oo_de", association: { nom: "Les P'tits Doudous", lien: "https://lesptitsdoudous.org/" },
  };
  const CLE_CARITATIF = "barhaw-caritatif-vu";
  let introCaritatifFaite = false;
  function infosCaritatif() {
    const c = donnees?.caritatif;
    if (c === null) return null; // le bot dit : ce n'est pas le week-end de l'événement
    const t = Date.now();
    if (!c && !(t >= CARITATIF.debut && t < CARITATIF.fin)) return null;
    const pote = (donnees?.amis || []).find((a) => String(a.login || "").toLowerCase() === CARITATIF.chaine);
    return { ...CARITATIF, ...(c || {}), enLive: c ? Boolean(c.enLive) : Boolean(pote?.enLive), viewers: c?.viewers || pote?.viewers || 0, connu: Boolean(c || pote) };
  }
  function rendreCaritatif() {
    const c = infosCaritatif();
    let b = $("caritatif-bandeau");
    if (!c) { b?.remove(); return; }
    const lien = `https://www.twitch.tv/${c.chaine}`;
    const etatLive = c.enLive ? `🔴 En live maintenant${c.viewers ? ` · ${nombre(c.viewers)} viewers` : ""}` : c.connu ? "Pas en live pour l'instant" : "";
    if (!b) {
      b = el("aside", { class: "caritatif-bandeau", id: "caritatif-bandeau", "aria-label": "L'événement caritatif du week-end" });
      document.querySelector("#accueil .hero-texte")?.prepend(b);
    }
    vider(b,
      el("img", { class: "caritatif-doudou", src: "/img/jeux/remede-calin.webp", alt: "", width: 46, height: 46, decoding: "async" }),
      el("p", { class: "caritatif-texte" }, el("b", { text: `Ce week-end, ${c.nom} joue pour ${c.association.nom}` }), el("span", { text: " : des dons pour rendre l'hôpital plus doux aux enfants opérés." })),
      etatLive ? el("span", { class: `caritatif-live${c.enLive ? " on" : ""}`, text: etatLive }) : null,
      el("a", { class: "btn btn-plein btn-petit", href: lien, target: "_blank", rel: "noopener", text: c.enLive ? "Regarder le live" : "Sa chaîne Twitch" }),
    );
    introCaritatif(c, etatLive, lien);
  }
  // l'animation d'arrivée : des cœurs qui montent, un doudou qui saute, et l'essentiel en une carte
  function introCaritatif(c, etatLive, lien) {
    if (introCaritatifFaite || $("caritatif-intro") || document.querySelector(".cine")) return;
    const jour = new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
    try { if (localStorage.getItem(CLE_CARITATIF) === jour) return; localStorage.setItem(CLE_CARITATIF, jour); } catch {}
    introCaritatifFaite = true;
    const echap = (e) => { if (e.key === "Escape") fermer(); };
    const fermer = () => {
      document.removeEventListener("keydown", echap);
      o.classList.add("part");
      setTimeout(() => o.remove(), reduit.matches ? 0 : 450);
    };
    const o = el("div", { class: "caritatif-intro", id: "caritatif-intro", role: "dialog", "aria-modal": "true", "aria-labelledby": "caritatif-titre" },
      el("div", { class: "caritatif-coeurs", "aria-hidden": "true" }, Array.from({ length: 18 }, (_, k) => el("i", { style: `--x: ${(k * 37) % 100}; --d: ${((k * 7) % 18) * 0.25}s; --t: ${0.7 + (k % 4) * 0.22}` }))),
      el("div", { class: "caritatif-carte" },
        el("img", { class: "caritatif-doudou grand", src: "/img/jeux/remede-calin.webp", alt: "", width: 128, height: 128, decoding: "async" }),
        el("p", { class: "surtitre", text: "Ce week-end · événement caritatif" }),
        el("h2", { class: "caritatif-titre", id: "caritatif-titre" }, `${c.nom} joue pour `, el("span", { class: "degrade", text: c.association.nom })),
        el("p", { class: "caritatif-sous", text: "L'association rend l'hospitalisation plus douce pour les enfants opérés, leurs parents et les soignants. Les dons se font pendant son live, du vendredi 18 h au lundi 3 h." }),
        etatLive ? el("p", { class: `caritatif-live${c.enLive ? " on" : ""}`, text: etatLive }) : null,
        el("div", { class: "caritatif-actions" },
          el("a", { class: "btn btn-plein", href: lien, target: "_blank", rel: "noopener", text: c.enLive ? "Regarder le live" : "Voir sa chaîne Twitch" }),
          el("a", { class: "btn btn-contour", href: c.association.lien, target: "_blank", rel: "noopener", text: "Découvrir l'association" }),
        ),
        el("button", { class: "caritatif-entrer", type: "button", onclick: () => fermer(), text: "Entrer sur le site →" }),
      ),
    );
    o.addEventListener("click", (e) => { if (e.target === o) fermer(); });
    document.addEventListener("keydown", echap);
    document.body.append(o);
    o.querySelector(".caritatif-entrer")?.focus({ preventScroll: true });
  }

  // le grand kanji de chaque partie glisse un peu moins vite que la page
  function kanjis() {
    const liste = [...document.querySelectorAll(".kanji")];
    if (!liste.length || reduit.matches) return;
    // sur un petit écran, le kanji ne glisse pas (site.css, max-width 560px) : rien à calculer pendant le défilement
    const petit = window.matchMedia("(max-width: 560px)");
    let attente = false;
    const maj = () => {
      attente = false;
      if (petit.matches) return;
      // toutes les mesures d'abord, puis toutes les écritures : une seule mise en page par image
      const bas = window.innerHeight;
      const glisses = liste.map((k) => {
        const r = k.parentElement.getBoundingClientRect();
        return r.bottom < -200 || r.top > bas + 200 ? null : `${Math.round(Math.max(-120, Math.min(40, -r.top * 0.14)))}px`;
      });
      liste.forEach((k, i) => {
        if (glisses[i] !== null && k.style.getPropertyValue("--glisse") !== glisses[i]) k.style.setProperty("--glisse", glisses[i]);
      });
    };
    maj();
    petit.addEventListener?.("change", maj);
    window.addEventListener("scroll", () => { if (!attente) { attente = true; requestAnimationFrame(maj); } }, { passive: true });
  }

  // ---------- la musique : un clic lance le morceau, un autre le coupe, et un réglage du volume ----------
  // Le morceau est un fichier du site : musique/oden.mp3. S'il n'y est pas, le bouton ne s'affiche pas.
  function musique() {
    const bouton = $("musique");
    if (!bouton) return;
    const zone = bouton.parentElement;
    const audio = new Audio();
    audio.loop = true;
    audio.preload = "none";
    let volume = 0.6;
    try { const v = parseFloat(localStorage.getItem("barhaw-volume")); if (v >= 0 && v <= 1) volume = v; } catch {}
    audio.volume = volume;
    // sur iPhone, le volume ne se règle qu'avec les boutons du téléphone : pas de réglage à l'écran
    const reglable = (() => { const a = new Audio(); a.volume = 0.5; return a.volume === 0.5; })();
    const curseur = el("input", { type: "range", min: 0, max: 1, step: 0.01, value: volume, "aria-label": "Volume de la musique", id: "musique-volume" });
    const reglage = el("label", { class: "volume", hidden: true }, el("span", { "aria-hidden": "true", text: "🔊" }), curseur);
    zone.append(reglage);
    curseur.addEventListener("input", () => {
      audio.volume = Number(curseur.value);
      try { localStorage.setItem("barhaw-volume", curseur.value); } catch {}
    });
    // on commence à charger le morceau dès que la souris (ou le doigt) arrive sur le bouton : le clic le lance tout de suite
    const preparer = () => { if (!audio.getAttribute("src")) { audio.src = MUSIQUE; audio.preload = "auto"; } };
    bouton.addEventListener("pointerenter", preparer);
    bouton.addEventListener("focus", preparer);
    bouton.addEventListener("touchstart", preparer, { passive: true });
    const afficher = (on) => {
      bouton.setAttribute("aria-pressed", String(on));
      $("musique-texte").textContent = on ? "Oden Store" : "Musique";
      reglage.hidden = !on || !reglable;
    };
    bouton.addEventListener("click", async () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        afficher(false);
        return;
      }
      preparer();
      afficher(true);
      try { await audio.play(); } catch { afficher(false); }
    });
    // sans le fichier, seul le bouton de la musique s'en va (le bouton des sons de la VF reste)
    const cacher = () => { bouton.hidden = true; reglage.hidden = true; };
    audio.addEventListener("error", () => { afficher(false); cacher(); });
    document.addEventListener("play", (e) => {
      if (e.target instanceof HTMLVideoElement && !e.target.muted && !audio.paused) { audio.pause(); audio.currentTime = 0; afficher(false); }
    }, true);
    SON.musiqueSite = audio;
    fetch(MUSIQUE, { method: "HEAD" }).then((r) => { if (!r.ok) cacher(); }).catch(() => {});
  }

  // ---------- la VF 1.0 : les sons du site (coupés par défaut ; le bouton haut-parleur les allume) ----------
  // Rien ne se charge tant qu'ils sont coupés. Allumés : un pop quand on change d'onglet, un souffle quand un menu s'ouvre,
  // un taiko quand un navire arrive sur une île, la mer sur la carte GRAND LINE en 3D, et la musique et les bruitages des jeux.
  // Les fichiers : son/*.m4a (AAC, de la banque Artlist), chargés un par un, la première fois qu'on en a besoin.
  // Web Audio : les boucles (la mer, les musiques) ont 0,5 s de marge de chaque côté et se rejouent sans blanc.
  const SON = { actif: false, ctx: null, maitre: null, tampons: new Map(), chargements: new Map(), boucles: {}, musiqueSite: null };
  const SON_BOUCLES = { "rt-drone": 24, mer: 24, "jeu-quiz": 20, "jeu-memory": 18.2944, "jeu-course": 23.2798, "jeu-rumble": 26.1818, "jeu-docteur": 19.6018 };
  const SON_NIVEAUX = { pop: 0.5, souffle: 0.45, clic: 0.55, taiko: 0.85, impact: 0.9, carte: 0.75, paire: 0.6, "quiz-bon": 0.65, "quiz-faux": 0.55, saut: 0.4, tonneau: 0.7, cloche: 0.7, potion: 0.5, soin: 0.55, victoire: 0.65,
    "br-tic": 0.39, "br-boum": 0.61, "br-onde": 0.38, "br-charge": 0.45, "br-score": 0.26, "br-monte": 0.47, "br-tampon": 0.92,
    "br-roulement": 0.76, "br-cymbale": 0.76, "br-fanfare": 0.64, "br-feux": 0.54, "br-acclame": 0.31, "br-paillettes": 0.58,
    "cr-plouf": 1, "cr-bulles": 0.42, "cr-filet": 0.55, "cr-baleine": 0.22, "cr-pieces": 1, "cr-feu": 0.58, "cr-cristal": 0.29,
    "cr-mignon": 0.46, "cr-nacree": 0.55, "cr-envol": 0.51,
    "rt-drone": 0.12, "rt-murmure": 0.36, "rt-voix": 0.3, "rt-plume": 0.6, "rt-cadenas": 1, "rt-ouvert": 1, "rt-goutte": 0.62,
    "rt-grince": 0.19, "rt-page": 0.74, "rt-cliquet": 1 };
  // la SEMAINE BAHRIOT (js/bahriot-anim.js) : ses bruitages, préchargés quand ses animations arrivent
  const SONS_BAHRIOT = ["br-tic", "br-boum", "br-onde", "br-charge", "br-score", "br-monte", "br-tampon", "br-roulement", "br-cymbale", "br-fanfare", "br-feux", "br-acclame", "br-paillettes", "carte"];
  const SONS_JEUX = { rumble: ["cloche", "potion", "victoire", "quiz-faux"], quiz: ["clic", "quiz-bon", "quiz-faux", "souffle", "victoire"], docteur: ["soin", "quiz-faux", "victoire", "souffle"], memory: ["carte", "paire", "victoire"], course: ["clic", "saut", "tonneau", "impact", "pop", "victoire"] };
  try { SON.actif = localStorage.getItem("barhaw-sons") === "oui"; } catch {}
  const sonVF = () => document.documentElement.classList.contains("v4");
  const sonActif = () => SON.actif && sonVF();
  function contexteSon() {
    if (!SON.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      SON.ctx = new Ctx();
      SON.maitre = SON.ctx.createGain();
      SON.maitre.gain.value = 0.9;
      SON.maitre.connect(SON.ctx.destination);
    }
    if (SON.ctx.state === "suspended" && !document.hidden) SON.ctx.resume().catch(() => {});
    return SON.ctx;
  }
  // un son : son tampon décodé (gardé), chargé une seule fois même si on le demande plusieurs fois en même temps
  function tamponSon(nom) {
    if (SON.tampons.has(nom)) return Promise.resolve(SON.tampons.get(nom));
    const ctx = contexteSon();
    if (!ctx) return Promise.resolve(null);
    if (!SON.chargements.has(nom)) {
      SON.chargements.set(nom, fetch(`/son/${nom}.m4a`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
        .then((a) => new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko)))
        .then((b) => { SON.tampons.set(nom, b); return b; })
        .catch(() => null)
        .finally(() => SON.chargements.delete(nom)));
    }
    return SON.chargements.get(nom);
  }
  function prechargerSons(noms) { if (sonActif()) for (const n of noms) tamponSon(n); }
  // jouer un bruitage ; s'il n'est pas encore là, il part quand il arrive (sauf s'il arrive trop tard pour avoir un sens)
  function jouerSon(nom, { volume = 1, duree = 0, retard = 0 } = {}) {
    if (!sonActif() || document.hidden) return;
    const ctx = contexteSon();
    if (!ctx) return;
    const demande = performance.now();
    const partir = (b) => {
      if (!b || !sonActif() || performance.now() - demande > 700 + retard * 1000) return;
      const src = ctx.createBufferSource();
      src.buffer = b;
      const g = ctx.createGain();
      const v = volume * (SON_NIVEAUX[nom] ?? 1);
      g.gain.value = v;
      src.connect(g).connect(SON.maitre);
      const t0 = ctx.currentTime + Math.max(0, retard - (performance.now() - demande) / 1000);
      src.start(t0);
      if (duree) {
        g.gain.setValueAtTime(v, t0 + Math.max(0, duree - 0.15));
        g.gain.linearRampToValueAtTime(0.0001, t0 + duree);
        src.stop(t0 + duree + 0.02);
      }
    };
    const b = SON.tampons.get(nom);
    if (b) partir(b); else tamponSon(nom).then(partir);
  }
  // les boucles : « mer » (la carte en 3D) et « jeu » (la musique du jeu en cours), avec un fondu à l'entrée et à la sortie
  async function lancerBoucle(cle, nom, volume) {
    if (!sonActif()) return;
    const ctx = contexteSon();
    if (!ctx) return;
    const deja = SON.boucles[cle];
    if (deja?.nom === nom) return;
    arreterBoucle(cle);
    const jeton = { nom };
    SON.boucles[cle] = jeton;
    const b = await tamponSon(nom);
    if (!b || SON.boucles[cle] !== jeton || !sonActif()) return;
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    src.loopStart = 0.5;
    src.loopEnd = Math.min(b.duration, 0.5 + (SON_BOUCLES[nom] || b.duration - 1));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
    src.connect(g).connect(SON.maitre);
    src.start(0, 0.5);
    jeton.src = src;
    jeton.g = g;
  }
  function arreterBoucle(cle, fondu = 0.6) {
    const l = SON.boucles[cle];
    if (!l) return;
    delete SON.boucles[cle];
    if (!l.src || !SON.ctx) return;
    const t = SON.ctx.currentTime;
    try {
      l.g.gain.cancelScheduledValues(t);
      l.g.gain.setValueAtTime(l.g.gain.value, t);
      l.g.gain.linearRampToValueAtTime(0.0001, t + fondu);
      l.src.stop(t + fondu + 0.05);
    } catch {}
  }
  // la musique d'un jeu : pas si la musique du site ou celle de BOSS LIVE joue déjà (les bruitages, eux, restent)
  function musiqueJeu(jeu) {
    if (!sonActif()) return;
    if ((SON.musiqueSite && !SON.musiqueSite.paused) || (BL.son && !BL.son.paused)) return;
    lancerBoucle("jeu", `jeu-${jeu}`, 0.3);
  }
  const finMusiqueJeu = (fondu = 0.8) => arreterBoucle("jeu", fondu);
  // la mer : tant que la carte GRAND LINE est ouverte en grand (en 3D)
  const merSon = (oui) => (oui ? lancerBoucle("mer", "mer", 0.42) : arreterBoucle("mer", 1));
  // une petite vidéo muette de la VF (rendue dans Blender) : WebM, sinon MP4 ; jamais avec « réduire les animations »,
  // en économie de données ou sur une connexion très lente (l'image fixe reste)
  function videoVF(chemin, classe) {
    const v = el("video", { class: classe, muted: true, playsinline: true, autoplay: true, preload: "auto", "aria-hidden": "true", tabindex: "-1", disablepictureinpicture: true },
      el("source", { src: `${chemin}.webm`, type: "video/webm" }), el("source", { src: `${chemin}.mp4`, type: "video/mp4" }));
    v.muted = true;
    v.defaultMuted = true;
    return v;
  }
  const videosPermises = () => sonVF() && !reduit.matches && !navigator.connection?.saveData && !/2g$/.test(navigator.connection?.effectiveType || "");
  function boutonSons() {
    const b = $("sons");
    if (!b) return;
    // un navigateur qui ne sait pas lire les sons (AAC) ou sans Web Audio : pas de bouton
    const lisible = (() => { try { return Boolean(new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"')); } catch { return false; } })();
    if (!lisible || !(window.AudioContext || window.webkitAudioContext)) { b.remove(); SON.actif = false; return; }
    const afficher = () => {
      b.setAttribute("aria-pressed", String(SON.actif));
      b.title = SON.actif ? "Couper les sons du site" : "Allumer les sons du site";
      const t = b.querySelector(".sons-texte");
      if (t) t.textContent = SON.actif ? "Sons" : "Sons coupés";
    };
    afficher();
    b.addEventListener("click", () => {
      SON.actif = !SON.actif;
      try { localStorage.setItem("barhaw-sons", SON.actif ? "oui" : "non"); } catch {}
      afficher();
      if (SON.actif) {
        contexteSon();
        jouerSon("pop");
        prechargerSons(["pop", "souffle", "taiko"]);
        if (animBahriotPret()) prechargerSons(SONS_BAHRIOT);
        if (SALLE.ouverte) merSon(true);
        const jeu = jeuEnCours();
        if (jeu) musiqueJeu(jeu);
      } else {
        for (const cle of Object.keys(SON.boucles)) arreterBoucle(cle, 0.3);
        setTimeout(() => { if (!SON.actif) SON.ctx?.suspend().catch(() => {}); }, 400);
      }
    });
    // la musique du site prend le relais de celle d'un jeu (jamais les deux en même temps)
    SON.musiqueSite?.addEventListener("play", () => finMusiqueJeu(0.4));
    // déjà allumés à la visite d'avant : le son se débloque au premier geste (les navigateurs l'exigent)
    const debloquer = () => { if (sonActif()) contexteSon(); };
    document.addEventListener("pointerdown", debloquer, { capture: true, passive: true });
    document.addEventListener("keydown", debloquer, { capture: true });
    // onglet caché : tout se tait ; il revient : ça reprend
    document.addEventListener("visibilitychange", () => {
      if (!SON.ctx) return;
      if (document.hidden) SON.ctx.suspend().catch(() => {});
      else if (sonActif()) SON.ctx.resume().catch(() => {});
    });
    // un pop quand on change d'onglet (lu avant que l'onglet ne se redessine)
    document.addEventListener("click", (e) => {
      const t = e.target.closest?.('[role="tab"]');
      if (t && t.getAttribute("aria-selected") !== "true") jouerSon("pop");
    }, true);
    // les bruitages d'un jeu se chargent quand on arrive près de lui (sa musique, quand on lance une partie)
    if ("IntersectionObserver" in window) {
      const o = new IntersectionObserver((entrees) => {
        for (const e of entrees) if (e.isIntersecting && SONS_JEUX[e.target.id]) prechargerSons(SONS_JEUX[e.target.id]);
      }, { rootMargin: "600px 0px" });
      for (const id of Object.keys(SONS_JEUX)) { const z = $(id); if (z) o.observe(z); }
    }
  }

  // ---------- les mèmes : des autocollants posés au hasard, différents à chaque visite ----------
  function melanger(liste) {
    for (let k = liste.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [liste[k], liste[j]] = [liste[j], liste[k]]; }
    return liste;
  }
  // le bord droit du texte d'un élément (là où ses lignes s'arrêtent vraiment)
  function bordTexte(e) {
    const r = document.createRange();
    r.selectNodeContents(e);
    const rects = [...r.getClientRects()];
    return rects.length ? Math.max(...rects.map((x) => x.right)) : e.getBoundingClientRect().left;
  }

  // l'écran sombre qui montre un mème, une vidéo ou une carte en grand ; un clic à côté, ✕ ou Échap le ferme
  function visionneuse(contenu, etiquette, depuis, { surTouche } = {}) {
    const fermer = () => {
      contenu.pause?.();
      v.remove();
      if (!document.querySelector(".visionneuse")) document.body.classList.remove("vision-ouverte");
      window.removeEventListener("keydown", touche);
      depuis?.focus({ preventScroll: true });
    };
    const touche = (e) => { if (e.key === "Escape") fermer(); else surTouche?.(e); };
    const v = el("div", { class: "visionneuse", role: "dialog", "aria-modal": "true", "aria-label": etiquette },
      contenu,
      el("button", { class: "visionneuse-fermer", type: "button", "aria-label": "Fermer", text: "✕" }),
    );
    v.addEventListener("click", (e) => { if (contenu.tagName === "IMG" || !contenu.contains(e.target)) fermer(); });
    window.addEventListener("keydown", touche);
    document.body.append(v);
    document.body.classList.add("vision-ouverte");
    v.querySelector(".visionneuse-fermer").focus();
  }
  const agrandir = (m, depuis) => visionneuse(el("img", { src: m.src, alt: "Un mème de Liliano", width: m.l, height: m.h }), "Le mème en grand", depuis);
  const lecteurVideo = (v, extra = {}) => el("video", { src: v.src, poster: v.affiche, controls: true, playsinline: true, preload: "none", width: 1920, height: 1080, "aria-label": v.titre, ...extra });
  // une vidéo posée dans la page : son image et un gros bouton ▶ ; le vrai lecteur (avec ses commandes) n'arrive qu'au clic.
  // Un lecteur avec ses commandes fait travailler le navigateur à chaque image, même tout en bas de la page ;
  // et l'image ne se charge qu'à l'approche (loading="lazy").
  function brancherFacade(bouton, v, etiquette) {
    bouton.addEventListener("click", () => {
      const lecteur = lecteurVideo(v, { autoplay: true, preload: "auto", "aria-label": etiquette || v.titre });
      bouton.replaceWith(lecteur);
      lecteur.play?.().catch(() => {});
      lecteur.focus({ preventScroll: true });
    }, { once: true });
    return bouton;
  }
  const videoAuClic = (v) => brancherFacade(el("button", { class: "video-facade", type: "button", "aria-label": `Lancer la vidéo : ${v.titre}` },
    el("img", { src: v.affiche, alt: "", width: 1920, height: 1080, loading: "lazy", decoding: "async" }),
    el("span", { class: "video-facade-bouton", "aria-hidden": "true" })), v);
  function facadesFixes() {
    for (const b of document.querySelectorAll(".video-facade[data-video]")) {
      const v = VIDEOS[b.dataset.video];
      if (v) brancherFacade(b, v, b.dataset.titre);
    }
  }
  const visionner = (v, depuis) => visionneuse(lecteurVideo(v, { autoplay: true, preload: "auto" }), v.titre, depuis);

  function autocollants() {
    const places = [];
    const hero = document.querySelector(".hero-chopper");
    if (hero) places.push({ type: "hero", parent: hero });
    for (const t of document.querySelectorAll("section[data-section]:not(.hero) > .entete-section")) places.push({ type: "entete", parent: t });
    const pied = document.querySelector(".pied");
    if (pied) places.push({ type: "pied", parent: pied });
    if (!places.length) return;
    const tirage = melanger([...MEMES]);
    const collants = places.map((place, k) => {
      const m = tirage[k % tirage.length];
      const b = el("button", { class: "autocollant", type: "button", "aria-label": "Voir ce mème en grand" },
        el("img", { src: m.src, alt: "Un mème de Liliano", width: m.l, height: m.h, loading: "lazy", decoding: "async" }));
      b.addEventListener("click", () => agrandir(m, b));
      place.parent.prepend(b);
      // le hasard est tiré une fois : l'autocollant ne saute pas quand la fenêtre change de taille
      return { place, m, b, r: (Math.random() * 22 - 11).toFixed(1), rx: Math.random(), ry: Math.random() };
    });

    const flottant = (s) => {
      const ratio = s.m.h / s.m.l;
      s.b.classList.add("flottant");
      s.b.style.width = `${ratio > 1.15 ? 86 : ratio > 0.8 ? 104 : 150}px`;
    };
    // ce qui se pose sans rien mesurer ; renvoie faux pour un autocollant d'en-tête sur ordinateur (il faut mesurer le titre)
    function poserSansMesure(s, etroit) {
      const { b, m, place } = s;
      const ratio = m.h / m.l;
      b.className = `autocollant${b.classList.contains("revele") ? " revele" : ""}${b.classList.contains("vu") ? " vu" : ""}`;
      b.removeAttribute("style");
      b.style.setProperty("--r", `${s.r}deg`);
      if (place.type === "pied") { b.classList.add("au-pied"); b.style.width = `${ratio > 1.15 ? 130 : ratio > 0.8 ? 160 : 220}px`; return true; }
      if (place.type === "hero") {
        b.classList.add("au-hero");
        b.style.width = `${etroit ? (ratio > 1.15 ? 78 : ratio > 0.8 ? 96 : 130) : (ratio > 1.15 ? 120 : ratio > 0.8 ? 150 : 200)}px`;
        return true;
      }
      if (etroit) { flottant(s); return true; }
      return false;
    }
    // dans l'en-tête d'une partie : à droite du titre, là où il y a de la place (toutes les mesures, puis toutes les écritures)
    function poserAvecMesure(liste) {
      const mesures = liste.map(({ place }) => {
        const boite = place.parent.getBoundingClientRect();
        const textes = [...place.parent.querySelectorAll(".titre-section, .sous, .surtitre")];
        return { boite, droite: Math.max(0, ...textes.map((e) => bordTexte(e) - boite.left)) };
      });
      liste.forEach((s, i) => {
        const { boite, droite } = mesures[i];
        const ratio = s.m.h / s.m.l;
        let w = ratio > 1.15 ? 150 : ratio > 0.8 ? 180 : 250;
        const libre = boite.width - droite - 40;
        if (libre < 120) { flottant(s); return; }
        w = Math.min(w, libre);
        const haut = w * ratio + 12;
        s.b.style.width = `${Math.round(w)}px`;
        s.b.style.left = `${Math.round(droite + 28 + s.rx * Math.max(0, libre - w))}px`;
        s.b.style.top = `${Math.round(-12 + s.ry * Math.max(0, boite.height - haut * 0.75))}px`;
      });
    }
    // une partie loin de l'écran est en veille (content-visibility) : la mesurer forcerait sa mise en page.
    // L'autocollant de son en-tête attend donc qu'elle approche (il est encore invisible d'ici là).
    const proches = new Set();
    const aMesurer = new Set();
    function poserProches() {
      const liste = [...aMesurer].filter((s) => proches.has(s.place.parent));
      if (!liste.length) return;
      for (const s of liste) aMesurer.delete(s);
      poserAvecMesure(liste);
    }
    let largeurPosee = 0;
    function placer() {
      const etroit = window.innerWidth <= 900;
      largeurPosee = window.innerWidth;
      aMesurer.clear();
      for (const s of collants) if (!poserSansMesure(s, etroit)) aMesurer.add(s);
      poserProches();
    }
    const veille = "IntersectionObserver" in window
      ? new IntersectionObserver((entrees) => {
        for (const e of entrees) {
          if (e.isIntersecting) proches.add(e.target);
          else proches.delete(e.target);
        }
        poserProches();
      }, { rootMargin: "40% 0px" })
      : null;
    for (const s of collants) {
      if (s.place.type !== "entete") continue;
      if (veille) veille.observe(s.place.parent);
      else proches.add(s.place.parent);
    }
    placer();
    apparaitre(collants.map((s) => s.b));
    let attente = 0;
    // sur téléphone, la barre d'adresse qui se cache change la hauteur de la fenêtre : rien à replacer pour si peu
    window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(() => { if (window.innerWidth !== largeurPosee) placer(); }, 200); });
    // les polices arrivent après : les titres changent de largeur, on replace (sur téléphone, rien ne dépend des titres)
    document.fonts?.ready?.then(() => { if (window.innerWidth > 900) placer(); });
  }

  // la section en cours est soulignée dans le menu
  function suiviSections() {
    const liens = new Map([...document.querySelectorAll(".nav a[data-lien]")].map((a) => [a.dataset.lien, a]));
    const sections = [...document.querySelectorAll("[data-section]")];
    if (!sections.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (!e.isIntersecting) continue;
        for (const [id, a] of liens) {
          if (id === e.target.id) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        }
      }
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));

    // le lecteur du match en direct, pareil, près de la partie Tournoi
    const partieTournoi = $("tournoi");
    if (partieTournoi) new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting) && !tournoiProche) { tournoiProche = true; chargerLecteurTournoi(); }
    }, { rootMargin: "400px 0px" }).observe(partieTournoi);
    // le lecteur Twitch se prépare un peu avant d'arriver sur « Ma chaîne »
    const chaine = $("chaine");
    if (!chaine) return;
    new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting) && !chaineProche) { chaineProche = true; rendreChaine(); }
    }, { rootMargin: "400px 0px" }).observe(chaine);
    // la pastille « En live » en bas de l'écran se cache quand on regarde déjà le live
    new IntersectionObserver((entrees) => {
      for (const e of entrees) chaineVue = e.isIntersecting;
      rendreFlottant();
    }, { threshold: 0.25 }).observe(chaine);
  }

  // ---------- l'en-tête : live, potes, compte ----------
  function rendreFlottant() {
    const c = donnees?.chaine;
    const f = $("flottant-live");
    if (!f) return;
    const live = Boolean(c?.enLive);
    f.hidden = !live || chaineVue;
    if (live) $("flottant-titre").textContent = [c.titre, c.jeu].filter(Boolean).join(" · ") || "Viens faire un tour";
  }

  function rendreEntete() {
    const c = donnees?.chaine;
    const live = Boolean(c?.enLive);
    $("pastille-live").hidden = !live;
    const n = (donnees?.amis || []).filter((a) => a.enLive).length;
    $("compteur-potes").hidden = !n;
    $("compteur-potes").textContent = n;
    $("hero-live").textContent = live ? "Regarder le live" : "Voir la chaîne";
    rendreMenuVF();
    rendreFlottant();
    rendreModeLive();
  }

  // ---------- le mode live : l'onglet, l'icône, et une grosse case manga en haut de l'écran ----------
  const titreNormal = document.title;
  let liveAvant = null; // null : on ne sait pas encore (premier chargement)
  let cleCaseLive = "";
  let iconeNormale = "";
  let iconeLive = "";
  const lireSession = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const ecrireSession = (k, v) => { try { sessionStorage.setItem(k, v); } catch {} };

  // l'icône de l'onglet avec un point rouge, dessinée une fois
  function iconeAvecPoint() {
    const lien = document.querySelector('link[rel="icon"]');
    if (!lien) return;
    if (!iconeNormale) iconeNormale = lien.getAttribute("href");
    if (iconeLive) { lien.setAttribute("href", iconeLive); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0, 64, 64);
        x.beginPath(); x.arc(47, 47, 15, 0, Math.PI * 2);
        x.fillStyle = "#ff2d55"; x.fill();
        x.lineWidth = 5; x.strokeStyle = "#12050d"; x.stroke();
        iconeLive = c.toDataURL("image/png");
        if (donnees?.chaine?.enLive) lien.setAttribute("href", iconeLive);
      } catch {}
    };
    img.src = iconeNormale;
  }

  function rendreModeLive() {
    const c = donnees?.chaine;
    const live = Boolean(c?.enLive);
    const z = $("case-live");
    document.documentElement.classList.toggle("mode-live", live);
    document.title = live ? `🔴 EN LIVE · ${titreNormal}` : titreNormal;
    if (live) iconeAvecPoint();
    else if (iconeNormale) document.querySelector('link[rel="icon"]')?.setAttribute("href", iconeNormale);
    if (!z) return;
    if (!live) {
      z.hidden = true;
      cleCaseLive = "";
      if (donnees && !donnees.horsLigne) liveAvant = false;
      return;
    }
    const vientDeCommencer = liveAvant === false; // le live a commencé pendant que la page était ouverte
    const premierChargement = liveAvant === null;
    liveAvant = true;
    const cle = `barhaw-live:${c.depuis || "live"}`;
    if (lireSession(cle) === "ferme") { z.hidden = true; return; }
    const details = [c.jeu, c.viewers ? `${nombre(c.viewers)} viewers` : ""].filter(Boolean);
    if (cle === cleCaseLive) {
      // la case est déjà là : on met juste à jour le titre, le jeu et les viewers
      $("case-live-titre").textContent = c.titre || "Viens faire un tour !";
      vider($("case-live-details"), details.map((t) => el("span", { class: "chip", text: t })));
      return;
    }
    cleCaseLive = cle;
    const fermer = () => { ecrireSession(cle, "ferme"); z.hidden = true; };
    vider(z,
      el("span", { class: "case-live-lignes", "aria-hidden": "true" }),
      el("div", { class: "case-live-chopper", "aria-hidden": "true" },
        el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 96, height: 96 }),
        el("p", { class: "case-live-cri", text: "IL EST EN LIIIVE !!" }),
      ),
      el("div", { class: "case-live-texte" },
        el("p", { class: "case-live-sur" }, el("span", { class: "point", "aria-hidden": "true" }), "En direct sur Twitch"),
        el("p", { class: "case-live-gros", text: "Liliano est en live !" }),
        el("p", { class: "case-live-titre", id: "case-live-titre", text: c.titre || "Viens faire un tour !" }),
        el("div", { class: "details", id: "case-live-details" }, details.map((t) => el("span", { class: "chip", text: t }))),
        el("div", { class: "case-live-boutons" },
          el("a", { class: "btn btn-plein btn-petit", href: "#chaine", onclick: fermer, text: "Regarder ici" }),
          el("a", { class: "btn btn-contour btn-petit", href: `https://www.twitch.tv/${MA_CHAINE}`, ...externe, text: "Ouvrir sur Twitch" }),
        ),
      ),
      el("span", { class: "sfx sfx-case-live tremble", "aria-hidden": "true", text: "ドドド" }),
      el("button", { class: "case-live-fermer", type: "button", "aria-label": "Fermer", onclick: fermer, text: "✕" }),
    );
    // le gros choc (tout l'écran) : dès qu'on arrive sur le site pendant ton live (depuis 2 min ou 3 h), ou quand le live
    // commence pendant la visite ; une fois par visite (un rechargement de la page ne le relance pas)
    const cleChoc = `barhaw-choc:${c.depuis || "live"}`;
    const choc = (vientDeCommencer || premierChargement) && lireSession(cleChoc) !== "vu";
    z.classList.toggle("impact", vientDeCommencer || choc);
    z.hidden = false;
    if (choc) { ecrireSession(cleChoc, "vu"); chocLive(); }
  }

  // tout l'écran en case de manga pendant 2 s : lignes de vitesse, flash, « ドドドドド », et le tampon « EN LIVE ! » qui claque puis file vers la case
  function chocLive() {
    if (reduit.matches || document.querySelector(".choc-live")) return;
    if (document.hidden) { document.addEventListener("visibilitychange", () => chocLive(), { once: true }); return; } // l'onglet est caché : au retour
    const o = el("div", { class: "choc-live", "aria-hidden": "true" },
      el("span", { class: "choc-lignes" }),
      el("span", { class: "sfx tremble choc-sfx", text: "ドドドドド" }),
      el("span", { class: "choc-tampon", text: "EN LIVE !" }),
    );
    document.body.append(o);
    setTimeout(() => o.remove(), 2200);
  }

  // ---------- un pote lance son live : une case manga surgit en bas de l'écran ----------
  // Une case à la fois (les autres attendent leur tour), et jamais deux fois le même live pendant la visite.
  // Au premier chargement : seulement les lives lancés il y a moins de 10 min. Ensuite : ceux qui apparaissent (moins de 30 min).
  let potesAvant = null; // null : premier chargement
  const filePotes = [];
  let poteAffiche = null;
  const clePote = (a) => `${a.login}|${a.depuis || "live"}`;

  function surveillerPotes() {
    const amis = donnees?.amis;
    if (!Array.isArray(amis) || donnees.horsLigne) return;
    const premier = potesAvant === null;
    const enLive = new Map();
    for (const a of amis) if (a?.enLive && a.login) enLive.set(clePote(a), a);
    for (const [cle, a] of enLive) {
      if (!premier && potesAvant.has(cle)) continue;
      const debut = a.depuis ? ms(a.depuis) : NaN;
      const age = Number.isFinite(debut) ? Date.now() - debut : (premier ? Infinity : 0);
      if (age > (premier ? 10 : 30) * 60_000) continue;
      if (lireSession(`barhaw-pote:${cle}`) || poteAffiche?.cle === cle || filePotes.some((p) => p.cle === cle)) continue;
      filePotes.push({ cle, login: a.login, debut: Number.isFinite(debut) ? debut : Date.now() });
    }
    potesAvant = new Set(enLive.keys());
    filePotes.sort((x, y) => x.debut - y.debut); // dans l'ordre où ils ont lancé leur live
    filePotes.splice(0, Math.max(0, filePotes.length - 4)); // pas plus de 4 qui attendent : les plus récents
    montrerPote();
  }

  function montrerPote() {
    const z = $("pote-live");
    if (!z || poteAffiche || document.hidden) return; // onglet caché : on attend qu'il revienne
    let a = null;
    let suivant = null;
    while (!a && filePotes.length) {
      suivant = filePotes.shift();
      a = (donnees?.amis || []).find((p) => p?.enLive && p.login === suivant.login && clePote(p) === suivant.cle);
    }
    if (!a) return;
    ecrireSession(`barhaw-pote:${suivant.cle}`, "vu");
    poteAffiche = { cle: suivant.cle };
    const nom = a.nom || a.login;
    const debut = a.depuis ? ms(a.depuis) : NaN;
    const minutes = Number.isFinite(debut) ? Math.max(0, Math.floor((Date.now() - debut) / 60_000)) : 0;
    const quand = minutes < 5 ? "vient de lancer son live" : `en live depuis ${minutes} min`;
    const fermer = () => fermerPote();
    const temps = el("span", { class: "pl-temps", "aria-hidden": "true" });
    vider(z,
      el("div", { class: "pl-case", onkeydown: (ev) => { if (ev.key === "Escape") fermerPote(); } },
        el("span", { class: "pl-lignes", "aria-hidden": "true" }),
        el("div", { class: "pl-photo", "aria-hidden": "true" },
          el("span", { class: "pl-anneau" }),
          el("img", { src: lienSur(a.avatar) || "/img/chopper-visage.jpg", alt: "", width: 84, height: 84 }),
          el("span", { class: "pl-tampon", text: "EN LIVE !" }),
        ),
        el("div", { class: "pl-texte" },
          el("p", { class: "pl-sur" }, el("span", { class: "point", "aria-hidden": "true" }), "Un pote en direct"),
          el("p", { class: "pl-nom", text: nom }),
          el("p", { class: "pl-quoi", text: [quand, a.jeu].filter(Boolean).join(" · ") }),
          a.titre ? el("p", { class: "pl-titre", text: a.titre }) : null,
          el("div", { class: "pl-boutons" },
            el("a", { class: "btn btn-plein btn-petit", href: `https://www.twitch.tv/${encodeURIComponent(a.login)}`, ...externe, onclick: fermer, text: "Regarder" }),
            el("a", { class: "btn btn-contour btn-petit", href: "#potes", onclick: fermer, text: "Tous les potes" }),
          ),
        ),
        el("span", { class: "pl-don", "aria-hidden": "true", text: "ドン!" }),
        el("button", { class: "pl-fermer", type: "button", "aria-label": `Fermer l'annonce du live de ${nom}`, onclick: fermer, text: "✕" }),
        temps,
      ),
    );
    if (reduit.matches) {
      // sans animations, pas de barre : la case reste 12 s (plus longtemps si la souris ou le clavier est dessus)
      const attendre = (duree) => {
        poteAffiche.minuteur = setTimeout(() => (document.hidden || z.matches(":hover, :focus-within") ? attendre(3000) : fermerPote()), duree);
      };
      attendre(12_000);
    } else {
      // la barre du bas se vide en 9 s (en pause sous la souris, ou quand l'onglet est caché) : la case part à la fin
      temps.addEventListener("animationend", (ev) => { if (ev.animationName === "pl-temps") fermerPote(); });
    }
    z.classList.remove("sort");
    z.hidden = false;
  }

  function fermerPote() {
    const z = $("pote-live");
    if (!z || !poteAffiche || poteAffiche.sortie) return;
    poteAffiche.sortie = true;
    clearTimeout(poteAffiche.minuteur);
    z.classList.add("sort");
    setTimeout(() => {
      z.hidden = true;
      vider(z);
      z.classList.remove("sort");
      poteAffiche = null;
      setTimeout(montrerPote, 700); // le pote suivant, s'il y en a un
    }, reduit.matches ? 0 : 380);
  }

  document.addEventListener("visibilitychange", () => {
    $("pote-live")?.classList.toggle("en-pause", document.hidden);
    if (!document.hidden) montrerPote();
  });

  // le compte : dans l'en-tête, et dans le menu sur téléphone
  function rendreCompte() {
    for (const z of [$("compte"), $("compte-menu")]) {
      if (!z) continue;
      if (moi?.connecte) {
        vider(z,
          el("img", { src: lienSur(moi.avatar) || "/img/chopper-visage.jpg", alt: "", width: 32, height: 32 }),
          el("span", { class: "nom-compte", text: moi.nom }),
          el("a", { class: "sortir", href: "/api/auth/logout", text: "Sortir" }),
        );
      } else {
        vider(z, el("a", { class: "btn btn-contour btn-petit", href: "/api/auth/login", text: "Connexion" }));
      }
    }
  }

  // ---------- en ce moment ----------
  function raccourci({ href, symbole, image, titre, texte, live = false }) {
    return el("a", { class: `carte raccourci${live ? " live" : ""}`, href },
      el("span", { class: "symbole", "aria-hidden": "true" }, image ? el("img", { src: image, alt: "" }) : symbole),
      el("span", { class: "corps" }, el("strong", { text: titre }), el("span", { class: "texte", text: texte })),
      el("span", { class: "fleche", "aria-hidden": "true", text: "Voir →" }),
    );
  }

  function rendreMaintenant() {
    const z = $("maintenant");
    const d = donnees || {};
    const c = d.chaine || {};
    const cartes = [];
    if (c.enLive) cartes.push(raccourci({ href: "#chaine", symbole: "●", titre: "Liliano est en live", texte: [c.jeu, `${nombre(c.viewers)} viewers`].filter(Boolean).join(" · "), live: true }));
    else if (d.rediff?.enCours) cartes.push(raccourci({ href: "#chaine", symbole: "▶", titre: "La rediff tourne", texte: d.rediff.titre || "Les anciens lives, 24 h/24" }));
    else cartes.push(raccourci({ href: "#chaine", symbole: "▶", titre: "Ma chaîne", texte: d.horsLigne ? "Les lives de Liliano sur Twitch" : "Pas de live en ce moment" }));

    const amis = d.amis || [];
    const enLive = amis.filter((a) => a.enLive);
    cartes.push(enLive.length
      ? raccourci({ href: "#potes", image: lienSur(enLive[0].avatar), symbole: "✦", titre: `${enLive.length} pote${enLive.length > 1 ? "s" : ""} en live`, texte: enLive.slice(0, 3).map((p) => p.nom).join(", "), live: true })
      : raccourci({ href: "#potes", symbole: "✦", titre: "Les potes", texte: amis.length ? `${amis.length} chaînes à suivre` : "Leurs chaînes Twitch" }));

    const ch = d.chopper;
    cartes.push(raccourci({
      href: "#chopper",
      image: "/img/chopper-visage.jpg",
      titre: ch?.actif ? `Chopper · niveau ${ch.niveau}` : "Chopper",
      texte: ch?.actif ? `${majuscule(ch.humeur)} · faim ${ch.faim} %` : "La mascotte qu'on fait vivre ensemble",
    }));

    const dis = d.discord;
    cartes.push(raccourci({
      href: "#discord",
      image: lienSur(dis?.icone),
      symbole: "◆",
      titre: dis?.nom || "Le Discord",
      texte: dis ? `${nombre(dis.membres)} membres${dis.enLigne ? ` · ${nombre(dis.enLigne)} en ligne` : ""}` : "Rejoins la commu",
    }));
    const vu = dejaVu(z);
    vider(z, cartes);
    apparaitre(cartes, vu);
  }

  // ---------- les événements ----------
  function lienEvenement(lien) {
    return /osiris/i.test(lien) ? "Aller sur Osiris" : "Y aller";
  }

  function evenement(e, passe = false) {
    const lien = lienSur(e.lien);
    const debut = new Date(ms(e.debut));
    const type = TYPES[e.type] ? e.type : "autre";
    const periode = e.fin
      ? `Du ${dateLongue(e.debut, e.heure)} au ${e.finHeure ? dateLongue(e.fin, true) : fmtJour.format(new Date(e.fin))}`
      : majuscule(dateLongue(e.debut, e.heure));
    return el("li", { class: `evenement type-${type}${e.enCours ? " en-cours" : ""}` },
      el("div", { class: "quand-col" },
        `${fmtNum.format(debut)} ${fmtMois.format(debut)}`,
        el("small", { text: e.heure ? `${fmtAn.format(debut)} · ${heure(debut)}` : fmtAn.format(debut) }),
      ),
      el("article", { class: "carte survol" },
        el("div", { class: "haut" },
          el("span", { class: "type", text: TYPES[type] }),
          el("span", { class: "dans", text: passe ? "Terminé" : e.enCours ? "En cours" : dansCombien(e.debut) }),
        ),
        el("h3", { text: e.titre }),
        el("p", { class: "quand", text: periode }),
        e.description ? el("p", { text: e.description }) : null,
        e.ancre && !passe ? el("a", { class: "lien", href: `#${e.ancre}`, text: e.ancreTexte || "Voir le programme" }) : null,
        lien && !passe ? el("a", { class: "lien", href: lien, ...externe, text: lienEvenement(lien) }) : null,
        VIDEOS[e.id] ? el("button", { class: "lien lien-video", type: "button", onclick: (ev) => visionner(VIDEOS[e.id], ev.currentTarget), text: passe ? "Revoir le teaser" : "Voir le teaser" }) : null,
      ),
    );
  }

  let minuteur = null;
  let cleProchain = "";
  function rendreProchain(e) {
    const z = $("prochain");
    const cle = JSON.stringify(e ? [e.id, e.titre, e.debut, e.enCours, e.description, e.lien, e.type, e.ancre, e.ancreTexte] : null);
    if (cle === cleProchain) return;
    cleProchain = cle;
    clearInterval(minuteur);
    if (!e) {
      vider(z, el("p", { class: "vide", text: "Rien de prévu pour l'instant. Reste branché, ça arrive !" }));
      return;
    }
    const d = new Date(ms(e.debut));
    const rebours = el("div", { class: "rebours", role: "timer", "aria-label": `Avant ${e.titre}` });
    const tic = () => {
      const reste = ms(e.debut) - Date.now();
      if (reste <= 0) {
        vider(rebours, el("span", { class: "tampon", text: "C'est parti !" }));
        clearInterval(minuteur);
        return;
      }
      const s = Math.floor(reste / 1000);
      const parts = [[Math.floor(s / 86400), "jours"], [Math.floor((s % 86400) / 3600), "heures"], [Math.floor((s % 3600) / 60), "min"], [s % 60, "sec"]];
      vider(rebours, parts.map(([v, u]) => el("div", {}, el("b", { text: String(v).padStart(2, "0") }), el("small", { text: u }))));
    };
    const lien = lienSur(e.lien);
    const [sfx, sfxClasse] = SFX_TYPES[e.type] || SFX_TYPES.autre;
    vider(z,
      el("span", { class: `sfx sfx-coin ${sfxClasse}`, "aria-hidden": "true", text: sfx }),
      el("div", { class: "grosse-date", "aria-hidden": "true" },
        el("div", {}, el("div", { class: "jour", text: fmtNum.format(d) }), el("div", { class: "mois", text: fmtMois.format(d).replace(".", "") })),
      ),
      el("div", {},
        e.enCours ? el("span", { class: "tampon", text: "En cours" }) : el("span", { class: "etiquette", text: `Le prochain · ${TYPES[e.type] || "Event"}` }),
        el("h3", { text: e.titre }),
        el("p", { class: "date", text: dateLongue(e.debut, e.heure) }),
        e.description ? el("p", { text: e.description }) : null,
        e.ancre ? el("div", { class: "boutons" }, el("a", { class: "btn btn-plein btn-petit", href: `#${e.ancre}`, text: `${e.ancreTexte || "Voir le programme"} ↓` }))
          : lien ? el("div", { class: "boutons" }, el("a", { class: "btn btn-plein btn-petit", href: lien, ...externe, text: `${lienEvenement(lien)} →` })) : null,
      ),
      e.enCours ? null : rebours,
      VIDEOS[e.id] ? el("div", { class: "prochain-video" },
        el("div", { class: "video-cadre" }, videoAuClic(VIDEOS[e.id])),
        el("p", { class: "legende", text: VIDEOS[e.id].titre }),
      ) : null,
    );
    if (!e.enCours) { tic(); minuteur = setInterval(tic, 1000); }
  }

  function rendreEvenements() {
    const ev = agendaVF(donnees?.evenements || evenementsSecours());
    const [premier, ...suite] = ev.aVenir || [];
    rendreProchain(premier);
    const liste = $("evenements-liste");
    const items = suite.map((e) => evenement(e));
    const vu = dejaVu(liste);
    vider(liste, items.length ? items : el("li", { class: "vide", text: "D'autres events arrivent bientôt." }));
    liste.classList.toggle("frise-vide", !items.length);
    apparaitre(items, vu);
    const passes = (ev.passes || []).map((e) => evenement(e, true));
    $("passes").hidden = !passes.length;
    vider($("evenements-passes"), passes);
  }

  // la bulle de Chopper sur l'accueil : quelques phrases qui tournent
  let tour = 0;
  function bulleAccueil() {
    const phrases = [];
    const b = $("bulle-hero");
    const live = Boolean(donnees?.chaine?.enLive);
    b.classList.toggle("crie", live);
    if (live) phrases.push("IL EST EN LIIIVE !! Fonce !", "Liliano est en live, viens vite !!", "C'EST MAINTENANT ! Le live a commencé !");
    const prochain = agendaVF(donnees?.evenements || evenementsSecours()).aVenir?.[0];
    if (prochain) phrases.push(prochain.enCours ? `${prochain.titre} : c'est maintenant !` : `Prochain event : ${prochain.titre}, ${dansCombien(prochain.debut)} !`);
    const ch = donnees?.chopper;
    if (ch?.actif && ch.faim < 40) phrases.push("J'ai faim… Viens me nourrir, plus bas !");
    if (ch?.actif && ch.deprime) phrases.push("Le serveur est tout calme… Venez me voir…");
    if (!live) phrases.push("Yo ! Moi c'est Chopper, la mascotte de Barhaw.", "Connecte-toi avec Discord pour jouer avec moi !");
    const texte = phrases[tour++ % phrases.length];
    if (b.textContent === texte) return;
    b.textContent = texte;
    b.classList.remove("change");
    void b.offsetWidth;
    b.classList.add("change");
  }

  // ---------- ma chaîne ----------
  function lecteurTwitch(chaine) {
    // muet au départ : le lecteur se lance en défilant, sans son surprise
    const q = new URLSearchParams({ channel: chaine, parent: HOTE, autoplay: "true", muted: "true" });
    return el("iframe", { src: `https://player.twitch.tv/?${q}`, title: `Lecteur Twitch de ${chaine}`, allow: "autoplay; fullscreen; picture-in-picture" });
  }

  function rendreChaine() {
    const c = donnees?.chaine || { login: MA_CHAINE, nom: "LilianoBarhaw" };
    const r = donnees?.rediff;
    const etat = $("etat-chaine");
    etat.textContent = c.enLive ? "● En live" : r?.enCours ? "Rediff 24 h/24" : donnees && !donnees.horsLigne ? "Hors ligne" : "";
    etat.className = `etiquette${c.enLive ? " live" : ""}`;

    if (chaineProche) {
      const mode = c.enLive ? "live" : r?.enCours && r.login ? `rediff:${r.login}` : "off";
      const grand = window.matchMedia("(min-width: 901px)").matches;
      if (mode + grand !== cleLecteur) {
        cleLecteur = mode + grand;
        const zone = $("lecteur-zone");
        if (mode === "live") {
          vider($("lecteur"), lecteurTwitch(MA_CHAINE));
          $("tchat").hidden = !grand;
          zone.classList.toggle("avec-tchat", grand);
          if (grand) vider($("tchat"), el("iframe", { src: `https://www.twitch.tv/embed/${MA_CHAINE}/chat?parent=${encodeURIComponent(HOTE)}&darkpopout`, title: "Le chat du live" }));
        } else {
          $("tchat").hidden = true;
          vider($("tchat"));
          zone.classList.remove("avec-tchat");
          if (mode.startsWith("rediff:")) vider($("lecteur"), lecteurTwitch(r.login));
          else {
            vider($("lecteur"), el("div", { class: "hors-ligne" },
              el("div", {},
                el("span", { class: "sfx sfx-silence", "aria-hidden": "true", text: "シーン" }),
                el("div", { class: "portrait" }, ppLiliano(640, "")),
                el("p", { text: "Liliano n'est pas en live pour l'instant." }),
                el("a", { class: "btn btn-contour btn-petit", href: `https://www.twitch.tv/${MA_CHAINE}`, ...externe, text: "Suivre sur Twitch" }),
              ),
            ));
          }
        }
      }
    }

    const suivre = el("a", { class: "btn btn-plein btn-petit", href: `https://www.twitch.tv/${MA_CHAINE}`, ...externe, text: c.enLive ? "Ouvrir sur Twitch" : "Suivre sur Twitch" });
    if (c.enLive) {
      vider($("infos-live"),
        quiChaine(
          el("h3", { text: c.titre || "En live" }),
          el("div", { class: "details" },
            c.jeu ? el("span", { class: "chip", text: c.jeu }) : null,
            el("span", { class: "chip", text: `${nombre(c.viewers)} viewers` }),
            c.depuis ? el("span", { class: "chip", text: `en live depuis ${depuis(c.depuis)}` }) : null,
          ),
        ),
        suivre,
      );
    } else if (r?.enCours) {
      vider($("infos-live"),
        quiChaine(
          el("h3", { text: "Pas de live : la rediff tourne" }),
          el("p", { text: `Sur la chaîne ${r.login}, les anciens lives de Liliano passent en boucle, 24 h/24.` }),
          r.titre ? el("div", { class: "details" }, el("span", { class: "chip", text: r.titre }), r.jeu ? el("span", { class: "chip", text: r.jeu }) : null) : null,
        ),
        suivre,
      );
    } else {
      vider($("infos-live"),
        quiChaine(
          el("h3", { text: "Pas de live pour l'instant" }),
          el("p", { text: "Suis la chaîne pour être prévenu, ou rejoins le Discord : une annonce part dès que Liliano lance un live." }),
        ),
        suivre,
      );
    }
  }

  // la pp de Liliano (celle de sa chaîne Twitch et YouTube), dessinée par Maelle Henry
  const ppLiliano = (taille, classe = "pp") => el("img", { class: classe, src: taille > 200 ? "/img/pp-liliano-640.webp" : "/img/pp-liliano-200.webp", alt: "", width: taille, height: taille, loading: "lazy", decoding: "async" });
  const quiChaine = (...contenu) => el("div", { class: "chaine-qui" }, ppLiliano(64), el("div", {}, ...contenu));

  // ---------- potes ----------
  function rendrePotes() {
    const z = $("potes-liste");
    const amis = donnees?.amis;
    if (!amis) { vider(z, el("p", { class: "vide carte", text: "Les chaînes des potes reviennent dans un instant." })); return; }
    if (!amis.length) { vider(z, el("p", { class: "vide carte", text: "Aucune chaîne pour l'instant." })); return; }
    const tries = [...amis].sort((a, b) => Number(Boolean(b.enLive)) - Number(Boolean(a.enLive)));
    const cartes = tries.map((a) => {
      const avatar = lienSur(a.avatar) || "/img/chopper-visage.jpg";
      return el("a", { class: `carte pote${a.enLive ? " live" : ""}`, href: `https://www.twitch.tv/${encodeURIComponent(a.login)}`, ...externe },
        el("div", { class: "vignette" },
          a.enLive && lienSur(a.vignette)
            ? el("img", { class: "apercu", src: lienSur(a.vignette), alt: "", loading: "lazy" })
            : el("img", { class: "grand-avatar", src: avatar, alt: "", loading: "lazy" }),
          a.enLive ? el("span", { class: "badge-live", text: "Live" }) : el("span", { class: "badge-off", text: "Hors ligne" }),
          a.enLive ? el("span", { class: "badge-vues", text: `${nombre(a.viewers)} viewers` }) : null,
        ),
        el("div", { class: "ligne" },
          el("img", { class: "avatar", src: avatar, alt: "", loading: "lazy", width: 42, height: 42 }),
          el("span", {},
            el("strong", { text: a.nom }),
            el("span", { class: "sous-pote", text: a.enLive ? [a.jeu, a.titre].filter(Boolean).join(" · ") : `twitch.tv/${a.login}` }),
          ),
        ),
      );
    });
    const vu = dejaVu(z);
    vider(z, cartes);
    apparaitre(cartes, vu);
  }

  // ---------- YouTube ----------
  function rendreYoutube() {
    const y = donnees?.youtube;
    const z = $("youtube-contenu");
    const lien = lienSur(y?.lien);
    $("lien-youtube").hidden = !lien;
    if (lien) $("lien-youtube").href = `${lien}?sub_confirmation=1`;
    const cle = JSON.stringify([donnees?.horsLigne, y?.videos?.map((v) => v.id), y?.shorts?.map((v) => v.id)]);
    if (cle === cleYoutube) return;
    cleYoutube = cle;
    const carteVideo = (v, court = false) => el("a", { class: `carte video${court ? " short" : ""}`, href: lienSur(v.lien) || "#", ...externe },
      el("div", { class: "image" }, el("img", { src: lienSur(v.vignette), alt: "", loading: "lazy" })),
      el("span", { text: v.titre }),
      v.publie ? el("small", { text: fmtCourt.format(new Date(v.publie)) }) : null,
    );
    if (!y?.videos?.length) {
      // pas de vidéo longue (par exemple une chaîne qui ne poste que des Shorts) : on montre au moins les Shorts
      const seulsShorts = (y?.shorts || []).map((v) => carteVideo(v, true));
      if (!seulsShorts.length) {
        vider(z, el("p", { class: "vide carte", text: donnees?.horsLigne ? "Les vidéos reviennent dans un instant." : "Les vidéos arrivent bientôt." }));
        return;
      }
      const vuShorts = dejaVu(z);
      vider(z, el("h3", { class: "sous-titre", text: "Les Shorts" }), el("div", { class: "shorts" }, seulsShorts));
      apparaitre(seulsShorts, vuShorts);
      return;
    }
    const [derniere, ...autres] = y.videos;
    const lecteur = el("div", { class: "yt-lecteur" });
    const facade = el("button", { class: "facade", type: "button", "aria-label": `Lancer la vidéo : ${derniere.titre}` },
      el("img", { src: lienSur(derniere.vignette), alt: "" }),
      el("span", { class: "jouer", "aria-hidden": "true" }),
    );
    facade.addEventListener("click", () => {
      vider(lecteur, el("iframe", { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(derniere.id)}?autoplay=1&rel=0`, title: derniere.titre, allow: "autoplay; encrypted-media; picture-in-picture; fullscreen" }));
    });
    lecteur.append(facade);
    const grand = el("div", { class: "yt-grand" },
      lecteur,
      el("div", { class: "carte yt-infos" },
        el("div", { class: "chaine-qui petite" }, ppLiliano(44), el("span", {}, el("strong", { text: "LilianoBarhaw" }), el("small", { text: "sur YouTube" }))),
        el("span", { class: "etiquette", text: "La dernière" }),
        el("h3", { text: derniere.titre }),
        derniere.publie ? el("p", { text: `Sortie le ${fmtCourt.format(new Date(derniere.publie))}` }) : null,
        el("a", { class: "btn btn-plein btn-petit", href: lienSur(derniere.lien) || "#", ...externe, text: "Voir sur YouTube" }),
      ),
    );
    const videos = autres.map((v) => carteVideo(v));
    const shorts = (y.shorts || []).map((v) => carteVideo(v, true));
    const vu = dejaVu(z);
    vider(z,
      grand,
      videos.length ? el("div", { class: "videos" }, videos) : null,
      shorts.length ? el("h3", { class: "sous-titre", text: "Les Shorts" }) : null,
      shorts.length ? el("div", { class: "shorts" }, shorts) : null,
    );
    apparaitre([grand, ...videos, ...shorts], vu);
  }

  // ---------- Discord ----------
  function rendreDiscord() {
    const d = donnees?.discord;
    const lien = lienSur(d?.lien);
    vider($("discord-carte"),
      el("img", { class: "discord-icone", src: lienSur(d?.icone) || "/img/chopper-visage.jpg", alt: "", width: 96, height: 96 }),
      el("div", {},
        el("h3", { text: d?.nom || "Barhaw" }),
        d ? el("div", { class: "chiffres" },
          el("div", {}, el("b", { text: nombre(d.membres) }), el("span", { text: "membres" })),
          d.enLigne ? el("div", { class: "en-ligne" }, el("b", { text: nombre(d.enLigne) }), el("span", { text: "en ligne" })) : null,
        ) : el("p", { class: "sous", text: "Le serveur de la commu : lives, jeux, Chopper et GRAND LINE." }),
      ),
      lien
        ? el("a", { class: "btn btn-plein", href: lien, ...externe, text: "Rejoindre le serveur" })
        : el("span", { class: "btn btn-contour", "aria-disabled": "true", text: "Lien bientôt là" }),
    );
  }

  // ---------- Chopper ----------
  function jauge(cls, nom, valeur, max, texte) {
    const part = Math.max(0, Math.min(1, (Number(valeur) || 0) / (max || 100)));
    const rempli = el("div", { class: "rempli" });
    requestAnimationFrame(() => requestAnimationFrame(() => { rempli.style.width = `${(part * 100).toFixed(1)}%`; }));
    return el("div", { class: `jauge ${cls}` },
      el("div", { class: "haut" }, el("span", { text: nom }), el("span", { text: texte })),
      el("div", { class: "barre", role: "meter", "aria-label": nom, "aria-valuemin": 0, "aria-valuemax": max, "aria-valuenow": Math.round(Number(valeur) || 0) }, rempli),
    );
  }

  function rendreChopper() {
    const ch = donnees?.chopper;
    const scene = $("chopper-scene");
    if (!ch?.actif) {
      $("niveau-chopper").textContent = "En pause";
      scene.classList.add("deprime");
      scene.classList.remove("legendaire");
      $("bulle-chopper").textContent = donnees?.horsLigne ? "Zzz… Je reviens dans un instant." : "Zzz… Je dors pour l'instant.";
      onomatopee($("sfx-chopper"), "シーン");
      cleJauges = "";
      vider($("jauges"), el("p", { class: "note", text: "Ses jauges s'afficheront dès qu'il sera réveillé." }));
      rendreActions();
      $("defi").hidden = true;
      vider($("classement"), el("h3", { text: "Ses meilleurs potes" }), el("p", { class: "note", text: "Le classement revient avec lui." }));
      return;
    }
    $("niveau-chopper").textContent = `Niveau ${ch.niveau} · ${ch.stade}`;
    scene.classList.toggle("deprime", Boolean(ch.deprime));
    scene.classList.toggle("legendaire", Boolean(ch.legendaire));
    const humeur = HUMEURS[ch.humeur] || HUMEURS.content;
    if (!scene.dataset.parle) $("bulle-chopper").textContent = humeur.bulle;
    if (!scene.dataset.geste) onomatopee($("sfx-chopper"), ch.deprime ? HUMEURS["déprimé"].sfx : humeur.sfx);
    const cle = JSON.stringify([ch.faim, ch.moral, ch.xpDansNiveau, ch.xpPourNiveau, ch.humeur, ch.deprime]);
    if (cle !== cleJauges) {
      cleJauges = cle;
      vider($("jauges"),
      jauge("faim", "Faim", ch.faim, 100, `${ch.faim} %`),
      jauge("moral", "Moral", ch.moral, 100, `${ch.moral} %`),
      jauge("xp", "XP", ch.xpDansNiveau, ch.xpPourNiveau, `${nombre(ch.xpDansNiveau)} / ${nombre(ch.xpPourNiveau)}`),
      el("p", { class: "humeur", text: `Humeur : ${ch.humeur}${ch.deprime ? " · il se remet dès que le serveur se réveille" : ""}` }),
      );
    }
    rendreActions();
    const d = ch.defi;
    $("defi").hidden = !d;
    if (d) {
      const barre = el("div", { class: "rempli" });
      barre.style.width = `${Math.min(100, (d.compte / d.objectif) * 100)}%`;
      vider($("defi"),
        el("h3", { text: "Chopper réclame !" }),
        el("p", { text: `Défi : ${d.texte}. Fin ${dansCombien(d.fin)}.` }),
        el("div", { class: "barre" }, barre),
        el("p", { class: "note", text: `${d.compte} / ${d.objectif} · ça se joue sur le Discord` }),
      );
    }
    vider($("classement"),
      el("h3", { text: "Ses meilleurs potes cette semaine" }),
      ch.potes?.length
        ? el("ol", {}, ch.potes.map((p) => el("li", {}, el("span", { text: p.nom }), el("small", { text: `${nombre(p.points)} pts` }))))
        : el("p", { class: "note", text: "Personne pour l'instant : sois le premier !" }),
      ch.potesAvant?.length ? el("p", { class: "note", text: `La semaine dernière : ${ch.potesAvant.join(", ")}.` }) : null,
    );
  }

  function rendreActions(message = null, { garder = true } = {}) {
    const z = $("actions");
    if (message) messageActions = { ...message, jusqua: Date.now() + 25_000 };
    else if (messageActions && messageActions.jusqua > Date.now()) message = messageActions;
    const ancien = z.querySelector("input[name=message]");
    const brouillon = garder && ancien ? ancien.value : "";
    const avaitFocus = Boolean(ancien) && document.activeElement === ancien;
    const ch = donnees?.chopper;
    if (!ch?.actif) {
      vider(z, el("h3", { text: "Joue avec lui" }), el("p", { class: "note", text: "Chopper dort pour l'instant. Reviens un peu plus tard !" }));
      return;
    }
    if (!moi?.connecte) {
      vider(z,
        el("h3", { text: "Joue avec lui" }),
        el("p", { text: "Connecte-toi avec ton compte Discord pour le nourrir, jouer avec lui et lui parler. Ça compte pour le classement, comme sur le serveur." }),
        erreurConnexion ? el("p", { class: "erreur", text: "La connexion n'a pas marché. Réessaie !" }) : null,
        el("div", { class: "rangee" }, el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" })),
        el("p", { class: "note", text: "Le site ne reçoit que ton pseudo et ton image de profil." }),
      );
      return;
    }
    if (chopperMoi?.pasMembre) {
      const lien = lienSur(donnees?.discord?.lien);
      vider(z,
        el("h3", { text: "Presque !" }),
        el("p", { text: "Pour jouer avec Chopper, il faut être sur le Discord Barhaw. Rejoins-le, puis reviens ici." }),
        el("div", { class: "rangee" },
          lien ? el("a", { class: "btn btn-plein", href: lien, ...externe, text: "Rejoindre le Discord" }) : null,
          el("button", { class: "btn btn-contour", type: "button", onclick: () => agir("etat"), text: "C'est fait, je réessaie" }),
        ),
      );
      return;
    }
    const m = chopperMoi || {};
    const champ = el("input", { type: "text", name: "message", maxlength: 300, placeholder: "Dis quelque chose à Chopper…", "aria-label": "Ton message pour Chopper", autocomplete: "off" });
    champ.value = brouillon;
    const form = el("form", { class: "parler" }, champ, el("button", { class: "btn btn-plein btn-petit", type: "submit", disabled: occupe || m.pause, text: "Envoyer" }));
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const t = champ.value.trim();
      if (t) agir("parler", t);
    });
    vider(z,
      el("h3", { text: `Salut ${moi.nom} !` }),
      el("div", { class: "rangee" },
        el("button", { class: "btn btn-plein", type: "button", disabled: occupe || m.nourri, onclick: () => agir("nourrir"), text: m.nourri ? "Déjà nourri" : "Nourrir" }),
        el("button", { class: "btn btn-contour", type: "button", disabled: occupe || m.joue, onclick: () => agir("jouer"), text: m.joue ? "Déjà joué" : "Jouer" }),
      ),
      form,
      message ? el("p", { class: message.erreur ? "erreur" : "note", text: message.texte }) : el("p", { class: "note", text: "Nourrir et jouer : une fois par jour chacun, ici ou sur Discord. Parler : une fois toutes les 2 minutes." }),
    );
    if (avaitFocus) champ.focus();
  }

  function montrerResultat({ anim, texte }) {
    const r = $("resultat");
    const img = $("resultat-gif");
    if (anim) {
      img.src = `/api/chopper?image=anim&type=${encodeURIComponent(anim)}`;
      img.alt = `Chopper : animation « ${anim} »`;
      img.parentElement.hidden = false;
    } else {
      img.parentElement.hidden = true;
    }
    $("resultat-texte").textContent = texte;
    // la carte réapparaît avec son animation à chaque fois
    r.hidden = true;
    void r.offsetWidth;
    r.hidden = false;
    r.scrollIntoView({ block: "nearest", behavior: reduit.matches ? "auto" : "smooth" });
  }

  async function agir(action, message = "") {
    if (occupe) return;
    occupe = action !== "etat";
    if (occupe) rendreActions();
    let r = null;
    let d = {};
    try {
      r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, message }) });
      d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
    } catch {
      d = { erreur: "Impossible de joindre Chopper. Vérifie ta connexion." };
    }
    occupe = false;
    if (r?.status === 401) {
      moi = { connecte: false };
      majApercuVF(false);
      rendreCompte();
      rendreActions();
      return;
    }
    if (d.nom) majApercuVF(d.apercuVF === true); // la réponse du bot pour un membre : l'aperçu de la VF, pour Liliano seul
    if (d.erreur === "pas-membre") {
      chopperMoi = { pasMembre: true };
      rendreActions();
      return;
    }
    if (d.chopper) {
      donnees = { ...(donnees || {}), chopper: { ...(donnees?.chopper || {}), ...d.chopper } };
      chopperMoi = d.chopper.moi || chopperMoi;
      rendreChopper();
      rendreClassementJeu();
    }
    const scene = $("chopper-scene");
    if ((action === "nourrir" || action === "jouer") && d.ok) {
      scene.classList.remove("joie", "impact");
      void scene.offsetWidth;
      scene.classList.add("joie", "impact");
      scene.dataset.geste = "1";
      onomatopee($("sfx-chopper"), action === "nourrir" ? "モグモグ" : "ピョン", true);
      setTimeout(() => scene.classList.remove("joie", "impact"), 1800);
      setTimeout(() => { delete scene.dataset.geste; rendreChopper(); }, 8000);
      if (d.butin) recevoirButin(d.butin);
      montrerResultat({ anim: d.anim, texte: `${d.texte} (${d.bonus})${d.butin && (d.butin.degats || d.butin.berrys) ? ` · ${texteButin(d.butin)}` : ""}` });
      rendreActions({ texte: "C'est noté ! La scène est aussi postée dans le salon de Chopper sur Discord." });
      return;
    }
    if (action === "parler" && d.ok) {
      scene.dataset.parle = "1";
      $("bulle-chopper").textContent = d.reponse;
      setTimeout(() => { delete scene.dataset.parle; }, 60_000);
      rendreActions({ texte: `Toi : « ${message} »` }, { garder: false });
      return;
    }
    if (d.deja || d.attente) { rendreActions({ texte: d.texte }); return; }
    if (d.erreur) { rendreActions({ erreur: true, texte: d.texte || d.erreur }); return; }
    if (action === "etat") rendreActions();
  }

  // ---------- le TOURNOI BARHAW ----------
  let tournoiProche = false; // le lecteur du match en direct se charge en arrivant près de la partie Tournoi
  let cleLecteurTournoi = "";
  let cleUne = "";
  const minuteurs = {}; // les comptes à rebours : celui de la finale, celui de la révélation des équipes
  const nomEquipe = (x, attente) => x?.nom || attente || "À définir";
  const quandMatch = (m) => (m.date ? majuscule(dateLongue(m.date, m.heure)) : "Date à venir");

  // des petites manches, comme des points de vie : ●●○
  function manches(n) {
    return el("span", { class: "manches", "aria-label": `${n} manche${n > 1 ? "s" : ""}` }, [0, 1].map((k) => el("i", { class: k < n ? "gagnee" : "" })));
  }

  function rebours(cible, avecHeure, nom = "finale", { fin = null, texteFin = "C'est le jour J !" } = {}) {
    const z = el("div", { class: "rebours", role: "timer" });
    const tic = () => {
      const reste = cible - Date.now();
      if (reste <= 0) { vider(z, el("span", { class: "tampon", text: texteFin })); return false; }
      if (!avecHeure) {
        const j = Math.ceil(reste / 86_400_000);
        vider(z, el("div", { class: "jour-j" }, el("b", { text: `J-${j}` }), el("small", { text: j > 1 ? "jours" : "jour" })));
        return true;
      }
      const s = Math.floor(reste / 1000);
      const parts = [[Math.floor(s / 86400), "jours"], [Math.floor((s % 86400) / 3600), "heures"], [Math.floor((s % 3600) / 60), "min"], [s % 60, "sec"]];
      vider(z, parts.map(([v, u]) => el("div", {}, el("b", { text: String(v).padStart(2, "0") }), el("small", { text: u }))));
      return true;
    };
    clearInterval(minuteurs[nom]);
    if (tic()) minuteurs[nom] = setInterval(() => { if (!tic()) { clearInterval(minuteurs[nom]); fin?.(); } }, 1000);
    else fin?.();
    return z;
  }

  function rendreUne(t) {
    const z = $("tournoi-une");
    const direct = t.direct ? t.matchs.find((m) => m.id === t.direct) : null;
    const finale = t.matchs.find((m) => m.id === "F");
    const prochain = t.matchs.find((m) => !m.fini && m.date && m.a && m.b && m.id !== t.direct);
    const etat = t.champion ? "champion" : direct ? `direct:${direct.id}` : "finale";
    const cle = JSON.stringify([etat, t.champion, direct?.score, direct?.cartes, direct?.a, direct?.b, finale?.date, finale?.heure, prochain?.id, prochain?.date]);
    if (cle === cleUne) return;
    cleUne = cle;
    z.className = `tournoi-une revele vu une-${etat.split(":")[0]}`;

    if (t.champion) {
      clearInterval(minuteurs.finale);
      const f = finale;
      vider(z,
        el("span", { class: "sfx sfx-champion eclat", "aria-hidden": "true", text: "優勝" }),
        el("p", { class: "surtitre", text: `Champions du ${t.nom}` }),
        el("p", { class: "champion-nom degrade", text: t.champion.nom }),
        el("p", { class: "champion-joueurs", text: t.champion.joueurs.join(" · ") }),
        f ? el("p", { class: "champion-finale", text: `Finale : ${nomEquipe(f.a)} ${f.score[0]} – ${f.score[1]} ${nomEquipe(f.b)}${f.cartes ? ` · ${f.cartes}` : ""}` }) : null,
        el("span", { class: "etiquette", text: `${t.cashprize} de cashprize` }),
      );
      return;
    }

    if (direct) {
      clearInterval(minuteurs.finale);
      const lecteur = el("div", { class: "tournoi-lecteur", id: "tournoi-lecteur" }, el("div", { class: "lecteur-attente", text: "Le lecteur se charge quand tu arrives ici…" }));
      cleLecteurTournoi = "";
      vider(z,
        el("div", { class: "une-info" },
          el("p", { class: "surtitre" }, el("span", { class: "point", "aria-hidden": "true" }), `En direct · ${direct.titre}`),
          el("div", { class: "tableau-score" },
            el("div", { class: "camp" }, el("strong", { text: nomEquipe(direct.a) }), manches(direct.score[0])),
            el("div", { class: "score-geant" }, el("b", { text: String(direct.score[0]) }), el("span", { text: "–" }), el("b", { text: String(direct.score[1]) })),
            el("div", { class: "camp" }, el("strong", { text: nomEquipe(direct.b) }), manches(direct.score[1])),
          ),
          direct.cartes ? el("div", { class: "details" }, direct.cartes.split(",").map((c) => el("span", { class: "chip", text: c.trim() }))) : null,
          el("a", { class: "btn btn-plein btn-petit", href: `https://www.twitch.tv/${MA_CHAINE}`, ...externe, text: "Ouvrir sur Twitch" }),
        ),
        lecteur,
        el("span", { class: "sfx sfx-coin violet tremble eclat", "aria-hidden": "true", text: "ゴゴゴ" }),
      );
      chargerLecteurTournoi();
      return;
    }

    // la finale arrive : compte à rebours
    vider(z,
      el("div", { class: "une-info" },
        el("p", { class: "surtitre", text: "La grande finale" }),
        el("p", { class: "une-date", text: finale?.date ? majuscule(dateLongue(finale.date, finale.heure)) : "Samedi 20 février 2027" }),
        el("p", { class: "une-texte", text: `En BO3 et en direct, avec ${t.cashprize} de cashprize sur le tournoi. Le soir même, ouverture du casting d'Osiris.` }),
        prochain ? el("p", { class: "une-prochain" }, el("span", { text: "Prochain match" }), `${nomEquipe(prochain.a)} contre ${nomEquipe(prochain.b)} · ${quandMatch(prochain)}`) : null,
      ),
      finale?.date ? rebours(finale.date, finale.heure) : null,
      el("span", { class: "sfx sfx-coin tremble eclat", "aria-hidden": "true", text: "ドドド" }),
    );
  }

  function chargerLecteurTournoi() {
    const z = $("tournoi-lecteur");
    if (!z || !tournoiProche || cleLecteurTournoi === "ok") return;
    cleLecteurTournoi = "ok";
    vider(z, lecteurTwitch(MA_CHAINE));
  }

  function rendrePoules(t) {
    const z = $("tournoi-poules");
    if (!t.poules) {
      vider(z,
        el("h3", { text: "Les poules" }),
        el("p", { class: "note", text: "Le tirage au sort des deux poules de 3 se fera en live. Chacun contre chacun, les deux premiers vont en demi-finale." }),
        el("div", { class: "poules-vides" }, ["A", "B"].map((l) => el("div", { class: "poule-vide" }, el("b", { text: l }), el("span", { text: "? · ? · ?" })))),
      );
      return;
    }
    const table = (lettre, lignes) => el("div", { class: "poule" },
      el("p", { class: "poule-titre" }, el("b", { text: lettre, "aria-hidden": "true" }), `Poule ${lettre}`),
      el("table", {},
        el("thead", {}, el("tr", {}, el("th", { scope: "col", text: "#" }), el("th", { scope: "col", text: "Équipe" }), el("th", { scope: "col", text: "V" }), el("th", { scope: "col", text: "D" }), el("th", { scope: "col", text: "Manches" }))),
        el("tbody", {}, lignes.map((x, k) => el("tr", { class: k < 2 ? "qualifie" : "" },
          el("td", { text: String(k + 1) }),
          el("td", { class: "nom", text: x.nom }),
          el("td", { text: String(x.v) }),
          el("td", { text: String(x.d) }),
          el("td", { text: `${x.mp}-${x.mc}` }),
        ))),
      ),
    );
    vider(z, el("h3", { text: "Les poules" }), el("div", { class: "poules" }, table("A", t.poules.A), table("B", t.poules.B)), el("p", { class: "note", text: "Les deux premiers de chaque poule vont en demi-finale." }));
  }

  function boiteMatch(m) {
    const ligne = (equipe, attente, score, gagnant) => el("div", { class: `ligne-match${gagnant ? " gagnant" : ""}${equipe ? "" : " attente"}` },
      el("span", { class: "nom", text: nomEquipe(equipe, attente) }),
      el("b", { text: m.fini || m.score[0] + m.score[1] > 0 ? String(score) : "–" }),
    );
    return el("div", { class: `boite-match${m.enDirect ? " direct" : ""}${m.fini ? " fini" : ""}` },
      el("p", { class: "boite-titre" }, m.titre, m.enDirect ? el("span", { class: "etiquette live", text: "● Live" }) : null),
      ligne(m.a, m.attenteA, m.score[0], m.fini && m.vainqueur === m.a?.id),
      ligne(m.b, m.attenteB, m.score[1], m.fini && m.vainqueur === m.b?.id),
      el("p", { class: "boite-date", text: quandMatch(m) }),
    );
  }

  function rendreArbre(t) {
    const m = (id) => t.matchs.find((x) => x.id === id);
    vider($("tournoi-arbre"),
      el("h3", { text: "La phase finale" }),
      el("div", { class: "arbre" },
        el("div", { class: "arbre-demis" }, boiteMatch(m("D1")), boiteMatch(m("D2"))),
        el("div", { class: "arbre-liens", "aria-hidden": "true" }),
        el("div", { class: "arbre-finale" }, boiteMatch(m("F"))),
      ),
    );
  }

  function rendreMatchs(t) {
    const z = $("tournoi-matchs");
    const poules = t.matchs.filter((m) => m.phase === "poule");
    if (!poules.length) {
      vider(z, el("p", { class: "vide carte", text: "Les matchs de poule apparaîtront après le tirage au sort." }));
      return;
    }
    const cartes = poules.map((m) => el("article", { class: `carte match${m.enDirect ? " direct" : ""}${m.fini ? " fini" : ""}` },
      el("div", { class: "haut" },
        el("span", { class: "type", text: m.titre }),
        el("span", { class: `statut${m.enDirect ? " live" : ""}`, text: m.enDirect ? "● En direct" : m.fini ? "Terminé" : m.score[0] + m.score[1] > 0 ? "En cours" : "À venir" }),
      ),
      el("div", { class: "affiche" },
        el("span", { class: `equipe${m.fini && m.vainqueur === m.a?.id ? " gagnant" : ""}`, text: nomEquipe(m.a) }),
        el("span", { class: "score", text: m.fini || m.score[0] + m.score[1] > 0 ? `${m.score[0]} – ${m.score[1]}` : "VS" }),
        el("span", { class: `equipe${m.fini && m.vainqueur === m.b?.id ? " gagnant" : ""}`, text: nomEquipe(m.b) }),
      ),
      el("p", { class: "quand", text: quandMatch(m) }),
      m.cartes ? el("div", { class: "details" }, m.cartes.split(",").map((c) => el("span", { class: "chip", text: c.trim() }))) : null,
    ));
    const vu = dejaVu(z);
    vider(z, cartes);
    apparaitre(cartes, vu);
  }

  // les agents Valorant (images de Riot Games, voir les mentions) : en pied pour la bande de la révélation,
  // en buste sur les cartes des équipes. [largeur en pied (hauteur 900), largeur du buste (hauteur 360)]
  const AGENTS = [[413, 344], [505, 420], [617, 433], [640, 328], [572, 476], [504, 404], [585, 324]];
  const ORDRE_AGENTS = [2, 7, 1, 5, 4, 6, 3]; // de gauche à droite, le violet au milieu
  const busteDe = (id) => ((id - 1) % AGENTS.length) + 1; // l'équipe 1 a l'agent 1, etc. (un décor, pas un choix des joueurs)
  function buste(id) {
    const k = busteDe(id);
    return el("span", { class: "equipe-buste", "aria-hidden": "true" },
      el("img", { src: `/img/agents/buste-${k}.webp`, alt: "", width: AGENTS[k - 1][1], height: 360, loading: "lazy", decoding: "async" }));
  }

  // la bande de la révélation : les agents en ombres chinoises tant que des équipes sont scellées, en couleur après
  let cleRevelation = "";
  let etatRevelation = "";
  let guetteRevelation = null;
  function guetterRevelation() {
    // l'heure est passée : on redemande les données jusqu'à voir les équipes (le cache du site peut avoir quelques secondes de retard)
    if (guetteRevelation) return;
    let essais = 0;
    const essai = async () => {
      essais++;
      await charger();
      guetteRevelation = donnees?.tournoi?.scellees && essais < 25 ? setTimeout(essai, 4000) : null;
    };
    guetteRevelation = setTimeout(essai, 1200);
  }

  function rendreRevelation(t) {
    const z = $("tournoi-revelation");
    if (!z) return;
    const scellees = t.equipes.filter((e) => e.scellee).length;
    const etat = !scellees ? "revelees" : t.revelation ? "compte" : "bientot";
    const cle = JSON.stringify([etat, t.revelation, scellees, t.equipes.length]);
    if (cle === cleRevelation) return;
    cleRevelation = cle;
    const devoilement = etat === "revelees" && (etatRevelation === "compte" || etatRevelation === "bientot");
    etatRevelation = etat;
    z.classList.toggle("scellee", etat !== "revelees");
    z.classList.toggle("devoilement", devoilement);

    const joueurs = t.equipes.reduce((n, e) => n + e.joueurs.length, 0);
    const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? "s" : ""}`;
    const texte = etat === "revelees"
      ? `${pluriel(t.equipes.length, "équipe")}${joueurs ? `, ${pluriel(joueurs, "joueur")}` : ""}. Tous les matchs en BO3 et en direct, du 4 au 20 février 2027.`
      : scellees === t.equipes.length
        ? `Les ${t.equipes.length} équipes, leurs noms et leurs joueurs, se dévoilent ${etat === "compte" ? "à cette heure-là" : "bientôt"}, ici et sur le Discord.`
        : `Encore ${pluriel(scellees, "équipe")} ${scellees > 1 ? "scellées" : "scellée"} : ${scellees > 1 ? "elles se dévoilent" : "elle se dévoile"} ${etat === "compte" ? "à cette heure-là" : "bientôt"}, ici et sur le Discord.`;
    const date = etat === "compte" ? majuscule(dateLongue(t.revelation, true)) : etat === "bientot" ? "Bientôt" : "Les équipes sont là";

    vider(z,
      el("div", { class: "revelation-texte" },
        el("p", { class: "surtitre", text: etat === "revelees" ? "C'est officiel" : "Révélation des équipes" }),
        el("p", { class: "une-date", text: date }),
        el("p", { class: "une-texte", text: texte }),
      ),
      etat === "compte" ? rebours(t.revelation, true, "revelation", { fin: guetterRevelation, texteFin: "C'est l'heure !" }) : null,
      el("div", { class: "agents-ligne", "aria-hidden": "true" },
        ORDRE_AGENTS.map((k, n) => el("img", {
          src: `/img/agents/agent-${k}.webp`, alt: "", width: AGENTS[k - 1][0], height: 900, loading: "lazy", decoding: "async",
          class: n % 2 ? "devant" : "", style: `--n:${n};--z:${10 - Math.abs(n - 3)}`,
        })),
      ),
      el("span", { class: `sfx sfx-revelation${etat === "revelees" ? " eclat" : " tremble"}`, "aria-hidden": "true", text: etat === "revelees" ? "ドン！" : "？？？" }),
    );
    if (etat !== "compte") clearInterval(minuteurs.revelation);
  }

  function rendreEquipes(t) {
    const z = $("tournoi-equipes");
    const cartes = t.equipes.map((e) => (e.scellee
      // une équipe scellée : ni nom ni joueurs, juste son numéro et le sceau
      ? el("article", { class: "carte equipe-carte scellee", "aria-label": `Équipe ${e.id} : scellée, révélée ${t.revelation ? `le ${dateLongue(t.revelation, true)}` : "bientôt"}` },
        el("span", { class: "equipe-numero", "aria-hidden": "true", text: String(e.id) }),
        el("div", {},
          el("strong", { text: `Équipe ${e.id}` }),
          el("div", { class: "joueurs", "aria-hidden": "true" }, [0, 1, 2].map(() => el("span", { class: "chip mystere", text: "? ? ?" }))),
          el("p", { class: "scelle-texte", text: t.revelation ? `Scellée · révélée le ${dateCourte(t.revelation)}` : "Scellée · révélée bientôt" }),
        ),
        buste(e.id),
        el("span", { class: "sceau", "aria-hidden": "true", text: "封" }),
        e.poule ? el("span", { class: "poule-badge", text: `Poule ${e.poule}` }) : null,
      )
      : el("article", { class: `carte equipe-carte${t.champion?.id === e.id ? " championne" : ""}` },
        el("span", { class: "equipe-numero", "aria-hidden": "true", text: String(e.id) }),
        el("div", {},
          el("strong", { text: e.nom }),
          el("div", { class: "joueurs" }, e.joueurs.length ? e.joueurs.map((j) => el("span", { class: "chip", text: j })) : el("span", { class: "note", text: "Joueurs à venir" })),
        ),
        buste(e.id),
        e.poule ? el("span", { class: "poule-badge", text: `Poule ${e.poule}` }) : null,
      )));
    const titre = document.querySelector("#tournoi .titre-equipes");
    if (titre) titre.textContent = t.scellees === t.equipes.length ? "Les équipes · scellées" : t.scellees ? `Les équipes · ${t.equipes.length - t.scellees} révélée${t.equipes.length - t.scellees > 1 ? "s" : ""} sur ${t.equipes.length}` : "Les équipes";
    const vu = dejaVu(z);
    vider(z, cartes);
    apparaitre(cartes, vu);
  }

  function rendreTournoi() {
    if ($("tournoi")?.hidden) return; // le tournoi est reporté : sa partie est cachée (index.html), on ne la remplit pas
    const t = donnees?.tournoi;
    const etat = $("etat-tournoi");
    // sans données du bot : on garde l'en-tête, le teaser et le message, sans cases vides
    for (const e of [document.querySelector(".tournoi-grille"), $("tournoi-revelation"), ...document.querySelectorAll("#tournoi .sous-titre")]) if (e) e.hidden = !t;
    if (!t) {
      etat.textContent = "Février 2027";
      etat.className = "etiquette";
      vider($("tournoi-une"), el("p", { class: "vide", text: donnees?.horsLigne ? "Le tableau du tournoi revient dans un instant." : "Le tableau du tournoi arrive bientôt." }));
      vider($("tournoi-poules"));
      vider($("tournoi-arbre"));
      vider($("tournoi-matchs"));
      vider($("tournoi-equipes"));
      clearInterval(minuteurs.revelation);
      cleRevelation = "";
      return;
    }
    const direct = Boolean(t.direct);
    etat.textContent = t.champion ? "Terminé" : direct ? "● En direct" : t.enCours ? "En cours" : "Février 2027";
    etat.className = `etiquette${direct ? " live" : ""}`;
    $("pastille-tournoi").hidden = !direct;
    rendreUne(t);
    rendrePoules(t);
    rendreArbre(t);
    rendreMatchs(t);
    rendreRevelation(t);
    rendreEquipes(t);
  }

  // ---------- le goûter de Chopper (mini-jeu) ----------
  const GOUTER = {
    bonbon: { points: 1, poids: 55 },
    chocolat: { points: 2, poids: 22 },
    barbe: { points: 5, poids: 6 },
    bombe: { points: -5, poids: 17 },
  };
  let jeu = null; // l'état du goûter, une fois la partie prête
  function gouter() {
    const zone = $("gouter");
    const canvas = $("gouter-canvas");
    if (!zone || !canvas?.getContext) return;
    const ctx = canvas.getContext("2d");
    const photo = new Image();
    photo.src = "/img/chopper-visage.jpg";
    const COULEURS = ["#ff7ab0", "#bf9bff", "#ffd166", "#7ee0f5", "#ff9a6b"];
    let L = 0;
    let H = 0;
    let cibleX = null;
    const touches = { gauche: false, droite: false };
    let boucle = 0;
    let dernier = 0;
    let decor = 0;
    let meilleurLocal = 0;
    try { meilleurLocal = Number(localStorage.getItem("barhaw-gouter")) || 0; } catch {}

    const s = {
      etat: "accueil", score: 0, combo: 0, temps: 45_000, duree: 45_000, x: 0, objets: [], effets: [], prochain: 0,
      secousse: 0, flash: 0, mord: 0, partie: "", envoi: false,
    };
    jeu = s;

    // ---------- le goûter en 3D ----------
    // js/gouter-3d.js (et three.js) ne se chargent qu'à l'approche de la partie Chopper, et seulement si l'appareil a une
    // carte graphique et n'économise pas ses données. Ils ne font que dessiner ce que calcule le jeu d'ici ; sinon, la 2D.
    // ?3d=non dans l'adresse garde la 2D, ?3d=oui force la 3D (pour les essais).
    const choix3d = new URLSearchParams(location.search).get("3d");
    let rendu3d = null;
    let toile3d = null;
    const images3d = { n: 0, ms: 0 };
    async function charger3d() {
      if (rendu3d || choix3d === "non" || navigator.connection?.saveData) return;
      try {
        const essai = document.createElement("canvas").getContext("webgl2");
        if (!essai) return;
        const info = essai.getExtension("WEBGL_debug_renderer_info");
        const logiciel = info && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(essai.getParameter(info.UNMASKED_RENDERER_WEBGL)));
        essai.getExtension("WEBGL_lose_context")?.loseContext();
        if (logiciel && choix3d !== "oui") return;
        const { creerGouter3D } = await import("/js/gouter-3d.js");
        const t = el("canvas", { class: "gouter-3d", "aria-hidden": "true" });
        const r = creerGouter3D(t, { photo });
        if (choix3d !== "oui" && r.tropLent()) { r.detruire(); return; }
        t.addEventListener("webglcontextlost", (e) => { e.preventDefault(); passer2d(); });
        canvas.before(t);
        $("gouter-jeu")?.classList.add("en-3d");
        toile3d = t;
        rendu3d = r;
        rendu3d.taille(L, H);
        dessiner(performance.now());
        if (choix3d) window.__gouter3d = { s, dessiner, rendu: r, taille: () => [L, H] }; // pour les essais (?3d=oui)
      } catch {}
    }
    function passer2d() {
      if (!rendu3d) return;
      try { rendu3d.detruire(); } catch {}
      rendu3d = null;
      toile3d?.remove();
      $("gouter-jeu")?.classList.remove("en-3d");
      dessiner(performance.now());
    }
    if ("IntersectionObserver" in window && $("chopper")) {
      const approche = new IntersectionObserver((entrees) => {
        if (!entrees.some((e) => e.isIntersecting)) return;
        approche.disconnect();
        charger3d();
      }, { rootMargin: "900px 0px" });
      approche.observe($("chopper"));
    }

    function taille() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      L = Math.max(200, r.width);
      H = Math.max(200, r.height);
      canvas.width = Math.round(L * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.x = s.x ? Math.min(Math.max(s.x, 0), L) : L / 2;
      rendu3d?.taille(L, H);
      dessiner(performance.now());
    }
    const rayon = () => Math.max(28, Math.min(46, L * 0.055));
    const taillesObjet = () => Math.max(16, Math.min(26, L * 0.03));

    // ---------- les écrans ----------
    function ecran(...contenu) { vider($("gouter-ecran"), ...contenu); $("gouter-ecran").hidden = false; }
    function ecranAccueil() {
      ecran(
        el("p", { class: "gouter-titre" }, "Le goûter", el("br"), el("span", { class: "degrade", text: "de Chopper" })),
        el("p", { class: "gouter-texte", text: "Chopper a un petit creux. Attrape un maximum de bonbons… et pas les bombes !" }),
        el("button", { class: "btn btn-plein", type: "button", onclick: () => lancer(), text: "Jouer" }),
        el("p", { class: "note", text: compteJeu() ? "Ton score compte pour le classement des potes de Chopper." : "Connecte-toi avec Discord pour que ton score compte." }),
      );
    }
    const compteJeu = () => Boolean(moi?.connecte && !chopperMoi?.pasMembre && donnees?.chopper?.actif);

    // ---------- une partie ----------
    async function lancer() {
      if (s.etat === "jeu" || s.etat === "pret") return;
      s.etat = "pret";
      s.partie = "";
      s.duree = Math.max(5, Number(donnees?.chopper?.jeu?.duree) || 45) * 1000;
      if (compteJeu()) {
        try {
          const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "jeu-debut" }) });
          const d = await r.json().catch(() => ({}));
          if (d.ok && d.partie) { s.partie = d.partie; s.duree = Math.max(5, Number(d.duree) || 45) * 1000; }
        } catch {}
      }
      Object.assign(s, { etat: "jeu", score: 0, combo: 0, temps: s.duree, objets: [], effets: [], prochain: 600, secousse: 0, flash: 0, x: L / 2 });
      images3d.n = 0; images3d.ms = 0;
      cibleX = null;
      $("gouter-ecran").hidden = true;
      $("gouter-hud").hidden = false;
      $("gouter-temps").textContent = String(Math.ceil(s.temps / 1000));
      majHud();
      canvas.focus?.({ preventScroll: true });
      demarrerBoucle();
    }

    function majHud() {
      $("gouter-score").textContent = String(s.score);
      $("gouter-combo").textContent = s.combo >= 3 ? `Combo ×${s.combo}` : "";
      // en VF : à 10 bonbons d'affilée, la « fièvre du goûter » fait briller le cadre
      $("gouter-jeu")?.classList.toggle("fievre", jeuxVF() && s.etat === "jeu" && s.combo >= 10);
    }

    async function finir() {
      s.etat = "fin";
      $("gouter-hud").hidden = true;
      $("gouter-jeu")?.classList.remove("fievre");
      const score = s.score;
      const record = score > meilleurLocal;
      if (record) { meilleurLocal = score; try { localStorage.setItem("barhaw-gouter", String(score)); } catch {} }
      const resultat = el("p", { class: "gouter-texte", text: s.partie ? "J'envoie ton score à Chopper…" : record && score > 0 ? "Nouveau record perso !" : `Ton record : ${meilleurLocal} points.` });
      ecran(
        el("p", { class: "gouter-fin", text: "Fin du goûter !" }),
        el("p", { class: "gouter-points" }, el("b", { class: "degrade", text: String(score) }), " points"),
        resultat,
        el("button", { class: "btn btn-plein", type: "button", onclick: () => lancer(), text: "Rejouer" }),
      );
      // en VF : le même écran de fin clair que les autres jeux (le résultat arrive du bot juste après)
      const finGouter = (f, note = "") => { if (jeuxVF() && s.etat === "fin") ecran(finVF({ semaine: donnees?.chopper?.jeu?.semaine, gros: `${score} points`, score: "Fin du goûter !", note, f, rejouer: () => lancer() })); };
      if (!s.partie) { finGouter({ perso: record && score > 0, message: compteJeu() ? "" : "Connecte-toi avec Discord pour que ton score compte." }); return; }
      const partie = s.partie;
      s.partie = "";
      try {
        const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "jeu-fin", partie, score }) });
        const d = await r.json().catch(() => ({}));
        if (d.chopper) {
          donnees = { ...(donnees || {}), chopper: { ...(donnees?.chopper || {}), ...d.chopper } };
          rendreClassementJeu();
        }
        if (d.ok) {
          if (d.butin) recevoirButin(d.butin);
          finGouter({ record: d.record, perso: d.perso, butin: d.butin, milles: d.milles }, d.recompense ? `Chopper est content : ${d.recompense}.` : d.restant > 0 ? "Attrape au moins un bonbon pour que la partie rapporte." : "Tes 3 parties qui rapportent sont faites pour aujourd'hui.");
          resultat.textContent = [
            d.record ? "Nouveau record du goûter, bravo !" : d.perso ? "Nouveau record perso cette semaine !" : `Ton meilleur cette semaine : ${d.meilleur} points.`,
            d.recompense ? `Chopper est content : ${d.recompense}.` : d.restant > 0 ? "Attrape au moins un bonbon pour que la partie rapporte." : "Tes 3 parties qui rapportent sont faites pour aujourd'hui.",
            d.butin && (d.butin.degats || d.butin.berrys) ? texteButin(d.butin) : "",
          ].filter(Boolean).join(" ");
        } else {
          resultat.textContent = d.texte || d.erreur || "Ton score n'a pas pu être envoyé.";
        }
      } catch {
        resultat.textContent = "Ton score n'a pas pu être envoyé (pas de connexion).";
      }
    }

    // ---------- ce qui tombe ----------
    function tirer() {
      const p = 1 - s.temps / s.duree;
      const poids = Object.entries(GOUTER).map(([k, v]) => [k, k === "bombe" ? v.poids + 8 * p : v.poids]);
      let n = Math.random() * poids.reduce((a, [, w]) => a + w, 0);
      for (const [k, w] of poids) { n -= w; if (n <= 0) return k; }
      return "bonbon";
    }
    function ajouterObjet() {
      const type = tirer();
      const t = taillesObjet() * (type === "barbe" ? 1.25 : type === "bombe" ? 1.1 : 1);
      const p = 1 - s.temps / s.duree;
      s.objets.push({
        type, t, x: t + Math.random() * (L - 2 * t), y: -t,
        v: H * (0.32 + 0.42 * p + Math.random() * 0.14), // pixels par seconde
        a: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 3,
        couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      });
    }
    function effet(texte, x, y, { sfx = false, couleur = "#fff", taille = 18 } = {}) {
      s.effets.push({ texte, x, y, sfx, couleur, taille, vie: 1 });
    }

    function avancer(dt) {
      if (s.etat !== "jeu") return;
      s.temps -= dt;
      $("gouter-temps").textContent = String(Math.max(0, Math.ceil(s.temps / 1000)));
      // Chopper suit la souris ou le doigt, ou les flèches
      const vitesse = L * 1.3 * (dt / 1000);
      if (touches.gauche) { cibleX = null; s.x -= vitesse; }
      if (touches.droite) { cibleX = null; s.x += vitesse; }
      if (cibleX !== null) s.x += (cibleX - s.x) * Math.min(1, dt / 70);
      const R = rayon();
      s.x = Math.max(R, Math.min(L - R, s.x));
      // apparitions, de plus en plus serrées
      const p = 1 - s.temps / s.duree;
      s.prochain -= dt;
      if (s.prochain <= 0) { ajouterObjet(); s.prochain = 1000 / (0.9 + 1.4 * p) * (0.7 + Math.random() * 0.6); }
      const yChopper = H - R - 16;
      for (const o of s.objets) {
        o.y += o.v * (dt / 1000);
        o.a += o.va * (dt / 1000);
        if (!o.fini && Math.abs(o.y - yChopper) < R * 0.75 + o.t * 0.5 && Math.abs(o.x - s.x) < R * 0.9 + o.t * 0.6) {
          o.fini = true;
          rendu3d?.attrape(o.x, o.y, o.type, o.couleur);
          const g = GOUTER[o.type];
          if (o.type === "bombe") {
            s.score = Math.max(0, s.score + g.points);
            s.combo = 0;
            s.secousse = reduit.matches ? 0 : 1;
            s.flash = 1;
            effet("ドカーン", o.x, yChopper - R * 1.6, { sfx: true, couleur: "#ff9a6b", taille: 34 });
            effet("−5", o.x + 30, yChopper - R, { couleur: "#ff8fb4" });
          } else {
            s.combo++;
            s.score += g.points;
            s.mord = 1;
            effet(`+${g.points}`, o.x, yChopper - R, { couleur: o.type === "barbe" ? "#ffb3d9" : "#fff" });
            if (o.type === "barbe") effet("キラッ", s.x, yChopper - R * 2, { sfx: true, couleur: "#ffb3d9", taille: 28 });
            else if (s.combo % 10 === 0) { s.score += 5; effet("スゴイ！", s.x, yChopper - R * 2.1, { sfx: true, couleur: "#ffd166", taille: 32 }); effet("+5", s.x + 40, yChopper - R * 1.4, { couleur: "#ffd166" }); }
            else if (Math.random() < 0.18) effet("パクッ", s.x, yChopper - R * 1.8, { sfx: true, couleur: "#ff7ab0", taille: 24 });
          }
          majHud();
        }
        if (!o.fini && o.y > H + o.t) {
          o.fini = true;
          if (o.type !== "bombe" && s.combo) { s.combo = 0; majHud(); }
        }
      }
      s.objets = s.objets.filter((o) => !o.fini);
      for (const e of s.effets) { e.vie -= dt / 900; e.y -= dt * 0.04; }
      s.effets = s.effets.filter((e) => e.vie > 0);
      s.secousse = Math.max(0, s.secousse - dt / 350);
      s.flash = Math.max(0, s.flash - dt / 250);
      s.mord = Math.max(0, s.mord - dt / 180);
      if (s.temps <= 0) finir();
    }

    // ---------- le dessin ----------
    function dessinerObjet(o) {
      const t = o.t;
      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.type === "bonbon") {
        ctx.rotate(o.a);
        ctx.fillStyle = o.couleur;
        for (const sens of [-1, 1]) { // les papillotes
          ctx.beginPath();
          ctx.moveTo(sens * t * 0.55, 0);
          ctx.lineTo(sens * t * 1.15, -t * 0.45);
          ctx.lineTo(sens * t * 1.15, t * 0.45);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, t * 0.65, t * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-t * 0.25, -t * 0.4);
        ctx.lineTo(t * 0.05, t * 0.45);
        ctx.stroke();
      } else if (o.type === "chocolat") {
        ctx.rotate(o.a * 0.3);
        ctx.fillStyle = "#6b3a2a";
        ctx.beginPath();
        ctx.roundRect(-t * 0.75, -t * 0.55, t * 1.5, t * 1.1, 4);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -t * 0.55); ctx.lineTo(0, t * 0.55);
        ctx.moveTo(-t * 0.75, 0); ctx.lineTo(t * 0.75, 0);
        ctx.stroke();
        ctx.fillStyle = "#d9d4e4"; // le papier alu
        ctx.beginPath();
        ctx.moveTo(t * 0.2, t * 0.55); ctx.lineTo(t * 0.75, t * 0.05); ctx.lineTo(t * 0.75, t * 0.55); ctx.closePath();
        ctx.fill();
      } else if (o.type === "barbe") {
        ctx.strokeStyle = "#f5f0fb";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0, t * 0.3); ctx.lineTo(0, t * 1.3); ctx.stroke();
        ctx.shadowColor = "rgba(255,150,200,.8)";
        ctx.shadowBlur = 14;
        ctx.fillStyle = "#ffb3d9";
        for (const [dx, dy, r] of [[0, -t * 0.25, 0.6], [-t * 0.45, 0, 0.45], [t * 0.45, 0, 0.45], [-t * 0.2, t * 0.25, 0.4], [t * 0.2, t * 0.25, 0.4]]) {
          ctx.beginPath(); ctx.arc(dx, dy, t * r, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = "#15111d";
        ctx.strokeStyle = "#3a2f4d";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, t * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.25)";
        ctx.beginPath(); ctx.arc(-t * 0.25, -t * 0.25, t * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c9b38a";
        ctx.beginPath(); ctx.moveTo(t * 0.35, -t * 0.55); ctx.quadraticCurveTo(t * 0.6, -t * 1.05, t * 0.95, -t * 0.95); ctx.stroke();
        ctx.fillStyle = Math.random() < 0.5 ? "#ffd166" : "#ff7a3d"; // l'étincelle de la mèche
        ctx.beginPath(); ctx.arc(t * 0.95, -t * 0.95, t * 0.16 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function dessiner(t) {
      if (!L) return;
      if (rendu3d) {
        // la 3D dessine le décor, Chopper et ce qui tombe ; ce canvas, transparent par-dessus, garde les +1, les onomatopées et l'éclair
        rendu3d.dessiner(s, { temps: t / 1000, rayon: rayon(), secousse: s.secousse });
        ctx.clearRect(0, 0, L, H);
        ctx.save();
        if (s.secousse) ctx.translate((Math.random() - 0.5) * 12 * s.secousse, (Math.random() - 0.5) * 12 * s.secousse);
        dessinerEffets();
        ctx.restore();
        if (s.flash) { ctx.fillStyle = `rgba(255,255,255,${0.35 * s.flash})`; ctx.fillRect(0, 0, L, H); }
        return;
      }
      ctx.save();
      ctx.clearRect(0, 0, L, H);
      if (s.secousse) ctx.translate((Math.random() - 0.5) * 12 * s.secousse, (Math.random() - 0.5) * 12 * s.secousse);
      // le fond : la nuit, et des lignes de vitesse qui partent de Chopper
      const fond = ctx.createLinearGradient(0, 0, 0, H);
      fond.addColorStop(0, "#110b1c");
      fond.addColorStop(1, "#1d1030");
      ctx.fillStyle = fond;
      ctx.fillRect(-20, -20, L + 40, H + 40);
      const R = rayon();
      const yC = H - R - 16;
      decor = t / 1000;
      ctx.save();
      ctx.translate(s.x || L / 2, yC);
      ctx.strokeStyle = s.etat === "jeu" && s.combo >= 10 ? "rgba(255,180,220,.16)" : "rgba(191,155,255,.09)";
      ctx.lineWidth = 1;
      const n = 48;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.sin(decor * 0.6) * 0.02 + (Math.floor(decor * 8) % 2) * 0.01;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 2.2, Math.sin(a) * R * 2.2);
        ctx.lineTo(Math.cos(a) * Math.max(L, H) * 1.2, Math.sin(a) * Math.max(L, H) * 1.2);
        ctx.stroke();
      }
      ctx.restore();
      // le sol
      ctx.fillStyle = "rgba(155,92,255,.12)";
      ctx.fillRect(-20, H - 10, L + 40, 30);

      for (const o of s.objets) dessinerObjet(o);

      // Chopper : sa photo dans un anneau violet-rose
      const echelle = 1 + 0.12 * s.mord;
      ctx.save();
      ctx.translate(s.x || L / 2, yC + Math.sin(decor * 4) * 2);
      ctx.scale(echelle, 1 / echelle);
      const anneau = ctx.createLinearGradient(-R, -R, R, R);
      anneau.addColorStop(0, "#c7a6ff");
      anneau.addColorStop(0.5, "#9b5cff");
      anneau.addColorStop(1, "#e3447f");
      ctx.shadowColor = "rgba(155,92,255,.7)";
      ctx.shadowBlur = 18;
      ctx.fillStyle = anneau;
      ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      if (photo.complete && photo.naturalWidth) ctx.drawImage(photo, -R, -R, R * 2, R * 2);
      else { ctx.fillStyle = "#e8b48a"; ctx.fillRect(-R, -R, R * 2, R * 2); }
      ctx.restore();
      dessinerEffets();
      ctx.restore();
      if (s.flash) { ctx.fillStyle = `rgba(255,255,255,${0.35 * s.flash})`; ctx.fillRect(0, 0, L, H); }
    }
    // les effets : +1, onomatopées
    function dessinerEffets() {
      for (const e of s.effets) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, e.vie * 1.5));
        ctx.textAlign = "center";
        if (e.sfx) {
          ctx.translate(e.x, e.y);
          ctx.rotate(-0.12);
          ctx.font = `${e.taille}px "Dela Gothic One", "M PLUS Rounded 1c", sans-serif`;
          ctx.lineWidth = 5;
          ctx.strokeStyle = "#0b0712";
          ctx.strokeText(e.texte, 3, 3);
          ctx.fillStyle = "#9b5cff";
          ctx.fillText(e.texte, 3, 3);
          ctx.strokeText(e.texte, 0, 0);
          ctx.fillStyle = e.couleur;
          ctx.fillText(e.texte, 0, 0);
        } else {
          ctx.font = `800 ${e.taille}px "M PLUS Rounded 1c", sans-serif`;
          ctx.fillStyle = e.couleur;
          ctx.fillText(e.texte, e.x, e.y);
        }
        ctx.restore();
      }
    }

    function image(t) {
      boucle = 0;
      const dt = dernier ? Math.min(50, t - dernier) : 16;
      // si la 3D est trop lourde pour l'appareil (moins de 24 images par seconde en moyenne), le goûter repasse en 2D
      if (rendu3d && s.etat === "jeu" && dernier && choix3d !== "oui" && ++images3d.n > 10) {
        images3d.ms += t - dernier;
        if (images3d.n === 50 && images3d.ms / 40 > 1000 / 24) passer2d();
      }
      dernier = t;
      if (!document.hidden) avancer(dt);
      dessiner(t);
      if (s.etat === "jeu" || s.effets.length) boucle = requestAnimationFrame(image);
    }
    function demarrerBoucle() {
      if (boucle) return;
      dernier = 0;
      boucle = requestAnimationFrame(image);
    }

    // ---------- les commandes ----------
    const viser = (clientX) => { const r = canvas.getBoundingClientRect(); cibleX = clientX - r.left; };
    canvas.addEventListener("pointermove", (e) => { if (s.etat === "jeu") viser(e.clientX); });
    canvas.addEventListener("pointerdown", (e) => { if (s.etat === "jeu") { viser(e.clientX); canvas.setPointerCapture?.(e.pointerId); } });
    canvas.tabIndex = 0;
    const touche = (e, bas) => {
      if (s.etat !== "jeu") return;
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "q" || k === "a") { touches.gauche = bas; e.preventDefault(); }
      if (k === "arrowright" || k === "d") { touches.droite = bas; e.preventDefault(); }
    };
    window.addEventListener("keydown", (e) => touche(e, true));
    window.addEventListener("keyup", (e) => touche(e, false));
    document.addEventListener("visibilitychange", () => { if (!document.hidden && s.etat === "jeu") demarrerBoucle(); });
    let attente = 0;
    // la zone suit sa propre taille (le ResizeObserver plus bas) ; la fenêtre ne compte que si l'écran change de densité
    // (zoom) ou, sans ResizeObserver, de largeur : sur téléphone, la barre d'adresse qui se cache ne refait rien
    let fenetre = `${window.innerWidth}x${window.devicePixelRatio}`;
    window.addEventListener("resize", () => {
      const f = `${window.innerWidth}x${window.devicePixelRatio}`;
      if (f === fenetre) return;
      fenetre = f;
      clearTimeout(attente);
      attente = setTimeout(() => { if (!enVeille(canvas)) taille(); }, 150);
    });
    photo.addEventListener("load", () => dessiner(performance.now()));

    // la zone de jeu peut changer de taille sans que la fenêtre change (mise en page, polices) : on suit le canvas
    if ("ResizeObserver" in window) {
      let dernierL = 0;
      let dernierH = 0;
      new ResizeObserver(() => {
        const r = canvas.getBoundingClientRect();
        if (Math.abs(r.width - dernierL) < 1 && Math.abs(r.height - dernierH) < 1) return;
        dernierL = r.width;
        dernierH = r.height;
        taille();
      }).observe(canvas);
    }
    // le ResizeObserver ci-dessus le fait dès que le canvas est mis en page (tout de suite s'il est à l'écran, sinon quand
    // sa partie approche) : le mesurer ici forcerait la mise en page de la partie de Chopper, même loin de l'écran
    if (!("ResizeObserver" in window)) taille();
    ecranAccueil();
    s.rafraichirAccueil = () => { if (s.etat === "accueil") ecranAccueil(); };
  }

  // le classement du goûter, à côté du jeu
  function rendreClassementJeu() {
    const z = $("gouter-classement");
    if (!z) return;
    const j = donnees?.chopper?.jeu;
    $("gouter-duree").textContent = String(j?.duree || 45);
    jeu?.rafraichirAccueil?.();
    if (!j) { vider(z); $("gouter-note").textContent = ""; return; }
    vider(z,
      j.record ? el("p", { class: "gouter-record" }, el("span", { text: "Record" }), el("b", { text: `${j.record.score} pts` }), el("span", { class: "qui", text: j.record.nom })) : null,
      el("p", { class: "sous-titre-jeu", text: "Cette semaine" }),
      j.semaine?.length
        ? el("ol", {}, j.semaine.map((x) => el("li", {}, el("span", { text: x.nom }), el("small", { text: `${x.score} pts` }))))
        : el("p", { class: "note", text: "Personne pour l'instant : à toi de jouer !" }),
    );
    const m = j.moi;
    $("gouter-note").textContent = m
      ? `Ton meilleur cette semaine : ${m.meilleur} pts · parties qui rapportent aujourd'hui : ${m.restant}/3.`
      : moi?.connecte ? "" : "Connecte-toi avec Discord pour que ton score compte.";
  }

  // ---------- les cartes à collectionner ----------
  // Le tirage est fait par le bot (une carte par jour et par membre) : la page ne fait qu'afficher.
  let mesCartes = null; // l'album du membre connecté : { possede, nb, total, tirageDuJour, eclats, bonus, prochain, derniere, complet }
  let cartesPasMembre = false;
  let tirageEnCours = false;
  let derniereTiree = null; // { carte, nouvelle, exemplaires, bonus, complet }
  let minuteurCartes = null;
  const RARETES_SECOURS = { commune: { nom: "Commune", chance: 50 }, rare: { nom: "Rare", chance: 30 }, epique: { nom: "Épique", chance: 15 }, legendaire: { nom: "Légendaire", chance: 5 } };
  const imageCarte = (id) => {
    if (id === "chopper") return { src: "/img/chopper-visage.jpg", l: 480, h: 480 };
    if (id === "liliano") return { src: "/img/pp-liliano-640.webp", l: 640, h: 640 };
    return MEMES.find((m) => m.id === id) || null;
  };
  const catalogue = () => donnees?.cartes?.catalogue || [];
  const raretes = () => donnees?.cartes?.raretes || RARETES_SECOURS;

  // une carte, face visible
  function faceCarte(c, { exemplaires = 0, petite = false } = {}) {
    const img = imageCarte(c.id);
    const large = img && img.l / img.h > 1.55; // les mèmes très larges : en entier, sur la trame
    return el("article", { class: `cc rarete-${c.rarete}${petite ? " petite" : ""}`, "aria-label": `Carte n° ${c.numero} : ${c.nom}, ${raretes()[c.rarete]?.nom || ""}` },
      el("div", { class: `cc-art${large ? " large" : ""}` }, img ? el("img", { src: img.src, alt: "", width: img.l, height: img.h, loading: petite ? "lazy" : "eager", decoding: "async" }) : null),
      el("div", { class: "cc-pied" },
        el("span", { class: "cc-num", text: `n° ${String(c.numero).padStart(2, "0")}` }),
        el("strong", { class: "cc-nom", text: c.nom }),
        el("span", { class: "cc-rarete", text: raretes()[c.rarete]?.nom || "" }),
      ),
      exemplaires > 1 ? el("span", { class: "cc-double", text: `×${exemplaires}` }) : null,
    );
  }
  // une carte trophée : le boss de la semaine vaincu (elle ne compte pas dans les 15)
  function faceTrophee(t, { petite = false } = {}) {
    const img = imageCarte(t.image);
    return el("article", { class: `cc trophee${petite ? " petite" : ""}`, "aria-label": `Carte trophée : ${t.nom}, boss n° ${t.numero}` },
      el("div", { class: "cc-art" }, img ? el("img", { src: img.src, alt: "", width: img.l, height: img.h, loading: petite ? "lazy" : "eager", decoding: "async" }) : null),
      el("div", { class: "cc-pied" },
        el("span", { class: "cc-num", text: `Boss n° ${t.numero}` }),
        el("strong", { class: "cc-nom", text: t.nom }),
        el("span", { class: "cc-rarete", text: "Trophée" }),
      ),
      el("span", { class: "cc-sceau", "aria-hidden": "true", text: "討伐" }),
    );
  }
  // le dos d'une carte
  const dosCarte = (numero = null) => el("div", { class: "cc-dos", "aria-hidden": "true" },
    el("span", { class: "cc-dos-kanji", text: "札" }),
    el("span", { class: "cc-dos-nom", text: numero ? `n° ${String(numero).padStart(2, "0")}` : "BARHAW" }),
  );
  // les deux tranches d'une carte qui tourne (elle n'en montre qu'une, et seulement de profil)
  const tranche = (cote) => el("i", { class: `tranche ${cote}`, "aria-hidden": "true" });
  const borne = (x) => Math.max(-1, Math.min(1, x));

  // le relief, à la souris : la carte pointée s'incline (le côté pointé s'enfonce), sa tranche se voit
  // et sa feuille holo s'allume là où tombe la lumière. Une seule carte à la fois ; au repos, rien ne change.
  // Les autocollants, les affiches WANTED, le portrait du boss et les games de La Faille penchent aussi, comme du papier qu'on tient.
  const EN_RELIEF = ".case-album:not(.vide) > .cc, .tirage-scene.retourne .tirage-face > .cc, .autocollant, .wanted-affiche, .boss-cadre, .fl-game, .fu-cadre";
  let carteRelief = null, pointeur = null, imageRelief = 0, cadreRelief = null;
  function lacherRelief() {
    carteRelief?.classList.remove("relief", "lumiere");
    carteRelief = null;
  }
  function majRelief() {
    imageRelief = 0;
    const c = pointeur?.cible?.closest?.(EN_RELIEF) || null;
    if (c !== carteRelief) lacherRelief();
    if (!c) return;
    if (!carteRelief) {
      carteRelief = c;
      // la place de l'objet avant qu'il penche (pour une carte : sa case, qui ne bouge pas)
      cadreRelief = (c.classList.contains("cc") ? c.parentElement : c).getBoundingClientRect();
      c.classList.add("relief", "lumiere");
    }
    const r = c.classList.contains("cc") ? c.parentElement.getBoundingClientRect() : cadreRelief;
    c.style.setProperty("--px", borne(((pointeur.x - r.left) / r.width) * 2 - 1).toFixed(3));
    c.style.setProperty("--py", borne(((pointeur.y - r.top) / r.height) * 2 - 1).toFixed(3));
  }
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reduit.matches) return;
    pointeur = { x: e.clientX, y: e.clientY, cible: e.target };
    if (!imageRelief) imageRelief = requestAnimationFrame(majRelief);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", lacherRelief);
  window.addEventListener("scroll", () => { if (carteRelief && !carteRelief.classList.contains("cc")) lacherRelief(); }, { passive: true });

  // l'accueil en profondeur : à la souris, Chopper penche un peu, la bulle et l'autocollant glissent devant lui
  const heroScene = document.querySelector(".hero-chopper");
  if (heroScene) {
    let imageHero = 0, posHero = null;
    const poserHero = (x, y) => { heroScene.style.setProperty("--hx", x); heroScene.style.setProperty("--hy", y); };
    heroScene.closest(".hero")?.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || reduit.matches) return;
      posHero = e;
      if (imageHero) return;
      imageHero = requestAnimationFrame(() => {
        imageHero = 0;
        heroScene.classList.add("profondeur");
        const r = heroScene.getBoundingClientRect();
        poserHero(borne(((posHero.clientX - r.left) / r.width) * 2 - 1).toFixed(3), borne(((posHero.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      });
    }, { passive: true });
    heroScene.closest(".hero")?.addEventListener("pointerleave", () => { poserHero(0, 0); heroScene.classList.remove("profondeur"); });
  }

  // une carte en grand : on la penche, on la fait tourner en la faisant glisser (ou d'un toucher) et on voit son dos
  function voirCarte(face, etiquette, depuis) {
    const REPOS = { px: -0.35, py: -0.5 }; // la lumière tombe d'en haut à gauche quand on ne la touche pas
    face.classList.add("lumiere");
    const carte = el("div", { class: "vc-carte" }, tranche("g"), face, dosCarte(), tranche("d"));
    const scene = el("div", { class: "vc" }, el("div", { class: "vc-incline" }, carte));
    const bouton = el("button", { class: "btn btn-contour btn-petit vc-retourner", type: "button", text: "↻ Voir le dos" });
    let tour = 0, glisse = null, image = 0, lumiere = { ...REPOS };
    const poser = () => {
      image = 0;
      carte.style.setProperty("--tour", `${tour}deg`);
      scene.style.setProperty("--px", lumiere.px.toFixed(3));
      scene.style.setProperty("--py", lumiere.py.toFixed(3));
    };
    const bientot = () => { if (!image) image = requestAnimationFrame(poser); };
    const caler = (t) => {
      tour = t;
      bouton.textContent = Math.round(tour / 180) % 2 ? "↺ Voir la face" : "↻ Voir le dos";
      bientot();
    };
    const tourner = (sens) => caler(Math.round(tour / 180) * 180 + 180 * sens);
    scene.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      glisse = { x: e.clientX, depart: tour, bouge: false };
      scene.setPointerCapture(e.pointerId);
      scene.classList.add("tenue");
    });
    scene.addEventListener("pointermove", (e) => {
      const r = scene.getBoundingClientRect();
      if (!reduit.matches) lumiere = { px: borne(((e.clientX - r.left) / r.width) * 2 - 1), py: borne(((e.clientY - r.top) / r.height) * 2 - 1) };
      if (glisse) {
        const dx = e.clientX - glisse.x;
        if (Math.abs(dx) > 6) glisse.bouge = true;
        if (glisse.bouge) tour = glisse.depart + dx * 0.6;
      }
      bientot();
    });
    const lacher = () => {
      if (!glisse) return;
      scene.classList.remove("tenue");
      const delta = tour - glisse.depart;
      if (!glisse.bouge) tourner(1); // un simple toucher : elle se retourne
      else caler(glisse.depart + (Math.abs(delta) > 50 ? 180 * Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / 180)) : 0));
      glisse = null;
    };
    scene.addEventListener("pointerup", lacher);
    scene.addEventListener("pointercancel", lacher);
    scene.addEventListener("pointerleave", () => { if (!glisse) { lumiere = { ...REPOS }; bientot(); } });
    bouton.addEventListener("click", () => tourner(1));
    visionneuse(el("div", { class: "vc-bloc" }, scene, bouton), etiquette, depuis, {
      surTouche: (e) => {
        if (e.key === "ArrowRight") tourner(1);
        else if (e.key === "ArrowLeft") tourner(-1);
      },
    });
    carte.style.setProperty("--avant", getComputedStyle(face).getPropertyValue("--bord").trim() || "#c9b3c9");
    poser();
  }

  async function demanderCartes(action) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      return { status: r.status, d: await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." })) };
    } catch {
      return { status: 0, d: { erreur: "Impossible de joindre le bot. Vérifie ta connexion." } };
    }
  }

  async function chargerMesCartes() {
    if (!moi?.connecte) { mesCartes = null; rendreCartes(); return; }
    const { status, d } = await demanderCartes("cartes");
    if (status === 401) { moi = { connecte: false }; rendreCompte(); }
    cartesPasMembre = d.erreur === "pas-membre";
    if (d.cartes) mesCartes = d.cartes;
    rendreCartes();
  }

  async function tirerCarte() {
    if (tirageEnCours) return;
    tirageEnCours = true;
    const z = $("tirage");
    const scene = z.querySelector(".tirage-scene");
    scene?.classList.add("secoue");
    const [{ status, d }] = await Promise.all([demanderCartes("carte-tirer"), new Promise((ok) => setTimeout(ok, reduit.matches ? 0 : 900))]);
    tirageEnCours = false;
    if (status === 401) { moi = { connecte: false }; rendreCompte(); rendreCartes(); return; }
    if (d.erreur === "pas-membre") { cartesPasMembre = true; rendreCartes(); return; }
    if (d.cartes) mesCartes = d.cartes;
    if (!d.ok) { rendreCartes({ message: d.texte || d.erreur || "Le tirage n'a pas marché, réessaie." }); return; }
    derniereTiree = d;
    if (d.butin) recevoirButin(d.butin);
    rendreCartes({ revele: true });
    // les nouvelles du classement arrivent avec le prochain chargement ; on le demande tout de suite
    setTimeout(charger, 1500);
  }

  function rendreTirage({ revele = false, message = "" } = {}) {
    const z = $("tirage");
    if (!z) return;
    // déjà tirée aujourd'hui (et pas de tirage bonus) : la carte du jour reste face visible
    const duJour = !revele && moi?.connecte && mesCartes && !mesCartes.tirageDuJour && !mesCartes.bonus && mesCartes.derniere
      ? catalogue().find((x) => x.id === mesCartes.derniere) || null : null;
    const c = revele ? derniereTiree?.carte : duJour;
    const exemplaires = revele ? derniereTiree?.exemplaires : mesCartes?.possede?.[c?.id] || 1;
    const scene = el("div", { class: `tirage-scene${c ? ` rarete-${c.rarete}` : ""}${duJour ? " retourne fixe" : ""}` },
      el("span", { class: "concentration", "aria-hidden": "true" }),
      el("div", { class: "tirage-carte" },
        tranche("g"),
        dosCarte(),
        c ? el("div", { class: "tirage-face" }, faceCarte(c, { exemplaires })) : null,
        tranche("d"),
      ),
      revele && c ? el("span", { class: `sfx sfx-tirage eclat${c.rarete === "legendaire" ? " violet" : ""}`, "aria-hidden": "true", text: c.rarete === "legendaire" ? "キラッ！" : c.rarete === "epique" ? "ドン！" : derniereTiree.nouvelle ? "ジャーン" : "ポン" }) : null,
    );
    let infos;
    if (!moi?.connecte) {
      infos = [
        el("h3", { text: "Ta carte du jour" }),
        el("p", { text: "Connecte-toi avec ton compte Discord pour tirer une carte par jour et remplir ton album." }),
        el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" }),
      ];
    } else if (cartesPasMembre) {
      infos = [el("h3", { text: "Ta carte du jour" }), el("p", { text: "Rejoins le Discord Barhaw pour collectionner les cartes." }), el("a", { class: "btn btn-plein", href: "#discord", text: "Rejoindre le Discord" })];
    } else if (!mesCartes) {
      infos = [el("h3", { text: "Ta carte du jour" }), el("p", { class: "note", text: message || "Ton album arrive…" })];
    } else {
      const m = mesCartes;
      const peut = m.tirageDuJour || m.bonus;
      const resultat = revele && derniereTiree
        ? el("p", { class: `tirage-resultat${derniereTiree.nouvelle ? " nouvelle" : ""}`, text: derniereTiree.complet ? `Album complet\u00a0! ${m.total}/${m.total}, bravo\u00a0!` : derniereTiree.nouvelle ? `Nouvelle carte\u00a0: ${c.nom}\u00a0!` : `Doublon (×${derniereTiree.exemplaires})\u00a0: +1\u00a0éclat` })
        : null;
      infos = [
        el("h3", { text: peut ? (m.tirageDuJour ? "Ta carte du jour t'attend" : "Tirage bonus\u00a0!") : "Carte du jour tirée" }),
        resultat,
        revele && derniereTiree?.butin && (derniereTiree.butin.degats || derniereTiree.butin.berrys) ? el("p", { class: "jeu-butin", text: texteButin(derniereTiree.butin) }) : null,
        duJour ? el("p", { text: `Aujourd'hui\u00a0: ${duJour.nom}.` }) : null,
        message ? el("p", { class: "note", text: message }) : null,
        peut
          ? el("button", { class: "btn btn-plein", type: "button", onclick: tirerCarte, text: m.tirageDuJour ? "Tirer ma carte" : `Tirage bonus (${donnees?.cartes?.eclatsBonus || 5} éclats)` })
          : el("p", { class: "tirage-attente" }, "Prochaine carte dans ", el("b", { id: "cartes-rebours", text: "…" })),
        el("div", { class: "eclats", "aria-label": `${m.eclats} éclat${m.eclats > 1 ? "s" : ""} sur ${donnees?.cartes?.eclatsBonus || 5}` },
          el("span", { text: "Éclats" }),
          el("span", { class: "eclats-points", "aria-hidden": "true" }, Array.from({ length: donnees?.cartes?.eclatsBonus || 5 }, (_, k) => el("i", { class: k < Math.min(m.eclats, donnees?.cartes?.eclatsBonus || 5) ? "plein" : "" }))),
        ),
      ];
    }
    vider(z, scene, el("div", { class: "tirage-infos" }, infos));
    if (revele && c) requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.add("retourne")));
    if (c) {
      const face = z.querySelector(".tirage-face .cc");
      face?.addEventListener("click", () => voirCarte(faceCarte(c, { exemplaires }), `Carte : ${c.nom}`, face));
    } else if (moi?.connecte && mesCartes && (mesCartes.tirageDuJour || mesCartes.bonus) && !tirageEnCours) {
      z.querySelector(".tirage-carte").addEventListener("click", tirerCarte);
      z.querySelector(".tirage-carte").classList.add("cliquable");
    }
    // le compte à rebours jusqu'à minuit (heure de Paris)
    clearInterval(minuteurCartes);
    const b = $("cartes-rebours");
    if (b && mesCartes?.prochain) {
      const tic = () => {
        const reste = mesCartes.prochain - Date.now();
        if (reste <= 0) { clearInterval(minuteurCartes); chargerMesCartes(); return; }
        const s = Math.floor(reste / 1000);
        b.textContent = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
      };
      tic();
      minuteurCartes = setInterval(tic, 1000);
    }
  }

  function rendreAlbum() {
    const z = $("album");
    if (!z) return;
    const cat = catalogue();
    if (!cat.length) { vider(z, el("h3", { text: "L'album" }), el("p", { class: "vide", text: donnees?.horsLigne ? "L'album revient dans un instant." : "L'album arrive bientôt." })); return; }
    const possede = mesCartes?.possede || {};
    const nb = cat.filter((c) => possede[c.id]).length;
    const cases = cat.map((c) => {
      const n = possede[c.id] || 0;
      if (!n) return el("div", { class: `case-album vide rarete-${c.rarete}`, title: `n° ${c.numero} · ${raretes()[c.rarete]?.nom || ""}` }, dosCarte(c.numero));
      const face = faceCarte(c, { exemplaires: n, petite: true });
      const b = el("button", { class: `case-album${derniereTiree?.carte?.id === c.id ? " fraiche" : ""}`, type: "button", "aria-label": `Voir la carte ${c.nom}` }, face);
      b.addEventListener("click", () => voirCarte(faceCarte(c, { exemplaires: n }), `Carte : ${c.nom}`, b));
      return b;
    });
    vider(z,
      el("div", { class: "album-tete" },
        el("h3", { text: moi?.connecte ? "Ton album" : "L'album" }),
        el("span", { class: "album-compte" }, el("b", { text: String(nb) }), ` / ${cat.length}`),
      ),
      el("div", { class: "album-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.round((nb / cat.length) * 100)}%` })),
      el("div", { class: "album-cases" }, cases),
      mesCartes?.trophees?.length ? [
        el("h4", { class: "album-trophees", text: `Trophées de chasse (${mesCartes.trophees.length})` }),
        el("div", { class: "album-cases trophees" }, mesCartes.trophees.map((t) => {
          const b = el("button", { class: "case-album", type: "button", "aria-label": `Voir la carte trophée ${t.nom}` }, faceTrophee(t, { petite: true }));
          b.addEventListener("click", () => voirCarte(faceTrophee(t), `Carte trophée : ${t.nom}`, b));
          return b;
        })),
      ] : null,
      !moi?.connecte ? el("p", { class: "note", text: "Les cartes que tu tires apparaissent ici. Les cases vides gardent leur secret." }) : null,
    );
  }

  function rendreCollectionneurs() {
    const z = $("collectionneurs");
    const r = $("regles-cartes");
    if (!z || !r) return;
    const s = donnees?.cartes;
    const liste = s?.classement || [];
    vider(z,
      el("h3", { text: "Les collectionneurs" }),
      liste.length
        ? el("ol", {}, liste.map((x) => el("li", {},
          el("span", { text: x.nom }),
          el("small", { text: x.complet ? `👑 ${x.nb}/${s.total}` : `${x.nb}/${s.total}` }),
        )))
        : el("p", { class: "note", text: "Personne n'a encore tiré de carte. Sois le premier !" }),
      s?.collectionneurs ? el("p", { class: "note", text: `${s.collectionneurs} collectionneur${s.collectionneurs > 1 ? "s" : ""} en tout.` }) : null,
    );
    const rar = raretes();
    vider(r,
      el("h3", { text: "Comment ça marche" }),
      el("ul", {},
        el("li", {}, el("strong", { text: "Une carte par jour" }), " : la prochaine arrive à minuit, heure de Paris."),
        el("li", {}, el("strong", { text: "Les raretés" }), "\u00a0: ", Object.entries(rar).flatMap(([k, v], i) => [i ? ", " : "", el("span", { class: `pastille-rarete rarete-${k}`, text: v.nom }), `\u00a0${v.chance}\u00a0%`])),
        el("li", {}, el("strong", { text: "Les doublons" }), ` donnent un éclat. ${s?.eclatsBonus || 5} éclats = un tirage bonus.`),
        el("li", {}, el("strong", { text: "Pas de malchance" }), " : après 4 doublons d'affilée, la carte suivante est forcément nouvelle."),
        el("li", {}, el("strong", { text: "Les légendaires" }), " et les albums complets sont annoncés sur le Discord."),
      ),
    );
  }

  function rendreCartes(opts = {}) {
    rendreTirage(opts);
    rendreAlbum();
    rendreCollectionneurs();
  }

  // ---------- les jeux de Chopper : la Rumble Ball et le quiz One Piece ----------
  // Le bot ouvre chaque partie, vérifie la Rumble Ball et corrige le quiz lui-même (la page ne reçoit jamais les réponses).
  let mesJeux = null; // { rumble, docteur, memory: { meilleur, detail, eclatRecu }, quiz: { facile, moyen, difficile }, eclatsDuJour, eclatsParJour }
  const POINTS_RUMBLE = ["Heavy Point", "Brain Point", "Walk Point", "Jumping Point", "Arm Point", "Guard Point", "Horn Point"];
  const SFX_RUMBLE = ["ドン！", "ボン！", "ゴゴゴ", "バーン！", "ドドド", "ズン！", "ガッ！"];
  const infosJeux = () => donnees?.jeux || null;

  async function demanderJeux(action, extra = {}) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
      if (d.jeux) mesJeux = d.jeux;
      if (d.cartes) { mesCartes = d.cartes; if (!$("tirage")?.querySelector(".retourne")) rendreTirage(); }
      if (d.butin) recevoirButin(d.butin);
      return { status: r.status, d };
    } catch {
      return { status: 0, d: { erreur: "Impossible de joindre le bot. Vérifie ta connexion." } };
    }
  }
  async function chargerMesJeux() {
    if (!moi?.connecte) { mesJeux = null; rendreJeux(); return; }
    await demanderJeux("jeux");
    rendreJeux();
  }

  // le classement d'un jeu (record + top 5 de la semaine)
  function tableauJeu(s, texte, titre = "") {
    if (!titre && document.documentElement.classList.contains("v4")) titre = "Le classement de la semaine";
    return el("div", { class: "jeu-classement" },
      titre ? el("p", { class: "jeu-classement-titre", text: titre }) : null,
      el("p", { class: "jeu-record" }, el("span", { text: "Record" }), s?.record ? `${texte(s.record)} · ${s.record.nom}` : "à prendre !"),
      s?.semaine?.length
        ? el("ol", {}, s.semaine.map((x) => el("li", { class: moi?.connecte && x.nom === moi.nom ? "moi" : "" }, el("span", { text: x.nom }), el("small", { text: texte(x) }))))
        : el("p", { class: "note", text: "Personne n'a encore joué cette semaine." }),
    );
  }
  // les petits messages de fin de partie : record, éclat
  const messagesFin = (f) => [
    f.record ? el("p", { class: "jeu-bravo", text: "Nouveau record du site !" }) : f.perso ? el("p", { class: "jeu-bravo", text: "Nouveau record perso !" }) : null,
    f.eclat ? el("p", { class: "jeu-bravo", text: "+1 éclat pour tes cartes 💎" }) : null,
    f.eclatPlafond ? el("p", { class: "note", text: `Tu as déjà gagné tes ${infosJeux()?.eclatsParJour || 2} éclats du jour avec les jeux.` }) : null,
    f.butin && (f.butin.degats || f.butin.berrys) ? el("p", { class: "jeu-butin", text: texteButin(f.butin) }) : null,
  ];
  const noteEclat = (jeu, seuil) => {
    if (!moi?.connecte) return "Connecte-toi avec Discord pour que ton score compte.";
    if (mesJeux && mesJeux.eclatsDuJour >= (mesJeux.eclatsParJour || 2)) return "Éclats du jour déjà gagnés avec les jeux.";
    if (jeu?.eclatRecu) return "Éclat du jour déjà gagné avec ce jeu.";
    return `${seuil} = 1 éclat pour tes cartes.`;
  };

  // ---------- la VF 1.0 : les jeux en relief (décors faits dans Blender, écran de fin, plein écran sur téléphone) ----------
  const jeuxVF = () => document.documentElement.classList.contains("v4");
  // sur téléphone, une partie (et son écran de fin) prend tout l'écran ; le bouton ✕ la referme
  function pleinEcranJeu(z, oui) {
    if (!z) return;
    z.classList.toggle("en-jeu", Boolean(oui) && jeuxVF());
    document.documentElement.classList.toggle("jeu-plein", Boolean(document.querySelector(".jeu-panneau.en-jeu")));
  }
  const fermerJeu = (onclick) => el("button", { class: "jeu-fermer", type: "button", "aria-label": "Fermer le jeu", title: "Fermer", onclick }, "✕");
  // l'écran de fin, en clair : le résultat, le record, ce que la partie a rapporté et ta place de la semaine
  function finVF({ semaine = [], gros, score, note = "", f, rejouer, texteRejouer = "Rejouer" }) {
    const gains = [];
    if (f.butin?.degats) gains.push(["⚔️", `−${nombre(f.butin.degats)} PV au boss de la semaine`]);
    if (f.butin?.berrys) gains.push(["฿", `+${berrys(f.butin.berrys)} sur ton avis de recherche`]);
    if (f.milles) gains.push(["⛵", `+${nombre(f.milles)} mille${f.milles > 1 ? "s" : ""} pour ton navire sur GRAND LINE`]);
    if (f.eclat) gains.push(["💎", "+1 éclat pour tes cartes"]);
    const rang = moi?.connecte ? (semaine || []).findIndex((x) => x.nom === moi.nom) + 1 : 0;
    return el("div", { class: "jeu-ecran jeu-fin-vf" },
      el("p", { class: "jeu-gros degrade", text: gros }),
      score ? el("p", { class: "jeu-score", text: score }) : null,
      f.record || f.perso ? el("p", { class: `jeu-badge${f.record ? " site" : ""}`, text: f.record ? "★ Nouveau record du site !" : "★ Nouveau record perso !" }) : null,
      note ? el("p", { class: "note", text: note }) : null,
      f.message ? el("p", { class: "note", text: f.message }) : null,
      moi?.connecte
        ? el("div", { class: "jeu-gains" },
          el("p", { class: "jeu-gains-titre", text: "Ce que ta partie a rapporté" }),
          gains.length ? el("ul", {}, gains.map(([i, t]) => el("li", {}, el("span", { "aria-hidden": "true", text: i }), el("span", { text: t })))) : el("p", { class: "note", text: "Rien cette fois : vise un meilleur score !" }),
          f.eclatPlafond ? el("p", { class: "note", text: `Tes ${infosJeux()?.eclatsParJour || 2} éclats du jour sont déjà gagnés.` }) : null,
          rang ? el("p", { class: "jeu-rang", text: `Tu es ${rang === 1 ? "1er" : `${rang}e`} du classement de la semaine` }) : null,
        )
        : el("a", { class: "btn btn-contour btn-petit", href: "/api/auth/login", text: "Se connecter avec Discord" }),
      el("button", { class: "btn btn-plein", type: "button", onclick: rejouer, text: texteRejouer }),
    );
  }

  // --- la Rumble Ball ---
  const rb = { etat: "accueil", manche: 0, score: 0, angle: 0, vitesse: 0, zone: 0, largeur: 0, t0: 0, boucle: 0, partie: "", fin: null, dernier: null };
  function rumbleScene() {
    const svg = `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="84" class="rb-piste"/><path class="rb-zone" d=""/><g class="rb-aiguille"><line x1="100" y1="100" x2="100" y2="22"/><circle cx="100" cy="22" r="6"/></g></svg>`;
    const cadran = el("div", { class: "rb-cadran" });
    cadran.innerHTML = svg;
    cadran.append(
      el("span", { class: "rb-ombre", "aria-hidden": "true" }),
      el("div", { class: `rb-chopper forme-${rb.etat === "fin" && rb.fin ? (rb.fin.transformations === 7 ? 8 : rb.fin.transformations) : 0}`, id: "rb-chopper" }, el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 480, height: 480 })),
      el("span", { class: "sfx rb-sfx", id: "rb-sfx", "aria-hidden": "true" }),
    );
    cadran.addEventListener("pointerdown", (e) => { if (rb.etat === "jeu") { e.preventDefault(); appuyerRumble(); } });
    // en VF : l'arène (décor Blender) derrière, et les cordes de devant par-dessus Chopper
    const avant = jeuxVF() ? el("img", { class: "rb-avant", src: "/img/jeux/rumble-avant.webp", srcset: "/img/jeux/rumble-avant-petit.webp 720w, /img/jeux/rumble-avant.webp 1200w", sizes: "(max-width: 760px) 100vw, 560px", alt: "", "aria-hidden": "true", decoding: "async" }) : null;
    return el("div", { class: "rb-scene" }, el("span", { class: "concentration", "aria-hidden": "true" }), cadran, avant, jeuxVF() ? el("span", { class: "rb-onde", "aria-hidden": "true" }) : null);
  }
  function fermerRumble() {
    if (rb.etat === "jeu" || rb.etat === "pause") { cancelAnimationFrame(rb.boucle); rb.etat = "accueil"; }
    finMusiqueJeu();
    pleinEcranJeu($("rumble"), false);
    if (rb.etat !== "envoi") rendreRumble();
  }
  const teteRumble = () => el("div", { class: "jeu-tete" }, el("h3", { text: "La Rumble Ball" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "💊" }), fermerJeu(fermerRumble));
  function rendreRumble() {
    const z = $("rumble");
    if (!z || rb.etat === "jeu") return;
    const s = infosJeux()?.rumble;
    const moiR = mesJeux?.rumble;
    let ecran;
    if (rb.etat === "fin" && rb.fin && jeuxVF()) {
      const f = rb.fin;
      ecran = finVF({ semaine: s?.semaine, gros: f.transformations === 7 ? "MONSTER POINT !!" : `${f.transformations}/7 transformations`, score: `${nombre(f.score)} points`, f, rejouer: lancerRumble });
    } else if (rb.etat === "fin" && rb.fin) {
      const f = rb.fin;
      ecran = el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-gros degrade", text: f.transformations === 7 ? "MONSTER POINT !!" : `${f.transformations}/7` }),
        el("p", { class: "jeu-score", text: `${nombre(f.score)} points` }),
        f.message ? el("p", { class: "note", text: f.message }) : null,
        messagesFin(f),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerRumble, text: "Rejouer" }),
      );
    } else {
      ecran = el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-regle", text: "Appuie quand l'aiguille passe dans la zone rose. 7 transformations de plus en plus dures : réussis-les toutes pour le MONSTER POINT." }),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerRumble, text: "Avaler la Rumble Ball" }),
        el("p", { class: "note", text: `${moi?.connecte && moiR?.meilleur ? `Ton meilleur score de la semaine : ${nombre(moiR.meilleur)} pts. ` : ""}${noteEclat(moiR, "5 transformations")}` }),
      );
    }
    vider(z,
      teteRumble(),
      rumbleScene(),
      el("div", { class: "rb-hud" }, el("span", { id: "rb-manche", text: rb.etat === "fin" ? "Partie finie" : "Prêt ?" }), el("b", { id: "rb-score", text: `${nombre(rb.score)} pts` })),
      ecran,
      s ? tableauJeu(s, (x) => `${nombre(x.score)} pts`) : null,
    );
    dessinerRumble();
  }
  function arcZone(debut, fin) {
    const p = (a) => { const r = ((a - 90) * Math.PI) / 180; return [100 + 84 * Math.cos(r), 100 + 84 * Math.sin(r)]; };
    const [x1, y1] = p(debut);
    const [x2, y2] = p(fin);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A 84 84 0 ${fin - debut > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  function dessinerRumble() {
    const z = $("rumble");
    const a = z?.querySelector(".rb-aiguille");
    const zone = z?.querySelector(".rb-zone");
    if (!a || !zone) return;
    a.setAttribute("transform", `rotate(${rb.angle % 360} 100 100)`);
    zone.setAttribute("d", rb.largeur ? arcZone(rb.zone - rb.largeur / 2, rb.zone + rb.largeur / 2) : "");
  }
  function mancheRumble() {
    const k = rb.manche;
    rb.vitesse = 0.72 * Math.pow(1.17, k); // tours par seconde
    rb.largeur = Math.max(22, 74 * Math.pow(0.82, k)); // degrés
    rb.angle = 0;
    rb.zone = 110 + Math.random() * 200;
    rb.t0 = performance.now();
    $("rb-manche").textContent = `Transformation ${k + 1}/7 · ${POINTS_RUMBLE[k]}`;
    dessinerRumble();
    cancelAnimationFrame(rb.boucle);
    const image = (t) => {
      if (rb.etat !== "jeu") return;
      const dt = (t - rb.t0) / 1000;
      rb.angle = 360 * rb.vitesse * dt;
      dessinerRumble();
      if (t - rb.t0 > 6500) { finirRumble("Trop tard ! Chopper s'est endormi…"); return; }
      rb.boucle = requestAnimationFrame(image);
    };
    rb.boucle = requestAnimationFrame(image);
  }
  async function lancerRumble() {
    rb.etat = "jeu"; rb.manche = 0; rb.score = 0; rb.fin = null; rb.partie = "";
    const z = $("rumble");
    pleinEcranJeu(z, true);
    jouerSon("cloche");
    musiqueJeu("rumble");
    vider(z,
      teteRumble(),
      rumbleScene(),
      el("div", { class: "rb-hud" }, el("span", { id: "rb-manche", text: "" }), el("b", { id: "rb-score", text: "0 pts" })),
      el("div", { class: "jeu-ecran" }, el("button", { class: "btn btn-plein rb-bouton", type: "button", onclick: appuyerRumble, text: "Appuie !" }), el("p", { class: "note", text: "Ou la barre espace, ou un tap sur le cadran." })),
    );
    z.querySelector(".rb-bouton").focus({ preventScroll: true });
    if (moi?.connecte) {
      const { d } = await demanderJeux("jeu-ouvrir", { jeu: "rumble" });
      if (d.partie) rb.partie = d.partie;
    }
    mancheRumble();
  }
  function appuyerRumble() {
    if (rb.etat !== "jeu" || performance.now() - rb.t0 < 150) return;
    const a = ((rb.angle % 360) + 360) % 360;
    const ecart = Math.abs((((a - rb.zone) % 360) + 540) % 360 - 180);
    if (ecart > rb.largeur / 2) { finirRumble("Raté ! Chopper n'a pas tenu le choc."); return; }
    const precision = 1 - ecart / (rb.largeur / 2);
    rb.score += Math.round(50 + 50 * precision);
    rb.manche++;
    $("rb-score").textContent = `${nombre(rb.score)} pts`;
    const ch = $("rb-chopper");
    ch.className = `rb-chopper forme-${rb.manche}`;
    const sfx = $("rb-sfx");
    sfx.textContent = precision > 0.8 ? "パーフェクト！" : SFX_RUMBLE[rb.manche % SFX_RUMBLE.length];
    sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat");
    const scene = $("rumble").querySelector(".rb-scene");
    scene.classList.remove("choc"); void scene.offsetWidth; scene.classList.add("choc");
    scene.style.setProperty("--niveau", String(rb.manche));
    jouerSon(rb.manche >= 7 ? "victoire" : "potion", { duree: rb.manche >= 7 ? 0 : 0.9 });
    if (rb.manche >= 7) {
      rb.score += 300;
      ch.className = "rb-chopper forme-8";
      sfx.textContent = "MONSTER POINT !!";
      $("rb-score").textContent = `${nombre(rb.score)} pts`;
      finirRumble("", 1400);
      return;
    }
    rb.etat = "pause";
    cancelAnimationFrame(rb.boucle);
    setTimeout(() => { if (rb.etat === "pause") { rb.etat = "jeu"; mancheRumble(); } }, 650);
  }
  async function finirRumble(message, delai = 900) {
    rb.etat = "envoi";
    cancelAnimationFrame(rb.boucle);
    const transformations = rb.manche;
    const score = rb.score;
    if (message) jouerSon("quiz-faux");
    jouerSon("cloche", { retard: message ? 0.5 : 0.9 });
    finMusiqueJeu(1.2);
    if (message) { const sfx = $("rb-sfx"); sfx.textContent = "ガーン"; sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat"); }
    let fin = { transformations, score, message };
    const attente = new Promise((ok) => setTimeout(ok, delai));
    if (rb.partie) {
      const { d } = await demanderJeux("rumble-fin", { partie: rb.partie, transformations, score });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
      else if (d.erreur) fin.message = [message, d.erreur].filter(Boolean).join(" ");
    } else if (!moi?.connecte) {
      fin.message = [message, "Connecte-toi avec Discord pour que ton score compte."].filter(Boolean).join(" ");
    }
    await attente;
    rb.etat = "fin";
    rb.fin = fin;
    rendreRumble();
    if (fin.record || fin.perso) setTimeout(charger, 1500);
  }
  window.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && rb.etat === "jeu" && !e.repeat) {
      const r = $("rumble")?.getBoundingClientRect();
      if (r && r.bottom > 0 && r.top < innerHeight) { e.preventDefault(); appuyerRumble(); }
    }
  });

  // --- le quiz One Piece : 3 niveaux, et 3 paliers qui montent dans chaque partie ---
  const NIVEAUX_QUIZ = [["facile", "Facile", "1 à 2 pts"], ["moyen", "Moyen", "1 à 3 pts"], ["difficile", "Difficile", "2 à 3 pts"]];
  const PALIERS = ["Échauffement", "Ça se corse", "Niveau Empereur"];
  const nomNiveau = (k) => NIVEAUX_QUIZ.find((x) => x[0] === k)?.[1] || "Moyen";
  let niveauSauve = "";
  try { niveauSauve = localStorage.getItem("barhaw-quiz-niveau") || ""; } catch {}
  const qz = { etat: "accueil", niveau: NIVEAUX_QUIZ.some((x) => x[0] === niveauSauve) ? niveauSauve : "moyen", partie: "", question: null, bonnes: 0, points: 0, palier: 0, fin: null, minuteur: 0, verrou: false, erreur: "" };
  const texteQuiz = (x) => `${x.score} pt${x.score > 1 ? "s" : ""} ·${x.bonnes ?? "?"}/10 · ${Math.round((x.temps || 0) / 1000)} s`;
  function teteQuiz() {
    return el("div", { class: "jeu-tete" }, el("h3", { text: "Le quiz One Piece" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🏴‍☠️" }), fermerJeu(fermerQuiz));
  }
  function fermerQuiz() {
    clearTimeout(qz.minuteur);
    finMusiqueJeu();
    if (qz.etat === "question" || qz.etat === "palier") qz.etat = "accueil";
    pleinEcranJeu($("quiz"), false);
    rendreQuiz();
  }
  function choixNiveau() {
    return el("div", { class: "qz-niveaux", role: "group", "aria-label": "Niveau du quiz" }, NIVEAUX_QUIZ.map(([k, nom, pts]) => el("button", {
      class: `qz-niveau niveau-${k}${qz.niveau === k ? " actif" : ""}`, type: "button", "aria-pressed": String(qz.niveau === k),
      onclick: () => { qz.niveau = k; try { localStorage.setItem("barhaw-quiz-niveau", k); } catch {} if (qz.etat === "fin") qz.etat = "accueil"; rendreQuiz(); },
    }, el("b", { text: nom }), el("small", { text: pts }))));
  }
  function rendreQuiz() {
    const z = $("quiz");
    if (!z || qz.etat === "question" || qz.etat === "palier") return;
    const s = infosJeux()?.quiz?.niveaux?.[qz.niveau];
    const moiQ = mesJeux?.quiz?.[qz.niveau];
    let ecran;
    if (!moi?.connecte) {
      ecran = el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-regle", text: "Choisis ton niveau : 10 questions en 3 paliers qui montent en difficulté, 15 secondes chacune. Les questions viennent du bot : connecte-toi avec Discord pour jouer." }),
        el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" }),
      );
    } else if (qz.etat === "fin" && qz.fin && jeuxVF()) {
      const f = qz.fin;
      ecran = finVF({
        semaine: s?.semaine, gros: `${f.bonnes}/10`, score: `${f.points} point${f.points > 1 ? "s" : ""} · ${Math.round(f.temps / 1000)} s · ${nomNiveau(f.niveau)}`,
        note: f.bonnes === 10 ? "Sans faute ! Un vrai nakama." : f.bonnes >= 7 ? "Bien joué, tu connais ton One Piece !" : f.bonnes >= 4 ? "Pas mal… Relis quelques tomes !" : "Aïe. Chopper va devoir te soigner.",
        f, rejouer: lancerQuiz, texteRejouer: `Rejouer en ${nomNiveau(qz.niveau).toLowerCase()}`,
      });
    } else if (qz.etat === "fin" && qz.fin) {
      const f = qz.fin;
      ecran = el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-gros degrade", text: `${f.bonnes}/10` }),
        el("p", { class: "jeu-score", text: `${f.points} point${f.points > 1 ? "s" : ""} · ${Math.round(f.temps / 1000)} s · ${nomNiveau(f.niveau)}` }),
        el("p", { class: "note", text: f.bonnes === 10 ? "Sans faute ! Un vrai nakama." : f.bonnes >= 7 ? "Bien joué, tu connais ton One Piece !" : f.bonnes >= 4 ? "Pas mal… Relis quelques tomes !" : "Aïe. Chopper va devoir te soigner." }),
        messagesFin(f),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerQuiz, text: `Rejouer en ${nomNiveau(qz.niveau).toLowerCase()}` }),
      );
    } else {
      const seuil = infosJeux()?.quiz?.niveaux?.[qz.niveau]?.eclat || 7;
      ecran = el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-regle", text: "10 questions en 3 paliers : Échauffement, Ça se corse, Niveau Empereur. Une question facile vaut 1 point, moyenne 2, difficile 3." }),
        qz.erreur ? el("p", { class: "note", text: qz.erreur }) : null,
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerQuiz, text: `Lancer le quiz · ${nomNiveau(qz.niveau)}` }),
        el("p", { class: "note", text: `${moiQ?.meilleur ? `Ton meilleur en ${nomNiveau(qz.niveau).toLowerCase()} cette semaine : ${moiQ.meilleur} pts. ` : ""}${noteEclat(moiQ, `${seuil} bonnes réponses`)}` }),
      );
    }
    vider(z, teteQuiz(), choixNiveau(),
      jeuxVF()
        ? el("div", { class: "qz-plateau qz-plateau-accueil", "aria-hidden": "true" }, el("div", { class: "qz-ecran" }, el("b", { class: "qz-ecran-titre", text: "QUIZ" }), el("small", { text: `Niveau ${nomNiveau(qz.niveau).toLowerCase()}` })))
        : el("div", { class: "qz-affiche", "aria-hidden": "true" }, el("span", { class: "qz-wanted", text: "WANTED" }), el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 480, height: 480 }), el("span", { class: "qz-prime", text: "50 ฿" })),
      ecran,
      infosJeux()?.quiz ? tableauJeu(s, texteQuiz, `Classement · ${nomNiveau(qz.niveau)}`) : null,
    );
  }
  async function lancerQuiz() {
    if (qz.verrou) return;
    qz.verrou = true;
    qz.erreur = "";
    const { d } = await demanderJeux("jeu-ouvrir", { jeu: "quiz", niveau: qz.niveau });
    qz.verrou = false;
    if (!d.ok || !d.question) { qz.etat = "accueil"; qz.erreur = d.texte || d.erreur || "Le quiz n'a pas pu démarrer, réessaie."; rendreQuiz(); return; }
    qz.partie = d.partie; qz.bonnes = 0; qz.points = 0; qz.palier = 0; qz.fin = null;
    if (d.niveau) qz.niveau = d.niveau;
    pleinEcranJeu($("quiz"), true);
    musiqueJeu("quiz");
    poserQuestion(d.question);
  }
  // un nouveau palier : une case manga avant la question
  function poserQuestion(q) {
    const z = $("quiz");
    if (q.palier && q.palier !== qz.palier) {
      qz.palier = q.palier;
      qz.etat = "palier";
      jouerSon("souffle");
      vider(z, teteQuiz(), el("div", { class: `qz-banniere palier-${q.palier}` },
        el("span", { class: "concentration", "aria-hidden": "true" }),
        el("span", { class: "qz-banniere-num", text: `Palier ${q.palier}` }),
        el("b", { text: PALIERS[q.palier - 1] || "" }),
        el("span", { class: "sfx eclat qz-banniere-sfx", "aria-hidden": "true", text: q.palier === 3 ? "ゴゴゴ" : q.palier === 2 ? "ドン！" : "スタート！" }),
      ));
      setTimeout(() => { if (qz.etat === "palier") poserQuestion(q); }, reduit.matches ? 300 : 1100);
      return;
    }
    qz.etat = "question";
    qz.question = q;
    const barre = el("i", {});
    const boutons = q.choix.map((c, k) => el("button", { class: "qz-choix", type: "button", onclick: () => repondreQuiz(k), text: c }));
    // en VF : la question s'affiche sur le grand écran du plateau télé, et ses 15 ampoules s'éteignent une par seconde
    const question = jeuxVF()
      ? el("div", { class: "qz-plateau" },
        el("div", { class: "qz-ecran" },
          el("div", { class: "qz-ampoules", "aria-hidden": "true" }, Array.from({ length: 15 }, (_, i) => el("i", { style: `--i: ${i}` }))),
          el("p", { class: "qz-question", text: q.q }),
        ),
        el("span", { class: "sfx qz-sfx", "aria-hidden": "true" }),
      )
      : [el("div", { class: "qz-temps", "aria-hidden": "true" }, barre), el("p", { class: "qz-question", text: q.q })];
    vider(z, teteQuiz(),
      el("div", { class: "qz-haut" }, el("span", { text: `${nomNiveau(qz.niveau)} · Question ${q.numero}/10` }), el("b", { text: `${qz.points} pts` })),
      el("div", { class: "qz-infos" },
        el("span", { class: `qz-pastille palier-${q.palier || 1}`, text: `Palier ${q.palier || 1} · ${PALIERS[(q.palier || 1) - 1]}` }),
        el("span", { class: `qz-pastille dif-${q.difficulte || "moyen"}`, text: `+${q.valeur || 1} pt${(q.valeur || 1) > 1 ? "s" : ""}` }),
      ),
      question,
      el("div", { class: "qz-choix-liste" }, boutons),
    );
    barre.style.animationDuration = "15s";
    clearTimeout(qz.minuteur);
    qz.minuteur = setTimeout(() => repondreQuiz(null), 15_000);
  }
  async function repondreQuiz(k) {
    if (qz.etat !== "question" || qz.verrou) return;
    qz.verrou = true;
    clearTimeout(qz.minuteur);
    const z = $("quiz");
    const boutons = [...z.querySelectorAll(".qz-choix")];
    boutons.forEach((b) => { b.disabled = true; });
    if (k !== null) { boutons[k]?.classList.add("choisi"); jouerSon("clic"); }
    z.querySelector(".qz-temps i")?.classList.add("arret");
    z.querySelector(".qz-ampoules")?.classList.add("arret");
    const { d } = await demanderJeux("quiz-repondre", { partie: qz.partie, choix: k });
    qz.verrou = false;
    if (!d.ok) { qz.etat = "accueil"; qz.erreur = d.erreur || "Le quiz s'est arrêté, relance-le."; rendreQuiz(); return; }
    boutons[d.bonne]?.classList.add("bonne");
    if (k !== null && !d.juste) boutons[k]?.classList.add("fausse");
    jouerSon(d.juste ? "quiz-bon" : "quiz-faux");
    if (d.fin) { finMusiqueJeu(1.2); if (d.bonnes >= 7) jouerSon("victoire", { retard: 0.9 }); }
    qz.bonnes = d.bonnes;
    qz.points = d.points ?? qz.points;
    const pts = z.querySelector(".qz-haut b");
    if (pts) pts.textContent = `${qz.points} pts`;
    z.append(el("p", { class: `qz-verdict ${d.juste ? "juste" : "faux"}`, text: d.juste ? `Bonne réponse ! +${qz.question?.valeur || 1}` : d.tropTard || k === null ? "Trop tard !" : "Raté !" }));
    const plateau = z.querySelector(".qz-plateau");
    if (plateau) {
      plateau.classList.add(d.juste ? "juste" : "faux");
      const sfx = plateau.querySelector(".qz-sfx");
      if (sfx) { sfx.textContent = d.juste ? "正解！" : "ブブー"; sfx.classList.add("eclat"); }
    }
    setTimeout(() => {
      if (qz.etat === "accueil") return; // le jeu a été refermé entre-temps
      if (d.fin) {
        qz.etat = "fin";
        qz.fin = { bonnes: d.bonnes, points: d.points, temps: d.temps, niveau: d.niveau || qz.niveau, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
        rendreQuiz();
        if (d.record || d.perso) setTimeout(charger, 1500);
      } else poserQuestion(d.question);
    }, d.juste ? 900 : 1500);
  }

  // --- Docteur Chopper : soigner un maximum de patients en 45 s ---
  const REMEDES = [
    { id: "pansement", e: "🩹", nom: "Pansement" },
    { id: "glace", e: "🧊", nom: "Glace" },
    { id: "sieste", e: "😴", nom: "Sieste" },
    { id: "viande", e: "🍖", nom: "Viande" },
    { id: "tisane", e: "🍵", nom: "Tisane" },
    { id: "calin", e: "🤗", nom: "Câlin" },
    { id: "creme", e: "🧴", nom: "Crème" },
    { id: "bonbon", e: "🍭", nom: "Barbe à papa" },
  ];
  const SYMPTOMES = [
    ["S'est coupé en épluchant des légumes", "pansement"], ["S'est égratigné le genou au bowling", "pansement"], ["A été griffé par un chat", "pansement"], ["S'est coupé avec un sabre de Zoro", "pansement"],
    ["A une énorme bosse sur la tête", "glace"], ["A pris un poing de l'amour de Garp", "glace"], ["S'est tordu la cheville en dansant", "glace"], ["A la joue toute gonflée", "glace"],
    ["A streamé 12 heures d'affilée", "sieste"], ["Bâille toutes les deux secondes", "sieste"], ["A joué en ranked jusqu'à 5 h du matin", "sieste"], ["Dort debout comme Zoro", "sieste"],
    ["A faim comme Luffy", "viande"], ["Son ventre gargouille très fort", "viande"], ["N'a rien mangé depuis trois jours", "viande"], ["Réclame un festin de pirate", "viande"],
    ["A mal à la gorge à force de crier en live", "tisane"], ["Tousse sans arrêt", "tisane"], ["A attrapé froid sur l'île de Drum", "tisane"], ["A la voix cassée", "tisane"],
    ["A perdu sa ranked", "calin"], ["Pleure comme Chopper", "calin"], ["Son équipe l'a abandonné", "calin"], ["Se sent tout seul", "calin"],
    ["A pris un coup de soleil à Alabasta", "creme"], ["Est rouge comme une écrevisse", "creme"], ["A la peau qui pèle", "creme"], ["S'est endormi au soleil sur le pont du Sunny", "creme"],
    ["Boude et veut une récompense", "bonbon"], ["A besoin de sucre tout de suite", "bonbon"], ["Fait une crise de gourmandise", "bonbon"], ["Veut un goûter comme Chopper", "bonbon"],
  ];
  const dc = { etat: "accueil", fin: null, partie: "", fin_t: 0, score: 0, soignes: 0, combo: 0, patient: null, boucle: 0, bloque: 0, dernier: -1 };
  const teteDocteur = () => el("div", { class: "jeu-tete" }, el("h3", { text: "Docteur Chopper" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🩺" }), fermerJeu(fermerDocteur));
  function fermerDocteur() {
    if (dc.etat === "jeu") { cancelAnimationFrame(dc.boucle); dc.etat = "accueil"; }
    finMusiqueJeu();
    pleinEcranJeu($("docteur"), false);
    rendreDocteur();
  }
  const texteDocteur = (x) => `${x.soignes ?? "?"} patient${x.soignes > 1 ? "s" : ""} · ${nombre(x.score)} pts`;
  function rendreDocteur() {
    const z = $("docteur");
    if (!z || dc.etat === "jeu" || dc.etat === "envoi") return;
    const moiD = mesJeux?.docteur;
    const ecran = dc.etat === "fin" && dc.fin && jeuxVF()
      ? finVF({ semaine: infosJeux()?.docteur?.semaine, gros: `${dc.fin.soignes} patient${dc.fin.soignes > 1 ? "s" : ""} soigné${dc.fin.soignes > 1 ? "s" : ""}`, score: `${nombre(dc.fin.score)} points`, f: dc.fin, rejouer: lancerDocteur, texteRejouer: "Rouvrir le cabinet" })
      : dc.etat === "fin" && dc.fin
      ? el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-gros degrade", text: `${dc.fin.soignes} patient${dc.fin.soignes > 1 ? "s" : ""}` }),
        el("p", { class: "jeu-score", text: `${nombre(dc.fin.score)} points` }),
        dc.fin.message ? el("p", { class: "note", text: dc.fin.message }) : null,
        messagesFin(dc.fin),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerDocteur, text: "Rouvrir le cabinet" }),
      )
      : el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-regle", text: "45 secondes pour soigner un max de patients : lis le symptôme et donne le bon remède. Les bonnes réponses d'affilée font monter le combo ; un mauvais remède bloque Chopper un instant." }),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerDocteur, text: "Ouvrir le cabinet" }),
        el("p", { class: "note", text: `${moiD?.meilleur ? `Ton meilleur score de la semaine : ${nombre(moiD.meilleur)} pts. ` : ""}${noteEclat(moiD, `${infosJeux()?.docteur?.eclat || 400} points`)}` }),
      );
    vider(z, teteDocteur(),
      el("div", { class: "dc-attente", "aria-hidden": "true" },
        el("div", { class: "dc-docteur" }, el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 480, height: 480 }), el("span", { text: "🩺" })),
        el("div", { class: "dc-file" }, melanger([...MEMES]).slice(0, 3).map((m) => el("img", { src: m.src, alt: "", loading: "lazy" }))),
      ),
      ecran,
      infosJeux()?.docteur ? tableauJeu(infosJeux().docteur, texteDocteur) : null,
    );
  }
  function nouveauPatient() {
    let k;
    do { k = Math.floor(Math.random() * SYMPTOMES.length); } while (k === dc.dernier && SYMPTOMES.length > 1);
    dc.dernier = k;
    const m = MEMES[Math.floor(Math.random() * MEMES.length)];
    dc.patient = { symptome: SYMPTOMES[k][0], remede: SYMPTOMES[k][1], img: m };
    const p = $("dc-patient");
    if (!p) return;
    vider(p,
      el("img", { src: m.src, alt: "", width: m.l, height: m.h }),
      el("p", { class: "dc-symptome", text: dc.patient.symptome }),
    );
    p.classList.remove("arrive"); void p.offsetWidth; p.classList.add("arrive");
  }
  async function lancerDocteur() {
    dc.etat = "jeu"; dc.score = 0; dc.soignes = 0; dc.combo = 0; dc.fin = null; dc.partie = ""; dc.bloque = 0;
    const z = $("docteur");
    pleinEcranJeu(z, true);
    jouerSon("souffle");
    musiqueJeu("docteur");
    const barre = el("i", {});
    vider(z, teteDocteur(),
      el("div", { class: "dc-hud" }, el("span", { id: "dc-temps", text: "45 s" }), el("span", { id: "dc-combo", text: "" }), el("b", { id: "dc-score", text: "0 pts" })),
      el("div", { class: "qz-temps dc-chrono", "aria-hidden": "true" }, barre),
      el("div", { class: "dc-scene" },
        el("div", { class: "dc-patient", id: "dc-patient" }),
        el("span", { class: "sfx dc-sfx", id: "dc-sfx", "aria-hidden": "true" }),
      ),
      el("div", { class: "dc-remedes", id: "dc-remedes" }, REMEDES.map((x, k) => el("button", { class: "dc-remede", type: "button", "data-remede": x.id, onclick: () => soigner(x.id), title: `Touche ${k + 1}` }, jeuxVF() ? el("img", { class: "dc-remede-img", src: `/img/jeux/remede-${x.id}.webp`, alt: "", width: 64, height: 64, decoding: "async" }) : el("span", { class: "dc-emoji", "aria-hidden": "true", text: x.e }), el("span", { text: x.nom })))),
    );
    nouveauPatient();
    if (moi?.connecte) {
      const { d } = await demanderJeux("jeu-ouvrir", { jeu: "docteur" });
      if (d.partie) dc.partie = d.partie;
    }
    dc.fin_t = performance.now() + 45_000;
    cancelAnimationFrame(dc.boucle);
    const image = (t) => {
      if (dc.etat !== "jeu") return;
      const reste = Math.max(0, dc.fin_t - t);
      barre.style.transform = `scaleX(${reste / 45_000})`;
      $("dc-temps").textContent = `${Math.ceil(reste / 1000)} s`;
      $("dc-remedes")?.classList.toggle("bloque", t < dc.bloque);
      if (reste <= 0) { finirDocteur(); return; }
      dc.boucle = requestAnimationFrame(image);
    };
    dc.boucle = requestAnimationFrame(image);
  }
  function soigner(id) {
    if (dc.etat !== "jeu" || !dc.patient || performance.now() < dc.bloque) return;
    const sfx = $("dc-sfx");
    const scene = $("docteur").querySelector(".dc-scene");
    if (id === dc.patient.remede) {
      dc.score += 10 + Math.min(dc.combo, 10);
      dc.soignes++;
      dc.combo++;
      sfx.textContent = dc.combo >= 10 ? "神ドクター！" : ["治った！", "ピカーン", "スッキリ"][dc.soignes % 3];
      jouerSon(dc.combo === 10 ? "victoire" : "soin", { duree: dc.combo === 10 ? 0 : 0.8 });
      scene.classList.remove("rate");
      nouveauPatient();
    } else {
      dc.combo = 0;
      dc.bloque = performance.now() + 1200;
      sfx.textContent = "ガーン";
      jouerSon("quiz-faux");
      scene.classList.remove("rate"); void scene.offsetWidth; scene.classList.add("rate");
      $("docteur").querySelector(`[data-remede="${id}"]`)?.classList.add("faux");
      setTimeout(() => $("docteur")?.querySelector(`[data-remede="${id}"]`)?.classList.remove("faux"), 1200);
    }
    sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat");
    $("dc-score").textContent = `${nombre(dc.score)} pts`;
    $("dc-combo").textContent = dc.combo >= 2 ? `Combo ×${dc.combo}` : "";
  }
  async function finirDocteur() {
    dc.etat = "envoi";
    cancelAnimationFrame(dc.boucle);
    finMusiqueJeu(1.2);
    let fin = { soignes: dc.soignes, score: dc.score, message: "" };
    if (dc.partie) {
      const { d } = await demanderJeux("docteur-fin", { partie: dc.partie, soignes: dc.soignes, score: dc.score });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ton score compte.";
    if (dc.etat !== "envoi") return; // refermé entre-temps
    dc.etat = "fin";
    dc.fin = fin;
    rendreDocteur();
    if (fin.record || fin.perso) setTimeout(charger, 1500);
  }
  window.addEventListener("keydown", (e) => {
    if (dc.etat !== "jeu" || !/^[1-8]$/.test(e.key)) return;
    const r = $("docteur")?.getBoundingClientRect();
    if (r && r.bottom > 0 && r.top < innerHeight) { e.preventDefault(); soigner(REMEDES[Number(e.key) - 1].id); }
  });

  // --- le Memory des mèmes : 8 paires à retrouver ---
  const mm = { etat: "accueil", cartes: [], retournees: [], trouvees: new Set(), coups: 0, t0: 0, partie: "", verrou: false, fin: null, minuteur: 0 };
  const teteMemory = () => el("div", { class: "jeu-tete" }, el("h3", { text: "Le Memory des mèmes" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🧠" }), fermerJeu(fermerMemory));
  function fermerMemory() {
    clearInterval(mm.minuteur);
    finMusiqueJeu();
    if (mm.etat === "jeu") mm.etat = "accueil";
    pleinEcranJeu($("memory"), false);
    rendreMemory();
  }
  const texteMemory = (x) => `${nombre(x.score)} pts · ${x.coups ?? "?"} coups`;
  const scoreMemoryLocal = (coups, ms) => Math.max(50, Math.round(1000 - 25 * (coups - 8) - (4 * ms) / 1000));
  function rendreMemory() {
    const z = $("memory");
    if (!z || mm.etat === "jeu" || mm.etat === "envoi") return;
    const moiM = mesJeux?.memory;
    const ecran = mm.etat === "fin" && mm.fin && jeuxVF()
      ? finVF({ semaine: infosJeux()?.memory?.semaine, gros: `${nombre(mm.fin.score)} pts`, score: `${mm.fin.coups} coups · ${Math.round(mm.fin.temps / 1000)} s`, f: mm.fin, rejouer: lancerMemory, texteRejouer: "Redistribuer les cartes" })
      : mm.etat === "fin" && mm.fin
      ? el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-gros degrade", text: `${nombre(mm.fin.score)} pts` }),
        el("p", { class: "jeu-score", text: `${mm.fin.coups} coups · ${Math.round(mm.fin.temps / 1000)} s` }),
        mm.fin.message ? el("p", { class: "note", text: mm.fin.message }) : null,
        messagesFin(mm.fin),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerMemory, text: "Rejouer" }),
      )
      : el("div", { class: "jeu-ecran" },
        el("p", { class: "jeu-regle", text: "16 cartes, 8 paires de mèmes de la commu. Retourne-les deux par deux et retrouve toutes les paires avec le moins de coups possible, le plus vite possible." }),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerMemory, text: "Distribuer les cartes" }),
        el("p", { class: "note", text: `${moiM?.meilleur ? `Ton meilleur score de la semaine : ${nombre(moiM.meilleur)} pts. ` : ""}${noteEclat(moiM, `${infosJeux()?.memory?.eclat || 650} points`)}` }),
      );
    vider(z, teteMemory(),
      jeuxVF()
        ? el("div", { class: "mm-table mm-table-accueil", "aria-hidden": "true" }, el("div", { class: "mm-apercu" }, [0, 1, 2, 3].map(() => dosCarte())))
        : el("div", { class: "mm-apercu", "aria-hidden": "true" }, [0, 1, 2, 3].map(() => dosCarte())),
      ecran,
      infosJeux()?.memory ? tableauJeu(infosJeux().memory, texteMemory) : null,
    );
  }
  async function lancerMemory() {
    const ids = melanger(["chopper", "liliano", ...MEMES.map((m) => m.id)]).slice(0, 8);
    mm.cartes = melanger([...ids, ...ids]);
    mm.retournees = []; mm.trouvees = new Set(); mm.coups = 0; mm.verrou = false; mm.fin = null; mm.partie = "";
    mm.etat = "jeu";
    const z = $("memory");
    pleinEcranJeu(z, true);
    musiqueJeu("memory");
    const grille = el("div", { class: "mm-grille" }, mm.cartes.map((id, k) => {
        const img = imageCarte(id);
        const b = el("button", { class: "mm-carte", type: "button", "aria-label": `Carte ${k + 1}`, onclick: () => retournerMemory(k, b) },
          el("span", { class: "mm-interieur" },
            tranche("g"),
            dosCarte(),
            el("span", { class: "mm-face" }, img ? el("img", { src: img.src, alt: "", loading: "eager", decoding: "async" }) : null),
            tranche("d"),
          ),
        );
        return b;
      }));
    // en VF : les cartes sont posées sur la table de jeu (décor Blender), un peu penchée
    vider(z, teteMemory(),
      el("div", { class: "dc-hud" }, el("span", { id: "mm-coups", text: "0 coup" }), el("span", { id: "mm-paires", text: "0/8 paires" }), el("b", { id: "mm-temps", text: "0 s" })),
      jeuxVF() ? el("div", { class: "mm-table" }, grille) : grille,
    );
    mm.t0 = performance.now();
    clearInterval(mm.minuteur);
    mm.minuteur = setInterval(() => { const t = $("mm-temps"); if (t && mm.etat === "jeu") t.textContent = `${Math.floor((performance.now() - mm.t0) / 1000)} s`; }, 250);
    if (moi?.connecte) {
      const { d } = await demanderJeux("jeu-ouvrir", { jeu: "memory" });
      if (d.partie) mm.partie = d.partie;
    }
  }
  function retournerMemory(k, b) {
    if (mm.etat !== "jeu" || mm.verrou || mm.trouvees.has(k) || mm.retournees.includes(k)) return;
    b.classList.add("retournee");
    jouerSon("carte", { volume: 0.8 + Math.random() * 0.3 });
    mm.retournees.push(k);
    if (mm.retournees.length < 2) return;
    mm.coups++;
    $("mm-coups").textContent = `${mm.coups} coup${mm.coups > 1 ? "s" : ""}`;
    const [a, c] = mm.retournees;
    const boutons = $("memory").querySelectorAll(".mm-carte");
    if (mm.cartes[a] === mm.cartes[c]) {
      mm.trouvees.add(a); mm.trouvees.add(c);
      jouerSon("paire", { retard: 0.15 });
      boutons[a].classList.add("trouvee"); boutons[c].classList.add("trouvee");
      mm.retournees = [];
      $("mm-paires").textContent = `${mm.trouvees.size / 2}/8 paires`;
      if (mm.trouvees.size === mm.cartes.length) finirMemory();
      return;
    }
    mm.verrou = true;
    setTimeout(() => {
      boutons[a].classList.remove("retournee"); boutons[c].classList.remove("retournee");
      mm.retournees = [];
      mm.verrou = false;
    }, 800);
  }
  async function finirMemory() {
    mm.etat = "envoi";
    clearInterval(mm.minuteur);
    finMusiqueJeu(1.2);
    jouerSon("victoire", { retard: 0.5 });
    const temps = performance.now() - mm.t0;
    let fin = { coups: mm.coups, temps, score: scoreMemoryLocal(mm.coups, temps), message: "" };
    const attente = new Promise((ok) => setTimeout(ok, 900));
    if (mm.partie) {
      const { d } = await demanderJeux("memory-fin", { partie: mm.partie, coups: mm.coups });
      if (d.ok) fin = { ...fin, score: d.score, temps: d.temps, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ton score compte.";
    await attente;
    if (mm.etat !== "envoi") return; // refermé entre-temps
    mm.etat = "fin";
    mm.fin = fin;
    rendreMemory();
    if (fin.record || fin.perso) setTimeout(charger, 1500);
  }

  // --- la course de Chopper : il court sur le pont du navire, on saute, et au premier choc c'est fini ---
  // Le monde fait 640 × 280 (unités du jeu), 1 mètre = 32 unités. La vitesse suit les règles du bot :
  // 9 m/s au départ, +0,2 m/s chaque seconde, 23 m/s au plus. Le bot vérifie que la distance est possible.
  const CO = { L: 640, H: 280, SOL: 228, M: 32, R: 21, X: 96, G: 2300, SAUT: 780, COUPE: 0.55, TAMPON: 0.12, V0: 9, ACC: 0.2, VMAX: 23 };
  const OBSTACLES = {
    tonneau: { w: 30, h: 34, des: 0, poids: 5 },
    double: { w: 64, h: 34, des: 80, poids: 2.5 },
    mouette: { w: 34, h: 18, des: 120, poids: 2, vitesse: 50 },
    caisse: { w: 38, h: 60, des: 160, poids: 2 },
    boulet: { r: 12, haut: 66, des: 220, poids: 1.8, vitesse: 150 },
  };
  const CAUSES = { tonneau: "Un tonneau en pleine tête.", double: "Deux tonneaux, c'était un de trop.", caisse: "La caisse ne s'est pas poussée.", mouette: "Percuté par une mouette. La honte.", boulet: "Un boulet de canon. Fallait rester au sol !" };
  // le moteur, sans dessin (il sert aussi à régler la difficulté hors du site)
  function moteurCourse({ hasard = Math.random, v0 = CO.V0, acc = CO.ACC, vMax = CO.VMAX } = {}) {
    const m = { t: 0, dist: 0, v: v0, y: 0, vy: 0, sol: true, tenu: false, coupe: true, tampon: 0, obstacles: [], prochain: 1.5, sauts: 0, choc: null, atterri: 0, palier: 0 };
    const metres = () => Math.floor(m.dist / CO.M);
    function choisir() {
      const d = metres();
      const liste = Object.entries(OBSTACLES).filter(([, o]) => d >= o.des);
      let x = hasard() * liste.reduce((s, [, o]) => s + o.poids, 0);
      for (const [k, o] of liste) { x -= o.poids; if (x < 0) return k; }
      return "tonneau";
    }
    function apparaitre() {
      const type = choisir();
      const o = OBSTACLES[type];
      const ob = { type, x: CO.L + 40, w: o.w || o.r * 2, h: o.h || o.r * 2, y: 0, phase: hasard() * 6.28, vitesse: o.vitesse || 0 };
      // la mouette vole bas (il faut sauter) ; passé 300 m, une sur trois vole haut (il faut rester au sol)
      if (type === "mouette") ob.y = metres() >= 300 && hasard() < 0.35 ? 54 + hasard() * 8 : 10 + hasard() * 16;
      if (type === "boulet") { ob.y = o.haut - o.r; ob.x = CO.L + 220; }
      m.obstacles.push(ob);
      // l'écart avant le suivant : jamais moins que le temps d'un saut, et de plus en plus serré
      const ecart = Math.max(0.7, 1.3 - 0.007 * m.t) + hasard() * Math.max(0.22, 1.4 - 0.018 * m.t);
      m.prochain = ecart + (type === "boulet" || type === "caisse" ? 0.3 : 0);
    }
    function appuyer(oui) {
      if (oui) {
        m.tenu = true;
        if (m.sol) sauter(); else m.tampon = CO.TAMPON;
      } else {
        m.tenu = false;
        if (!m.sol && m.vy > 0 && !m.coupe) { m.vy *= CO.COUPE; m.coupe = true; }
      }
    }
    function sauter() { m.vy = CO.SAUT; m.sol = false; m.coupe = false; m.tampon = 0; m.sauts++; }
    // le cercle de Chopper (un peu plus petit que l'image, pour pardonner les frôlements) contre une boîte
    function touche(ob) {
      const cx = CO.X;
      const cy = m.y + CO.R;
      const r = CO.R * 0.76;
      if (ob.type === "boulet") return Math.hypot(ob.x + ob.w / 2 - cx, ob.y + ob.h / 2 - cy) < r + ob.w / 2 * 0.85;
      const marge = ob.type === "mouette" ? 4 : 2;
      const x0 = ob.x + marge, x1 = ob.x + ob.w - marge, y0 = ob.y + marge, y1 = ob.y + ob.h - marge;
      const px = Math.max(x0, Math.min(cx, x1));
      const py = Math.max(y0, Math.min(cy, y1));
      return Math.hypot(px - cx, py - cy) < r;
    }
    function avancer(dt) {
      if (m.choc) return;
      m.t += dt;
      m.v = Math.min(vMax, v0 + acc * m.t);
      const vx = m.v * CO.M;
      m.dist += vx * dt;
      if (!m.sol) {
        m.vy -= CO.G * dt;
        m.y += m.vy * dt;
        if (m.tampon > 0) m.tampon -= dt;
        if (m.y <= 0) {
          m.y = 0; m.vy = 0; m.sol = true; m.atterri = m.t;
          if (m.tampon > 0 && m.tenu) sauter();
        }
      }
      for (const ob of m.obstacles) {
        ob.x -= (vx + ob.vitesse) * dt;
        if (ob.type === "mouette") ob.phase += dt * 9;
      }
      m.obstacles = m.obstacles.filter((ob) => ob.x + ob.w > -40);
      m.prochain -= dt;
      if (m.prochain <= 0) apparaitre();
      for (const ob of m.obstacles) if (touche(ob)) { m.choc = ob; break; }
      const p = Math.floor(metres() / 100);
      if (p > m.palier) { m.palier = p; return "palier"; }
      return null;
    }
    return { m, metres, appuyer, avancer };
  }

  const co = { etat: "accueil", partie: "", fin: null, boucle: 0, moteur: null, dernier: 0, secousse: 0, particules: [], pause: false, decor: 0, record: 0 };
  try { co.record = Number(localStorage.getItem("barhaw-course")) || 0; } catch {}
  const photoCourse = new Image();
  photoCourse.src = "/img/chopper-visage.jpg";
  photoCourse.addEventListener("load", () => { if (co.etat !== "jeu") dessinerCourse(co.moteur?.m || null); });

  // ---------- la course en 3D ----------
  // Le rendu 3D (js/course-3d.js et three.js, ~170 ko) n'est chargé qu'à l'approche des jeux, et seulement si l'appareil
  // sait faire de la 3D (WebGL 2) et n'a pas demandé d'économiser les données. Il ne fait que dessiner : le moteur reste
  // celui d'ici. Sans lui (ou s'il est trop lent sur l'appareil, ou si ?3d=non est dans l'adresse), la course reste en 2D.
  const choix3D = new URLSearchParams(location.search).get("3d"); // « non » pour la 2D, « oui » pour garder la 3D même lente
  const trois = { etat: "", rendu: null, toile: null, images: 0, tempsImages: 0 };
  const course3D = () => trois.etat === "pret";
  async function chargerCourse3D() {
    if (trois.etat || choix3D === "non" || navigator.connection?.saveData) return;
    trois.etat = "charge";
    try {
      // une carte graphique, sinon rien : sans elle (rendu logiciel), la 3D serait trop lente et on ne télécharge même pas three.js
      const essai = document.createElement("canvas").getContext("webgl2");
      if (!essai) throw new Error("pas de WebGL 2");
      const info = essai.getExtension("WEBGL_debug_renderer_info");
      const logiciel = info && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(essai.getParameter(info.UNMASKED_RENDERER_WEBGL)));
      essai.getExtension("WEBGL_lose_context")?.loseContext();
      if (logiciel && choix3D !== "oui") throw new Error("rendu logiciel");
      const { creerCourse3D } = await import("/js/course-3d.js");
      const toile = el("canvas", { class: "co-3d", "aria-hidden": "true" });
      trois.rendu = creerCourse3D(toile, { CO, photo: photoCourse, vf: jeuxVF, iles: ["phare", "cristal", "archipel", "forteresse", "champignons", "tonnerre"].map((n) => `/img/jeux/course-ile-${n}.webp`) });
      trois.toile = toile;
      // un essai de quelques images, hors de la page : si l'appareil peine, on garde la 2D
      if (choix3D !== "oui" && trois.rendu.tropLent()) { trois.rendu.detruire(); trois.rendu = null; throw new Error("trop lent"); }
      toile.addEventListener("webglcontextlost", (e) => { e.preventDefault(); passerEn2D(); });
      trois.etat = "pret";
      if (choix3D) window.__course3D = trois; // pour les essais (?3d=oui)
      brancherCourse3D();
      if (co.etat !== "jeu") dessinerCourse(co.moteur?.m || null);
    } catch {
      trois.etat = "non";
    }
  }
  // le canvas 3D est toujours le même (une seule 3D pour toute la visite) : on le remet dans la scène quand elle est redessinée
  function brancherCourse3D() {
    const scene = $("co-scene");
    if (!course3D() || !scene) return;
    if (trois.toile.parentElement !== scene) scene.prepend(trois.toile);
    scene.classList.add("en-3d");
    trois.rendu.taille(scene.getBoundingClientRect().width || CO.L);
  }
  // la 3D se charge quand on approche des jeux (un écran avant d'y arriver)
  if ($("jeux") && "IntersectionObserver" in window) {
    const approche = new IntersectionObserver((entrees) => {
      if (!entrees.some((e) => e.isIntersecting)) return;
      approche.disconnect();
      chargerCourse3D();
    }, { rootMargin: "900px 0px" });
    approche.observe($("jeux"));
  }
  function passerEn2D() {
    if (!trois.rendu) return;
    trois.etat = "non";
    trois.toile.remove();
    try { trois.rendu.detruire(); } catch {}
    trois.rendu = null;
    $("co-scene")?.classList.remove("en-3d");
    dessinerCourse(co.moteur?.m || null);
  }
  const teteCourse = () => el("div", { class: "jeu-tete" }, el("h3", { text: "La course de Chopper" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🏃" }), fermerJeu(fermerCourse));
  // les pistes de la VF 1.0 (en 3D) : elles changent tous les 250 m
  const NOMS_PISTES = ["Coucher de soleil", "Nuit étoilée", "Tempête", "Aurore"];
  function fermerCourse() {
    if (co.etat === "jeu" || co.etat === "pret") { cancelAnimationFrame(co.boucle); co.etat = "accueil"; }
    finMusiqueJeu();
    pleinEcranJeu($("course"), false);
    rendreCourse();
  }
  const texteCourse = (x) => `${nombre(x.score)} m`;
  const reglesCourse = () => {
    const c = infosJeux()?.course;
    return { v0: Number(c?.v0) || CO.V0, acc: Number(c?.acceleration) || CO.ACC, vMax: Number(c?.vMax) || CO.VMAX };
  };

  function rendreCourse() {
    const z = $("course");
    if (!z || co.etat === "jeu" || co.etat === "choc" || co.etat === "envoi" || co.etat === "pret") return;
    const moiC = mesJeux?.course;
    const meilleur = Math.max(moiC?.meilleur || 0, co.record);
    const ecran = co.etat === "fin" && co.fin && jeuxVF()
      ? finVF({ semaine: infosJeux()?.course?.semaine, gros: `${nombre(co.fin.distance)} m`, score: CAUSES[co.fin.cause] || "Bonk !", f: co.fin, rejouer: lancerCourse, texteRejouer: "Recourir" })
      : co.etat === "fin" && co.fin
      ? el("div", { class: "jeu-ecran co-ecran" },
        el("p", { class: "jeu-gros degrade", text: `${nombre(co.fin.distance)} m` }),
        el("p", { class: "jeu-score", text: CAUSES[co.fin.cause] || "Bonk !" }),
        co.fin.message ? el("p", { class: "note", text: co.fin.message }) : null,
        messagesFin(co.fin),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerCourse, text: "Recourir" }),
      )
      : el("div", { class: "jeu-ecran co-ecran" },
        el("p", { class: "jeu-regle", text: "Chopper court tout seul, de plus en plus vite. Saute par-dessus les tonneaux, les caisses et les mouettes : clic, toucher ou Espace, et reste appuyé pour sauter plus haut. Les boulets de canon volent haut : reste au sol et ils passent au-dessus. Un seul choc et c'est fini." }),
        el("button", { class: "btn btn-plein", type: "button", onclick: lancerCourse, text: "Courir !" }),
        el("p", { class: "note", text: `${meilleur ? `Ton meilleur : ${nombre(meilleur)} m. ` : ""}${noteEclat(moiC, `${infosJeux()?.course?.eclat || 600} m`)}` }),
      );
    const canvas = el("canvas", { class: "co-canvas", id: "co-canvas", role: "img", "aria-label": "La course de Chopper : Chopper court sur le pont d'un navire et saute par-dessus les obstacles" });
    canvas.addEventListener("click", () => { if (co.etat === "accueil" || co.etat === "fin") lancerCourse(); });
    vider(z, teteCourse(),
      el("div", { class: "co-scene", id: "co-scene" }, canvas, el("span", { class: "sfx co-sfx", id: "co-sfx", "aria-hidden": "true" })),
      ecran,
      infosJeux()?.course ? tableauJeu(infosJeux().course, texteCourse) : null,
    );
    preparerEtDessinerCourse();
  }

  // le canvas prend sa taille et se dessine quand il est mis en page (le ResizeObserver le prévient, avant l'affichage) :
  // loin de l'écran, il attend que sa partie arrive, au lieu de forcer la mise en page de toute la partie des jeux
  let attenteCourse = null;
  function preparerCourseMaintenant() {
    preparerCanvasCourse();
    brancherCourse3D();
    if (co.etat !== "jeu") dessinerCourse(co.moteur?.m || null);
  }
  function preparerEtDessinerCourse() {
    const c = $("co-canvas");
    if (!c) return;
    if (!("ResizeObserver" in window)) { preparerCourseMaintenant(); return; }
    if (attenteCourse?.canvas === c) return;
    attenteCourse?.suivi.disconnect();
    const suivi = new ResizeObserver(() => {
      if ($("co-canvas") !== c) { suivi.disconnect(); return; }
      if (enVeille(c)) return;
      suivi.disconnect();
      attenteCourse = null;
      preparerCourseMaintenant();
    });
    attenteCourse = { canvas: c, suivi };
    suivi.observe(c);
  }

  // le canvas : sa taille réelle suit la largeur du panneau (1,5 × au plus sur les écrans très fins)
  let ctxCourse = null;
  let echelleCourse = 1;
  let echelleEcran = 1; // pixels de l'écran par unité du jeu (pour garder des compteurs lisibles sur téléphone)
  function preparerCanvasCourse() {
    const c = $("co-canvas");
    if (!c?.getContext) { ctxCourse = null; return; }
    const largeur = c.getBoundingClientRect().width || c.parentElement.clientWidth || CO.L;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    c.width = Math.round(largeur * dpr);
    c.height = Math.round((largeur * CO.H / CO.L) * dpr);
    ctxCourse = c.getContext("2d");
    echelleCourse = c.width / CO.L;
    echelleEcran = largeur / CO.L;
  }
  // la taille du canvas ne suit que la largeur : sur téléphone, la barre d'adresse qui se cache (la hauteur change) ne refait rien
  let largeurCourse = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === largeurCourse) return;
    largeurCourse = window.innerWidth;
    preparerEtDessinerCourse();
  });

  // ---------- le dessin ----------
  const DECOR = { iles: Array.from({ length: 6 }, (_, k) => ({ x: k * 160 + Math.random() * 60, l: 90 + Math.random() * 120, h: 18 + Math.random() * 30 })), nuages: Array.from({ length: 4 }, (_, k) => ({ x: k * 190 + Math.random() * 80, y: 30 + Math.random() * 60, l: 60 + Math.random() * 50 })) };
  let gradientsCourse = null;
  function dessinerCourse(m) {
    const ctx = ctxCourse;
    if (!ctx) return;
    const e = echelleCourse;
    ctx.setTransform(e, 0, 0, e, 0, 0);
    if (course3D()) {
      // la 3D dessine le monde ; ce canvas, transparent par-dessus, garde les traits de vitesse, les alertes et les compteurs
      trois.rendu.dessiner(m, { decor: co.decor });
      ctx.clearRect(0, 0, CO.L, CO.H);
      traitsVitesse(ctx, m);
      for (const ob of m ? m.obstacles : []) {
        if (ob.type === "boulet" && ob.x > CO.L - 10) alerteBoulet(ctx, trois.rendu.versEcran(CO.L, ob.y + ob.h / 2)[1] * CO.H);
      }
      compteursCourse(ctx, m);
      return;
    }
    if (!gradientsCourse || gradientsCourse.ctx !== ctx) {
      const ciel = ctx.createLinearGradient(0, 0, 0, 160);
      ciel.addColorStop(0, "#1c0a26"); ciel.addColorStop(0.55, "#5a1d55"); ciel.addColorStop(1, "#ff8fb3");
      const mer = ctx.createLinearGradient(0, 150, 0, CO.SOL);
      mer.addColorStop(0, "#5b2a78"); mer.addColorStop(1, "#2a0f3e");
      const soleil = ctx.createRadialGradient(470, 150, 4, 470, 150, 54);
      soleil.addColorStop(0, "#fff0d6"); soleil.addColorStop(0.45, "#ffb37a"); soleil.addColorStop(1, "rgba(255, 120, 170, 0)");
      gradientsCourse = { ctx, ciel, mer, soleil };
    }
    const g = gradientsCourse;
    const d = m ? m.dist : co.decor;
    // le ciel, le soleil couchant, les nuages et les îles au loin (ils défilent moins vite : la profondeur)
    ctx.fillStyle = g.ciel; ctx.fillRect(0, 0, CO.L, 160);
    ctx.fillStyle = g.soleil; ctx.beginPath(); ctx.arc(470, 150, 54, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 240, 0.16)";
    for (const n of DECOR.nuages) {
      const x = ((n.x - d * 0.06) % 760 + 760) % 760 - 60;
      ctx.beginPath(); ctx.ellipse(x, n.y, n.l / 2, 9, 0, 0, Math.PI * 2); ctx.ellipse(x + n.l * 0.2, n.y - 7, n.l / 3, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "#2b1036";
    for (const i of DECOR.iles) {
      const x = ((i.x - d * 0.1) % 960 + 960) % 960 - 160;
      ctx.beginPath(); ctx.moveTo(x, 152); ctx.quadraticCurveTo(x + i.l / 2, 152 - i.h * 2, x + i.l, 152); ctx.fill();
    }
    // la mer et ses vagues
    ctx.fillStyle = g.mer; ctx.fillRect(0, 150, CO.L, CO.SOL - 150);
    ctx.strokeStyle = "rgba(255, 190, 230, 0.22)"; ctx.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      const y = 162 + k * 16;
      const decal = (d * (0.25 + k * 0.08)) % 80;
      ctx.beginPath();
      for (let x = -decal; x < CO.L; x += 80) { ctx.moveTo(x + k * 17, y); ctx.lineTo(x + k * 17 + 26, y); }
      ctx.stroke();
    }
    // le pont du navire : des planches qui défilent
    ctx.fillStyle = "#6e3a27"; ctx.fillRect(0, CO.SOL, CO.L, CO.H - CO.SOL);
    ctx.fillStyle = "#a35c3b"; ctx.fillRect(0, CO.SOL, CO.L, 4);
    ctx.fillStyle = "#4a2418";
    for (let x = -(d % 56); x < CO.L; x += 56) ctx.fillRect(x, CO.SOL + 4, 3, CO.H - CO.SOL);
    ctx.fillRect(0, CO.SOL + 26, CO.L, 2);
    traitsVitesse(ctx, m);
    // les obstacles
    for (const ob of m ? m.obstacles : []) dessinerObstacle(ctx, ob);
    // Chopper (sa photo en rond), son ombre, ses petits pieds
    const y = m ? m.y : 0;
    const t = m ? m.t : performance.now() / 1000;
    const auSol = !m || m.sol;
    const pas = auSol ? Math.abs(Math.sin(t * (m ? m.v : 6) * 0.9)) * 3 : 0;
    const ecrase = m && m.t - m.atterri < 0.1 ? 0.86 : 1;
    const cx = CO.X;
    const cy = CO.SOL - y - CO.R - pas;
    ctx.fillStyle = `rgba(20, 5, 12, ${Math.max(0.12, 0.4 - y / 300)})`;
    ctx.beginPath(); ctx.ellipse(cx, CO.SOL + 3, CO.R * Math.max(0.5, 1 - y / 200), 5, 0, 0, Math.PI * 2); ctx.fill();
    if (auSol) {
      const p = Math.sin(t * (m ? m.v : 6) * 1.8);
      ctx.fillStyle = "#5a2d1b";
      ctx.beginPath(); ctx.ellipse(cx - 9 + p * 5, CO.SOL - 3, 7, 4, 0, 0, Math.PI * 2); ctx.ellipse(cx + 8 - p * 5, CO.SOL - 3, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(cx, cy + CO.R * (1 - ecrase));
    ctx.rotate(m && !m.sol ? Math.max(-0.35, Math.min(0.35, -m.vy / 2400)) : 0);
    ctx.scale(1 / ecrase > 1 ? 1.08 : 1, ecrase);
    ctx.fillStyle = "#ff4f9a"; ctx.beginPath(); ctx.arc(2, 3, CO.R + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff0f7"; ctx.beginPath(); ctx.arc(0, 0, CO.R + 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, CO.R, 0, Math.PI * 2); ctx.clip();
    if (photoCourse.complete && photoCourse.naturalWidth) ctx.drawImage(photoCourse, -CO.R, -CO.R, CO.R * 2, CO.R * 2);
    else { ctx.fillStyle = "#f4c48a"; ctx.fillRect(-CO.R, -CO.R, CO.R * 2, CO.R * 2); }
    if (m?.choc) { ctx.fillStyle = "rgba(255, 45, 85, 0.35)"; ctx.fillRect(-CO.R, -CO.R, CO.R * 2, CO.R * 2); }
    ctx.restore();
    // la poussière
    for (const p of co.particules) {
      ctx.fillStyle = `rgba(255, 225, 200, ${p.a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    compteursCourse(ctx, m);
  }
  // les traits de vitesse quand ça va très vite
  function traitsVitesse(ctx, m) {
    if (!m || m.v <= 14.5) return;
    ctx.strokeStyle = `rgba(255, 240, 250, ${Math.min(0.35, (m.v - 14.5) * 0.08)})`; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) { const y = 20 + ((k * 37 + Math.floor(m.t * 20) * 13) % 190); const x = (k * 97 + m.dist * 1.6) % (CO.L + 120) ; ctx.moveTo(CO.L - x, y); ctx.lineTo(CO.L - x + 60 + k * 6, y); }
    ctx.stroke();
  }
  // un boulet arrive : un « ! » au bord pour prévenir
  function alerteBoulet(ctx, cy) {
    ctx.fillStyle = "#ff2d55"; ctx.beginPath(); ctx.arc(CO.L - 18, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 15px 'M PLUS Rounded 1c', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", CO.L - 18, cy + 1);
  }
  // les compteurs : la distance, le meilleur, la vitesse
  function compteursCourse(ctx, m) {
    if (m) {
      ctx.textAlign = "right"; ctx.textBaseline = "top";
      const gros = Math.max(26, 18 / echelleEcran);
      const petit = Math.max(12, 11 / echelleEcran);
      ctx.font = `400 ${gros}px 'Dela Gothic One', sans-serif`;
      ctx.lineWidth = 5; ctx.strokeStyle = "#12050d"; ctx.fillStyle = "#fff0f7";
      const txt = `${nombre(Math.floor(m.dist / CO.M))} m`;
      ctx.strokeText(txt, CO.L - 16, 12); ctx.fillText(txt, CO.L - 16, 12);
      ctx.font = `800 ${petit}px 'M PLUS Rounded 1c', sans-serif`;
      ctx.fillStyle = "rgba(255, 240, 247, 0.85)";
      const meilleur = Math.max(mesJeux?.course?.meilleur || 0, co.record);
      if (meilleur) ctx.fillText(`Meilleur : ${nombre(meilleur)} m`, CO.L - 16, 18 + gros);
      ctx.textAlign = "left";
      ctx.fillText(`${m.v.toFixed(1).replace(".", ",")} m/s`, 16, 14);
    }
  }
  function dessinerObstacle(ctx, ob) {
    const bas = CO.SOL - ob.y;
    if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
    if (ob.type === "tonneau" || ob.type === "double") {
      const n = ob.type === "double" ? 2 : 1;
      const l = ob.w / n;
      for (let k = 0; k < n; k++) {
        const x = ob.x + k * l;
        ctx.fillStyle = "#8a4b2b";
        ctx.beginPath(); ctx.roundRect(x + 1, bas - ob.h, l - 2, ob.h, 7); ctx.fill();
        ctx.fillStyle = "#3b2410";
        ctx.fillRect(x + 1, bas - ob.h * 0.78, l - 2, 3); ctx.fillRect(x + 1, bas - ob.h * 0.3, l - 2, 3);
        ctx.fillStyle = "rgba(255, 220, 180, 0.25)"; ctx.fillRect(x + 6, bas - ob.h + 4, 3, ob.h - 8);
        ctx.strokeStyle = "#2a1508"; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x + 1, bas - ob.h, l - 2, ob.h, 7); ctx.stroke();
      }
    } else if (ob.type === "caisse") {
      ctx.fillStyle = "#b07a3c"; ctx.fillRect(ob.x, bas - ob.h, ob.w, ob.h);
      ctx.strokeStyle = "#3b2410"; ctx.lineWidth = 3; ctx.strokeRect(ob.x + 1.5, bas - ob.h + 1.5, ob.w - 3, ob.h - 3);
      ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ob.x + 4, bas - ob.h + 4); ctx.lineTo(ob.x + ob.w - 4, bas - 4); ctx.moveTo(ob.x + ob.w - 4, bas - ob.h + 4); ctx.lineTo(ob.x + 4, bas - 4); ctx.stroke();
    } else if (ob.type === "mouette") {
      const cx = ob.x + ob.w / 2;
      const cy = bas - ob.h / 2;
      const aile = Math.sin(ob.phase) * 8;
      ctx.strokeStyle = "#fff8fb"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx - 17, cy - aile); ctx.quadraticCurveTo(cx - 8, cy - 9 - aile / 2, cx, cy); ctx.quadraticCurveTo(cx + 8, cy - 9 - aile / 2, cx + 17, cy - aile); ctx.stroke();
      ctx.fillStyle = "#fff8fb"; ctx.beginPath(); ctx.ellipse(cx, cy + 1, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.moveTo(cx - 9, cy); ctx.lineTo(cx - 15, cy + 2); ctx.lineTo(cx - 9, cy + 3); ctx.fill();
      ctx.lineCap = "butt";
    } else if (ob.type === "boulet") {
      const r = ob.w / 2;
      const cx = ob.x + r;
      const cy = bas - r;
      if (ob.x > CO.L - 10) { alerteBoulet(ctx, cy); return; }
      for (let k = 1; k <= 3; k++) { ctx.fillStyle = `rgba(230, 210, 230, ${0.28 - k * 0.07})`; ctx.beginPath(); ctx.arc(cx + k * 14, cy, r - k * 2, 0, Math.PI * 2); ctx.fill(); }
      const gr = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, r);
      gr.addColorStop(0, "#7a6a78"); gr.addColorStop(1, "#140a12");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- une course ----------
  async function lancerCourse() {
    if (co.etat === "jeu" || co.etat === "pret" || co.etat === "envoi") return;
    co.etat = "pret";
    co.partie = "";
    co.fin = null;
    co.pause = false;
    co.particules = [];
    co.moteur = moteurCourse(reglesCourse());
    co.piste = 0;
    const z = $("course");
    pleinEcranJeu(z, true);
    // en VF : un grand pavé « Sauter » sous la course, pour le pouce (reste appuyé pour sauter plus haut)
    const pave = jeuxVF() ? el("button", { class: "co-pave", type: "button", tabindex: "-1", "aria-label": "Sauter (reste appuyé pour sauter plus haut)" }, el("b", { text: "SAUTE !" }), el("small", { text: "reste appuyé pour sauter plus haut" })) : null;
    vider(z, teteCourse(),
      el("div", { class: "co-scene en-jeu", id: "co-scene" },
        el("canvas", { class: "co-canvas", id: "co-canvas", role: "img", "aria-label": "La course de Chopper en cours" }),
        el("span", { class: "sfx co-sfx", id: "co-sfx", "aria-hidden": "true" }),
        el("span", { class: "co-depart", id: "co-depart", "aria-hidden": "true", text: "3" }),
        jeuxVF() ? el("span", { class: "co-piste", id: "co-piste", "aria-hidden": "true" }) : null,
      ),
      pave || el("p", { class: "note co-aide", text: "Clic, toucher ou Espace pour sauter · reste appuyé pour sauter plus haut" }),
    );
    if (pave) {
      pave.addEventListener("pointerdown", (e) => { if (co.etat === "jeu") { e.preventDefault(); pave.setPointerCapture?.(e.pointerId); pave.classList.add("appui"); appuiCourse(true); } });
      for (const ev of ["pointerup", "pointercancel"]) pave.addEventListener(ev, () => { pave.classList.remove("appui"); if (co.etat === "jeu") appuiCourse(false); });
      pave.addEventListener("contextmenu", (e) => e.preventDefault());
    }
    preparerCanvasCourse();
    brancherCourse3D();
    trois.images = 0; trois.tempsImages = 0;
    const c = $("co-canvas");
    c.addEventListener("pointerdown", (e) => { if (co.etat === "jeu") { e.preventDefault(); c.setPointerCapture?.(e.pointerId); appuiCourse(true); } });
    for (const ev of ["pointerup", "pointercancel"]) c.addEventListener(ev, () => { if (co.etat === "jeu") appuiCourse(false); });
    dessinerCourse(co.moteur.m);
    const ouverture = moi?.connecte ? demanderJeux("jeu-ouvrir", { jeu: "course" }) : null;
    // 3, 2, 1… partez !
    const depart = $("co-depart");
    for (const t of ["3", "2", "1"]) {
      depart.textContent = t;
      depart.classList.remove("pop"); void depart.offsetWidth; depart.classList.add("pop");
      jouerSon("clic");
      await new Promise((ok) => setTimeout(ok, reduit.matches ? 250 : 520));
      if (co.etat !== "pret") return; // refermé pendant le compte à rebours
    }
    depart.textContent = "";
    if (ouverture) { const { d } = await ouverture; if (d.partie) co.partie = d.partie; }
    if (co.etat !== "pret") return;
    co.etat = "jeu";
    co.sauts = 0;
    musiqueJeu("course");
    co.dernier = performance.now();
    cancelAnimationFrame(co.boucle);
    co.boucle = requestAnimationFrame(imageCourse);
  }
  // un appui : saute, ou reprend la course après une pause (sans sauter)
  function appuiCourse(oui) {
    if (co.pause) {
      if (oui) { co.pause = false; const d = $("co-depart"); if (d) { d.textContent = ""; d.classList.remove("pause"); } }
      return;
    }
    co.moteur.appuyer(oui);
  }
  function imageCourse(t) {
    if (co.etat !== "jeu") return;
    if (co.pause) { co.dernier = t; co.boucle = requestAnimationFrame(imageCourse); return; }
    const dt = Math.min(0.05, Math.max(0, (t - co.dernier) / 1000));
    // si la 3D est trop lourde pour l'appareil (moins de 24 images par seconde en moyenne), la course repasse en 2D
    if (course3D() && choix3D !== "oui" && ++trois.images > 10) {
      trois.tempsImages += t - co.dernier;
      if (trois.images === 50 && trois.tempsImages / 40 > 1000 / 24) passerEn2D();
    }
    co.dernier = t;
    const m = co.moteur.m;
    const etaitAuSol = m.sol;
    const ev = co.moteur.avancer(dt);
    if (m.sauts !== co.sauts) { co.sauts = m.sauts; jouerSon("saut"); }
    // la poussière : quand il court, et un petit nuage quand il retombe
    if (m.sol && Math.random() < dt * 9) co.particules.push({ x: CO.X - 14, y: CO.SOL - 3, r: 2 + Math.random() * 2, a: 0.5, vx: -60 - Math.random() * 40, vy: -20 - Math.random() * 20 });
    if (m.sol && !etaitAuSol) for (let k = 0; k < 6; k++) co.particules.push({ x: CO.X + (k - 3) * 5, y: CO.SOL - 2, r: 2 + Math.random() * 3, a: 0.6, vx: (k - 3) * 30, vy: -30 - Math.random() * 30 });
    for (const p of co.particules) { p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 1.4; }
    co.particules = co.particules.filter((p) => p.a > 0).slice(-40);
    // en VF (et en 3D) : une nouvelle piste tous les 250 m, annoncée en haut de l'écran
    const piste = Math.floor(m.dist / CO.M / 250);
    if (piste !== co.piste && course3D() && jeuxVF()) {
      co.piste = piste;
      const b = $("co-piste");
      if (b) { b.textContent = `Piste ${(piste % 4) + 1} · ${NOMS_PISTES[piste % 4]}`; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
    }
    if (ev === "palier") {
      jouerSon("pop");
      const sfx = $("co-sfx");
      const metres = m.palier * 100;
      sfx.textContent = metres % 500 === 0 ? "ゴゴゴ" : `${metres} m!`;
      sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat");
    }
    dessinerCourse(m);
    if (m.choc) { chocCourse(); return; }
    co.boucle = requestAnimationFrame(imageCourse);
  }
  async function chocCourse() {
    co.etat = "choc";
    const m = co.moteur.m;
    const distance = Math.floor(m.dist / CO.M);
    const sfx = $("co-sfx");
    sfx.textContent = m.choc.type === "boulet" ? "ドカーン！" : m.choc.type === "mouette" ? "グワッ！" : "ゴン！";
    jouerSon(m.choc.type === "boulet" ? "impact" : "tonneau");
    finMusiqueJeu(1.2);
    sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat");
    $("co-scene")?.classList.add("choc");
    if (jeuxVF()) navigator.vibrate?.(70); // sur téléphone, le choc se sent aussi
    if (distance > co.record) { co.record = distance; try { localStorage.setItem("barhaw-course", String(distance)); } catch {} }
    let fin = { distance, cause: m.choc.type, message: "" };
    const attente = new Promise((ok) => setTimeout(ok, reduit.matches ? 300 : 1100));
    if (co.partie) {
      co.etat = "envoi";
      const { d } = await demanderJeux("course-fin", { partie: co.partie, distance });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ta distance compte.";
    await attente;
    if (co.etat === "accueil") return; // refermé entre-temps
    co.etat = "fin";
    co.fin = fin;
    if (fin.record || fin.perso) jouerSon("victoire");
    rendreCourse();
    if (fin.record || fin.perso) setTimeout(charger, 1500);
  }
  // le clavier : Espace, flèche du haut, Z ou W, seulement quand la course est à l'écran
  const toucheCourse = (e) => ["Space", "ArrowUp", "KeyW", "KeyZ"].includes(e.code);
  window.addEventListener("keydown", (e) => {
    if (!toucheCourse(e) || co.etat === "accueil" || e.target?.closest?.("input, textarea, select, button, a")) return;
    const r = $("course")?.getBoundingClientRect();
    if (!r || r.bottom < 0 || r.top > innerHeight) return;
    // pendant la course (et juste avant, et juste après) : la barre d'espace ne fait pas défiler la page
    e.preventDefault();
    if (e.repeat) return;
    if (co.etat === "jeu") appuiCourse(true);
    else if (co.etat === "fin") lancerCourse(); // Espace pour recourir
  });
  window.addEventListener("keyup", (e) => { if (co.etat === "jeu" && toucheCourse(e)) appuiCourse(false); });
  // un autre onglet : la course se met en pause, et reprend au prochain appui
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || co.etat !== "jeu") return;
    co.pause = true;
    co.moteur.appuyer(false);
    const d = $("co-depart");
    if (d) { d.textContent = "Pause"; d.classList.add("pause"); }
  });

  function jeuEnCours() {
    if (rb.etat === "jeu" || rb.etat === "pause") return "rumble";
    if (qz.etat === "question" || qz.etat === "palier") return "quiz";
    if (dc.etat === "jeu") return "docteur";
    if (mm.etat === "jeu") return "memory";
    if (co.etat === "jeu" || co.etat === "pret") return "course";
    return "";
  }
  function rendreJeux() {
    if (rb.etat !== "jeu" && rb.etat !== "pause" && rb.etat !== "envoi") rendreRumble();
    rendreQuiz();
    rendreDocteur();
    rendreMemory();
    rendreCourse();
    rendreTraversee();
  }

  // ---------- la chasse : le boss de la semaine et les avis de recherche WANTED ----------
  // Le bot tient les PV du boss et les primes. La page affiche tout, lance l'attaque du jour (une par jour)
  // et crée (ou retire) l'avis de recherche du membre connecté : personne n'a d'affiche sans l'avoir voulu.
  let maChasse = null; // { primes: { actif, prime, titre, rang… }, boss: { degats, rang, attaqueDispo, prochaineAttaque, trophee } }
  let chassePasMembre = false;
  let attaqueEnCours = false;
  let dernierCoup = null; // la dernière attaque : { degats, critique, phrase, berrys }
  let animBossJusqua = 0; // pendant l'animation d'un coup, la page ne redessine pas le boss
  let ongletPrimes = "top";
  let confirmerRetrait = false;
  let creationEnCours = false;
  let pvVu = null; // les PV affichés la dernière fois (pour que la barre descende en douceur)
  let minuteurBoss = 0;
  let chasseVue = false;
  const infosChasse = () => donnees?.chasse || null;
  const berrys = (n) => `${nombre(Math.round(Number(n) || 0))} ฿`;
  const imageBoss = (id) => imageCarte(id) || { src: "/img/chopper-visage.jpg", l: 480, h: 480 };
  const SOURCES_PRIME = { depart: "Création de l'avis", messages: "Messages sur le Discord", lives: "Présence aux lives", cartes: "Cartes", jeux: "Jeux", chopper: "Chopper", faille: "Games de LoL", boss: "Coups au boss", battle: "La Battle Royale" };
  const texteButin = (b) => [b.degats ? `⚔️ −${nombre(b.degats)} PV au boss` : "", b.berrys ? `+${berrys(b.berrys)}` : ""].filter(Boolean).join(" · ");

  function dureeCourte(t) {
    const s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    const j = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return j ? `${j} j ${h} h` : h ? `${h} h ${String(m).padStart(2, "0")}` : `${Math.max(1, m)} min`;
  }

  async function demanderChasse(action) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
      chassePasMembre = d.erreur === "pas-membre";
      if (d.chasse) maChasse = d.chasse;
      if (d.etatBoss && donnees) donnees.chasse = { ...(donnees.chasse || {}), boss: d.etatBoss };
      return { status: r.status, d };
    } catch {
      return { status: 0, d: { erreur: "Impossible de joindre le bot. Vérifie ta connexion." } };
    }
  }
  async function chargerMaChasse() {
    if (!moi?.connecte) { maChasse = null; rendreChasse(); return; }
    await demanderChasse("chasse");
    rendreChasse();
  }
  // les données publiques sont gardées 20 s en cache : on ne laisse pas un boss « d'avant » remplacer celui qu'on vient de frapper
  function bossLePlusFrais(ancien, nouveau) {
    if (!ancien || !nouveau || ancien.numero !== nouveau.numero || ancien.pv >= nouveau.pv) return nouveau;
    return { ...nouveau, pv: ancien.pv, etat: ancien.etat, coups: ancien.coups, top: ancien.top, chasseurs: ancien.chasseurs, total: ancien.total, vaincuLe: ancien.vaincuLe, coupFinal: ancien.coupFinal };
  }
  function recevoirPublic(d) {
    const ancien = donnees?.chasse?.boss;
    if (d?.chasse?.boss) d.chasse = { ...d.chasse, boss: bossLePlusFrais(ancien, d.chasse.boss) };
    return d;
  }
  // le butin d'une partie, d'une carte ou de Chopper : le boss perd des PV tout de suite sur la page
  function recevoirButin(b) {
    if (!b) return;
    if (b.boss && donnees?.chasse) donnees.chasse = { ...donnees.chasse, boss: { ...donnees.chasse.boss, ...b.boss } };
    if (maChasse?.primes?.actif && b.berrys) maChasse.primes.prime += b.berrys;
    if (maChasse?.boss && b.degats) maChasse.boss.degats += b.degats;
    if (Date.now() > animBossJusqua) rendreBoss();
    rendreWanted();
  }

  // --- le boss ---
  function portraitBoss(b) {
    const img = imageBoss(b.id);
    return el("div", { class: `boss-portrait etat-${b.etat}`, id: "boss-portrait" },
      el("span", { class: "concentration", "aria-hidden": "true" }),
      el("div", { class: "boss-cadre" }, el("img", { src: img.src, alt: `Le boss : ${b.nom}`, width: img.l, height: img.h, decoding: "async" })),
      el("span", { class: "boss-tampon", text: b.etat === "vaincu" ? "VAINCU" : b.etat === "enfui" ? "ENFUI" : `BOSS n° ${b.numero}` }),
      el("span", { class: "boss-degat", id: "boss-degat", "aria-hidden": "true" }),
      el("span", { class: "sfx boss-sfx", id: "boss-sfx", "aria-hidden": "true" }),
    );
  }
  function actionBoss(b) {
    const m = maChasse?.boss;
    if (b.etat !== "vivant") {
      return [
        el("p", { class: "boss-fini", text: b.etat === "vaincu" ? `Vaincu ! Coup final : ${b.coupFinal?.nom || "?"}.` : "Il s'est enfui…" }),
        m?.trophee ? el("p", { class: "jeu-bravo", text: "🏆 Tu as gagné sa carte trophée : elle est dans ton album." }) : null,
        el("p", { class: "note", text: "Le prochain boss arrive lundi à 0 h." }),
      ];
    }
    if (!moi?.connecte) return [el("a", { class: "btn btn-plein boss-attaque", href: "/api/auth/login", text: "Se connecter pour attaquer" })];
    if (chassePasMembre) return [el("a", { class: "btn btn-plein", href: "#discord", text: "Rejoins le Discord pour entrer dans la chasse" })];
    if (!m) return [el("button", { class: "btn btn-plein boss-attaque", type: "button", disabled: true, text: "…" })];
    const coup = dernierCoup ? el("p", { class: `boss-coup${dernierCoup.critique ? " critique" : ""}`, role: "status" },
      `${dernierCoup.critique ? "COUP CRITIQUE ! " : ""}${dernierCoup.phrase} `, el("b", { text: `−${nombre(dernierCoup.degats)} PV` }),
      dernierCoup.berrys ? ` · +${berrys(dernierCoup.berrys)}` : "") : null;
    if (m.attaqueDispo) {
      return [coup, el("button", { class: "btn btn-plein boss-attaque", type: "button", onclick: attaquerBoss, disabled: attaqueEnCours, text: attaqueEnCours ? "…" : "⚔️ Attaquer !" })];
    }
    return [
      coup,
      el("p", { class: "boss-attente" }, "Attaque du jour faite. La prochaine dans ", el("b", { id: "boss-prochaine", text: dureeCourte(m.prochaineAttaque) }), "."),
      el("p", { class: "note", text: "Tu peux encore le frapper en jouant aux jeux, en tirant ta carte ou en t'occupant de Chopper." }),
    ];
  }
  function rendreBoss() {
    const z = $("boss");
    if (!z) return;
    const b = infosChasse()?.boss;
    if (!b) {
      vider(z, el("h3", { text: "Le boss de la semaine" }), el("p", { class: "vide", text: donnees?.horsLigne ? "Le boss revient dans un instant." : "Le boss arrive bientôt." }));
      return;
    }
    const pct = b.pvMax ? Math.max(0, Math.min(100, (b.pv / b.pvMax) * 100)) : 0;
    // la barre part des PV vus la dernière fois, puis descend (avec la traînée des jeux de combat)
    const depart = pvVu && pvVu.numero === b.numero && pvVu.pv > b.pv ? Math.min(100, (pvVu.pv / b.pvMax) * 100) : pct;
    pvVu = { numero: b.numero, pv: b.pv };
    const m = maChasse?.boss;
    const plein = el("i", { class: "boss-pv-plein", style: `width:${depart}%` });
    const traine = el("i", { class: "boss-pv-traine", style: `width:${depart}%` });
    const D = b.degats || {};
    vider(z,
      el("div", { class: "boss-haut" },
        portraitBoss(b),
        el("div", { class: "boss-infos" },
          el("p", { class: "boss-surtitre", text: b.etat === "vivant" ? "Le boss de la semaine" : b.etat === "vaincu" ? "Le boss de la semaine est tombé" : "Le boss s'est enfui" }),
          el("h3", { class: "boss-nom", text: b.nom }),
          el("div", { class: `boss-pv${pct <= 20 ? " critique" : ""}`, role: "meter", "aria-label": "Points de vie du boss", "aria-valuemin": "0", "aria-valuemax": String(b.pvMax), "aria-valuenow": String(b.pv) },
            el("div", { class: "boss-pv-barre" }, traine, plein, el("span", { class: "boss-pv-graduation", "aria-hidden": "true" })),
            el("div", { class: "boss-pv-texte" },
              el("b", { text: `${nombre(b.pv)} / ${nombre(b.pvMax)} PV` }),
              b.etat === "vivant" ? el("span", {}, "S'enfuit dans ", el("b", { id: "boss-fuite", text: dureeCourte(b.fin) })) : null,
            ),
          ),
          el("div", { class: "boss-action" }, actionBoss(b)),
          el("p", { class: "boss-recompense" },
            el("strong", { text: b.etat === "vaincu" ? "La récompense" : "S'il tombe" }),
            ` : sa carte trophée${b.role ? ` et le rôle Chasseur sur le Discord pendant ${b.roleJours || 7} jours` : ""}, pour ${b.etat === "vaincu" ? "" : "tous "}ceux qui lui ont fait au moins ${b.minTrophee || 10} dégâts.`,
            m ? el("span", { class: "boss-moi" }, ` Toi : ${nombre(m.degats)} dégât${m.degats > 1 ? "s" : ""}${m.rang ? ` (n° ${m.rang})` : ""}${m.degats >= (b.minTrophee || 10) ? " ✓" : ""}.`) : null,
          ),
        ),
      ),
      el("div", { class: "boss-bas" },
        el("div", { class: "boss-bloc" },
          el("h4", { text: "Les derniers coups" }),
          b.coups?.length
            ? el("ul", { class: "boss-coups", "aria-live": "polite" }, b.coups.map((c) => el("li", { class: c.critique ? "critique" : "" },
              el("span", { class: "boss-coups-nom", text: c.nom }),
              el("span", { class: "boss-coups-source", text: `${(b.sources || {})[c.source] || ""}${c.critique ? " critique" : ""} · il y a ${depuis(c.t)}` }),
              el("b", { text: `−${nombre(c.degats)}` }),
            )))
            : el("p", { class: "note", text: "Personne ne l'a encore frappé. À toi l'honneur !" }),
        ),
        el("div", { class: "boss-bloc" },
          el("h4", { text: `Les chasseurs${b.chasseurs ? ` (${b.chasseurs})` : ""}` }),
          b.top?.length
            ? el("ol", {}, b.top.map((c) => el("li", {}, el("span", { text: c.nom }), el("small", { text: `${nombre(c.degats)} dégâts` }))))
            : el("p", { class: "note", text: "Le classement des chasseurs de la semaine s'affiche ici." }),
          b.precedent ? el("p", { class: "note", text: `La semaine dernière : ${b.precedent.nom} ${b.precedent.etat === "vaincu" ? "a été vaincu" : "s'est enfui"}.` }) : null,
        ),
        el("div", { class: "boss-bloc" },
          el("h4", { text: "Comment le frapper" }),
          el("ul", { class: "boss-regles" },
            el("li", {}, el("span", { text: "L'attaque du jour (sur le site)" }), el("b", { text: `${(D.attaque || [8, 20]).join(" à ")} · critique ×3` })),
            el("li", {}, el("span", { text: "Une partie de jeu finie" }), el("b", { text: `${D.partie ?? 3} (+${D.bonScore ?? 5} bon score, +${D.recordSite ?? 15} record)` })),
            el("li", {}, el("span", { text: "Ta carte du jour" }), el("b", { text: `${D.carte ?? 3} (+${D.legendaire ?? 12} légendaire)` })),
            el("li", {}, el("span", { text: "Nourrir ou jouer avec Chopper" }), el("b", { text: String(D.chopper ?? 2) })),
            el("li", {}, el("span", { text: "Une bonne game de LoL (La Faille des potes)" }), el("b", { text: `${D.faille?.["S+"] ?? 15} (S+), ${D.faille?.S ?? 10} (S), ${D.faille?.A ?? 5} (A)` })),
            el("li", {}, el("span", { text: "Avec ton avis de recherche : un message sur le Discord" }), el("b", { text: `${D.message ?? 1} (15 par jour)` })),
            el("li", {}, el("span", { text: "Avec ton avis de recherche : venir à un live" }), el("b", { text: String(D.live ?? 10) })),
          ),
        ),
      ),
    );
    if (depart !== pct) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        plein.style.width = `${pct}%`;
        traine.style.width = `${pct}%`;
      }));
    }
    // les comptes à rebours (fuite du boss, prochaine attaque) : une fois par minute
    clearInterval(minuteurBoss);
    minuteurBoss = setInterval(() => {
      const f = $("boss-fuite");
      if (f) f.textContent = dureeCourte(b.fin);
      const p = $("boss-prochaine");
      if (p && m) {
        if (m.prochaineAttaque <= Date.now()) { clearInterval(minuteurBoss); chargerMaChasse(); return; }
        p.textContent = dureeCourte(m.prochaineAttaque);
      }
      if (b.etat === "vivant" && b.fin <= Date.now()) { clearInterval(minuteurBoss); charger(); }
    }, 30_000);
  }

  async function attaquerBoss() {
    if (attaqueEnCours) return;
    attaqueEnCours = true;
    dernierCoup = null;
    rendreBoss();
    const portrait = $("boss-portrait");
    portrait?.classList.add("charge");
    const [{ status, d }] = await Promise.all([demanderChasse("boss-attaquer"), new Promise((ok) => setTimeout(ok, reduit.matches ? 0 : 450))]);
    attaqueEnCours = false;
    if (status === 401) { rendreChasse(); return; }
    if (d.ok) {
      dernierCoup = { degats: d.degats, critique: d.critique, phrase: d.phrase, berrys: d.berrys || 0 };
      animBossJusqua = Date.now() + 1600;
      rendreBoss();
      rendreWanted();
      const p = $("boss-portrait");
      const n = $("boss-degat");
      if (p && n) {
        n.textContent = `−${nombre(d.degats)}`;
        p.classList.add("touche");
        if (d.critique) p.classList.add("critique");
        onomatopee($("boss-sfx"), d.critique ? "ズガーン！" : ["ドン！", "バキッ！", "ドカッ！", "ボコッ！"][Math.floor(Math.random() * 4)], true);
        setTimeout(() => p.classList.remove("touche", "critique"), 1500);
      }
      if (d.vaincu) setTimeout(charger, 1200);
      setTimeout(rafraichirChasse, 2500);
      return;
    }
    dernierCoup = null;
    rendreBoss();
    const zone = $("boss")?.querySelector(".boss-action");
    if (zone && (d.texte || d.erreur)) zone.prepend(el("p", { class: "note", role: "status", text: d.texte || d.erreur }));
  }

  // --- les affiches en 3D (js/wanted-3d.js) : posées par-dessus les affiches de la page, qui restent là sans WebGL ---
  // Une seule toile par panneau, gardée d'un rendu à l'autre (on la déplace dans le nouveau contenu, sans refaire de 3D).
  const W3D = { mod: null, vues: new Map(), echec: false, observe: null };
  // les photos Discord passent par le site : la 3D a besoin de lire leurs pixels (pour découper la personne)
  const photoAffiche = (u) => {
    const m = String(u || "").match(/^https:\/\/cdn\.discordapp\.com\/((?:guilds\/\d{5,25}\/users\/\d{5,25}\/)?avatars\/(?:\d{5,25}\/)?(?:a_)?[0-9a-f]{32}|embed\/avatars\/\d)\.(?:png|webp|jpg|jpeg|gif)(?:\?size=\d{1,4})?$/);
    return m ? `/api/chopper?image=avatar&u=${encodeURIComponent(m[1])}` : u;
  };
  // les bruitages des affiches (la pose, le tampon, la prime qui arrive, le personnage qui se cache…) : ceux du site
  const SONS_AFFICHE = { pose: ["carte", 0.8], tampon: ["br-tampon", 1], prime: ["br-score", 0.6], cache: ["souffle", 0.4], coucou: ["pop", 0.9], tombe: ["souffle", 0.6], gagne: ["br-paillettes", 0.8] };
  const sonsAffiche = {};
  function sonAffiche(nom) {
    const s = SONS_AFFICHE[nom];
    // (plusieurs affiches arrivent souvent en même temps : un seul bruit)
    if (!s || performance.now() - (sonsAffiche[nom] || 0) < 260) return;
    sonsAffiche[nom] = performance.now();
    jouerSon(s[0], { volume: s[1] });
  }
  async function poser3D(nom, panneau, conteneur, entrees, options = {}) {
    if (W3D.echec || !panneau) return;
    let v = W3D.vues.get(nom);
    if (!entrees.length || !conteneur) {
      panneau.classList.remove("w3d-pret");
      if (v) { v.actif = false; v.rendu?.placer([]); v.rendu?.pause(true); v.toile.remove(); v.conteneur = null; }
      return;
    }
    if (!v) {
      v = { toile: el("canvas", { class: "w3d-toile", "aria-hidden": "true" }), rendu: null, conteneur: null, panneau, actif: true, visible: !("IntersectionObserver" in window) };
      W3D.vues.set(nom, v);
      try {
        W3D.mod ||= await import("/js/wanted-3d.js");
        v.rendu = W3D.mod.creerWanted3D(v.toile, { zone: panneau, petit: Math.min(window.innerWidth, window.innerHeight) < 700, reduit: reduit.matches, photo: photoAffiche, ...options });
      } catch {
        W3D.echec = true; // pas de WebGL : les affiches de la page restent
        W3D.vues.delete(nom);
        return;
      }
      v.toile.addEventListener("wanted-son", (e) => sonAffiche(e.detail));
      prechargerSons(["carte", "br-tampon", "br-score", "pop", "souffle"]);
      v.toile.addEventListener("wanted-pret", () => panneau.classList.toggle("w3d-pret", Boolean(v.conteneur && v.rendu.pretes())));
      v.toile.addEventListener("wanted-perdu", () => {
        W3D.echec = true;
        for (const x of W3D.vues.values()) { x.panneau.classList.remove("w3d-pret"); x.toile.remove(); try { x.rendu.arreter(); } catch {} }
        W3D.vues.clear();
      });
      if (!W3D.observe && "IntersectionObserver" in window) {
        W3D.observe = new IntersectionObserver((e) => {
          for (const x of e) { const vue = [...W3D.vues.values()].find((y) => y.panneau === x.target); if (vue) vue.visible = x.isIntersecting; }
          for (const x of W3D.vues.values()) x.rendu?.pause(!x.actif || !x.visible || document.hidden);
        }, { rootMargin: "120px 0px" });
        document.addEventListener("visibilitychange", () => { for (const x of W3D.vues.values()) x.rendu?.pause(!x.actif || !x.visible || document.hidden); });
      }
      W3D.observe?.observe(panneau);
      if (!v.actif) { v.rendu.pause(true); return; } // (pendant le chargement, on n'en a plus voulu : la toile attend la prochaine fois)
    }
    if (!v.rendu) return;
    v.actif = true;
    if (v.conteneur !== conteneur) {
      conteneur.append(v.toile);
      v.conteneur = conteneur;
    }
    v.rendu.placer(entrees);
    v.rendu.redimensionner();
    panneau.classList.toggle("w3d-pret", v.rendu.pretes());
    v.rendu.pause(!v.visible || document.hidden);
  }

  // --- l'avis de recherche du membre ---
  function affiche({ nom, avatar, prime, inconnu = false, petite = false }) {
    return el("div", { class: `wanted-affiche${inconnu ? " inconnu" : ""}${petite ? " petite" : ""}` },
      el("span", { class: "wanted-titre", text: "WANTED" }),
      el("div", { class: "wanted-photo" }, avatar && !inconnu
        ? el("img", { src: avatar, alt: "", width: 256, height: 256, loading: petite ? "lazy" : "eager", decoding: "async", referrerpolicy: "no-referrer" })
        : el("span", { class: "wanted-qui", text: "?" })),
      el("span", { class: "wanted-mort", text: "DEAD OR ALIVE" }),
      el("strong", { class: "wanted-nom", text: (nom || "?").toUpperCase() }),
      el("span", { class: "wanted-prime" }, el("b", { text: inconnu ? "???" : nombre(prime) }), el("span", { class: "wanted-berry", text: "฿" })),
      petite ? null : el("span", { class: "wanted-pied", text: "BERRYS · BARHAW" }),
    );
  }
  async function creerAvis() {
    if (creationEnCours) return;
    creationEnCours = true;
    rendreWanted();
    const { d } = await demanderChasse("prime-activer");
    creationEnCours = false;
    rendreWanted({ nouveau: Boolean(d.ok) });
    if (d.ok) setTimeout(rafraichirChasse, 1500);
  }
  async function retirerAvis() {
    if (!confirmerRetrait) { confirmerRetrait = true; rendreWanted(); return; }
    confirmerRetrait = false;
    await demanderChasse("prime-retirer");
    rendreWanted();
    setTimeout(rafraichirChasse, 1500);
  }
  async function partagerAffiche(p) {
    const texte = `Ma prime sur Barhaw : ${berrys(p.prime)} (${p.titre}) 🏴‍☠️`;
    const lien = `${location.origin}/#chasse`;
    try {
      const img = await fetch(`/api/chopper?image=wanted&cle=${p.cle}`);
      const fichier = new File([await img.blob()], "wanted-barhaw.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [fichier] })) { await navigator.share({ files: [fichier], text: `${texte} ${lien}` }); return; }
    } catch {}
    try {
      if (navigator.share) { await navigator.share({ text: texte, url: lien }); return; }
      await navigator.clipboard.writeText(`${texte} ${lien}`);
      const b = $("wanted-partager");
      if (b) { b.textContent = "Lien copié !"; setTimeout(() => { b.textContent = "Partager"; }, 2000); }
    } catch {}
  }
  function gainsListe() {
    const G = infosChasse()?.primes?.gains || {};
    const k = (n) => nombre(Math.round(n));
    const l = [
      ["Un message sur le Discord", `${berrys(G.message ?? 500)} (${k(G.messageLive ?? 1000)} en live)`],
      ["Venir à un live", berrys(G.live ?? 30000)],
      ["Une nouvelle carte", `${berrys(G.carteNouvelle ?? 10000)} (légendaire ${k(G.carteLegendaire ?? 50000)})`],
      ["Une partie de jeu", `${berrys(G.partie ?? 2000)} (record +${k(G.recordSite ?? 100000)})`],
      ["Une game de LoL notée S+ (La Faille)", `${berrys(G.failleSPlus ?? 40000)} (S ${k(G.failleS ?? 20000)}, A ${k(G.failleA ?? 8000)})`],
      ["Un dégât au boss", berrys(G.degat ?? 500)],
      ["Le boss vaincu", berrys(G.bossVaincu ?? 100000)],
    ];
    return el("ul", { class: "wanted-gains" }, l.map(([a, b]) => el("li", {}, el("span", { text: a }), el("b", { text: b }))));
  }
  function rendreWanted({ nouveau = false } = {}) {
    const z = $("wanted");
    if (!z) return;
    const p = maChasse?.primes;
    let contenu;
    let pourLa3D = null;
    if (!moi?.connecte) {
      pourLa3D = { nom: "Toi ?", inconnu: true };
      contenu = [
        el("div", { class: "wanted-apercu" }, affiche(pourLa3D)),
        el("div", { class: "wanted-infos" },
          el("h3", { text: "Ton avis de recherche" }),
          el("p", { text: "Ta photo de profil sur une affiche WANTED, avec une prime en berrys qui monte avec tout ce que tu fais sur le Discord et sur le site." }),
          el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" }),
        ),
      ];
    } else if (chassePasMembre) {
      pourLa3D = { nom: moi.nom, inconnu: true };
      contenu = [el("div", { class: "wanted-apercu" }, affiche(pourLa3D)), el("div", { class: "wanted-infos" }, el("h3", { text: "Ton avis de recherche" }), el("p", { text: "Rejoins le Discord Barhaw pour entrer dans la chasse." }), el("a", { class: "btn btn-plein", href: "#discord", text: "Rejoindre le Discord" }))];
    } else if (!p) {
      pourLa3D = { nom: moi.nom, inconnu: true };
      contenu = [el("div", { class: "wanted-apercu" }, affiche(pourLa3D)), el("div", { class: "wanted-infos" }, el("h3", { text: "Ton avis de recherche" }), el("p", { class: "note", text: "Ta prime arrive…" }))];
    } else if (!p.actif) {
      pourLa3D = { nom: moi.nom, avatar: moi.avatar, prime: infosChasse()?.primes?.gains?.depart || 50000 };
      contenu = [
        el("div", { class: "wanted-apercu" }, affiche(pourLa3D)),
        el("div", { class: "wanted-infos" },
          el("h3", { text: "Crée ton avis de recherche" }),
          el("p", { text: "Ta prime démarre à 50 000 ฿ (plus 10 000 par carte déjà dans ton album), puis elle monte avec :" }),
          gainsListe(),
          el("p", { class: "note", text: "Le bot compte seulement qui écrit, il ne lit jamais tes messages. Ton pseudo, ta photo et ta prime s'affichent sur le site et sur le Discord. Tu peux retirer ton avis quand tu veux." }),
          el("button", { class: "btn btn-plein", type: "button", onclick: creerAvis, disabled: creationEnCours, text: creationEnCours ? "On imprime l'affiche…" : "📜 Créer mon avis de recherche" }),
        ),
      ];
    } else {
      const prochain = p.prochainPalier;
      const part = prochain ? Math.min(1, p.prime / prochain) : 1;
      const sources = Object.entries(p.sources || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
      const maxSource = sources[0]?.[1] || 1;
      pourLa3D = { nom: p.nom, avatar: p.avatar || moi.avatar, prime: p.prime, tampon: p.tampon || null };
      contenu = [
        el("div", { class: `wanted-apercu${nouveau ? " placarde" : ""}` }, affiche(pourLa3D)),
        el("div", { class: "wanted-infos" },
          el("p", { class: "wanted-titre-pirate", text: p.titre }),
          el("p", { class: "wanted-grosse-prime", style: `--n: ${berrys(p.prime).length}` }, el("b", { class: "degrade", text: berrys(p.prime) })),
          el("p", { class: "wanted-rang", text: `N° ${p.rang} sur ${p.total} chasseur${p.total > 1 ? "s" : ""}${p.gainMois ? ` · ce mois-ci : +${berrys(p.gainMois)}${p.rangMois ? ` (n° ${p.rangMois})` : ""}` : ""}` }),
          prochain ? el("div", { class: "wanted-palier" },
            el("div", { class: "album-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.round(part * 100)}%` })),
            el("p", { class: "note", text: `Prochain palier : ${berrys(prochain)} (annoncé sur le Discord)` }),
          ) : null,
          el("ul", { class: "wanted-sources" }, sources.map(([k, v]) => el("li", {},
            el("span", { text: SOURCES_PRIME[k] || k }),
            el("i", { "aria-hidden": "true", style: `--part:${Math.max(4, Math.round((v / maxSource) * 100))}%` }),
            el("b", { text: berrys(v) }),
          ))),
          el("div", { class: "wanted-boutons" },
            el("a", { class: "btn btn-plein btn-petit", href: `/api/chopper?image=wanted&cle=${p.cle}&v=${p.prime}`, download: "wanted-barhaw.png", text: "Télécharger l'affiche" }),
            el("button", { class: "btn btn-contour btn-petit", type: "button", id: "wanted-partager", onclick: () => partagerAffiche(p), text: "Partager" }),
          ),
          el("p", { class: "note" }, "Sur le Discord : ", el("code", { text: "/wanted" }), " affiche ton avis pour tout le monde."),
          el("button", { class: `lien-discret${confirmerRetrait ? " danger" : ""}`, type: "button", onclick: retirerAvis, text: confirmerRetrait ? "Sûr ? Ta prime sera effacée. Clique encore pour retirer." : "Retirer mon avis de recherche" }),
        ),
      ];
    }
    vider(z, contenu);
    const ap = z.querySelector(".wanted-apercu");
    const a = ap?.querySelector(".wanted-affiche");
    poser3D("wanted", z, ap, a && pourLa3D ? [{ el: a, donnees: { ...pourLa3D, epingle: "rose", decor: true } }] : []);
  }

  // --- le mur des primes ---
  function rendreMurPrimes() {
    const z = $("mur-primes");
    if (!z) return;
    const s = infosChasse()?.primes;
    const onglet = (k, t) => el("button", { class: `onglet${ongletPrimes === k ? " actif" : ""}`, type: "button", role: "tab", "aria-selected": String(ongletPrimes === k), onclick: () => { ongletPrimes = k; rendreMurPrimes(); }, text: t });
    let corps;
    if (!s) corps = el("p", { class: "vide", text: donnees?.horsLigne ? "Le mur revient dans un instant." : "Le mur des primes arrive bientôt." });
    else if (ongletPrimes === "top") {
      const l = s.top || [];
      corps = l.length
        ? [
          el("div", { class: "mur" }, l.slice(0, 3).map((x, k) => el("div", { class: `mur-affiche rang-${k + 1}` },
            el("span", { class: "mur-rang", text: ["1er", "2e", "3e"][k] }),
            affiche({ nom: x.nom, avatar: x.avatar, prime: x.prime, petite: true }),
            el("span", { class: "mur-titre", text: x.titre }),
          ))),
          l.length > 3 ? el("ol", { class: "mur-liste", start: "4" }, l.slice(3).map((x) => el("li", {},
            x.avatar ? el("img", { src: x.avatar, alt: "", width: 32, height: 32, loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }),
            el("span", { class: "mur-nom", text: x.nom }),
            el("small", { text: x.titre }),
            el("b", { text: berrys(x.prime) }),
          ))) : null,
        ]
        : el("p", { class: "note", text: "Aucun avis de recherche placardé pour l'instant. Sois le premier !" });
    } else {
      const l = s.mois || [];
      corps = l.length
        ? el("ol", { class: "mur-liste mois" }, l.map((x) => el("li", {},
          x.avatar ? el("img", { src: x.avatar, alt: "", width: 32, height: 32, loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }),
          el("span", { class: "mur-nom", text: x.nom }),
          el("small", { text: `prime : ${berrys(x.prime)}` }),
          el("b", { text: `+${berrys(x.gain)}` }),
        )))
        : el("p", { class: "note", text: "Personne n'a encore gagné de berrys ce mois-ci." });
    }
    vider(z,
      el("div", { class: "mur-tete" },
        el("h3", { text: "Le mur des primes" }),
        el("div", { class: "onglets", role: "tablist", "aria-label": "Classement" }, onglet("top", "De tous les temps"), onglet("mois", "Ce mois-ci")),
      ),
      corps,
      s?.total ? el("p", { class: "note", text: `${s.total} avis de recherche placardé${s.total > 1 ? "s" : ""}. La prime ne baisse jamais ; le classement du mois repart à zéro le 1er.` }) : null,
    );
    if (BR.vu && !brDirect()) BR.rendu?.etat(brPourLa3D());
    // les trois premières affiches en 3D (médailles : la punaise en or, en argent, en bronze)
    const mur = z.querySelector(".mur");
    const trois = ongletPrimes === "top" ? (s?.top || []).slice(0, 3) : [];
    poser3D("mur", z, mur, mur ? [...mur.querySelectorAll(".wanted-affiche")].slice(0, trois.length).map((a, k) => ({ el: a, donnees: { nom: trois[k].nom, avatar: trois[k].avatar, prime: trois[k].prime, tampon: trois[k].tampon || null, epingle: ["or", "argent", "bronze"][k] } })) : []);
  }

  function rendreChasse() {
    if (Date.now() > animBossJusqua && !attaqueEnCours) rendreBoss();
    rendreWanted();
    rendreMurPrimes();
  }
  // pendant qu'on regarde la partie Chasse : les coups des autres arrivent toutes les 20 s
  async function rafraichirChasse() {
    try {
      const r = await fetch("/api/public", { headers: { Accept: "application/json" } });
      const d = await r.json();
      if (d && typeof d === "object" && !d.horsLigne) donnees = recevoirPublic({ ...d, evenements: d.evenements || donnees?.evenements || evenementsSecours() });
    } catch {}
    if (Date.now() > animBossJusqua && !attaqueEnCours) rendreBoss();
    rendreMurPrimes();
  }
  function suivreChasse() {
    const s = $("chasse");
    if (!s || !("IntersectionObserver" in window)) return;
    new IntersectionObserver((e) => { chasseVue = e.some((x) => x.isIntersecting); }, { rootMargin: "200px 0px" }).observe(s);
    setInterval(() => { if (chasseVue && !document.hidden) rafraichirChasse(); }, 20_000);
  }

  // ---------- La Battle Royale de GRAND LINE : « L'Île sans retour » (lib/battle.js du bot), en 3D sur le site ----------
  // Le dernier dimanche du mois, tous les avis de recherche sont lâchés sur une île ; le bot joue un round toutes les
  // 2 minutes. Le site montre l'île en 3D (js/battle-3d.js) : en direct pendant la battle (le duel du round avec les deux
  // avis de recherche en 3D face à face, ceux qui tombent, la marée qui monte, la fête du survivant), sinon la prochaine
  // battle et le dernier survivant. Le tonneau de rhum s'envoie d'ici. Entre deux battles, on peut revoir la dernière
  // (la rediff : son film, rejoué en accéléré), ou une battle de démonstration tant qu'il n'y en a pas eu.
  // Pas de résultat en avance : le bot montre au site l'île d'avant le round tant que Discord n'a pas montré le résultat.
  const BR = {
    d: null, vu: false, charge: false, rendu: null, minuteur: 0, horloge: 0, choix: null, moi: null, message: null, occupe: false, decal: 0, rounds: new Map(), echec: false,
    duel: null, // le face-à-face : { cle, a, b, enJeu, finale, round, phase: "suspense" | "verdict", t0, revele, res, gain }
    duelFin: 0,
    fete: null, // la fin d'une battle en direct, gardée à l'écran un moment : { direct, jusqua }
    rediff: null, // la rediff qu'on regarde : { film, pirates, i, phase, vitesse, pause, direct, minuteur, fin, reste, morts }
    rediffCharge: false,
    vuCle: "", vuRound: -1, vuFini: false, // ce qu'on a déjà vu passer (pour annoncer ce qui change)
    bandeaux: [], bandeau: 0, hud: null, sonFeu: 0, sonsPrets: false,
  };
  // là où les têtes d'affiche attendent la prochaine battle (des places de l'île, comme sur la carte du bot)
  const BR_PLACES = [[366, 384], [282, 274], [406, 266], [437, 466], [262, 568], [554, 310], [166, 440], [296, 152], [434, 578], [544, 470], [487, 148], [162, 294]];
  const brMaintenant = () => Date.now() + BR.decal;
  const brDuree = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    const j = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (j) return `${j} j ${h} h`;
    if (h) return `${h} h ${String(m).padStart(2, "0")}`;
    return m ? `${m} min ${String(s % 60).padStart(2, "0")}` : `${s % 60} s`;
  };
  // « Dimanche 27 décembre · 21 h »
  const brDate = (t, { heure = true } = {}) => {
    const o = { timeZone: "Europe/Paris" };
    const jour = new Date(t).toLocaleDateString("fr-FR", { ...o, weekday: "long", day: "numeric", month: "long" });
    const [hh, mm] = new Date(t).toLocaleTimeString("fr-FR", { ...o, hour: "2-digit", minute: "2-digit" }).split(":");
    return `${jour.charAt(0).toUpperCase()}${jour.slice(1)}${heure ? ` · ${Number(hh)} h${mm === "00" ? "" : ` ${mm}`}` : ""}`;
  };
  // la photo d'un pirate (les faux pirates des battles d'essai et de la démo ont un portrait inventé)
  const brPortrait = (p) => (Number.isInteger(p?.portrait) ? `/img/battle/portraits/${String(p.portrait).padStart(2, "0")}.png` : "");
  const photoPirate = (p) => (p?.avatar ? photoAffiche(p.avatar) : brPortrait(p));
  const EMOJIS_BR = { duel: "⚔️", trahison: "🗡️", alliance: "🤝", bete: "🦑", absurde: "🐟", piege: "🪤", maree: "🌊", coffre: "💰", esquive: "💨", rhum: "" };
  const brPetit = () => Math.min(window.innerWidth, window.innerHeight) < 700;
  // les bruitages de la battle : ceux du site (rien si le son est coupé)
  const BR_SONS = {
    suspense: [["taiko", 0.8]], roulement: [["br-roulement", 0.9]], choc: [["br-boum", 0.9], ["br-cymbale", 0.5]], tombe: [["impact", 0.55, 1.3]], plouf: [["cr-plouf", 0.8]],
    envol: [["cr-envol", 0.8]], bete: [["cr-baleine", 0.6, 2.6]], piege: [["impact", 0.45, 1]], epee: [["br-tic", 0.9]], coffre: [["cr-pieces", 0.8]], rhum: [["tonneau", 0.8]],
    alliance: [["paire", 0.7]], maree: [["br-onde", 0.8]], feu: [["br-feux", 0.45]], victoire: [["br-fanfare", 0.9], ["br-acclame", 0.7, 0, 0.8]], bandeau: [["souffle", 0.5]],
  };
  function brSon(nom) {
    if (nom === "feu") { if (performance.now() - BR.sonFeu < 1700) return; BR.sonFeu = performance.now(); }
    for (const [fichier, volume, duree = 0, retard = 0] of BR_SONS[nom] || []) jouerSon(fichier, { volume, duree, retard });
  }
  // ce qu'on montre : la rediff si on la regarde, sinon la battle en direct (ou sa fin, gardée un moment à l'écran)
  const brDirect = () => BR.rediff?.direct || BR.d?.direct || (BR.fete && BR.fete.jusqua > Date.now() ? BR.fete.direct : null);
  // ce que la 3D doit montrer
  function brPourLa3D() {
    const x = brDirect();
    if (x) {
      const survivant = x.fini ? x.pirates.find((p) => p.vivant) : null;
      return { mode: "direct", maree: x.maree, round: x.round, pirates: x.pirates, suspense: x.suspense, dernier: x.dernier, fete: survivant ? survivant.k : null, rythme: x.rediff ? 5 : 7 };
    }
    // en attendant : les têtes d'affiche du mur des primes sur l'île, et le dernier survivant couronné
    const d = BR.d;
    const top = (infosChasse()?.primes?.top || []).slice(0, 10);
    const surv = d?.dernier?.gagnant;
    const liste = surv && !top.some((y) => y.nom === surv.nom) ? [{ ...surv }, ...top.slice(0, 9)] : top;
    return {
      mode: "attente", maree: 0, round: 0, suspense: null, dernier: null,
      pirates: liste.map((y, k) => ({ k, nom: y.nom, avatar: y.avatar, prime: y.prime, x: BR_PLACES[k][0], y: BR_PLACES[k][1], vivant: true, top: surv ? y.nom === surv.nom : k === 0, vies: 1 })),
    };
  }
  async function brCharger3D() {
    if (BR.charge || BR.echec) return;
    BR.charge = true;
    try {
      const { creerBattle3D, chargerIle } = await import("/js/battle-3d.js");
      // l'île faite dans Blender (la version légère sur un petit écran) ; si elle ne vient pas, le site la dessine lui-même
      const ile = await chargerIle({ petit: brPetit() });
      BR.rendu = creerBattle3D($("btl-toile"), {
        couche: $("btl-couche"), petit: brPetit(), reduit: reduit.matches, photo: photoAffiche, son: brSon, ile,
        surPirate: (k) => { const x = BR.d?.direct; if (x && !x.fini && !BR.rediff) { BR.choix = k; brRendreCote(); $("btl-cote")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); } },
      });
      $("btl-toile").addEventListener("battle-perdu", () => { BR.echec = true; BR.rendu = null; $("btl-scene")?.classList.remove("btl-3d"); }, { once: true });
      $("btl-scene").classList.add("btl-3d");
      BR.rendu.vitesse(BR.rediff?.vitesse || 1);
      BR.rendu.pause(!BR.vu || document.hidden);
      BR.rendu.etat(brPourLa3D());
    } catch {
      BR.echec = true; // pas de WebGL : la scène reste une belle image fixe
      BR.rendu = null;
    }
  }
  async function brCharger() {
    clearTimeout(BR.minuteur);
    const avant = BR.d?.direct;
    try {
      const r = await fetch("/api/battle", { headers: { Accept: "application/json" } });
      const d = await r.json();
      if (d?.maintenant) BR.decal = d.maintenant - Date.now();
      // pendant le suspense du dernier duel, le bot sait déjà que la battle est finie : ici, rien n'est fini avant le
      // résultat (sinon la fête partirait sur l'un des deux finalistes, avec « C'EST FINI », avant le verdict)
      if (d?.direct?.suspense) d.direct.fini = false;
      if (d && !d.horsLigne) BR.d = d;
      else if (!BR.d) BR.d = d;
    } catch {
      if (!BR.d) BR.d = { horsLigne: true };
    }
    const x = BR.d?.direct;
    // la battle vient de finir : on garde la fête du survivant à l'écran un moment
    if (avant?.fini && !x && !BR.d?.horsLigne) {
      BR.fete = { direct: { ...avant, suspense: null }, jusqua: Date.now() + 40_000 };
      setTimeout(() => { BR.fete = null; brRendre(); }, 40_200);
    }
    if (x) {
      BR.fete = null;
      if (BR.rediff) brRediffQuitter({ rendre: false }); // une vraie battle commence : on arrête la rediff
      if (x.dernier && !BR.rounds.has(x.dernier.round)) BR.rounds.set(x.dernier.round, x.dernier);
      if (moi?.connecte && !BR.moi) brMoi();
    } else if (!BR.rediff && !BR.fete) BR.rounds.clear();
    brRendre();
    const ms = document.hidden ? 60_000 : x ? (x.suspense ? 1500 : 3000) : BR.vu ? 30_000 : 180_000;
    BR.minuteur = setTimeout(brCharger, ms);
  }
  // le membre connecté : son pirate sur l'île, son tonneau
  async function brAgir(action, extra = {}) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
      if (d.moi) BR.moi = d.moi;
      return d;
    } catch {
      return { erreur: "reseau", texte: "Le tonneau n'est pas parti, réessaie." };
    }
  }
  async function brMoi() { await brAgir("battle"); brRendreCote(); }
  async function brTonneau() {
    if (BR.occupe || BR.choix == null) return;
    BR.occupe = true;
    brRendreCote();
    const d = await brAgir("battle-rhum", { pour: BR.choix });
    BR.occupe = false;
    BR.message = { texte: d.texte || d.erreur || "C'est parti !", erreur: !d.ok };
    brRendreCote();
  }
  // un grand titre passe sur l'île (le round, la marée, le survivant) ; ils passent l'un après l'autre
  function brBandeau(titre, sous = "", classe = "") {
    BR.bandeaux.push({ titre, sous, classe });
    if (!BR.bandeau) brBandeauSuivant();
  }
  function brBandeauSuivant() {
    const scene = $("btl-scene");
    const b = BR.bandeaux.shift();
    if (!b || !scene || !BR.vu || document.hidden) { BR.bandeaux.length = 0; BR.bandeau = 0; return; }
    const e = el("div", { class: `btl-bandeau ${b.classe}`, "aria-hidden": "true" }, el("b", { text: b.titre }), b.sous ? el("span", { text: b.sous }) : null);
    scene.append(e);
    brSon("bandeau");
    BR.bandeau = setTimeout(() => { e.remove(); BR.bandeau = 0; brBandeauSuivant(); }, reduit.matches ? 1500 : 2300);
  }
  // ce qui vient de changer sur l'île : un nouveau duel, son résultat, un nouveau round, la marée, la fin
  function brSuivre() {
    const x = brDirect();
    const cle = x ? `${x.rediff ? "r" : "d"}${x.debut}` : "";
    if (cle !== BR.vuCle) {
      // une autre battle (ou plus de battle) : on repart de ce qu'on voit, sans rien annoncer
      BR.vuCle = cle;
      BR.vuRound = x ? x.dernier?.round ?? 0 : -1;
      BR.vuFini = Boolean(x?.fini);
      clearTimeout(BR.duelFin);
      BR.duel = null;
    }
    if (!x) return;
    const vitesse = BR.rediff?.vitesse || 1;
    const s = x.suspense;
    const cleDuel = s ? `${s.round}-${s.a}-${s.b}` : "";
    if (s && BR.duel?.cle !== cleDuel) {
      clearTimeout(BR.duelFin);
      BR.duel = { cle: cleDuel, a: s.a, b: s.b, enJeu: s.enJeu, finale: s.finale, round: s.round, phase: "suspense", t0: Date.now(), revele: s.revele, roulement: false, res: null, gain: 0 };
      brBandeau(s.finale ? "LA FINALE" : `ROUND ${s.round}`, s.finale ? "Les deux derniers pirates" : "Le duel du round", "duel");
    }
    const r = x.dernier?.round ?? 0;
    if (r !== BR.vuRound) {
      const suite = r === BR.vuRound + 1;
      BR.vuRound = r;
      const du = x.dernier?.duel;
      if (suite && BR.duel?.phase === "suspense" && du && ((du.a === BR.duel.a && du.b === BR.duel.b) || (du.a === BR.duel.b && du.b === BR.duel.a))) {
        // le résultat du duel qu'on attendait : le face-à-face reste encore un peu, avec le verdict
        const tag = (x.dernier.fil || []).find((l) => l.type === "duel" && l.a === du.gagnant && l.b === du.perdant)?.tag || "";
        BR.duel = { ...BR.duel, phase: "verdict", t0: Date.now(), res: du, gain: /฿/.test(tag) ? Number(tag.replace(/\D/g, "")) || 0 : 0 };
        clearTimeout(BR.duelFin);
        BR.duelFin = setTimeout(() => { BR.duel = null; brRendreVs(); }, (x.fini ? 3400 : 4700) / vitesse);
      } else if (!s) {
        clearTimeout(BR.duelFin);
        BR.duel = null;
        if (suite) brBandeau(x.dernier.finale ? "LA FINALE" : `ROUND ${r}`);
      }
      if (suite && x.dernier?.mareeMonte) brBandeau("LA MARÉE MONTE", x.maree >= 4 ? "Il ne reste que le volcan" : "L'île rétrécit", "maree");
    } else if (!s && BR.duel?.phase === "suspense") BR.duel = null; // (le duel s'est arrêté sans résultat)
    if (x.fini && !BR.vuFini) {
      // le nom du survivant passe en grand (après le verdict du dernier duel, s'il est encore à l'écran)
      const g = x.pirates.find((p) => p.vivant);
      if (g) setTimeout(() => { if (brDirect()?.fini) brBandeau(g.nom, "survit à l'Île sans retour", "fete"); }, BR.duel ? 3500 / vitesse : 0);
    }
    BR.vuFini = Boolean(x.fini);
  }
  function brRendre() {
    brSuivre();
    BR.rendu?.etat(brPourLa3D());
    brRendreHud();
    brRendreVs();
    brRendreFil();
    brRendreCote();
  }
  // par-dessus l'île : le round, les chiffres, le compte à rebours (ou les boutons de la rediff). On ne refait le
  // bandeau que s'il change vraiment (sinon un clic sur un de ses boutons pourrait se perdre) ; le chrono, lui, bouge seul.
  function brRendreHud() {
    const z = $("btl-hud");
    if (!z) return;
    const d = BR.d;
    const x = brDirect();
    if (x) {
      const R = x.rediff ? BR.rediff : null;
      const etiquette = R ? (R.demo ? "DÉMO" : "REDIFF") : x.essai ? "ESSAI" : "EN DIRECT";
      const round = x.fini ? "C'EST FINI" : x.suspense?.finale ? "LA FINALE" : (x.suspense?.round || x.round) ? `ROUND ${x.suspense?.round || x.round} / ${x.rounds}` : "LE DÉBARQUEMENT";
      const cle = `d|${etiquette}|${round}|${x.debout}|${x.primeEnVie}|${x.maree}|${R ? `${R.pause}|${R.vitesse}` : ""}`;
      if (BR.hud?.cle !== cle) {
        const chrono = R ? null : el("p", { class: "btl-chrono" });
        vider(z,
          el("div", { class: "btl-hud-haut" },
            el("p", { class: `btl-direct${R ? " rediff" : ""}` }, el("span", { class: "btl-point", "aria-hidden": "true" }), etiquette, el("b", { text: round })),
            R ? el("div", { class: "btl-commandes" },
              el("button", { type: "button", class: "btl-bouton", onclick: brRediffPause, "aria-label": R.pause ? "Reprendre la rediff" : "Mettre la rediff en pause" }, R.pause ? "▶" : "⏸", el("span", { class: "btl-long", text: R.pause ? " Reprendre" : " Pause" })),
              el("button", { type: "button", class: "btl-bouton", onclick: brRediffVitesse, "aria-label": "Changer la vitesse de la rediff", text: R.vitesse === 1 ? "×1" : "×2" }),
              el("button", { type: "button", class: "btl-bouton", onclick: () => brRediffQuitter(), "aria-label": "Fermer la rediff" }, "✕", el("span", { class: "btl-long", text: " Fermer" })),
            ) : chrono,
          ),
          el("div", { class: "btl-chiffres" },
            el("p", {}, el("b", { text: String(x.debout) }), el("span", { text: ` / ${x.total} debout` })),
            el("p", {}, el("b", { class: "degrade", text: berrys(x.primeEnVie) }), el("span", { text: " en vie" })),
            el("p", { class: "btl-maree", text: x.maree ? `🌊 Marée ${x.maree}/4` : "🌊 Marée basse" }),
          ),
        );
        BR.hud = { cle, chrono, dans: null };
      }
      if (BR.hud.chrono) {
        const reste = x.suspense ? x.suspense.revele - brMaintenant() : x.prochainRound - brMaintenant();
        const texte = x.fini ? "🏆 Le survivant est là !" : x.suspense || reste > 0 ? brDuree(Math.max(0, reste)) : "Le round se joue…";
        const long = x.fini || !(x.suspense || reste > 0) ? "" : x.suspense ? "Résultat dans " : "Prochain round dans ";
        if (BR.hud.chrono.dataset.t !== long + texte) {
          BR.hud.chrono.dataset.t = long + texte;
          vider(BR.hud.chrono, long ? el("span", { class: "btl-long", text: long }) : null, long ? el("span", { class: "btl-court", "aria-hidden": "true", text: "⏱ " }) : null, texte);
        }
      }
      return;
    }
    const p = d?.prochaine;
    const der = d?.dernier;
    const chasseur = Boolean(maChasse?.primes?.actif);
    const revoir = Boolean(der?.rediff);
    const cle = `a|${p?.quand}|${p?.pirates}|${p?.primes}|${chasseur}|${der?.gagnant?.nom}|${der?.nb}|${revoir}|${BR.rediffCharge}|${Boolean(d?.horsLigne)}`;
    if (BR.hud?.cle !== cle) {
      const dans = p ? el("p", { class: "btl-attente-dans" }) : null;
      vider(z,
        el("div", { class: "btl-attente" },
          el("p", { class: "btl-attente-sur", text: p ? "Prochaine battle" : "La Battle Royale" }),
          el("p", { class: "btl-attente-date", text: p ? brDate(p.quand) : d?.horsLigne ? "Le bot fait une pause, reviens vite." : "Bientôt" }),
          dans,
          p ? el("p", { class: "btl-attente-chiffres", text: `${p.pirates} pirate${p.pirates > 1 ? "s" : ""} · ${berrys(p.primes)} de primes en jeu` }) : null,
          chasseur ? el("p", { class: "btl-attente-toi", text: "⚔️ Tu y seras : ton avis de recherche te sert de billet." })
            : el("a", { class: "btn btn-plein btn-petit", href: "#wanted", text: "📜 Crée ton avis de recherche pour y être" }),
          // revoir la dernière battle sur l'île (ou une battle de démonstration, tant qu'il n'y en a pas eu)
          el("button", { type: "button", class: "btn btn-petit btl-revoir", disabled: BR.rediffCharge, onclick: brRediffOuvrir, text: BR.rediffCharge ? "Ça arrive…" : revoir ? "▶ Revoir la dernière battle" : "▶ Voir une battle (démo)" }),
        ),
        der?.gagnant ? el("div", { class: "btl-survivant" }, el("span", { text: "Dernier survivant" }), el("b", { text: der.gagnant.nom }), el("small", { text: `parmi ${der.nb} pirates` })) : null,
      );
      BR.hud = { cle, chrono: null, dans };
    }
    if (BR.hud.dans && p) {
      const t = `dans ${brDuree(p.quand - brMaintenant())}`;
      if (BR.hud.dans.textContent !== t) BR.hud.dans.textContent = t;
    }
  }
  // le face-à-face du duel : les deux avis de recherche de chaque côté de l'île (en 3D sur ordinateur : la photo sort
  // de l'affiche, elles tremblent pendant le suspense) ; au résultat, ÉLIMINÉ claque sur le perdant et son affiche se
  // décroche, la prime du gagnant monte
  function brRendreVs() {
    const vs = $("btl-vs");
    const scene = $("btl-scene");
    if (!vs || !scene) return;
    const x = brDirect();
    const D = x ? BR.duel : null;
    const a = D ? x.pirates[D.a] : null, b = D ? x.pirates[D.b] : null;
    if (!D || !a || !b) {
      if (!vs.hidden || vs.dataset.cle) { vs.hidden = true; vs.dataset.cle = ""; vs.className = "btl-vs"; vider(vs); poser3D("duel", scene, null, []); }
      return;
    }
    if (vs.dataset.cle !== D.cle) {
      vs.dataset.cle = D.cle;
      const carte = (p, cote) => el("div", { class: `btl-vs-affiche ${cote}` }, affiche({ nom: p.nom, avatar: photoPirate(p), prime: p.prime, petite: true }));
      vider(vs, carte(a, "bleu"), el("p", { class: "btl-vs-mot", text: "VS" }), carte(b, "rouge"), el("p", { class: "btl-vs-enjeu" }));
      vs.hidden = false;
    }
    const verdict = D.phase === "verdict";
    const [ea, eb] = vs.querySelectorAll(".btl-vs-affiche");
    const enjeu = vs.querySelector(".btl-vs-enjeu");
    if (!ea || !eb || !enjeu) return;
    const en3D = !brPetit() && !W3D.echec; // les affiches en 3D par-dessus (sur les petits écrans, celles de la page suffisent)
    vs.className = `btl-vs${verdict ? " verdict" : ""}${en3D ? " en-3d" : ""}`;
    const gagnant = verdict ? x.pirates[D.res.gagnant] : null, perdant = verdict ? x.pirates[D.res.perdant] : null;
    for (const [e, p] of [[ea, a], [eb, b]]) {
      e.classList.toggle("gagne", Boolean(verdict && p.k === gagnant?.k));
      e.classList.toggle("perdu", Boolean(verdict && p.k === perdant?.k && D.res.mort));
    }
    const texte = verdict
      ? (D.res.mort ? `🏆 ${gagnant?.nom || "?"} l'emporte${D.gain ? ` : +${berrys(D.gain)}` : ""}` : `🛡️ ${perdant?.nom || "?"} tient bon !`)
      : `${D.finale ? "LA FINALE · " : ""}${berrys(D.enJeu)} de primes en jeu`;
    if (enjeu.textContent !== texte) enjeu.textContent = texte;
    // le roulement de tambour, juste avant le résultat
    if (!verdict && !D.roulement && D.revele - brMaintenant() < 2100) { D.roulement = true; brSon("roulement"); }
    if (!en3D) return;
    const tension = verdict ? 0 : Math.min(1, 0.25 + (Date.now() - D.t0) / 7000);
    const donnees = (p, epingle) => ({
      nom: p.nom, avatar: p.avatar || brPortrait(p), epingle,
      prime: p.prime + (verdict && p.k === gagnant?.k && D.res.mort ? D.gain : 0),
      tension, gagne: Boolean(verdict && p.k === gagnant?.k && D.res.mort),
      tampon: verdict && p.k === perdant?.k && D.res.mort ? "elimine" : null,
      tombe: Boolean(verdict && p.k === perdant?.k && D.res.mort),
    });
    poser3D("duel", scene, vs, [
      { el: ea.querySelector(".wanted-affiche"), donnees: donnees(a, "argent") },
      { el: eb.querySelector(".wanted-affiche"), donnees: donnees(b, "bronze") },
    ], { ombre: false });
  }
  // sous l'île : ce qui s'est passé (les derniers rounds), ou le dernier podium
  function brRendreFil() {
    const z = $("btl-fil");
    if (!z) return;
    const d = BR.d;
    const x = brDirect();
    if (x) {
      const rounds = [...BR.rounds.values()].sort((a, b) => b.round - a.round).slice(0, 4);
      vider(z, el("h3", { text: "Ce qui se passe sur l'île" }),
        rounds.length ? rounds.map((r) => el("div", { class: "btl-round" },
          el("p", { class: "btl-round-titre", text: r.finale ? "La finale" : `Round ${r.round}` }),
          r.mareeMonte ? el("p", { class: "btl-ligne maree", text: "🌊 La marée monte : l'île rétrécit." }) : null,
          (r.fil || []).map((l) => el("p", { class: `btl-ligne ${l.type}` }, `${EMOJIS_BR[l.type] ? `${EMOJIS_BR[l.type]} ` : ""}${l.texte}`, /฿/.test(l.tag || "") ? el("b", { text: ` ${l.tag}` }) : null)),
        )) : el("p", { class: "note", text: x.suspense ? "Le premier duel se joue…" : "Les pirates débarquent. Le premier round arrive." }));
      return;
    }
    const der = d?.dernier;
    vider(z, el("h3", { text: der ? "La dernière battle" : "Comment ça se passe" }),
      der ? el("ol", { class: "btl-podium" }, (der.podium || []).map((p, k) => el("li", { class: `rang-${k + 1}` },
        p?.avatar ? el("img", { src: p.avatar, alt: "", width: 40, height: 40, loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }),
        el("span", { class: "btl-podium-nom", text: p?.nom || "?" }),
        el("b", { text: ["1 000 000 ฿", "250 000 ฿", "100 000 ฿"][k] || "" })))) : null,
      el("ul", { class: "btl-regles" },
        el("li", { text: "⚔️ Un round toutes les 2 minutes, une quarantaine de minutes en tout : des duels, des créatures, des pièges, des trahisons. La marée monte 4 fois." }),
        el("li", { text: "💪 Plus ta prime est grosse, plus tu es fort. Mais les grosses têtes se font viser, et la chance compte toujours." }),
        el("li", { text: "🍺 Pendant la battle, chacun envoie un tonneau de rhum à un pirate : une vie de plus pour lui." }),
        el("li", { text: "🏆 10 000 ฿ pour chaque participant, 20 000 ฿ + 10 % de la prime pour chaque duel gagné, 1 000 000 ฿ et le tampon SURVIVANT pour le dernier debout. Personne ne mise, personne ne perd rien." }),
      ),
      d?.survivants?.length > 1 ? el("p", { class: "note", text: `Les survivants : ${d.survivants.map((y) => y.nom).join(", ")}` }) : null,
    );
  }
  // à côté : le tonneau de rhum (pendant la battle), la rediff (quand on la regarde), ou les têtes d'affiche
  function brRendreCote() {
    const z = $("btl-cote");
    if (!z) return;
    const x = brDirect();
    if (x?.rediff) {
      const R = BR.rediff;
      const debout = x.pirates.filter((p) => p.vivant).sort((a, b) => b.prime - a.prime).slice(0, 6);
      vider(z, el("h3", { text: R.demo ? "Une battle de démonstration" : "La rediff" }),
        el("p", { class: "note", text: R.demo
          ? `Des pirates inventés, pour voir comment ça se passe.${BR.d?.prochaine ? ` La vraie : ${brDate(BR.d.prochaine.quand).toLowerCase()}.` : ""}`
          : `La battle du ${brDate(R.debut, { heure: false }).toLowerCase()}, rejouée en accéléré.` }),
        debout.length ? el("ol", { class: "btl-tetes" }, debout.map((p) => el("li", {},
          photoPirate(p) ? el("img", { src: photoPirate(p), alt: "", width: 32, height: 32, loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }),
          el("span", { text: p.nom }), el("b", { text: berrys(p.prime) })))) : null,
        el("p", { class: "note", text: x.fini ? "🏆 Et voilà le survivant." : `Encore debout : ${x.debout} sur ${x.total}.` }),
        el("button", { class: "btn btn-petit", type: "button", onclick: () => brRediffQuitter(), text: "✕ Fermer" }));
      return;
    }
    if (!x || x.fini) {
      const top = (infosChasse()?.primes?.top || []).slice(0, 5);
      vider(z, el("h3", { text: "Les têtes d'affiche" }),
        top.length ? el("ol", { class: "btl-tetes" }, top.map((p) => el("li", {},
          p.avatar ? el("img", { src: p.avatar, alt: "", width: 32, height: 32, loading: "lazy", referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }),
          el("span", { text: p.nom }), el("b", { text: berrys(p.prime) })))) : el("p", { class: "note", text: "Pas encore d'avis de recherche." }),
        el("p", { class: "note", text: "Les plus grosses primes du serveur : ce sont elles qu'on vise en premier sur l'île." }));
      return;
    }
    const vivants = x.pirates.filter((p) => p.vivant).sort((a, b) => b.prime - a.prime);
    const monPirate = BR.moi?.pirate != null ? x.pirates[BR.moi.pirate] : null;
    const donne = BR.moi?.tonneau != null ? x.pirates[BR.moi.tonneau] : null;
    let action;
    if (!moi?.connecte) action = [el("p", { text: "Connecte-toi avec Discord pour envoyer ton tonneau de rhum à un pirate." }), el("a", { class: "btn btn-plein btn-petit", href: "/api/auth/login", text: "Se connecter avec Discord" })];
    else if (donne) action = el("p", { class: "btl-donne", text: `🍺 Ton tonneau est parti vers ${donne.nom}.` });
    else {
      const choisi = BR.choix != null ? x.pirates[BR.choix] : null;
      action = [
        el("p", { class: "note", text: "Choisis un pirate (ici, ou en cliquant son affiche sur l'île) : il pourra encaisser un coup de plus. Un tonneau par personne et par battle." }),
        el("div", { class: "btl-choix" }, vivants.slice(0, 24).map((p) => el("button", {
          class: `btl-pirate${BR.choix === p.k ? " choisi" : ""}${monPirate?.k === p.k ? " moi" : ""}`, type: "button", disabled: monPirate?.k === p.k,
          onclick: () => { BR.choix = p.k; BR.rendu?.focus(p.k); brRendreCote(); },
        }, photoPirate(p) ? el("img", { src: photoPirate(p), alt: "", width: 28, height: 28, referrerpolicy: "no-referrer" }) : el("span", { class: "mur-sans" }), el("span", { text: p.nom }), el("small", { text: `${p.vies > 1 ? `${p.vies} vies · ` : ""}${berrys(p.prime)}` })))),
        el("button", { class: "btn btn-plein", type: "button", disabled: !choisi || BR.occupe, onclick: brTonneau, text: BR.occupe ? "Le tonneau roule…" : choisi ? `🍺 Envoyer le tonneau à ${choisi.nom}` : "🍺 Choisis un pirate" }),
      ];
    }
    vider(z, el("h3", { text: "Ton tonneau de rhum" }),
      monPirate ? el("p", { class: "btl-toi", text: monPirate.vivant ? `⚔️ Tu es sur l'île : ${monPirate.vies} vie${monPirate.vies > 1 ? "s" : ""}${monPirate.kills ? `, ${monPirate.kills} pirate${monPirate.kills > 1 ? "s" : ""} éliminé${monPirate.kills > 1 ? "s" : ""}` : ""}.` : `💀 Tu es tombé au round ${monPirate.mort?.round ?? "?"}. Tu peux encore aider un autre pirate.` }) : null,
      action,
      BR.message ? el("p", { class: `note${BR.message.erreur ? " erreur" : ""}`, role: "status", text: BR.message.texte }) : null,
    );
  }

  // --- la rediff : le film de la dernière battle (ou la démo), rejoué sur l'île en accéléré ---
  // Le film : { pirates: [{ nom, avatar, portrait, prime }], film: [{ r, m, p: [[x, y, debout, vies]…], f, mm, fil, duel }…] }
  // (une image par round ; la première est le débarquement). Chaque round se rejoue en deux temps, comme en direct : le
  // suspense du duel (l'île d'avant le round), puis le résultat.
  const BR_DUREES = { debut: 2.8, suspense: 3.8, resultat: 5.8, sansDuel: 4.4, fete: 12 }; // en secondes (à vitesse ×1)
  async function brRediffOuvrir() {
    if (BR.rediff || BR.rediffCharge || BR.d?.direct) return;
    BR.rediffCharge = true;
    brRendreHud();
    let f = null;
    if (BR.d?.dernier?.rediff) {
      try { const d = await (await fetch("/api/battle?rediff=1", { headers: { Accept: "application/json" } })).json(); if (d?.film?.length > 1 && d.pirates?.length) f = d; } catch {}
    }
    if (!f) {
      try { const d = await (await fetch("/img/battle/demo.json")).json(); if (d?.film?.length > 1 && d.pirates?.length) f = { ...d, demo: true }; } catch {}
    }
    BR.rediffCharge = false;
    if (!f || BR.d?.direct) { brRendre(); return; }
    BR.fete = null;
    BR.rounds.clear();
    BR.rediff = { ...f, cle: Date.now(), i: 0, phase: "debut", vitesse: 1, pause: false, direct: null, minuteur: 0, fin: 0, reste: 0, morts: new Map() };
    prechargerSons([...new Set(Object.values(BR_SONS).flat().map((s) => s[0]))]);
    brRediffMontrer();
    $("btl-scene")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  // l'état de l'île à ce moment du film, sous la même forme que le direct du bot
  function brRediffDirect(R) {
    const img = R.film[R.i], avant = R.film[Math.max(0, R.i - 1)];
    const suspense = R.phase === "suspense";
    const e = suspense ? avant : img;
    const dernierDe = (f) => (f?.fil ? { round: f.r, finale: Boolean(f.f), mareeMonte: Boolean(f.mm), fil: f.fil, duel: f.duel || null } : null);
    if (!suspense && img.fil) {
      // ceux qui tombent à ce round, et comment (la ligne qui les concerne)
      for (const l of img.fil) if (l.b != null && avant.p[l.b]?.[2] && !img.p[l.b]?.[2] && !R.morts.has(l.b)) R.morts.set(l.b, { round: img.r, cause: l.type === "trahison" ? "trahison" : l.type });
      img.p.forEach((q, k) => { if (!q[2] && !R.morts.has(k)) R.morts.set(k, { round: img.r, cause: "duel" }); });
    }
    const debout = e.p.map((q, k) => (q[2] ? k : -1)).filter((k) => k >= 0);
    const tete = [...debout].sort((a, b) => R.pirates[b].prime - R.pirates[a].prime)[0];
    const fin = R.phase === "fete" || (R.phase === "resultat" && debout.length <= 1);
    const t = Date.now();
    return {
      rediff: true, essai: false, debut: R.cle, round: e.r, rounds: R.rounds || R.film.length - 1, maree: e.m, debout: debout.length, total: R.pirates.length,
      primeEnVie: debout.reduce((s, k) => s + (R.pirates[k].prime || 0), 0), totalPrimes: R.total || 0,
      pirates: R.pirates.map((p, k) => ({
        k, nom: p.nom, avatar: p.avatar || "", portrait: p.portrait ?? null, prime: p.prime, x: e.p[k][0], y: e.p[k][1],
        vivant: Boolean(e.p[k][2]), vies: e.p[k][3] || 1, top: k === tete, kills: 0, mort: e.p[k][2] ? null : R.morts.get(k) || { round: e.r, cause: "duel" },
      })),
      dernier: dernierDe(e),
      suspense: suspense ? { a: img.duel.a, b: img.duel.b, enJeu: img.duel.enJeu, finale: Boolean(img.f), round: img.r, revele: t + BR.decal + (BR_DUREES.suspense * 1000) / R.vitesse } : null,
      prochainRound: 0, fini: fin, enAttente: false,
    };
  }
  function brRediffMontrer() {
    const R = BR.rediff;
    if (!R) return;
    R.direct = brRediffDirect(R);
    if (R.direct.dernier) BR.rounds.set(R.direct.dernier.round, R.direct.dernier);
    BR.rendu?.vitesse(R.vitesse);
    brRendre();
    const duree = R.phase === "debut" ? BR_DUREES.debut : R.phase === "suspense" ? BR_DUREES.suspense : R.phase === "fete" ? BR_DUREES.fete
      : R.film[R.i].duel ? BR_DUREES.resultat : BR_DUREES.sansDuel + Math.max(0, (R.film[R.i].fil?.length || 0) - 3) * 0.5;
    brRediffAttendre((duree * 1000) / R.vitesse);
  }
  function brRediffAttendre(ms) {
    const R = BR.rediff;
    clearTimeout(R.minuteur);
    R.fin = Date.now() + ms;
    R.minuteur = setTimeout(brRediffSuite, ms);
  }
  function brRediffSuite() {
    const R = BR.rediff;
    if (!R || R.pause) return;
    if (R.phase === "fete") { brRediffQuitter(); return; }
    if (R.phase === "suspense") R.phase = "resultat";
    else if (R.i >= R.film.length - 1) R.phase = "fete";
    else { R.i++; R.phase = R.film[R.i].duel ? "suspense" : "resultat"; }
    brRediffMontrer();
  }
  function brRediffPause() {
    const R = BR.rediff;
    if (!R) return;
    R.pause = !R.pause;
    if (R.pause) { clearTimeout(R.minuteur); R.reste = Math.max(0, R.fin - Date.now()); } else brRediffAttendre(R.reste || 300);
    brRendreHud();
  }
  function brRediffVitesse() {
    const R = BR.rediff;
    if (!R) return;
    const reste = R.pause ? R.reste : Math.max(0, R.fin - Date.now());
    const avant = R.vitesse;
    R.vitesse = R.vitesse === 1 ? 2 : 1;
    BR.rendu?.vitesse(R.vitesse);
    if (R.pause) R.reste = (reste * avant) / R.vitesse; else brRediffAttendre((reste * avant) / R.vitesse);
    brRendreHud();
  }
  function brRediffQuitter({ rendre = true } = {}) {
    const R = BR.rediff;
    if (!R) return;
    clearTimeout(R.minuteur);
    clearTimeout(BR.duelFin);
    BR.rediff = null;
    BR.duel = null;
    BR.rounds.clear();
    BR.bandeaux.length = 0;
    BR.rendu?.vitesse(1);
    if (rendre) brRendre();
  }
  function brDemarrer() {
    const s = $("battle");
    if (!s) return;
    new IntersectionObserver(([e]) => {
      BR.vu = e.isIntersecting;
      BR.rendu?.pause(!BR.vu || document.hidden);
      if (BR.vu && !BR.charge) brCharger3D();
      if (BR.vu && !BR.sonsPrets) { BR.sonsPrets = true; prechargerSons(["taiko", "br-roulement", "br-boum", "impact", "cr-plouf", "br-tic", "cr-pieces", "tonneau", "br-tampon", "carte"]); }
      if (BR.vu) brCharger();
    }, { threshold: 0.08 }).observe(s);
    document.addEventListener("visibilitychange", () => { BR.rendu?.pause(!BR.vu || document.hidden); });
    // le compte à rebours bouge tout seul, la tension du face-à-face monte
    BR.horloge = setInterval(() => { if (BR.vu && !document.hidden) { brRendreHud(); if (BR.duel) brRendreVs(); } }, 1000);
    brCharger();
  }

  // ---------- La Faille des potes : le défi LoL de la semaine ----------
  // Le bot suit les games des membres qui ont relié leur compte (leur Riot ID, puis une icône de profil à mettre)
  // et les note de S+ à D selon leur rôle. La page montre la game de la semaine, le podium et les dernières games ;
  // au membre connecté : relier son compte, ses games de la semaine, le retirer. Son Riot ID n'est montré qu'à lui.
  let maFaille = null; // { actif, lie, riot, attente: { riot, icone, image, expire }, semaine: { points, rang, sur, games } }
  let faillePasMembre = false;
  let failleOccupee = false;
  let failleMessage = null; // { texte, erreur }
  let confirmerRetraitFaille = false;
  let failleCelebrer = false; // « リンク! » juste après la liaison
  let minuteurFaille = 0;
  const cleFaille = {}; // ce qui est déjà affiché, partie par partie (pour ne pas tout redessiner chaque minute)
  const infosFaille = () => donnees?.faille || null;
  const NOTES_FAILLE = { "S+": "splus", S: "s", A: "a", B: "b", C: "c", D: "d" };
  const ROLES_FAILLE = { TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support" };
  const kda = (g) => `${g.k} / ${g.d} / ${g.a}`;
  const enMinutes = (s) => `${Math.max(1, Math.round((Number(s) || 0) / 60))} min`;
  const pluriel = (n, mot) => `${nombre(n)} ${mot}${n > 1 ? "s" : ""}`;
  function ilYa(t) {
    const m = Math.max(1, Math.round((Date.now() - ms(t)) / 60_000));
    if (m < 60) return `il y a ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const j = Math.round(h / 24);
    return j === 1 ? "hier" : `il y a ${j} jours`;
  }
  // la remise à zéro : lundi à 0 h, heure de Paris
  function avantLundi() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    const jour = Math.max(0, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday));
    const reste = Math.max(1, (7 - jour) * 1440 - (Number(p.hour) * 60 + Number(p.minute)));
    const j = Math.floor(reste / 1440);
    const h = Math.floor((reste % 1440) / 60);
    return j ? `Fin dans ${j} j ${h} h` : `Fin dans ${h} h ${String(reste % 60).padStart(2, "0")}`;
  }

  // l'icône d'un champion (Data Dragon) ; sans elle (pas encore chargée, pas de réseau), ses initiales
  function visageChampion(g, classe = "") {
    const nom = String(g?.champion || "");
    const src = lienSur(g?.image);
    return el("span", { class: `fl-champ ${classe}`.trim(), title: nom || null },
      el("b", { "aria-hidden": "true", text: nom.replace(/[^A-Za-z]/g, "").slice(0, 2) || "?" }),
      src ? el("img", { src, alt: nom, width: 120, height: 120, loading: "lazy", decoding: "async", onerror: (e) => e.currentTarget.remove() }) : null,
    );
  }
  const tamponNote = (note, classe = "") => el("span", { class: `fl-note n-${NOTES_FAILLE[note] || "d"} ${classe}`.trim(), text: note || "?" });

  // une game en carte : le champion, la note en tampon, le KDA, les raisons de la note
  function carteGame(g) {
    return el("article", { class: `fl-game n-${NOTES_FAILLE[g.note] || "d"}${g.win ? " gagnee" : " perdue"}` },
      el("div", { class: "fl-game-haut" },
        visageChampion(g),
        el("div", { class: "fl-game-titre" },
          el("strong", { text: g.nom }),
          el("span", { text: `${g.champion} · ${ROLES_FAILLE[g.role] || g.role}` }),
        ),
        tamponNote(g.note),
      ),
      el("p", { class: "fl-kda" },
        el("b", { text: kda(g) }),
        el("span", { class: g.win ? "fl-v" : "fl-d", text: g.win ? "Victoire" : "Défaite" }),
        el("small", { text: enMinutes(g.duree) }),
      ),
      el("ul", { class: "fl-raisons" }, (g.raisons || []).slice(0, 3).map((r) => el("li", { text: r }))),
      el("p", { class: "fl-game-pied" },
        el("b", { text: `+${pluriel(g.points, "pt")}` }),
        g.duo?.length ? el("span", { class: "fl-duo", text: `duo avec ${g.duo.join(", ")}` }) : null,
        el("time", { datetime: new Date(ms(g.fin)).toISOString(), text: ilYa(g.fin) }),
      ),
    );
  }

  // --- la game de la semaine : la meilleure note, en grand, comme une case d'action ---
  function rendreFailleUne() {
    const z = $("faille-une");
    if (!z) return;
    const f = infosFaille();
    const g = f?.gameDeLaSemaine;
    const cle = g ? `${g.nom}|${g.fin}|${g.champion}|${g.image}` : `vide|${f?.actif}`;
    if (cleFaille.une === cle) return;
    cleFaille.une = cle;
    z.classList.toggle("une-vide", !g);
    if (!g) {
      vider(z,
        el("div", { class: "fu-portrait" },
          el("span", { class: "concentration", "aria-hidden": "true" }),
          el("div", { class: "fu-cadre fu-cadre-vide" }, el("span", { class: "fu-point", text: "?" })),
        ),
        el("div", { class: "fu-infos" },
          el("p", { class: "fu-surtitre", text: "La game de la semaine" }),
          el("h3", { class: "fu-nom", text: f?.actif ? "La Faille attend ses héros." : "La Faille ouvre très bientôt." }),
          el("p", { class: "fu-meta", text: "Relie ton compte et lance une game : la meilleure de la semaine s'affiche ici, en grand, avec sa note." }),
          f?.actif ? el("a", { class: "btn btn-plein", href: "#faille-moi", text: "Relier mon compte LoL" }) : null,
        ),
      );
      return;
    }
    vider(z,
      el("div", { class: "fu-portrait" },
        el("span", { class: "concentration", "aria-hidden": "true" }),
        el("div", { class: "fu-cadre" }, visageChampion(g, "fl-champ-grand")),
        tamponNote(g.note, "fu-tampon"),
        el("span", { class: "sfx fu-sfx", "aria-hidden": "true", text: g.note === "S+" ? "ドン!" : "バン!" }),
      ),
      el("div", { class: "fu-infos" },
        el("p", { class: "fu-surtitre", text: "La game de la semaine" }),
        el("h3", { class: "fu-nom" }, g.nom, el("span", { class: "fu-champion", text: ` sur ${g.champion}` })),
        el("p", { class: "fu-kda", "aria-label": `${g.k} kills, ${g.d} morts, ${g.a} assists`, text: kda(g) }),
        el("p", { class: "fu-meta", text: [ROLES_FAILLE[g.role] || g.role, g.win ? "Victoire" : "Défaite", `en ${enMinutes(g.duree)}`, g.file, ilYa(g.fin)].filter(Boolean).join(" · ") }),
        el("ul", { class: "fu-bulles" }, (g.raisons || []).map((r) => el("li", { text: r }))),
        el("p", { class: "fu-score" },
          el("span", { text: "Note" }), el("b", { text: `${g.score}/100` }),
          el("span", { text: "Points" }), el("b", { text: `+${g.points}` }),
          g.duo?.length ? el("span", { class: "fu-duo", text: `en duo avec ${g.duo.join(", ")}` }) : null,
        ),
      ),
    );
  }

  // --- le podium de la semaine, la suite du classement et les titres ---
  function rendreFaillePodium() {
    const z = $("faille-podium");
    if (!z) return;
    const f = infosFaille();
    const c = f?.classement || [];
    const titres = f?.titres || [];
    const cle = JSON.stringify([c, titres, f?.precedente, avantLundi()]);
    if (cleFaille.podium === cle) return;
    cleFaille.podium = cle;
    const marche = (x, place) => el("li", { class: `fp-marche place-${place}${x ? "" : " libre"}` },
      x
        ? el("div", { class: "fp-joueur" },
          place === 1 ? el("span", { class: "fp-couronne", "aria-hidden": "true", text: "👑" }) : null,
          visageChampion({ champion: x.meilleure?.champion, image: x.meilleure?.image }, "fp-champ"),
          el("strong", { class: "fp-nom", text: x.nom }),
          el("span", { class: "fp-points" }, el("b", { text: nombre(x.points) }), " pts"),
          el("small", {}, pluriel(x.games, "game"), " · meilleure ", tamponNote(x.meilleure?.note, "fl-note-mini")),
        )
        : el("div", { class: "fp-joueur" }, el("span", { class: "fp-vide", text: "?" }), el("small", { text: "Place libre" })),
      el("div", { class: "fp-socle" }, el("span", { class: "fp-rang", text: String(place) })),
    );
    vider(z,
      el("div", { class: "fp-tete" }, el("h3", { text: "Le podium de la semaine" }), el("span", { class: "etiquette", text: avantLundi() })),
      el("ol", { class: "fp-podium", "aria-label": "Les trois premiers de la semaine" }, marche(c[1], 2), marche(c[0], 1), marche(c[2], 3)),
      c.length > 3
        ? el("ol", { class: "fp-suite", start: "4" }, c.slice(3).map((x) => el("li", {},
          el("span", { class: "fp-suite-nom", text: x.nom }),
          el("small", { text: pluriel(x.games, "game") }),
          el("b", { text: `${nombre(x.points)} pts` }),
        )))
        : null,
      titres.length
        ? el("ul", { class: "fp-titres", "aria-label": "Les titres de la semaine" }, titres.map((t) => el("li", { class: `fp-titre titre-${t.cle}` },
          el("span", { class: "fp-titre-nom", text: t.titre }),
          el("strong", { text: t.nom }),
          el("small", { text: t.valeur }),
        )))
        : el("p", { class: "note", text: "Le podium et les titres (Carry de la semaine, Œil de lynx, Roi du farm, Le mur…) se remplissent avec les games de la semaine." }),
      f?.precedente ? el("p", { class: "note fp-avant", text: `La semaine dernière : ${f.precedente.carry}, carry avec ${nombre(f.precedente.points)} pts.` }) : null,
    );
  }

  // --- ton compte : le relier (Riot ID, puis l'icône), tes games de la semaine, le retirer ---
  async function demanderFaille(action, extra = {}) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      const d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
      faillePasMembre = d.erreur === "pas-membre";
      if (d.faille) maFaille = d.faille;
      return { status: r.status, d };
    } catch {
      return { status: 0, d: { erreur: "Impossible de joindre le bot. Vérifie ta connexion." } };
    }
  }
  async function chargerMaFaille() {
    if (!moi?.connecte) { maFaille = null; rendreFailleMoi(); return; }
    await demanderFaille("faille");
    rendreFailleMoi();
  }
  async function agirFaille(action, extra = {}) {
    if (failleOccupee) return;
    const etaitLie = Boolean(maFaille?.lie);
    failleOccupee = true;
    failleMessage = null;
    rendreFailleMoi();
    const { d } = await demanderFaille(action, extra);
    failleOccupee = false;
    if (d.erreur && d.erreur !== "pas-membre") failleMessage = { texte: d.texte || d.erreur, erreur: true };
    else if (action === "faille-verifier" && d.ok) {
      failleCelebrer = true;
      setTimeout(() => { failleCelebrer = false; rendreFailleMoi(); }, 8000);
      charger();
    } else if (action === "faille-retirer" && d.ok) {
      confirmerRetraitFaille = false;
      if (etaitLie) { failleMessage = { texte: "C'est fait : ton compte LoL est retiré et tes games sont effacées." }; charger(); }
    }
    rendreFailleMoi();
    const suite = action === "faille-lier" && d.ok ? ".fm-verifier" : action === "faille-retirer" ? "#faille-riot-id" : "";
    if (suite) $("faille-moi")?.querySelector(suite)?.focus({ preventScroll: true });
  }
  const teteMoi = (titre, ...plus) => el("div", { class: "fp-tete" }, el("h3", { text: titre }), ...plus);
  function formulaireFaille(message) {
    const champ = el("input", {
      type: "text", name: "riot-id", id: "faille-riot-id", placeholder: "Pseudo#EUW", maxlength: "30", autocomplete: "off",
      autocapitalize: "off", spellcheck: "false", required: true, "aria-describedby": "faille-aide",
    });
    const envoyer = (e) => {
      e.preventDefault();
      const v = champ.value.trim().replace(/\s*#\s*/, "#");
      if (!/^[^#]{3,16}#[^#\s]{2,5}$/u.test(v)) {
        failleMessage = { texte: "Écris ton Riot ID avec le # : par exemple Liliano#EUW.", erreur: true };
        rendreFailleMoi();
        $("faille-riot-id")?.focus();
        return;
      }
      agirFaille("faille-lier", { riotId: v });
    };
    return [
      teteMoi("Relie ton compte LoL"),
      el("ol", { class: "fm-etapes" },
        el("li", { class: "actuelle" }, el("b", { text: "1" }), el("span", { text: "Ton Riot ID" })),
        el("li", {}, el("b", { text: "2" }), el("span", { text: "Une icône à mettre 2 min" })),
        el("li", {}, el("b", { text: "3" }), el("span", { text: "Tes games sont notées" })),
      ),
      el("form", { class: "fm-form", onsubmit: envoyer },
        el("label", { for: "faille-riot-id", text: "Ton Riot ID (serveur EUW)" }),
        el("div", { class: "fm-ligne" }, champ, el("button", { class: "btn btn-plein", type: "submit", disabled: failleOccupee, text: failleOccupee ? "…" : "Relier" })),
        el("p", { class: "note", id: "faille-aide", text: "Dans le client LoL, en haut à droite : ton nom, un #, et ton tag." }),
      ),
      message,
      el("p", { class: "fm-promesse", text: "Aucun mot de passe, aucune connexion à Riot : pour prouver que c'est bien ton compte, tu changes juste d'icône de profil quelques minutes. Sur le site, tout le monde voit ton pseudo Discord, jamais ton Riot ID." }),
    ];
  }
  function etapeIcone(a, message) {
    return [
      teteMoi("Dernière étape", el("span", { class: "etiquette fm-riot", text: a.riot })),
      el("ol", { class: "fm-etapes" },
        el("li", { class: "fait" }, el("b", { text: "✓" }), el("span", { text: "Ton Riot ID" })),
        el("li", { class: "actuelle" }, el("b", { text: "2" }), el("span", { text: "Une icône à mettre 2 min" })),
        el("li", {}, el("b", { text: "3" }), el("span", { text: "Tes games sont notées" })),
      ),
      el("div", { class: "fm-icone" },
        el("div", { class: "fm-icone-image" },
          el("b", { text: `n° ${a.icone}` }),
          lienSur(a.image) ? el("img", { src: a.image, alt: `L'icône de profil n° ${a.icone}`, width: 128, height: 128, onerror: (e) => e.currentTarget.remove() }) : null,
        ),
        el("ol", { class: "fm-consignes" },
          el("li", {}, "Dans le client LoL, clique sur ton icône de profil, en haut à droite."),
          el("li", {}, "Mets ", el("strong", { text: "celle-ci" }), ` (l'icône n° ${a.icone}, dans les icônes de base) et valide.`),
          el("li", {}, "Attends quelques secondes, puis clique sur Vérifier. Tu pourras remettre ton icône juste après."),
        ),
      ),
      el("div", { class: "fm-actions" },
        el("button", { class: "btn btn-plein fm-verifier", type: "button", disabled: failleOccupee, onclick: () => agirFaille("faille-verifier"), text: failleOccupee ? "Vérification…" : "Vérifier" }),
        el("button", { class: "btn btn-contour btn-petit", type: "button", disabled: failleOccupee, onclick: () => agirFaille("faille-retirer"), text: "Changer de compte" }),
      ),
      el("p", { class: "note", id: "faille-delai", text: `Il te reste ${dureeCourte(a.expire)}.` }),
      message,
    ];
  }
  const miniGame = (g) => el("li", { class: `fm-game ${g.win ? "gagnee" : "perdue"}` },
    visageChampion(g, "fl-champ-petit"),
    el("span", { class: "fm-game-txt" }, el("strong", { text: `${g.champion} · ${kda(g)}` }), el("small", { text: `${ROLES_FAILLE[g.role] || g.role} · ${g.win ? "victoire" : "défaite"} · ${ilYa(g.fin)}` })),
    tamponNote(g.note, "fl-note-petite"),
    el("b", { class: "fm-game-pts", text: `+${g.points}` }),
  );
  function maSemaine(m, message) {
    const s = m.semaine || {};
    const games = s.games || [];
    const meilleures = [...games].sort((a, b) => b.points - a.points || b.score - a.score).slice(0, infosFaille()?.meilleures || 10);
    const compte = new Set(meilleures.map((g) => `${g.fin}|${g.champion}`));
    return [
      failleCelebrer ? el("span", { class: "sfx fm-sfx eclat", "aria-hidden": "true", text: "リンク!" }) : null,
      teteMoi("Ta semaine sur la Faille", el("span", { class: "etiquette fm-riot", title: "Ton Riot ID (toi seul le vois)", text: m.riot })),
      failleCelebrer ? el("p", { class: "jeu-bravo", role: "status", text: "C'est relié ! Tu peux remettre ton icône. Tes prochaines games compteront." }) : null,
      el("div", { class: "fm-stats" },
        el("div", {}, el("b", { text: s.rang ? `${s.rang}ᵉ` : "–" }), el("span", { text: s.rang ? `sur ${s.sur}` : "pas encore classé" })),
        el("div", {}, el("b", { text: nombre(s.points || 0) }), el("span", { text: "points" })),
        el("div", {}, el("b", { text: nombre(games.length) }), el("span", { text: `game${games.length > 1 ? "s" : ""} notée${games.length > 1 ? "s" : ""}` })),
      ),
      games.length
        ? el("ul", { class: "fm-games" }, games.slice(0, 8).map((g) => {
          const li = miniGame(g);
          if (!compte.has(`${g.fin}|${g.champion}`)) li.classList.add("hors-compte");
          return li;
        }))
        : el("p", { class: "note fm-attente", text: "Lance une game de la Faille (classée ou normale) : elle apparaît ici une dizaine de minutes après la fin, avec sa note." }),
      message,
      confirmerRetraitFaille
        ? el("div", { class: "fm-confirmer", role: "group", "aria-label": "Retirer ton compte LoL" },
          el("p", { text: "Retirer ton compte efface tes games et tes points de la semaine. Sûr ?" }),
          el("div", { class: "fm-actions" },
            el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: failleOccupee, onclick: () => agirFaille("faille-retirer"), text: "Oui, retirer" }),
            el("button", { class: "btn btn-contour btn-petit", type: "button", onclick: () => { confirmerRetraitFaille = false; rendreFailleMoi(); }, text: "Annuler" }),
          ))
        : el("button", { class: "fm-retirer", type: "button", onclick: () => { confirmerRetraitFaille = true; rendreFailleMoi(); }, text: "Retirer mon compte LoL" }),
    ];
  }
  function rendreFailleMoi() {
    const z = $("faille-moi");
    if (!z) return;
    const m = maFaille;
    const cle = JSON.stringify([moi?.connecte, faillePasMembre, m, failleMessage, failleOccupee, confirmerRetraitFaille, failleCelebrer, Boolean(infosFaille()?.actif)]);
    if (cleFaille.moi === cle) return;
    cleFaille.moi = cle;
    // ce qui est en train d'être tapé reste là
    const tape = $("faille-riot-id")?.value || "";
    const focus = document.activeElement?.id === "faille-riot-id";
    const message = failleMessage ? el("p", { class: `fm-message${failleMessage.erreur ? " erreur" : ""}`, role: failleMessage.erreur ? "alert" : "status", text: failleMessage.texte }) : null;
    const ouverte = Boolean(infosFaille()?.actif);
    let contenu;
    if (!ouverte && !m?.lie && !m?.actif) {
      contenu = [teteMoi("Ton compte LoL"), el("p", { text: "La Faille ouvre très bientôt : tu pourras relier ton compte League of Legends ici, et tes games seront notées toutes seules." }), message];
    } else if (!moi?.connecte) {
      contenu = [teteMoi("Ton compte LoL"), el("p", { text: "Connecte-toi avec Discord, puis relie ton compte League of Legends : tes games sont notées toutes seules, et tu entres dans le classement de la semaine." }), el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" })];
    } else if (faillePasMembre) {
      contenu = [teteMoi("Ton compte LoL"), el("p", { text: "Rejoins le Discord Barhaw pour entrer dans La Faille des potes." }), el("a", { class: "btn btn-plein", href: "#discord", text: "Rejoindre le Discord" })];
    } else if (!m) {
      contenu = [teteMoi("Ton compte LoL"), message || el("p", { class: "note", text: "Chargement…" })];
    } else if (m.lie) {
      contenu = maSemaine(m, message);
    } else if (!m.actif) {
      contenu = [teteMoi("Ton compte LoL"), el("p", { text: "La Faille ouvre très bientôt : le bot attend sa clé Riot. Reviens dans un moment !" }), message];
    } else if (m.attente) {
      contenu = etapeIcone(m.attente, message);
    } else {
      contenu = formulaireFaille(message);
    }
    vider(z, ...contenu);
    const champ = $("faille-riot-id");
    if (champ && tape) champ.value = tape;
    if (champ && focus) champ.focus({ preventScroll: true });
    clearInterval(minuteurFaille);
    if (m?.attente && !m.lie) {
      minuteurFaille = setInterval(() => {
        const t = $("faille-delai");
        if (!t) return clearInterval(minuteurFaille);
        t.textContent = m.attente.expire > Date.now() ? `Il te reste ${dureeCourte(m.attente.expire)}.` : "Le temps est écoulé : clique sur « Changer de compte » pour recommencer.";
      }, 20_000);
    }
  }

  // --- les dernières games de tout le monde ---
  function rendreFailleFil() {
    const z = $("faille-fil");
    if (!z) return;
    const f = infosFaille();
    const l = f?.dernieres || [];
    const cle = JSON.stringify([l.map((g) => [g.fin, g.nom, g.image]), f?.membres, Math.floor(Date.now() / 600_000)]);
    if (cleFaille.fil === cle) return;
    cleFaille.fil = cle;
    vider(z,
      el("div", { class: "fp-tete" },
        el("h3", { text: "Les dernières games" }),
        f?.membres ? el("span", { class: "etiquette", text: `${pluriel(f.membres, "compte")} relié${f.membres > 1 ? "s" : ""}` }) : null,
      ),
      l.length
        ? el("div", { class: "fl-fil" }, l.map((g) => carteGame(g)))
        : el("p", { class: "note", text: "Les games notées arrivent ici une dizaine de minutes après leur fin, avec leur note et ce qui l'explique." }),
    );
  }

  // --- comment c'est noté ---
  function rendreFailleRegles() {
    const z = $("faille-regles");
    if (!z) return;
    const f = infosFaille();
    const notes = f?.notes || [["S+", 10], ["S", 7], ["A", 5], ["B", 3], ["C", 1], ["D", 0]].map(([note, points]) => ({ note, points }));
    const R = f?.recompenses || { "S+": { degats: 15, berrys: 40000 }, S: { degats: 10, berrys: 20000 }, A: { degats: 5, berrys: 8000 } };
    const cle = JSON.stringify([notes, R, f?.meilleures, f?.bonusDuo]);
    if (cleFaille.regles === cle) return;
    cleFaille.regles = cle;
    const recompense = (n) => (R[n] ? `${n} : −${R[n].degats} PV au boss, ${berrys(R[n].berrys)}` : "");
    vider(z,
      el("h3", { text: "Comment c'est noté" }),
      el("ul", { class: "fr-echelle", "aria-label": "Les notes et leurs points" }, notes.map((n) => el("li", {}, tamponNote(n.note, "fl-note-petite"), el("b", { text: pluriel(n.points, "pt") })))),
      el("ul", { class: "fr-regles" },
        el("li", {}, el("strong", { text: "Selon ton rôle. " }), "Ta game est comparée à une bonne game de ton rôle : KDA, part des kills et des dégâts de ta team, CS et vision par minute, coups encaissés. Un support est jugé sur sa vision et ses assists, pas sur ses CS. La victoire donne un bonus."),
        el("li", {}, el("strong", { text: "La qualité avant tout. " }), `Tes ${f?.meilleures || 10} meilleures games de la semaine comptent. +${f?.bonusDuo ?? 1} point quand tu joues avec un autre membre relié dans ta team.`),
        el("li", {}, el("strong", { text: "Les games qui comptent. " }), "Classées solo/duo et flex, normales, parties rapides, jouées après avoir relié ton compte. Pas l'ARAM, pas l'Arena, pas les parties perso, pas les remakes."),
        el("li", {}, el("strong", { text: "Dans la chasse. " }), `${["S+", "S", "A"].map(recompense).filter(Boolean).join(" ; ")} (les berrys, avec ton avis de recherche ; 6 games par jour).`),
      ),
      el("p", { class: "fr-mention", text: "Un défi entre potes, pas un classement officiel : pas de MMR, pas de rang. La Faille des potes n'est ni soutenue ni parrainée par Riot Games." }),
    );
  }


  // --- en direct : qui est en game en ce moment, et la note qui tombe dès la fin ---
  let failleVue = false;
  let minuteurChrono = 0;
  let premierDirect = true;
  const notesVues = new Set(); // les games « juste finies » déjà montrées : la note ne claque qu'une fois
  let cartesDirect = new Set(); // les cartes déjà affichées : seules les nouvelles arrivent en sautant
  function chrono(debut) {
    const s = Math.max(0, Math.floor((Date.now() - ms(debut)) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
  }
  const carteEnGame = (x) => el("li", { class: "fd-carte en-game" },
    el("span", { class: "fd-radar", "aria-hidden": "true" }, visageChampion(x)),
    el("span", { class: "fd-qui" },
      el("strong", { text: x.nom }),
      el("small", { text: [x.champion, x.file].filter(Boolean).join(" · ") }),
    ),
    x.debut
      ? el("span", { class: "fd-chrono", "data-debut": String(x.debut), title: "Depuis le début de la game", text: chrono(x.debut) })
      : el("span", { class: "fd-chargement", text: "chargement" }),
    (x.avec?.length || x.contre?.length || !x.compte || x.live)
      ? el("span", { class: "fd-tags" },
        x.avec?.length ? el("span", { class: "fd-tag avec", text: `avec ${x.avec.join(", ")}` }) : null,
        x.contre?.length ? el("span", { class: "fd-tag contre", text: `contre ${x.contre.join(", ")}` }) : null,
        !x.compte ? el("span", { class: "fd-tag", text: "ne compte pas" }) : null,
        x.live && /^[a-z0-9_]{3,25}$/.test(x.twitch || "") ? el("a", { class: "fd-live", href: `https://www.twitch.tv/${x.twitch}`, ...externe, text: "Regarder son live" }) : null,
      )
      : null,
  );
  const carteAttente = (x) => el("li", { class: "fd-carte attente" },
    visageChampion(x),
    el("span", { class: "fd-qui" }, el("strong", { text: x.nom }), el("small", { text: [x.champion, "fin de game"].filter(Boolean).join(" · ") })),
    el("span", { class: "fl-note fd-mystere", "aria-label": "La note arrive", text: "?" }),
    el("span", { class: "fd-tags" }, el("span", { class: "fd-arrive", text: "la note arrive" })),
  );
  function carteFinie(g) {
    const cle = `${g.nom}|${g.fin}`;
    const tombe = !premierDirect && !notesVues.has(cle);
    notesVues.add(cle);
    return el("li", { class: `fd-carte finie${tombe ? " tombe" : ""}` },
      visageChampion(g),
      el("span", { class: "fd-qui" }, el("strong", { text: g.nom }), el("small", { text: `${g.champion} · ${kda(g)} · ${g.win ? "victoire" : "défaite"}` })),
      tamponNote(g.note, "fd-note"),
      el("span", { class: "fd-tags" }, el("span", { class: "fd-tag", text: `+${pluriel(g.points, "pt")} · ${ilYa(g.fin)}` })),
    );
  }
  function rendreFailleDirect() {
    const z = $("faille-direct");
    if (!z) return;
    const f = infosFaille();
    const l = f?.enGame || [];
    const att = f?.enAttente || [];
    const finies = (f?.dernieres || []).filter((g) => Date.now() - ms(g.fin) < 30 * 60_000).slice(0, 4);
    const compteur = $("compteur-faille");
    if (compteur) { compteur.hidden = !l.length; compteur.textContent = l.length; }
    z.hidden = !f?.actif;
    if (!f?.actif) return;
    const cle = JSON.stringify([l, att, finies.map((g) => [g.nom, g.fin, g.note]), Math.floor(Date.now() / 60_000)]);
    if (cleFaille.direct === cle) return;
    cleFaille.direct = cle;
    z.classList.toggle("actif", l.length > 0);
    const titre = l.length ? `${l.length === 1 ? "Un pote est" : `${l.length} potes sont`} en game` : att.length ? "Une game vient de finir" : "Personne en game pour l'instant";
    vider(z,
      el("div", { class: "fd-tete" },
        el("span", { class: "fd-direct", text: "En direct" }),
        el("h3", { class: "fd-titre", text: titre }),
        el("p", { class: "fd-aide", text: l.length || att.length || finies.length ? "Mis à jour toutes les 2 min · la note tombe dès la fin" : "Ça s'allume dès qu'un pote lance une game." }),
      ),
      l.length || att.length || finies.length
        ? el("ul", { class: "fd-liste" }, l.map(carteEnGame), att.map(carteAttente), finies.map(carteFinie))
        : null,
    );
    const cles = [...l.map((x) => `g|${x.nom}|${x.debut}`), ...att.map((x) => `a|${x.nom}|${x.fin}`), ...finies.map((g) => `f|${g.nom}|${g.fin}`)];
    z.querySelectorAll(".fd-carte").forEach((c, k) => { if (!premierDirect && !cartesDirect.has(cles[k])) c.classList.add("nouvelle"); });
    cartesDirect = new Set(cles);
    premierDirect = false;
    clearInterval(minuteurChrono);
    if (l.some((x) => x.debut)) {
      minuteurChrono = setInterval(() => {
        if (!failleVue || document.hidden) return;
        const c = document.querySelectorAll("#faille-direct [data-debut]");
        if (!c.length) return clearInterval(minuteurChrono);
        for (const e of c) e.textContent = chrono(Number(e.dataset.debut));
      }, 1000);
    }
  }
  // pendant qu'on regarde La Faille et que quelqu'un joue : les nouvelles toutes les 20 s
  async function rafraichirFaille() {
    const avant = (infosFaille()?.dernieres || []).length + "|" + (infosFaille()?.dernieres?.[0]?.fin || 0);
    try {
      const r = await fetch("/api/public", { headers: { Accept: "application/json" } });
      const d = await r.json();
      if (d && typeof d === "object" && !d.horsLigne) donnees = recevoirPublic({ ...d, evenements: d.evenements || donnees?.evenements || evenementsSecours() });
    } catch {}
    rendreFaille();
    const apres = (infosFaille()?.dernieres || []).length + "|" + (infosFaille()?.dernieres?.[0]?.fin || 0);
    if (apres !== avant && maFaille?.lie) chargerMaFaille(); // une nouvelle note : peut-être la tienne
  }
  function suivreFaille() {
    const s = $("faille");
    if (!s || !("IntersectionObserver" in window)) return;
    new IntersectionObserver((e) => { failleVue = e.some((x) => x.isIntersecting); }, { rootMargin: "200px 0px" }).observe(s);
    setInterval(() => {
      const f = infosFaille();
      if (failleVue && !document.hidden && (f?.enGame?.length || f?.enAttente?.length)) rafraichirFaille();
    }, 20_000);
  }

  function rendreFaille() {
    rendreFailleDirect();
    rendreFailleUne();
    rendreFaillePodium();
    rendreFailleMoi();
    rendreFailleFil();
    rendreFailleRegles();
  }

  // ---------- GRAND LINE : le navire de la commu, d'île en île ----------
  // Le bot fait tout le calcul (lib/navire.js) ; ici : la carte (en 3D avec js/grandline-3d.js, sinon en 2D),
  // le cap, la mer (tempête, monstre, vent, bouteille), le vote aux carrefours, l'équipage et le journal de bord.
  // Les places des îles sur la carte (x, z, et ce qu'il y a dessus) : les mêmes en 3D et en 2D.
  const GL_PLACES = {
    port: [-86, 30, "port"], moussaillons: [-72, 6, "plage"], recif: [-58, -26, "recif"], braise: [-36, -38, "volcan"], givre: [-42, 4, "glace"],
    lucioles: [-20, -16, "lucioles"], champignons: [-6, 20, "champignons"], engloutie: [10, -10, "ruines"], vents: [12, 38, "moulins"],
    marche: [28, 12, "marche"], arbre: [44, -22, "arbre"], ambre: [48, 32, "dunes"], phare: [64, 2, "phare"], tonnerre: [76, -28, "orage"], tresor: [86, 12, "tresor"],
    // la V4 (22 décembre) : les nouvelles îles, chacune avec son maître des lieux
    marais: [-56, 28, "marais"], cristal: [-26, 30, "cristal"], archipel: [-8, -34, "ciel"], cimetiere: [26, -34, "epaves"],
    horloge: [30, 34, "horloge"], geants: [60, -38, "geants"], forteresse: [72, 30, "fort"],
  };
  const GL_SOURCES = { messages: "Messages", vocal: "Vocal", site: "Jeux du site", boss: "Boss", faille: "La Faille", twitch: "Twitch", stream: "Sur le live", bosslive: "BOSS LIVE" };
  const GL_ACTIONS = [
    ["💬", "Un message sur le Discord", "message", "par minute"],
    ["🎙️", "Une minute en vocal à plusieurs", "vocal", "par personne"],
    ["🎮", "Une partie sur un jeu du site", "partie", ""],
    ["🃏", "La carte du jour (légendaire : beaucoup plus)", "carte", ""],
    ["🍖", "Nourrir ou jouer avec Chopper", "chopper", ""],
    ["⚔️", "L'attaque du jour contre le boss", "boss", ""],
    ["🎯", "Une game de LoL sur la Faille (S+ : 40)", "faille", "selon la note"],
    ["💜", "Twitch : le chat, les follows, les subs, les bits, les raids", "follow", "follow : 5, sub : 30"],
    ["📺", "Rester sur le live, même sans écrire (Twitch relié)", "stream", "2 par 10 min"],
  ];
  let carteGL = null; // { type: "3d" | "2d", rendu }
  let glVue = false;
  let monNavire = null;
  let glMessage = null;
  let glOccupe = false;
  let glAvant = null; // l'étape d'avant (pour « Terre en vue ! »)
  let cleVerrou = "";
  const infosGL = () => (flotteActive() ? commuRegardee()?.navire : null) || donnees?.grandline || null;
  // GRAND LINE ouvre avec la V3 du site, samedi 31 octobre à 21 h (heure de Paris) ; avant : accès restreint.
  // Le bot dit si c'est ouvert (un admin peut ouvrir plus tôt) ; sans réponse du bot, c'est la date qui compte.
  const GL_OUVERTURE = Date.parse("2026-10-31T20:00:00Z");
  const glOuvert = () => { const g = infosGL(); return Boolean(g?.route && (g.ouvert === true || (g.ouvert === undefined && Date.now() >= GL_OUVERTURE))); };
  // l'image d'une île (rendue dans Blender) ; au niveau 5, celle de l'île du niveau 5 (img/iles/<id>-v5.webp)
  const imageIle = (id) => (/^[a-z]{2,20}$/.test(String(id || "")) ? `/img/iles/${id}${niveau5() && window.__niveau5 !== "navire" && ILES_V5.includes(id) ? "-v5" : ""}.webp` : "");
  // ---------- LA FLOTTE (V4) : un navire par commu de potes, sur la même mer, et la course jusqu'au trésor ----------
  // La VF 1.0 (la grande mise à jour, appelée « v4 » dans le code) sort le mardi 22 décembre 2026 à 21 h 30 (heure de Paris),
  // en direct : avant, rien d'elle ne se voit (comme
  // GRAND LINE avant la V3). Le bot peut l'ouvrir plus tôt ou la retenir (donnees.v4.ouvert) ; sans réponse du bot,
  // c'est la date qui compte. Le bot ne donne la flotte (donnees.flotte) qu'une fois la V4 ouverte.
  const V4_OUVERTURE = Date.parse("2026-12-22T20:30:00Z");
  // la VF ouverte pour tout le monde (selon le bot, sinon selon la date) ; ou seulement à l'écran de Liliano, en aperçu
  const v4Officielle = () => { const o = donnees?.v4?.ouvert; return o === true || (o !== false && Date.now() >= V4_OUVERTURE); };
  const v4Ouverte = () => v4Officielle() || apercuVF.actif;
  const ID_COMMU = /^[a-z0-9]{2,20}$/;
  // les identifiants déjà pris dans GRAND LINE (les liens directs sont #grandline-<commu>)
  const RESERVES_GL = new Set(["scene", "carte", "etiquettes", "hud", "info", "cap", "mer", "moi", "equipage", "journal", "escales", "ramer", "verrou", "course", "fiche", "3d", "recit"]);
  let flVue = ""; // "" : la course ; sinon la commu qu'on regarde
  let flDemandee = ""; // arrivée par un lien direct (#grandline-veyzo) : appliquée dès que la flotte est là
  let maFlotte = null; // { equipage, serveurs, bloque } pour le membre connecté
  let maFlotteDemandee = false;
  let flOccupe = false;
  let flMessage = null;
  let flChoix = "";
  let cleBarreFlotte = "";
  const commusFlotte = () => (v4Ouverte() && Array.isArray(donnees?.flotte?.commus)
    ? donnees.flotte.commus.filter((c) => ID_COMMU.test(String(c?.id || "")) && !RESERVES_GL.has(c.id) && c.navire?.route && c.nom)
    : []);
  const flotteActive = () => commusFlotte().length > 0;
  const commu = (id) => (id ? commusFlotte().find((c) => c.id === id) || null : null);
  const hexaCommu = (c, k) => (/^#[0-9a-f]{6}$/i.test(String(c?.couleurs?.[k] || "")) ? c.couleurs[k] : k === "principale" ? "#ff4f9a" : "#9b4dff");
  // le texte sur la couleur d'une commu : encre sur une couleur claire (l'or de Veyzo), blanc sinon
  const clair = (h) => { const n = parseInt(h.slice(1), 16); const l = (v) => { v /= 255; return v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * l(n >> 16) + 0.7152 * l((n >> 8) & 255) + 0.0722 * l(n & 255) > 0.45; };
  const styleCommu = (c) => `--c1:${hexaCommu(c, "principale")};--c2:${hexaCommu(c, "secondaire")};--fl-texte:${clair(hexaCommu(c, "principale")) ? "#12050d" : "#fff"}`;
  // Ce que chaque commu apporte, en plus de ses couleurs (/flotte commu sur Discord) : son drapeau, dessiné par elle,
  // dans img/flotte/<id>.webp (512 × 512), et sa traînée derrière son navire. Ajouter une commu = ces trois choses.
  // Traînées : petales (cerisier), pieces (pièces d'or au V), encre (bulles d'encre), pieuvres (petites pieuvres roses) ; sans rien, un sillage d'écume.
  const FLOTTE_STYLES = {
    // navire : son propre modèle V4 (modeles/grandline/navire-<id>.glb, avec sa figure de proue) ; sinon le navire V4 commun
    barhaw: { drapeau: true, trainee: "petales", navire: true }, // renne-raton
    veyzo: { drapeau: true, trainee: "pieces", navire: true }, // tigre
    kikso: { drapeau: true, trainee: "pieuvres", navire: true }, // Squirt.exe : le calmar à bandeau, figure de proue pieuvre
  };
  const drapeauImage = (c) => (FLOTTE_STYLES[c?.id]?.drapeau ? `/img/flotte/${c.id}.webp` : lienSur(c?.drapeau));
  const ILES_V4 = ["phare", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"]; // les îles en V4 (modeles/grandline/ile-<id>-v4.glb)
  // une nouvelle commu n'a besoin que d'un drapeau, de ses couleurs et d'une traînée : elle prend le navire V4 commun
  const modeleNavire = (c) => (window.__navireV3 || !c?.id ? "" : FLOTTE_STYLES[c.id]?.navire ? `navire-${c.id}.glb` : "navire-v4.glb");
  // Le « niveau 5 » (validé le 11 novembre) : matières et lumière cuites dans Blender. C'est le niveau de la VF 1.0 ;
  // « ?n5=non » dans l'adresse (ou les boutons de l'aperçu) remet les modèles d'avant, pour comparer.
  const ILES_V5 = ["port", "moussaillons", "recif", "lucioles", "champignons", "braise", "givre", "engloutie", "vents", "marche", "arbre", "ambre", "phare", "tonnerre", "tresor", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"]; // modeles/grandline/ile-<id>-v5.glb + .webp
  // chaque équipage a son navire, vraiment différent : un type de coque et de voilure, sa figure de proue (tout est inventé)
  const NAVIRES_V5 = { barhaw: "galion", veyzo: "chebec", kikso: "jonque" }; // modeles/grandline/navire-<type>.glb ; les autres commus : le brick
  try { if (new URLSearchParams(location.search).get("n5") === "non") window.__niveau5 = false; } catch {}
  const niveau5 = () => window.__niveau5 !== false && v4Ouverte();
  const modeleNavireGL = (c) => (niveau5() && window.__niveau5 !== "port" && c?.id ? `navire-${NAVIRES_V5[c.id] || "brick"}.glb` : modeleNavire(c));
  const traineeCommu = (c) => (["petales", "pieces", "encre", "pieuvres"].includes(c?.trainee) ? c.trainee : FLOTTE_STYLES[c?.id]?.trainee || "");
  const avanceCommu = (c) => {
    if (typeof c.avance === "number") return Math.max(0, Math.min(1, c.avance));
    const n = c.navire;
    return Math.max(0, Math.min(1, ((n.etape || 0) + Math.min(1, (n.milles || 0) / Math.max(1, n.longueur || 1))) / Math.max(1, n.etapes || 11)));
  };
  // le classement : celui du bot, sinon l'avance
  const classementFlotte = () => [...commusFlotte()].sort((a, b) => (a.rang || 99) - (b.rang || 99) || avanceCommu(b) - avanceCommu(a));
  const rangCommu = (c) => c.rang || classementFlotte().indexOf(c) + 1;
  const ordinal = (n) => (n === 1 ? "1er" : `${n}e`);
  // le navire qu'on regarde : la commu choisie ; dans « La course » : ton équipage, sinon celui qui mène
  function commuRegardee() {
    if (!flotteActive()) return null;
    return commu(flVue) || commu(maFlotte?.equipage) || classementFlotte()[0];
  }
  const vueCourse = () => flotteActive() && !commu(flVue);
  const nomNavireGL = () => (flotteActive() ? `Le navire de ${commuRegardee().nom}` : "Le navire de la commu");
  const lienTwitch = (c) => (/^[a-z0-9_]{3,25}$/i.test(String(c?.twitch || "")) ? `https://www.twitch.tv/${c.twitch}` : "");
  const lienDiscord = (c) => { const u = lienSur(c?.discord); return /^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/i.test(u) ? u : ""; };
  // je peux agir sur ce navire (voter, ouvrir la bouteille) : c'est mon équipage
  const monNavireGL = () => !flotteActive() || (Boolean(maFlotte?.equipage) && maFlotte.equipage === commuRegardee()?.id);

  // le drapeau d'une commu : un fanion à ses couleurs, avec son logo ou son emblème
  function drapeauCommu(c, classe = "") {
    const NS = "http://www.w3.org/2000/svg";
    const s = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
    const svg = s("svg", { viewBox: "0 0 48 34", class: "fl-fanion", "aria-hidden": "true" });
    svg.append(
      s("path", { d: "M3 3 H45 L36 17 L45 31 H3 Z", fill: hexaCommu(c, "principale") }),
      s("path", { d: "M3 22 H38.6 L45 31 H3 Z", fill: hexaCommu(c, "secondaire") }),
      s("path", { d: "M3 3 H45 L36 17 L45 31 H3 Z", fill: "none", stroke: "#12050d", "stroke-width": "3", "stroke-linejoin": "round" }),
    );
    const logo = lienSur(c.logo);
    const embleme = String(c.embleme || c.nom || "?").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
    // le vrai drapeau de la commu (son image), qui flotte sur son mât ; s'il ne vient pas : le fanion à ses couleurs
    const image = drapeauImage(c);
    if (image) {
      const zone = el("span", { class: `fl-drapeau fl-drapeau-image ${classe}`.trim(), style: styleCommu(c), "aria-hidden": "true" }, el("i", { class: "fl-mat" }));
      zone.append(el("img", { class: "fl-drapeau-img", src: image, alt: "", width: 64, height: 64, decoding: "async", onerror: () => zone.replaceWith(drapeauCommu({ ...c, drapeau: "", id: `${c.id}-` }, classe)) }));
      return zone;
    }
    return el("span", { class: `fl-drapeau ${classe}`.trim(), style: styleCommu(c), "aria-hidden": "true" },
      el("i", { class: "fl-mat" }),
      svg,
      logo ? el("img", { class: "fl-logo", src: logo, alt: "", width: 40, height: 40, loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }) : el("b", { class: "fl-embleme", text: embleme }),
    );
  }

  function choisirVueFlotte(id, { lien = true, voir = false } = {}) {
    if (id && !commu(id)) id = "";
    flVue = id;
    flChoix = "";
    glMessage = null;
    if (lien) { try { history.replaceState(null, "", `${location.pathname}${location.search}#grandline-${id || "course"}`); } catch {} }
    if (id && moi?.connecte && monNavireGL()) chargerMonNavire();
    rendreGrandLine();
    if (voir) $("grandline-scene")?.scrollIntoView({ block: "start", behavior: reduit.matches ? "instant" : "smooth" });
    $(`grandline-${id || "course"}`)?.focus({ preventScroll: true });
  }
  // un lien direct (barhaw.vercel.app/#grandline-veyzo), à l'arrivée ou plus tard
  function lienDirectFlotte() {
    const m = /^#grandline-([a-z0-9]{2,20})$/.exec(location.hash);
    if (!m || m[1] === "3d") return;
    flDemandee = m[1] === "course" ? "" : m[1];
    if (flotteActive()) { choisirVueFlotte(flDemandee, { lien: false }); flDemandee = ""; }
  }

  function rendreFlotte() {
    const s = $("grandline");
    const barre = $("flotte-barre");
    const course = $("flotte-course");
    if (!s || !barre || !course) return;
    const liste = commusFlotte();
    const actif = liste.length > 0;
    s.classList.toggle("fl-active", actif);
    if (!actif) {
      if (!barre.hidden) { barre.hidden = true; vider(barre); cleBarreFlotte = ""; }
      if (!course.hidden) { course.hidden = true; vider(course); }
      $("flotte-fiche")?.remove();
      return;
    }
    if (flDemandee !== "" && commu(flDemandee)) { flVue = flDemandee; flDemandee = ""; }
    if (flVue && !commu(flVue)) flVue = "";
    if (moi?.connecte && !maFlotte && !maFlotteDemandee) { maFlotteDemandee = true; agirFlotte("flotte"); }
    const regardee = commuRegardee();
    s.classList.toggle("fl-vue-course", vueCourse());
    s.style.setProperty("--fl-c1", hexaCommu(regardee, "principale"));
    s.style.setProperty("--fl-c2", hexaCommu(regardee, "secondaire"));
    rendreBarreFlotte(barre, liste);
    course.hidden = !vueCourse();
    if (vueCourse()) rendreLaCourse(course);
    rendreFicheCommu();
  }

  // en haut de GRAND LINE : « La course », puis un drapeau par commu (des onglets, au clavier avec les flèches)
  function rendreBarreFlotte(barre, liste) {
    const cle = JSON.stringify([flVue, maFlotte?.equipage, regneGL(), liste.map((c) => [c.id, c.nom, c.couleurs, c.embleme, c.logo, c.live, rangCommu(c)])]);
    if (cle === cleBarreFlotte && !barre.hidden) return;
    const focus = document.activeElement?.closest?.("#flotte-barre") ? document.activeElement.id : "";
    cleBarreFlotte = cle;
    barre.hidden = false;
    barre.setAttribute("role", "tablist");
    barre.setAttribute("aria-label", "La flotte : la course et le navire de chaque commu");
    const onglet = (id, enfants, extra = {}) => el("button", {
      type: "button", role: "tab", id: `grandline-${id || "course"}`, class: `fl-onglet${id ? "" : " fl-onglet-course"}`,
      "aria-selected": String(flVue === id), tabindex: flVue === id ? "0" : "-1", "aria-controls": "grandline-scene",
      onclick: () => choisirVueFlotte(id), ...extra,
    }, enfants);
    vider(barre,
      onglet("", [el("span", { class: "fl-onglet-icone", "aria-hidden": "true", text: "🏁" }), el("span", { class: "fl-onglet-nom", text: "La course" })]),
      classementFlotte().map((c) => onglet(c.id, [
        drapeauCommu(c),
        el("span", { class: "fl-onglet-nom", text: c.nom }),
        el("span", { class: "fl-onglet-rang", text: ordinal(rangCommu(c)) }),
        c.live ? el("span", { class: "fl-onglet-live", text: "Live" }) : null,
        maFlotte?.equipage === c.id ? el("span", { class: "fl-onglet-moi", title: "Ton équipage", text: "⭐" }) : null,
        regneGL() === c.id ? el("span", { class: "fl-onglet-regne", title: "Elle règne sur GRAND LINE (la Guerre des commus)", text: "👑" }) : null,
      ], { style: styleCommu(c), "aria-label": `${c.nom}, ${ordinal(rangCommu(c))}${c.live ? ", en live" : ""}${maFlotte?.equipage === c.id ? ", ton équipage" : ""}${regneGL() === c.id ? ", elle règne sur GRAND LINE" : ""}` })),
    );
    if (focus) $(focus)?.focus({ preventScroll: true });
    if (!barre.dataset.clavier) {
      barre.dataset.clavier = "1";
      barre.addEventListener("keydown", (ev) => {
        const tabs = [...barre.querySelectorAll('[role="tab"]')];
        const i = tabs.indexOf(document.activeElement);
        if (i < 0) return;
        const j = ev.key === "ArrowRight" ? (i + 1) % tabs.length : ev.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : ev.key === "Home" ? 0 : ev.key === "End" ? tabs.length - 1 : -1;
        if (j < 0) return;
        ev.preventDefault();
        tabs[j].click();
      });
    }
  }

  // « La course » : tous les navires sur leur piste, du port au trésor, et ton équipage
  function rendreLaCourse(z) {
    const f = donnees.flotte;
    const tries = classementFlotte();
    const gagnant = commu(f.gagnant?.id);
    const etapes = Math.max(1, ...tries.map((c) => c.navire.etapes || 11));
    const piste = (c, k) => {
      const n = c.navire;
      const av = avanceCommu(c);
      const pc = Math.floor(av * 100);
      const ici = n.vote ? "au carrefour, la commu vote" : n.cible ? `cap sur ${n.cible.nom}` : "en mer";
      return el("li", { class: `fl-piste${k === 0 ? " en-tete" : ""}${c.id === maFlotte?.equipage ? " la-mienne" : ""}${gagnant?.id === c.id ? " gagnante" : ""}`, style: `${styleCommu(c)};--av:${(av * 100).toFixed(2)}%` },
        el("span", { class: "fl-rang", "aria-hidden": "true", text: k < 3 ? ["🥇", "🥈", "🥉"][k] : String(k + 1) }),
        el("button", { type: "button", class: "fl-piste-commu", onclick: () => choisirVueFlotte(c.id, { voir: true }), "aria-label": `Voir le navire de ${c.nom}` },
          drapeauCommu(c),
          el("span", { class: "fl-piste-noms" }, el("b", { text: c.nom }), c.streamer ? el("small", { text: `chez ${c.streamer}` }) : null)),
        el("div", { class: "fl-piste-mer", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pc), "aria-label": `${c.nom} : ${pc} % de la course, ${ici}` },
          el("span", { class: "fl-piste-iles", "aria-hidden": "true" }, Array.from({ length: etapes + 1 }, (_, i) => el("i", { class: i <= (n.etape || 0) ? "faite" : "", style: `--x:${((i / etapes) * 100).toFixed(2)}%` }))),
          el("i", { class: "fl-piste-sillage" }),
          el("span", { class: "fl-piste-navire", "aria-hidden": "true", text: "⛵" }),
          el("span", { class: "fl-piste-tresor", "aria-hidden": "true", text: "💰" })),
        el("p", { class: "fl-piste-info" },
          el("b", { text: `${pc} %`, "data-compte": String(pc), "data-suffixe": " %" }),
          el("span", { text: `île ${Math.min((n.etape || 0) + 1, n.etapes || etapes)}/${n.etapes || etapes}` }),
          el("span", { text: ici }),
          c.live ? el("span", { class: "fl-live", text: "🔴 en live" }) : null,
          c.bot === false ? el("span", { class: "fl-sans-bot", title: "Le bot n'est pas encore sur son Discord : ce navire avance avec ses lives Twitch.", text: "lives Twitch seulement" }) : null,
          n.rameurs ? el("span", { class: "fl-rameurs", text: pluriel(n.rameurs, "rameur") }) : null),
      );
    };
    vider(z,
      el("div", { class: "fl-course-tete" },
        el("p", { class: "gl-sur", text: "La course des commus" }),
        el("h3", { class: "gl-titre", text: gagnant ? "Le trésor est trouvé !" : "Qui touchera le trésor en premier ?" }),
        el("p", { class: "gl-texte", text: `${pluriel(tries.length, "équipage")} sur la même mer, ${etapes} îles du port au trésor. Clique sur un drapeau pour suivre son navire.` })),
      gagnant ? el("div", { class: "fl-honneur", style: styleCommu(gagnant) },
        el("span", { class: "fl-couronne", "aria-hidden": "true", text: "👑" }),
        drapeauCommu(gagnant, "grand"),
        el("div", {},
          el("p", { class: "fl-honneur-sur", text: "Place d'honneur" }),
          el("p", { class: "fl-honneur-nom", text: gagnant.nom }),
          el("p", { class: "gl-texte", text: `L'équipage a touché le trésor${f.gagnant.le ? ` ${ilYa(f.gagnant.le)}` : ""}. Chaque matelot qui a ramé pour lui gagne la carte spéciale du trésor dans son album.` }))) : null,
      el("ol", { class: "fl-pistes" }, tries.map(piste)),
      el("div", { class: "fl-course-bas" }, carteMonEquipage(), carteReglesFlotte()),
    );
  }

  // ton équipage : automatique si tu es sur un seul Discord de la course, à choisir une fois si tu es sur plusieurs
  function carteMonEquipage() {
    const z = el("div", { class: "carte fl-moi", id: "flotte-moi" });
    const titre = (t) => [el("p", { class: "gl-sur", text: "Ton équipage" }), el("h3", { class: "gl-titre", text: t })];
    const message = flMessage ? el("p", { class: `gl-message${flMessage.erreur ? " erreur" : ""}`, role: "status", text: flMessage.texte }) : null;
    if (!moi?.connecte) {
      return vider(z, titre("Monte à bord"),
        el("p", { class: "gl-texte", text: "Connecte-toi avec Discord : le site regarde sur quels Discord de la course tu es, et te met dans le bon équipage." }),
        el("a", { class: "btn btn-plein btn-petit", href: "/api/auth/login", text: "Connexion avec Discord" }));
    }
    const m = maFlotte;
    if (!m) return vider(z, titre("À tes rames !"), el("p", { class: "gl-texte", text: "Le bot regarde sur quels Discord de la course tu es…" }));
    if (m.erreur) return vider(z, titre("À tes rames !"), el("p", { class: "gl-message erreur", role: "status", text: m.erreur }));
    const serveurs = (m.serveurs || []).map(commu).filter(Boolean);
    const mien = commu(m.equipage);
    if (mien) {
      return vider(z, titre(`Tu rames pour ${mien.nom}`),
        el("div", { class: "fl-moi-commu", style: styleCommu(mien) }, drapeauCommu(mien, "grand"),
          el("p", { class: "gl-texte", text: serveurs.length > 1 ? "Ton choix est bloqué jusqu'à l'arrivée au trésor." : "Tu es sur son Discord : c'est automatique." })),
        el("button", { type: "button", class: "btn btn-plein btn-petit", onclick: () => choisirVueFlotte(mien.id, { voir: true }), text: "⭐ Voir mon navire" }),
        message);
    }
    if (serveurs.length > 1) {
      const pris = commu(flChoix);
      return vider(z, titre("Choisis ton équipage"),
        el("p", { class: "gl-texte", text: "Tu es sur plusieurs Discord de la course. Choisis une fois pour qui tu rames sur le site : le choix est bloqué jusqu'à la fin du voyage." }),
        pris
          ? el("div", { class: "fl-confirmer" },
            el("p", { class: "gl-texte" }, "Tu rames pour ", el("b", { text: pris.nom }), " jusqu'au trésor ?"),
            el("div", { class: "fl-boutons" },
              el("button", { type: "button", class: "btn btn-plein btn-petit", disabled: flOccupe, onclick: () => agirFlotte("flotte-choisir", { commu: pris.id }), text: "Oui, je monte à bord" }),
              el("button", { type: "button", class: "btn btn-contour btn-petit", disabled: flOccupe, onclick: () => { flChoix = ""; rendreGrandLine(); }, text: "Pas encore" })))
          : el("div", { class: "fl-boutons" }, serveurs.map((c) => el("button", { type: "button", class: "btn btn-contour btn-petit fl-choix", style: styleCommu(c), disabled: flOccupe, onclick: () => { flChoix = c.id; rendreGrandLine(); } }, drapeauCommu(c), c.nom))),
        message);
    }
    if (serveurs.length === 1) return vider(z, titre(`Tu rames pour ${serveurs[0].nom}`), el("p", { class: "gl-texte", text: "Tu es sur son Discord : c'est automatique." }), message);
    const liens = classementFlotte().filter((c) => lienDiscord(c));
    return vider(z, titre("Tu regardes la course"),
      el("p", { class: "gl-texte", text: "Tu n'es sur aucun Discord de la course. Tu peux suivre les navires d'ici ; pour ramer, rejoins le Discord d'un équipage." }),
      liens.length ? el("div", { class: "fl-boutons" }, liens.map((c) => el("a", { class: "btn btn-contour btn-petit fl-choix", style: styleCommu(c), href: lienDiscord(c), ...externe }, drapeauCommu(c), c.nom))) : null,
      message);
  }
  function carteReglesFlotte() {
    return el("div", { class: "carte fl-regles" },
      el("p", { class: "gl-sur", text: "Qui rame pour qui" }),
      el("h3", { class: "gl-titre", text: "Ce qui fait avancer chaque navire" }),
      el("ul", { class: "gl-ramer-liste" },
        el("li", {}, el("span", { "aria-hidden": "true", text: "💬" }), el("span", { text: "Les messages et le vocal sur son Discord : ils comptent pour la commu où ils se passent." })),
        el("li", {}, el("span", { "aria-hidden": "true", text: "💜" }), el("span", { text: "Le chat et le temps de live sur la chaîne Twitch de son streamer, et son !boss." })),
        el("li", {}, el("span", { "aria-hidden": "true", text: "🎮" }), el("span", { text: "Les parties, les votes et le bouton FRAPPER sur le site : ils comptent pour ton équipage." }))),
      el("p", { class: "note", text: "Les messages ne sont jamais lus, seulement comptés. Sur les serveurs des potes, le bot ne fait que compter." }));
  }

  // dans l'onglet d'une commu : sa fiche (drapeau, streamer, liens, meilleurs matelots), en tête des panneaux
  function rendreFicheCommu() {
    const grille = document.querySelector("#grandline .gl-grille");
    const c = commu(flVue);
    let z = $("flotte-fiche");
    if (!grille || !c) { z?.remove(); return; }
    if (!z) { z = el("div", { class: "carte fl-fiche", id: "flotte-fiche" }); grille.prepend(z); }
    z.setAttribute("style", styleCommu(c));
    const matelots = Array.isArray(c.matelots) ? c.matelots.slice(0, 5) : [];
    const twitch = lienTwitch(c);
    const discord = lienDiscord(c);
    vider(z,
      el("div", { class: "fl-fiche-tete" },
        drapeauCommu(c, "grand"),
        el("div", {},
          el("p", { class: "gl-sur", text: `${rangCommu(c) === 1 ? "En tête de la course" : `Classement : ${rangCommu(c)} sur ${commusFlotte().length}`}${maFlotte?.equipage === c.id ? " · ⭐ ton équipage" : ""}` }),
          el("h3", { class: "gl-titre fl-fiche-nom", text: c.nom }),
          el("p", { class: "gl-texte", text: [c.streamer ? `La commu de ${c.streamer}` : "", c.bot === false ? "Le bot n'est pas encore sur son Discord : son navire avance avec ses lives Twitch." : ""].filter(Boolean).join(" · ") || "Un équipage de la course." })),
        el("div", { class: "fl-fiche-liens" },
          twitch ? el("a", { class: `btn ${c.live ? "btn-plein" : "btn-contour"} btn-petit`, href: twitch, ...externe, text: c.live ? "🔴 En live sur Twitch" : "💜 Sa chaîne Twitch" }) : null,
          discord ? el("a", { class: "btn btn-contour btn-petit", href: discord, ...externe, text: "Son Discord" }) : null,
          el("button", { type: "button", class: "btn btn-contour btn-petit", onclick: (ev) => copierLienFlotte(c, ev.currentTarget), text: "🔗 Copier le lien du navire" }))),
      matelots.length ? el("div", { class: "fl-matelots" },
        el("p", { class: "gl-petit-titre", text: "Ses meilleurs matelots du voyage" }),
        el("ol", { class: "gl-rameurs" }, matelots.map(rameur))) : null,
    );
  }
  async function copierLienFlotte(c, bouton) {
    const lien = `${location.origin}/#grandline-${c.id}`;
    let ok = false;
    try { await navigator.clipboard.writeText(lien); ok = true; } catch {}
    bouton.textContent = ok ? "✅ Lien copié !" : `🔗 ${lien.replace(/^https?:\/\//, "")}`;
    setTimeout(() => { if (bouton.isConnected) bouton.textContent = "🔗 Copier le lien du navire"; }, 2600);
  }

  async function agirFlotte(action, extra = {}) {
    if (flOccupe || !v4Ouverte()) return;
    flOccupe = true;
    if (action !== "flotte") flMessage = null;
    let d = {};
    let status = 0;
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      status = r.status;
      d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
    } catch {
      d = { erreur: "Impossible de joindre le navire. Vérifie ta connexion." };
    }
    flOccupe = false;
    if (status === 401) { moi = { connecte: false }; maFlotte = null; maFlotteDemandee = false; rendreCompte(); }
    if (d.flotte) maFlotte = d.flotte;
    else if (action === "flotte" && status !== 401) { maFlotte = { erreur: d.texte || d.erreur || "Le navire ne répond pas, réessaie dans un moment." }; maFlotteDemandee = false; }
    flChoix = "";
    if (action === "flotte-choisir") {
      flMessage = d.ok ? { texte: `⭐ Bienvenue à bord ! Tu rames pour ${commu(maFlotte?.equipage)?.nom || "ton équipage"} jusqu'au trésor.` } : { texte: d.texte || d.erreur || "Ça n'a pas marché, réessaie.", erreur: true };
      if (d.ok) { chargerMonNavire(); if (!reduit.matches) confettisGL(); }
    }
    if (infosGL()) rendreGrandLine();
  }
  function chargerMaFlotte() {
    maFlotte = null;
    maFlotteDemandee = false;
    if (moi?.connecte && flotteActive()) { maFlotteDemandee = true; agirFlotte("flotte"); }
  }
  // ce que la carte (3D ou 2D) reçoit : le navire regardé, à ses couleurs, et les autres navires de la flotte
  // ---------- le jour et la nuit sur GRAND LINE (V4) : à l'heure de Paris, pour tout le monde ----------
  // le lever et le coucher du soleil à Paris, ce jour-là (l'équation du lever du soleil ; en temps universel : pas d'heure d'été à gérer)
  function soleilParis(t = Date.now()) {
    const rad = Math.PI / 180, lat = 48.8566 * rad, lon = 2.3522;
    const n = Math.round(t / 86_400_000 + 2440587.5 - 2451545 + lon / 360);
    const j = n - lon / 360;
    const M = ((357.5291 + 0.98560028 * j) % 360) * rad;
    const C = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
    const l = ((M / rad + C + 180 + 102.9372) % 360) * rad;
    const midi = 2451545 + j + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * l);
    const d = Math.asin(Math.sin(l) * Math.sin(23.4397 * rad));
    const w = Math.acos(Math.max(-1, Math.min(1, (Math.sin(-0.833 * rad) - Math.sin(lat) * Math.sin(d)) / (Math.cos(lat) * Math.cos(d))))) / rad;
    const ms = (jj) => (jj - 2440587.5) * 86_400_000;
    return { lever: ms(midi - w / 360), coucher: ms(midi + w / 360) };
  }
  const AMBIANCES = { jour: { phase: "jour", nuit: 0, or: 0 }, aube: { phase: "aube", nuit: 0.2, or: 0.9 }, crepuscule: { phase: "crepuscule", nuit: 0.16, or: 1 }, nuit: { phase: "nuit", nuit: 1, or: 0 } };
  const AMBIANCE_TEXTE = { jour: "☀️ Jour", aube: "🌅 Aube", crepuscule: "🌇 Crépuscule", nuit: "🌙 Nuit" };
  let ambianceForcee = ""; // les essais et l'aperçu : « ?heure=nuit » (ou aube, crepuscule, jour)
  try { const h = new URLSearchParams(location.search).get("heure"); if (AMBIANCES[h]) ambianceForcee = h; } catch {}
  function ambianceGL(t = Date.now()) {
    if (!v4Ouverte()) return AMBIANCES.jour;
    if (AMBIANCES[ambianceForcee]) return AMBIANCES[ambianceForcee];
    const { lever, coucher } = soleilParis(t);
    const m = (t - lever) / 60_000, c = (t - coucher) / 60_000; // en minutes : depuis le lever, depuis le coucher
    const lisse = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    if (m > -50 && m < 40) return { phase: "aube", nuit: 1 - lisse(-50, -5, m), or: lisse(-50, -10, m) * (1 - lisse(0, 40, m)) };
    if (c > -45 && c < 50) return { phase: "crepuscule", nuit: lisse(5, 50, c), or: lisse(-45, 5, c) * (1 - lisse(10, 50, c)) };
    return m <= -50 || c >= 50 ? AMBIANCES.nuit : AMBIANCES.jour;
  }
  let ambianceVue = "";
  function majAmbianceGL(allure = "") { // « rapide » : en quelques secondes (l'aperçu) ; « vite » : tout de suite (les essais)
    const a = ambianceGL();
    if (carteGL?.type === "3d") carteGL.rendu.ambiance?.({ ...a, rapide: allure === "rapide", vite: allure === "vite" });
    const scene = $("grandline-scene");
    if (!scene || ambianceVue === a.phase) return a;
    ambianceVue = a.phase;
    for (const k of Object.keys(AMBIANCES)) scene.classList.toggle(`gl-${k}`, k === a.phase && k !== "jour");
    return a;
  }
  if (new URLSearchParams(location.search).has("3d")) window.__glAmbiance = (phase, allure = "vite") => { ambianceForcee = AMBIANCES[phase] ? phase : ""; const a = majAmbianceGL(allure); if (infosGL()) rendreHudGL(infosGL()); return a; }; // pour les essais

  // Un défi entre commus, vu sur la carte (V4). Aujourd'hui : la SEMAINE BAHRIOT. Pendant sa dernière soirée (le dimanche
  // à 20 h) et jusqu'au podium, les navires des premières commus quittent leur route et se font face dans une arène ; une
  // fois le podium figé, le vainqueur porte la couronne 7 jours (le temps que le podium reste à l'affiche).
  function defiGL() {
    const s = donnees?.bahriot;
    if (!s || !Array.isArray(s.classement) || !v4Ouverte()) return null;
    const enJeu = s.classement.filter((x) => ID_COMMU.test(String(x?.id || "")) && (x.inscrits > 0 || x.points > 0));
    const base = { id: String(s.id || "bahriot"), nom: String(s.nom || "La SEMAINE BAHRIOT"), commus: enJeu.map((x) => x.id), scores: Object.fromEntries(enJeu.map((x) => [x.id, Number(x.points) || 0])) };
    if ((s.phase === "en-cours" && s.derniereSoiree) || s.phase === "comptage") return enJeu.length >= 2 ? { ...base, phase: "combat" } : null;
    const premier = s.valide?.podium?.[0];
    if (s.phase === "fini" && premier?.points > 0) return { ...base, phase: "victoire", gagnant: premier.id };
    return null;
  }
  // la commu qui règne sur GRAND LINE (elle a gagné la dernière Guerre des commus) : sa couronne sur la carte
  const regneGL = () => (v4Ouverte() && ID_COMMU.test(String(donnees?.guerre?.regne?.commu || "")) ? donnees.guerre.regne.commu : "");
  function donneesCarteGL(g) {
    if (!g || !flotteActive()) return g;
    const c = commuRegardee();
    return {
      ...g,
      defi: defiGL(),
      regne: regneGL(),
      recit: ilesRecit(),
      flotte: {
        id: c.id, nom: c.nom, couleurs: c.couleurs, embleme: c.embleme, drapeau: drapeauImage(c), trainee: traineeCommu(c), modele: modeleNavireGL(c), ensemble: vueCourse(), rang: ordinal(rangCommu(c)),
        autres: commusFlotte().filter((x) => x.id !== c.id).map((x) => ({ id: x.id, nom: x.nom, couleurs: x.couleurs, embleme: x.embleme, drapeau: drapeauImage(x), trainee: traineeCommu(x), modele: modeleNavireGL(x), live: Boolean(x.live), rang: ordinal(rangCommu(x)), route: x.navire.route, etape: x.navire.etape, milles: x.navire.milles, longueur: x.navire.longueur, vote: Boolean(x.navire.vote), voyage: x.navire.voyage })),
      },
    };
  }
  const prechargees = new Set();
  const prechargerIle = (id) => { const u = imageIle(id); if (u && !prechargees.has(u)) { prechargees.add(u); const i = new Image(); i.src = u; } };
  const pourcentGL = (g) => Math.min(100, Math.floor((g.milles / Math.max(1, g.longueur)) * 100));
  function quandGL(t) {
    const d = new Date(t);
    const jour = (x) => x.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
    const j = jour(d) === jour(new Date()) ? "aujourd'hui" : jour(d) === jour(new Date(Date.now() + 86_400_000)) ? "demain" : d.toLocaleDateString("fr-FR", { weekday: "long", timeZone: "Europe/Paris" });
    return `${j} vers ${fmtHeure.format(d).replace(":", " h ")}`;
  }

  // avant l'ouverture : « accès restreint », avec le compte à rebours
  function rendreVerrouGL(escale = false) {
    const scene = $("grandline-scene");
    if (!scene) return;
    const g = infosGL();
    const t = g?.ouverture && g.ouvert === false ? g.ouverture : GL_OUVERTURE;
    const cle = `${t}:${escale}`;
    let v = $("grandline-verrou");
    if (v && cle === cleVerrou) return;
    cleVerrou = cle;
    if (!v) { v = el("div", { class: "gl-verrou", id: "grandline-verrou" }); scene.append(v); }
    const quand = new Date(t);
    const date = quand.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
    const mouette = () => {
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 10");
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", "M1 7 Q6 0 12 6 Q18 0 23 7");
      svg.append(p);
      return el("i", {}, svg);
    };
    vider(v,
      el("span", { class: "gl-verrou-nuages", "aria-hidden": "true" }, ["☁️", "☁️", "☁️", "☁️", "☁️"].map((n) => el("i", { text: n }))),
      el("span", { class: "gl-verrou-points", "aria-hidden": "true" }, ["?", "?", "?", "?", "?", "?"].map((n) => el("i", { text: n }))),
      el("div", { class: "gl-verrou-diorama", "aria-hidden": "true" },
        el("span", { class: "gl-verrou-halo" }),
        el("span", { class: "gl-verrou-ombre" }),
        el("img", { class: "gl-verrou-port", src: "/img/grandline-port.webp", alt: "", width: 820, height: 505, decoding: "async", loading: "lazy" }),
        el("span", { class: "gl-verrou-mouettes" }, mouette(), mouette(), mouette()),
        el("span", { class: "gl-verrou-eclats" }, ["✦", "✧", "✦", "✧", "✦", "✧"].map((n) => el("i", { text: n }))),
      ),
      el("div", { class: "gl-verrou-carte" },
        ...(escale ? [
          el("span", { class: "gl-verrou-cadenas gl-ancre", "aria-hidden": "true" }, el("i", { class: "gl-chaine" }), el("b", { text: "⚓" })),
          el("p", { class: "gl-verrou-tampon gl-tampon-escale", text: "Escale" }),
          el("p", { class: "gl-sur", text: "Pause au port" }),
          el("h3", { class: "gl-verrou-titre" }, "Le navire fait ", el("span", { class: "degrade", text: "le plein" })),
          el("div", { class: "gl-provisions", "aria-hidden": "true" }, el("span", { text: "🍎" }), el("span", { text: "🛢️" }), el("span", { text: "🍖" }), el("span", { text: "📦" }), el("span", { text: "🧭" })),
          el("p", { class: "gl-texte", text: "Le navire de la commu est à quai pour prendre des provisions : le bot fait une petite pause (maintenance). Tout ce que vous avez ramé est gardé, et il repart très vite !" }),
        ] : [
          el("span", { class: "gl-verrou-cadenas", "aria-hidden": "true" }, el("i", { class: "gl-chaine" }), el("b", { text: "🔒" })),
          el("p", { class: "gl-verrou-tampon", text: "Accès restreint" }),
          el("p", { class: "gl-sur", text: "La V3 du site" }),
          el("h3", { class: "gl-verrou-titre" }, "GRAND LINE ", el("span", { class: "degrade", text: "lève l'ancre" })),
          el("p", { class: "gl-verrou-date", text: `${majuscule(date)} à ${fmtHeure.format(quand).replace(":", " h ")}` }),
          rebours(t, true, "grandline", { fin: () => guetterOuvertureGL(), texteFin: "Le navire part !" }),
          el("p", { class: "gl-texte", text: "Le navire de la commu attend au port. À l'ouverture, tout ce que vous faites sur le Discord, le site et Twitch le fera avancer, d'île en île, jusqu'au trésor. Prépare tes rames !" }),
        ]),
      ),
    );
  }
  // à l'heure dite : on redemande au bot jusqu'à ce que le navire soit parti
  let guetteGL = null;
  function guetterOuvertureGL() {
    if (guetteGL) return;
    let n = 0;
    guetteGL = setInterval(() => {
      if (glOuvert() || ++n > 40) { clearInterval(guetteGL); guetteGL = null; return; }
      charger();
    }, 15_000);
    charger();
  }

  let sousGL = "";
  // ---------- le récit de GRAND LINE (VF) : la voix raconte ce que TON équipage a vécu ----------
  // Le serveur (/api/recit) n'envoie que les pages débloquées par le navire pour lequel le membre rame : leur texte et
  // leur voix. Les autres restent scellées (même leur titre). Rien ne joue sans un clic, et le fichier de la voix n'est
  // chargé qu'à ce moment-là. Le navigateur retient les pages déjà écoutées et la preuve de celles déjà débloquées
  // (le navire repart de zéro à chaque voyage : une page gagnée reste gagnée).
  const CLE_RECIT = "barhaw-recit";
  const RECIT = { pages: null, equipage: null, nom: "", connecte: false, cle: "", essai: 0, occupe: false, page: null, audio: null, tic: 0, retour: null, baisse: null };
  const GENRE_RECIT = { port: ["⚓", "Le départ"], ile: ["🏝️", "Île"], mer: ["🌊", "En mer"], evenement: ["⚡", "Événement"] };
  function memoireRecit() {
    try {
      const m = JSON.parse(localStorage.getItem(CLE_RECIT) || "{}");
      return { preuves: m.preuves && typeof m.preuves === "object" ? m.preuves : {}, entendues: Array.isArray(m.entendues) ? m.entendues.map(String) : [] };
    } catch { return { preuves: {}, entendues: [] }; }
  }
  const garderRecit = (m) => { try { localStorage.setItem(CLE_RECIT, JSON.stringify(m)); } catch {} };
  const pagesOuvertes = () => (RECIT.pages || []).filter((p) => p.ouverte);
  const pagesNouvelles = () => { const e = new Set(memoireRecit().entendues); return pagesOuvertes().filter((p) => !e.has(p.id)); };
  const recitVisible = () => v4Ouverte() && glOuvert() && Array.isArray(RECIT.pages);
  // sur la carte : les îles dont la page attend d'être écoutée (seulement quand on regarde le navire de son équipage)
  const ilesRecit = () => (recitVisible() && RECIT.equipage && monNavireGL() ? pagesNouvelles().filter((p) => p.genre === "ile").map((p) => p.ile) : []);
  function cleRecit() {
    const n = commu(maFlotte?.equipage)?.navire;
    return JSON.stringify([Boolean(moi?.connecte), maFlotte?.equipage || "", n?.voyage, n?.etape, n?.milles > 0, n?.evenement?.type || "", n?.route?.flat().filter((i) => i.etat === "atteinte").length]);
  }
  async function chargerRecit() {
    if (RECIT.occupe || !v4Ouverte() || !glOuvert()) return;
    const cle = cleRecit();
    // même situation : on ne redemande que toutes les 5 minutes (un BOSS LIVE gagné peut ouvrir une page), 1 minute après un échec
    if (cle === RECIT.cle && Date.now() - RECIT.essai < (RECIT.pages ? 300_000 : 60_000)) return;
    RECIT.occupe = true;
    RECIT.cle = cle;
    RECIT.essai = Date.now();
    try {
      const m = memoireRecit();
      const p = Object.entries(m.preuves).filter(([k, v]) => /^[a-z]{2,20}$/.test(k) && /^[A-Za-z0-9_-]{22}$/.test(String(v))).map(([k, v]) => `${k}.${v}`).join(",");
      const r = await fetch("/api/recit" + (p ? `?p=${encodeURIComponent(p)}` : ""), { credentials: "same-origin" });
      const d = await r.json();
      if (Array.isArray(d.pages)) {
        Object.assign(RECIT, { pages: d.pages, equipage: d.equipage || null, nom: String(d.nom || ""), connecte: Boolean(d.connecte) });
        let change = false;
        for (const x of d.pages) if (x.ouverte && x.preuve && m.preuves[x.id] !== x.preuve) { m.preuves[x.id] = x.preuve; change = true; }
        if (change) garderRecit(m);
      } else if (d.ferme) RECIT.pages = null;
    } catch {} finally { RECIT.occupe = false; }
    rendreRecit();
    if (carteGL && infosGL()) carteGL.rendu.maj(donneesCarteGL(infosGL()));
  }
  function rendreRecit() {
    const z = $("grandline-recit");
    if (!z) return;
    const pages = recitVisible() ? RECIT.pages : null;
    z.hidden = !pages;
    rendreBulleRecit();
    if (!pages) { z.dataset.cle = ""; return; }
    const entendues = new Set(memoireRecit().entendues);
    const ouvertes = pages.filter((p) => p.ouverte);
    const cle = JSON.stringify([RECIT.equipage, RECIT.connecte, RECIT.nom, pages.map((p) => (p.ouverte ? (entendues.has(p.id) ? 2 : 1) : 0)).join("")]);
    if (z.dataset.cle === cle) return;
    z.dataset.cle = cle;
    const focus = document.activeElement?.closest?.("#grandline-recit") ? document.activeElement.dataset.page : "";
    const phrase = !RECIT.connecte ? "Connecte-toi avec Discord et monte à bord d'un navire : chaque équipage ouvre ses propres pages en avançant sur la mer."
      : !RECIT.equipage ? "Choisis ton équipage dans la flotte : le récit s'ouvre avec le navire pour lequel tu rames."
      : `${RECIT.nom} a ouvert ${ouvertes.length} ${ouvertes.length > 1 ? "pages" : "page"} sur ${pages.length}. Chaque équipage n'entend que ce que son propre navire a vécu : les îles des autres restent scellées.`;
    const derniere = pagesNouvelles().at(-1) || ouvertes.at(-1);
    vider(z,
      el("div", { class: "recit-tete" },
        el("div", {},
          el("p", { class: "gl-sur", text: "Le récit · Arc 1" }),
          el("h3", { class: "gl-titre" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: "📖" }), "La Carte de Barhaw"),
        ),
        derniere ? el("button", { type: "button", class: "btn btn-plein btn-petit recit-derniere", "data-page": `dernier`, onclick: (ev) => ouvrirRecit(derniere.id, ev.currentTarget) }, `${derniere.son ? "▶" : "📜"} ${!derniere.son ? "Lire" : entendues.has(derniere.id) ? "Réécouter" : "Écouter"} : ${derniere.titre}`) : null,
      ),
      el("p", { class: "gl-texte", text: phrase }),
      el("ol", { class: "recit-rail", "aria-label": "Les pages du récit, dans l'ordre de la route" }, pages.map((p) => el("li", {}, p.ouverte
        ? el("button", { type: "button", class: `recit-pastille ${entendues.has(p.id) ? "entendue" : "nouvelle"}`, title: p.titre, "data-page": p.id, "aria-label": `Page ${p.n} : ${p.titre}${entendues.has(p.id) ? "" : " (pas encore écoutée)"}`, onclick: (ev) => ouvrirRecit(p.id, ev.currentTarget) },
          el("span", { "aria-hidden": "true", text: GENRE_RECIT[p.genre]?.[0] || "📖" }), el("span", { class: "recit-num", "aria-hidden": "true", text: String(p.n) }))
        : el("span", { class: "recit-pastille scellee", role: "img", "aria-label": `Page ${p.n}, scellée`, title: "Page scellée" }, el("span", { "aria-hidden": "true", text: "🔒" }), el("span", { class: "recit-num", "aria-hidden": "true", text: String(p.n) }))))),
    );
    if (focus) z.querySelector(`[data-page="${focus}"]`)?.focus();
  }
  // la bulle dorée posée sur la carte : une page attend d'être écoutée
  function rendreBulleRecit() {
    const scene = $("grandline-scene");
    if (!scene) return;
    let b = $("grandline-recit-bulle");
    const page = recitVisible() ? pagesNouvelles().at(-1) : null;
    if (!page) { b?.remove(); return; }
    if (!b) {
      b = el("button", { type: "button", class: "recit-bulle", id: "grandline-recit-bulle" });
      b.addEventListener("click", () => ouvrirRecit(b.dataset.page, b));
      scene.append(b);
    }
    if (b.dataset.page !== page.id) {
      b.dataset.page = page.id;
      vider(b, el("span", { class: "recit-bulle-emoji", "aria-hidden": "true", text: "📖" }), el("span", { class: "recit-bulle-texte" }, el("small", { text: "Nouvelle page du récit" }), page.titre));
    }
  }
  function marquerEntendue(id) {
    const m = memoireRecit();
    if (m.entendues.includes(id)) return;
    m.entendues.push(id);
    garderRecit(m);
    rendreRecit();
    if (carteGL && infosGL()) carteGL.rendu.maj(donneesCarteGL(infosGL()));
  }
  // pendant que la voix raconte, la musique du site et l'ambiance baissent (et remontent ensuite)
  function baisserSonsRecit(baisser) {
    if (baisser && !RECIT.baisse) {
      RECIT.baisse = { musique: SON.musiqueSite ? SON.musiqueSite.volume : null, maitre: SON.maitre ? SON.maitre.gain.value : null };
      if (SON.musiqueSite) SON.musiqueSite.volume = RECIT.baisse.musique * 0.2;
      if (SON.maitre) SON.maitre.gain.value = RECIT.baisse.maitre * 0.25;
    } else if (!baisser && RECIT.baisse) {
      if (SON.musiqueSite && RECIT.baisse.musique !== null) SON.musiqueSite.volume = RECIT.baisse.musique;
      if (SON.maitre && RECIT.baisse.maitre !== null) SON.maitre.gain.value = RECIT.baisse.maitre;
      RECIT.baisse = null;
    }
  }
  function ouvrirRecit(id, depuis) {
    const p = pagesOuvertes().find((x) => x.id === id);
    if (!p) return;
    const retour = RECIT.page ? RECIT.retour : depuis || document.activeElement;
    fermerRecit(true);
    RECIT.page = p;
    RECIT.retour = retour;
    const [emoji, genre] = GENRE_RECIT[p.genre] || ["📖", ""];
    const ouvertes = pagesOuvertes();
    const k = ouvertes.indexOf(p);
    const voile = el("div", { class: "recit-voile", id: "recit-lecteur", role: "dialog", "aria-modal": "true", "aria-labelledby": "recit-titre" },
      el("div", { class: "recit-feuille" },
        el("button", { type: "button", class: "recit-fermer", "aria-label": "Fermer le récit", onclick: () => fermerRecit(), text: "✕" }),
        el("p", { class: "gl-sur", text: `Page ${p.n} sur ${RECIT.pages.length} · ${genre}` }),
        el("h3", { class: "gl-titre", id: "recit-titre" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: emoji }), p.titre),
        // pour les lecteurs d'écran : le texte entier, tout de suite ; à l'écran : il s'écrit au rythme de la voix
        el("p", { class: "recit-lu", text: p.texte }),
        el("p", { class: "recit-texte", "aria-hidden": "true" }, el("span", { class: "recit-dit" }), el("span", { class: "recit-reste", text: p.texte })),
        p.son ? el("div", { class: "recit-piste", "aria-hidden": "true" }, el("span", { class: "recit-avance" })) : el("p", { class: "note", text: "La voix de cette page arrive bientôt. Pour l'instant, elle se lit." }),
        el("div", { class: "recit-commandes" },
          el("button", { type: "button", class: "recit-nav", disabled: k <= 0, onclick: () => ouvrirRecit(ouvertes[k - 1].id), "aria-label": "Page précédente", text: "◀" }),
          p.son ? el("button", { type: "button", class: "btn btn-plein recit-jouer", onclick: () => basculerRecit(), text: "▶ Écouter" }) : null,
          el("button", { type: "button", class: "recit-nav", disabled: k >= ouvertes.length - 1, onclick: () => ouvrirRecit(ouvertes[k + 1].id), "aria-label": "Page suivante", text: "▶" }),
        ),
      ),
    );
    voile.addEventListener("click", (ev) => { if (ev.target === voile) fermerRecit(); });
    if (p.id === "port") marqueRecit(voile.querySelector(".recit-feuille")); // le site secret : la marque I
    (document.fullscreenElement || document.body).append(voile);
    document.documentElement.classList.add("recit-ouvert");
    document.addEventListener("keydown", toucheRecit);
    (voile.querySelector(".recit-jouer") || voile.querySelector(".recit-fermer")).focus();
    if (!p.son) { ecrireRecit(1); marquerEntendue(p.id); return; }
    // le clic qui ouvre la page est le geste qui autorise la voix : elle part tout de suite
    const a = new Audio(p.son);
    a.preload = "auto";
    RECIT.audio = a;
    a.addEventListener("play", () => { baisserSonsRecit(true); boutonRecit(); cancelAnimationFrame(RECIT.tic); RECIT.tic = requestAnimationFrame(suivreRecit); });
    a.addEventListener("pause", () => { baisserSonsRecit(false); boutonRecit(); });
    a.addEventListener("ended", () => { ecrireRecit(1); marquerEntendue(p.id); boutonRecit(); });
    a.addEventListener("error", () => { ecrireRecit(1); const b = $("recit-lecteur")?.querySelector(".recit-jouer"); if (b) { b.disabled = true; b.textContent = "La voix n'a pas pu se charger"; } });
    a.play().catch(() => boutonRecit());
  }
  function boutonRecit() {
    const b = $("recit-lecteur")?.querySelector(".recit-jouer");
    const a = RECIT.audio;
    if (!b || !a || b.disabled) return;
    b.textContent = a.ended ? "↺ Réécouter" : a.paused ? (a.currentTime > 0.2 ? "▶ Reprendre" : "▶ Écouter") : "⏸ Pause";
  }
  function basculerRecit() {
    const a = RECIT.audio;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }
  // la part du texte déjà dite : on coupe entre deux mots, le reste attend en clair
  function ecrireRecit(part) {
    const z = $("recit-lecteur");
    const p = RECIT.page;
    if (!z || !p) return;
    let n = part >= 1 ? p.texte.length : Math.round(p.texte.length * Math.max(0, part));
    if (n > 0 && n < p.texte.length) { const s = p.texte.indexOf(" ", n); n = s < 0 ? p.texte.length : s; }
    if (z.dataset.n === String(n)) return;
    z.dataset.n = String(n);
    z.querySelector(".recit-dit").textContent = p.texte.slice(0, n);
    z.querySelector(".recit-reste").textContent = p.texte.slice(n);
  }
  function suivreRecit() {
    const a = RECIT.audio;
    const p = RECIT.page;
    const z = $("recit-lecteur");
    if (!a || !p || !z) return;
    // le texte suit la voix : il n'avance que pendant qu'elle parle (ses silences sont connus), avec un rien d'avance
    const t = a.currentTime + 0.25;
    let dit = 0, total = 0;
    for (const [x, y] of p.parole || []) { total += y - x; dit += Math.max(0, Math.min(t, y) - x); }
    ecrireRecit(reduit.matches || a.ended || !total ? 1 : dit / total);
    const barre = z.querySelector(".recit-avance");
    if (barre) barre.style.transform = `scaleX(${Math.min(1, a.currentTime / (a.duration || p.duree || 1)).toFixed(4)})`;
    if (!a.paused && !a.ended) RECIT.tic = requestAnimationFrame(suivreRecit);
  }
  function toucheRecit(e) {
    const z = $("recit-lecteur");
    if (!z) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fermerRecit(); return; }
    if (e.key !== "Tab") return;
    // le clavier reste dans la page ouverte
    const f = [...z.querySelectorAll("button:not([disabled])")];
    if (!f.length) return;
    const k = f.indexOf(document.activeElement);
    if (e.shiftKey && k <= 0) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
  function fermerRecit(pourUneAutre = false) {
    cancelAnimationFrame(RECIT.tic);
    if (RECIT.audio) { try { RECIT.audio.pause(); RECIT.audio.removeAttribute("src"); RECIT.audio.load(); } catch {} RECIT.audio = null; }
    baisserSonsRecit(false);
    $("recit-lecteur")?.remove();
    document.removeEventListener("keydown", toucheRecit);
    RECIT.page = null;
    if (pourUneAutre) return;
    document.documentElement.classList.remove("recit-ouvert");
    const r = RECIT.retour;
    RECIT.retour = null;
    if (r?.isConnected) r.focus(); else $("grandline-recit")?.querySelector("button")?.focus();
  }

  function rendreGrandLine() {
    const z = $("grandline-cap");
    if (!z) return;
    rendreFlotte();
    rendreTraversee();
    const g = infosGL();
    const sous = document.querySelector("#grandline .entete-section .sous");
    if (sous) {
      sousGL ||= sous.textContent;
      const noms = classementFlotte().map((c) => c.nom);
      const texte = noms.length ? `Chaque commu a son navire sur la même mer : ${noms.length > 1 ? `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}` : noms[0]}. Tout ce que vous faites sur votre Discord, sur le live de votre streamer et sur le site fait avancer votre navire, d'île en île. Le premier au trésor gagne la place d'honneur.` : sousGL;
      if (sous.textContent !== texte) sous.textContent = texte;
    }
    const ouvert = glOuvert();
    $("grandline")?.classList.toggle("gl-ferme", !ouvert);
    const pastille = $("pastille-grandline");
    if (pastille) pastille.hidden = ouvert || (Boolean(donnees?.horsLigne) && Date.now() >= GL_OUVERTURE);
    if (!ouvert) {
      rendreVerrouGL(Boolean(donnees?.horsLigne));
      rendreRecit();
      return;
    }
    $("grandline-verrou")?.remove();
    cleVerrou = "";
    if (glVue && !carteGL) preparerCarteGL();
    // la V4 : le lien direct vers la carte en 3D (#grandline-3d)
    if (salleVoulue() && !SALLE.ouverte && v4Ouverte()) ouvrirSalleGL();
    const b3 = $("gl-ouvrir-3d");
    if (b3) b3.hidden = !v4Ouverte() || SALLE.ouverte || carteGL?.type !== "2d";
    const bg = $("gl-generique");
    if (bg) bg.hidden = !v4Ouverte();
    const sousSalle = $("gl-salle-sous");
    if (sousSalle) sousSalle.textContent = flotteActive() ? commuRegardee()?.nom || "" : g?.cible ? `Cap sur ${g.cible.nom}` : "";
    // « Terre en vue ! » : une nouvelle île pendant la visite (ou il y a moins de 2 h, une fois par visite), navire par navire
    const cleNavire = flotteActive() ? commuRegardee().id : "";
    const avant = glAvant?.cle === cleNavire ? glAvant : null;
    const derniere = g.escales?.[0] ? { ...g.escales[0], commu: cleNavire } : null;
    if (avant && (g.voyage > avant.voyage || (g.voyage === avant.voyage && g.etape > avant.etape)) && derniere) terreEnVue(derniere);
    else if (!avant && derniere && Date.now() - derniere.arrivee < 2 * 3600_000) terreEnVue(derniere);
    glAvant = { cle: cleNavire, voyage: g.voyage, etape: g.etape };
    majAmbianceGL();
    if (v4Ouverte()) { chargerRecit(); rendreRecit(); }
    if (carteGL) carteGL.rendu.maj(donneesCarteGL(g));
    rendreCapGL(g);
    rendreMerGL(g);
    rendreEquipageGL(g);
    rendreJournalGL(g);
    rendreEscalesGL(g);
    rendreMoiGL(g);
    rendreHudGL(g);
  }

  function rendreHudGL(g) {
    const h = $("grandline-hud");
    if (!h) return;
    const ev = g.evenement;
    const heure = v4Ouverte() ? ambianceGL().phase : "";
    const defi = flotteActive() ? defiGL() : null;
    vider(h,
      flotteActive()
        ? el("p", { class: "gl-badge fl-badge" }, vueCourse() ? el("b", { text: "🏁 La course" }) : el("b", { text: commuRegardee().nom }), vueCourse() ? ` · ${pluriel(commusFlotte().length, "navire")}` : ` · île ${Math.min(g.etape + 1, g.etapes)}/${g.etapes}`)
        : el("p", { class: "gl-badge" }, el("b", { text: `Voyage ${g.voyage}` }), ` · étape ${Math.min(g.etape + 1, g.etapes)}/${g.etapes}`),
      ev ? el("p", { class: `gl-alerte gl-alerte-${ev.type}`, text: `${ev.emoji} ${ev.titre}` })
        : defi?.phase === "combat" ? el("p", { class: "gl-alerte gl-alerte-defi", text: `⚔️ ${defi.nom} : à l'abordage !` })
        : g.vote ? el("p", { class: "gl-alerte gl-alerte-vote", text: "🗳️ Carrefour : la commu vote !" })
        : defi?.phase === "victoire" ? el("p", { class: "gl-alerte gl-alerte-victoire", text: `👑 ${commusFlotte().find((c) => c.id === defi.gagnant)?.nom || "Une commu"} a gagné le défi !` }) : null,
      el("div", { class: "gl-cote" }, // à droite : l'heure qu'il est sur la carte, les vues
      heure ? el("p", { class: `gl-heure gl-heure-${heure}`, title: "Sur GRAND LINE, il fait jour et nuit à l'heure de Paris", text: AMBIANCE_TEXTE[heure] }) : null,
      carteGL?.type === "3d" ? el("div", { class: "gl-vues" },
        el("button", { type: "button", class: "gl-vue", "aria-pressed": String(carteGL.rendu.mode() !== "ensemble"), onclick: () => { carteGL.rendu.vue("navire"); rendreHudGL(g); }, text: "⛵ Le navire" }),
        el("button", { type: "button", class: "gl-vue", "aria-pressed": String(carteGL.rendu.mode() === "ensemble"), onclick: () => { carteGL.rendu.vue("ensemble"); rendreHudGL(g); }, text: "🗺️ Toute la carte" }),
        el("button", { type: "button", class: "gl-vue gl-zoom", "aria-label": "Zoomer", title: "Zoomer", onclick: () => carteGL.rendu.zoomer?.(0.7), text: "＋" }),
        el("button", { type: "button", class: "gl-vue gl-zoom", "aria-label": "Dézoomer", title: "Dézoomer", onclick: () => carteGL.rendu.zoomer?.(1 / 0.7), text: "－" }),
      ) : null),
    );
  }

  function rendreCapGL(g) {
    const p = pourcentGL(g);
    const cible = g.cible;
    const titre = g.vote ? "Au carrefour : où va-t-on ?" : cible ? `Cap sur ${cible.nom}` : "En mer";
    const details = [
      `💨 ${nombre(g.vent)} milles/h`,
      g.multiplicateur > 1 ? `×${String(g.multiplicateur).replace(".", ",")}${g.live ? " (le capitaine est en live !)" : ""}` : "",
      g.estimation ? `arrivée ${quandGL(g.estimation)}` : "",
    ].filter(Boolean);
    if (cible) prechargerIle(cible.id);
    vider($("grandline-cap"),
      cible && !g.vote && imageIle(cible.id) ? el("img", { class: "gl-cap-ile", src: imageIle(cible.id), alt: "", width: 360, height: 300, loading: "lazy", decoding: "async" }) : null,
      el("p", { class: "gl-sur", text: g.actif ? nomNavireGL() : "⚓ À l'ancre pour l'instant" }),
      el("h3", { class: "gl-titre" }, cible && !g.vote ? el("span", { class: "gl-emoji", "aria-hidden": "true", text: cible.emoji }) : null, titre),
      el("div", { class: "gl-barre", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(p), "aria-label": "L'étape en cours" },
        el("i", { style: `--p:${p}%` }), el("span", { class: "gl-barre-navire", style: `--p:${p}%`, "aria-hidden": "true", text: "⛵" })),
      el("p", { class: "gl-milles" }, el("b", { text: `${p} %`, "data-compte": String(p), "data-suffixe": " %" }), ` · ${nombre(g.milles)} / ${nombre(g.longueur)} milles${g.reserve ? ` · ${nombre(g.reserve)} en réserve` : ""}`),
      el("p", { class: "gl-details", text: details.join(" · ") }),
      cible?.texte && !g.vote ? el("p", { class: "gl-texte", text: cible.texte }) : null,
      el("p", { class: "gl-total", text: `${pluriel(g.rameurs, "rameur")} cette étape · ${nombre(g.totalVoyage)} milles depuis le départ du voyage` }),
    );
  }

  function rendreMerGL(g) {
    const z = $("grandline-mer");
    const ev = g.evenement;
    const contenu = [];
    if (g.vote) {
      const total = Math.max(1, g.vote.total);
      const mien = monNavire?.vote;
      contenu.push(
        el("p", { class: "gl-sur", text: "Le carrefour" }),
        el("h3", { class: "gl-titre", text: "Où va le navire ?" }),
        el("p", { class: "gl-texte", text: `Le navire attend à mi-chemin. Fin du vote ${quandGL(g.vote.fin)} : la majorité décide (en cas d'égalité, le hasard).` }),
        el("div", { class: "gl-choix" }, g.vote.choix.map((c) => el("div", { class: `gl-option${mien === c.id ? " choisie" : ""}` },
          el("p", { class: "gl-option-nom" }, el("span", { "aria-hidden": "true", text: c.emoji }), c.nom),
          el("p", { class: "gl-option-texte", text: c.texte }),
          el("div", { class: "gl-option-barre", "aria-hidden": "true" }, el("i", { style: `--p:${Math.round((c.voix / total) * 100)}%` })),
          el("p", { class: "gl-option-voix", text: `${pluriel(c.voix, "voix").replace("voixs", "voix")}` }),
          moi?.connecte && monNavireGL()
            ? el("button", { type: "button", class: `btn ${mien === c.id ? "btn-plein" : "btn-contour"} btn-petit`, disabled: glOccupe, onclick: () => agirGL("grandline-voter", { choix: c.id }), text: mien === c.id ? "Ton choix ✓" : "Voter" })
            : null,
        ))),
        !moi?.connecte ? el("p", { class: "note" }, el("a", { href: "/api/auth/login", text: "Connecte-toi avec Discord" }), " pour voter (ou vote avec les boutons sur le Discord).")
          : !monNavireGL() ? el("p", { class: "note", text: `Seul l'équipage de ${commuRegardee().nom} vote pour ce navire.` }) : null,
      );
    }
    if (ev) {
      const fin = `Fin ${quandGL(ev.fin)}`;
      const barre = (v, max, texte) => [el("div", { class: "gl-barre gl-barre-ev" }, el("i", { style: `--p:${Math.min(100, Math.round((v / Math.max(1, max)) * 100))}%` })), el("p", { class: "gl-milles", text: texte })];
      contenu.push(el("div", { class: `gl-ev gl-ev-${ev.type}` },
        el("p", { class: "gl-sur", text: ev.type === "maitre" ? "Devant l'île" : "En mer" }),
        el("h3", { class: "gl-titre" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: ev.type === "maitre" ? "👹" : ev.emoji }), ev.titre),
        ev.type === "tempete" ? [el("p", { class: "gl-texte", text: "Les vagues ralentissent le navire de moitié. Ramez assez avant la fin pour la traverser : le navire avancera d'autant en plus !" }), ...barre(ev.avance, ev.objectif, `${nombre(ev.avance)} / ${nombre(ev.objectif)} milles ramés · ${fin}`)] : null,
        ev.type === "monstre" ? [el("p", { class: "gl-texte", text: "Le navire est bloqué tant qu'il est là ! Chaque mille ramé est un coup. Repoussez-le pour un gros bonus." }), ...barre(ev.pv, ev.pvMax, `${nombre(ev.pv)} / ${nombre(ev.pvMax)} PV · ${fin}`)] : null,
        ev.type === "maitre" ? [
          el("p", { class: "gl-maitre-nom" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: ev.emoji }), ev.nom),
          ev.texte ? el("p", { class: "gl-texte", text: ev.texte }) : null,
          el("p", { class: "gl-texte", text: "Le navire est arrêté devant l'île. Chaque mille ramé est un coup : battez-le à temps pour accoster avec son trésor !" }),
          ...barre(ev.pv, ev.pvMax, `${nombre(ev.pv)} / ${nombre(ev.pvMax)} PV · ${fin}`),
        ] : null,
        ev.type === "fantome" ? [el("p", { class: "gl-texte", text: "Le navire gris de Capitaine Calcaire suit le vôtre dans le brouillard. Ramez assez pour le semer : il laissera tomber un coffre !" }), ...barre(ev.avance, ev.objectif, `${nombre(ev.avance)} / ${nombre(ev.objectif)} milles ramés · ${fin}`)] : null,
        ev.type === "vent" ? el("p", { class: "gl-texte", text: `Tout ce que vous faites compte une fois et demie ! ${fin}.` }) : null,
        ev.type === "bouteille" ? [
          el("p", { class: "gl-texte", text: `Elle flotte à côté du navire. Le premier qui l'ouvre gagne ce qu'il y a dedans (et le navire avance) ! ${fin}.` }),
          moi?.connecte && monNavireGL() ? el("button", { type: "button", class: "btn btn-plein gl-ouvrir", disabled: glOccupe, onclick: () => agirGL("grandline-bouteille"), text: "🍾 Ouvrir la bouteille" })
            : moi?.connecte ? el("p", { class: "note", text: `Seul l'équipage de ${commuRegardee().nom} peut l'ouvrir.` })
            : el("p", { class: "note" }, el("a", { href: "/api/auth/login", text: "Connecte-toi avec Discord" }), " pour l'ouvrir (ou avec le bouton sur le Discord)."),
        ] : null,
      ));
    }
    if (!contenu.length) {
      contenu.push(
        el("p", { class: "gl-sur", text: "La mer" }),
        el("h3", { class: "gl-titre", text: "Mer calme" }),
        el("p", { class: "gl-texte", text: "Pour l'instant, rien à l'horizon… Mais une tempête, un monstre marin, un coup de vent ou une bouteille à la mer peuvent arriver à tout moment." }),
      );
    }
    if (glMessage) contenu.push(el("p", { class: `gl-message${glMessage.erreur ? " erreur" : ""}${glMessage.parchemin ? " gl-parchemin" : ""}`, role: "status", text: glMessage.texte }));
    z.dataset.ev = ev?.type || (g.vote ? "vote" : "calme");
    vider(z, el("span", { class: "gl-mer-fx", "aria-hidden": "true" }, Array.from({ length: 6 }, () => el("i"))), contenu);
  }

  function rameur(x, k) {
    return el("li", { class: `gl-rameur${k < 3 ? ` podium-${k + 1}` : ""}` },
      el("span", { class: "gl-rang", text: k < 3 ? ["🥇", "🥈", "🥉"][k] : `${k + 1}` }),
      x.twitch ? el("span", { class: "gl-avatar gl-avatar-twitch", "aria-hidden": "true", text: "💜" }) : el("img", { class: "gl-avatar", src: lienSur(x.avatar) || "/img/chopper-visage.jpg", alt: "", width: 34, height: 34, loading: "lazy" }),
      el("span", { class: "gl-nom", text: x.nom }),
      el("b", { text: `${nombre(x.milles)} milles` }),
    );
  }
  function rendreEquipageGL(g) {
    const sources = Object.entries(g.sources || {}).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);
    const max = Math.max(1, ...sources.map(([, v]) => v));
    vider($("grandline-equipage"),
      el("p", { class: "gl-sur", text: "L'équipage" }),
      el("h3", { class: "gl-titre", text: "Ceux qui rament cette étape" }),
      g.equipage.length ? el("ol", { class: "gl-rameurs" }, g.equipage.map(rameur)) : el("p", { class: "vide", text: "Personne n'a encore ramé cette étape. Un message sur le Discord suffit pour monter à bord !" }),
      sources.length ? el("div", { class: "gl-sources" }, el("p", { class: "gl-petit-titre", text: "D'où viennent les milles" }), sources.map(([k, v]) => el("p", { class: "gl-source" },
        el("span", { text: GL_SOURCES[k] || k }), el("i", { "aria-hidden": "true", style: `--part:${Math.max(4, Math.round((v / max) * 100))}%` }), el("b", { text: nombre(v) })))) : null,
    );
  }
  function rendreJournalGL(g) {
    vider($("grandline-journal"),
      el("p", { class: "gl-sur", text: "Le journal de bord" }),
      el("h3", { class: "gl-titre", text: "Ce qui s'est passé" }),
      g.journal.length ? el("ul", { class: "gl-journal-liste" }, g.journal.slice(0, 10).map((j) => el("li", { class: `gl-ligne gl-ligne-${j.type}` }, el("time", { datetime: new Date(j.t).toISOString(), text: ilYa(j.t) }), el("span", { text: j.texte })))) : el("p", { class: "vide", text: "Le journal est encore vierge." }),
    );
  }
  function rendreEscalesGL(g) {
    const z = $("grandline-escales");
    if (!z) return;
    vider(z,
      el("p", { class: "gl-sur", text: "Les escales" }),
      el("h3", { class: "gl-titre", text: "Les îles atteintes" }),
      g.escales.length ? el("ul", { class: "gl-escales-liste" }, g.escales.slice(0, 8).map((e) => el("li", {},
        imageIle(e.id) ? el("img", { class: "gl-escale-ile", src: imageIle(e.id), alt: "", width: 64, height: 54, loading: "lazy", decoding: "async" }) : el("span", { class: "gl-emoji", "aria-hidden": "true", text: e.emoji }),
        el("span", {}, el("b", { text: e.nom }), el("small", { text: `${e.tresor ? "💰 Trésor trouvé · " : ""}voyage ${e.voyage} · ${ilYa(e.arrivee)}${e.navigateur ? ` · 🧭 ${e.navigateur}` : ""}` })),
      ))) : el("p", { class: "vide", text: "Aucune île encore : le navire vient de quitter Port Barhaw." }),
    );
  }
  function rendreMoiGL(g) {
    const z = $("grandline-moi");
    if (!moi?.connecte) {
      vider(z, el("p", { class: "gl-sur", text: "Toi" }), el("h3", { class: "gl-titre", text: "Monte à bord" }),
        el("p", { class: "gl-texte", text: "Pas besoin de s'inscrire : tout ce que tu fais sur le Discord et ici fait déjà ramer le navire. Connecte-toi pour voir combien tu as ramé et voter aux carrefours." }),
        el("a", { class: "btn btn-plein btn-petit", href: "/api/auth/login", text: "Connexion avec Discord" }));
      return;
    }
    if (flotteActive() && !monNavireGL()) {
      const mien = commu(maFlotte?.equipage);
      const c = commuRegardee();
      vider(z, el("p", { class: "gl-sur", text: "Toi" }), el("h3", { class: "gl-titre", text: mien ? "Pas ton navire" : "Ton équipage ?" }),
        el("p", { class: "gl-texte", text: mien ? `Tu rames pour ${mien.nom}. Ici, tu regardes ${c.nom} avancer : tes parties, tes votes et tes coups comptent pour ton équipage.` : "Dans « La course », le site te dit pour quel équipage tu rames (ou te laisse choisir si tu es sur plusieurs Discord de la course)." }),
        mien ? el("button", { type: "button", class: "btn btn-plein btn-petit", style: styleCommu(mien), onclick: () => choisirVueFlotte(mien.id), text: `⭐ Voir ${mien.nom}` })
          : el("button", { type: "button", class: "btn btn-contour btn-petit", onclick: () => choisirVueFlotte(""), text: "🏁 Aller à « La course »" }));
      return;
    }
    const m = monNavire;
    vider(z, el("p", { class: "gl-sur", text: "Toi" }), el("h3", { class: "gl-titre", text: m?.etape ? "Tu rames !" : "À tes rames !" }),
      m ? el("div", { class: "gl-moi-chiffres" },
        el("p", {}, el("b", { text: nombre(m.etape), "data-compte": String(m.etape) }), el("span", { text: `milles cette étape${m.rang ? ` (${m.rang}e)` : ""}` })),
        el("p", {}, el("b", { text: nombre(m.voyage), "data-compte": String(m.voyage) }), el("span", { text: "milles ce voyage" })),
        el("p", {}, el("b", { text: nombre(m.total), "data-compte": String(m.total) }), el("span", { text: "milles en tout" })),
      ) : el("p", { class: "gl-texte", text: "Chargement de ce que tu as ramé…" }),
      el("p", { class: "note", text: "Le butin de chaque île va à ceux qui ont ramé, selon leur part (en berrys, sur ton avis de recherche de la Chasse). Celui qui a le plus ramé devient le Navigateur de l'île." }),
    );
  }
  function rendreRamerGL() {
    const z = $("grandline-ramer");
    if (!z || z.childElementCount) return;
    vider(z, el("p", { class: "gl-sur", text: "Comment ramer" }), el("h3", { class: "gl-titre", text: "Ce qui fait avancer le navire" }),
      el("ul", { class: "gl-ramer-liste" }, GL_ACTIONS.map(([e, t, , x]) => el("li", {}, el("span", { "aria-hidden": "true", text: e }), el("span", { text: t }), x ? el("small", { text: x }) : null))),
      el("p", { class: "note", text: "Pendant les lives de Liliano : vent arrière, tout compte double. Les messages ne sont jamais lus, seulement comptés." }));
  }

  async function agirGL(action, extra = {}) {
    if (glOccupe || !glOuvert()) return;
    glOccupe = true;
    glMessage = null;
    const g = infosGL();
    if (g) rendreMerGL(g);
    let d = {};
    let status = 0;
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra, ...(flotteActive() ? { commu: commuRegardee().id } : {}) }) });
      status = r.status;
      d = await r.json().catch(() => ({ erreur: "Réponse illisible, réessaie." }));
    } catch {
      d = { erreur: "Impossible de joindre le navire. Vérifie ta connexion." };
    }
    glOccupe = false;
    if (status === 401) { moi = { connecte: false }; rendreCompte(); }
    if (d.navire) monNavire = d.navire;
    if (d.grandline && donnees) {
      // dans la flotte, le bot renvoie le navire visé : il remplace celui de sa commu
      const c = flotteActive() ? commuRegardee() : null;
      if (c && Array.isArray(donnees.flotte?.commus)) donnees = { ...donnees, flotte: { ...donnees.flotte, commus: donnees.flotte.commus.map((x) => (x.id === c.id ? { ...x, navire: d.grandline } : x)) } };
      else donnees = { ...donnees, grandline: d.grandline };
    }
    if (action === "grandline-bouteille" && d.ok) glMessage = { texte: `🍾 Dedans : ${d.message} Le navire avance de ${nombre(d.milles)} milles${d.berrys ? `, et tu gagnes ${berrys(d.berrys)}` : ""} !`, parchemin: true };
    else if (action === "grandline-voter" && d.ok) glMessage = { texte: `🗳️ ${d.change ? "Vote changé" : "C'est noté"} ! Tu peux changer d'avis jusqu'à la fin du vote.` };
    else if (d.erreur && action !== "grandline") glMessage = { texte: d.erreur === "pas-membre" ? (flotteActive() ? "Rejoins le Discord d'un équipage de la course pour monter à bord." : "Rejoins le Discord Barhaw pour monter à bord.") : d.texte || d.erreur, erreur: true };
    const fete = d.ok && (action === "grandline-voter" || action === "grandline-bouteille");
    if (infosGL()) rendreGrandLine();
    if (fete) confettisGL();
  }
  async function chargerMonNavire() {
    if (!moi?.connecte) { monNavire = null; if (infosGL()) rendreMoiGL(infosGL()); return; }
    await agirGL("grandline");
  }

  // « Terre en vue ! » : tout l'écran, comme le début du live, avec l'île atteinte
  // (en VF, les îles de la V4 ont leur petite vidéo : videos/iles/<id>, un tour de caméra autour de l'île et de son maître ;
  // au niveau 5, celle de l'île et du maître du niveau 5 : videos/iles/<id>-v5)
  function terreEnVue(e) {
    const cle = `barhaw-terre:${e.commu ? `${e.commu}:` : ""}${e.voyage}-${e.etape}`;
    if (lireSession(cle) === "vu" && !e.force) return;
    ecrireSession(cle, "vu");
    if (reduit.matches) { jouerSon("taiko"); return; } // pas d'animation : juste le taiko (si les sons sont allumés)
    if (document.hidden) { document.addEventListener("visibilitychange", () => terreEnVue({ ...e, force: true }), { once: true }); return; }
    if (document.querySelector(".choc-live")) return;
    jouerSon("taiko");
    const video = videosPermises() && ILES_V4.includes(e.id) ? videoVF(`/videos/iles/${e.id}${niveau5() ? "-v5" : ""}`, "choc-video") : null;
    const o = el("div", { class: `choc-live choc-terre${video ? " avec-video" : ""}`, "aria-hidden": "true" },
      el("span", { class: "choc-lignes" }),
      el("span", { class: "sfx tremble choc-sfx", text: "ドドン" }),
      imageIle(e.id) ? el("img", { class: "choc-ile-image", src: imageIle(e.id), alt: "", width: 360, height: 300, decoding: "async" }) : null,
      video ? el("div", { class: "choc-ile-video" }, video) : null,
      el("span", { class: "choc-tampon", text: e.tresor ? "TRÉSOR !!" : "TERRE EN VUE !" }),
      el("span", { class: "choc-ile", text: `${e.emoji} ${e.nom}` }),
    );
    document.body.append(o);
    const debut = performance.now();
    let fin = setTimeout(() => o.remove(), 2600);
    // la vidéo prend la place de l'image si elle démarre vite ; sinon, l'image seule, comme avant
    video?.addEventListener("playing", () => {
      if (performance.now() - debut > 1400 || !o.isConnected) return;
      o.classList.add("video-prete");
      clearTimeout(fin);
      fin = setTimeout(() => o.remove(), 4500);
    }, { once: true });
    video?.addEventListener("error", () => o.classList.remove("avec-video"), true);
  }

  // ---------- la carte : 3D si l'appareil peut, sinon 2D ----------
  function infoIleGL(id) {
    const g = infosGL();
    const z = $("grandline-info");
    if (!g || !z) return;
    const e = g.route.flat().find((x) => x.id === id);
    if (!e) return;
    const inconnue = e.etat === "inconnue" || e.etat === "ecartee";
    const pageIle = recitVisible() && monNavireGL() ? pagesOuvertes().find((x) => x.genre === "ile" && x.ile === e.id) || null : null;
    vider(z,
      el("button", { type: "button", class: "gl-info-fermer", "aria-label": "Fermer", onclick: () => { z.hidden = true; }, text: "✕" }),
      !inconnue && imageIle(e.id) ? el("img", { class: "gl-info-ile", src: imageIle(e.id), alt: "", width: 360, height: 300, decoding: "async" }) : null,
      el("p", { class: "gl-sur", text: e.etat === "atteinte" ? "Île atteinte" : e.etat === "cible" ? "Prochaine île" : e.etat === "vote" ? "Au vote" : e.etat === "ecartee" ? "Une autre fois" : "Île inconnue" }),
      el("h3", { class: "gl-titre" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: inconnue ? "❓" : e.emoji }), inconnue ? "???" : e.nom),
      el("p", { class: "gl-texte", text: inconnue ? (e.etat === "ecartee" ? "La commu a choisi une autre route. Peut-être au prochain voyage !" : "Une île encore cachée dans les nuages. Ramez pour la découvrir !") : e.texte }),
      e.arrivee ? el("p", { class: "gl-details", text: `Atteinte ${ilYa(e.arrivee)}${e.navigateur ? ` · 🧭 Navigateur : ${e.navigateur}` : ""}${e.rameurs ? ` · ${pluriel(e.rameurs, "rameur")}` : ""}` }) : null,
      !inconnue && e.maitre ? el("div", { class: `gl-maitre${e.maitre.vaincu ? " vaincu" : ""}` },
        el("p", { class: "gl-sur", text: e.maitre.vaincu ? "Maître des lieux · vaincu" : "Maître des lieux" }),
        el("p", { class: "gl-maitre-nom" }, el("span", { class: "gl-emoji", "aria-hidden": "true", text: e.maitre.emoji }), e.maitre.nom),
        el("p", { class: "gl-texte", text: e.maitre.texte }),
      ) : null,
      pageIle ? el("button", { type: "button", class: "btn btn-plein btn-petit gl-info-recit", onclick: (ev) => ouvrirRecit(pageIle.id, ev.currentTarget) }, `📖 ${!pageIle.son ? "Lire" : pagesNouvelles().includes(pageIle) ? "Écouter" : "Réécouter"} le récit de cette île`) : null,
    );
    z.hidden = false;
  }
  async function preparerCarteGL() {
    const zone = $("grandline-carte");
    if (!zone || carteGL || preparationGL) return;
    preparationGL = true;
    try { await preparerCarteGLVraiment(zone); } finally { preparationGL = false; }
  }
  let preparationGL = false;
  async function preparerCarteGLVraiment(zone) {
    const choix3d = new URLSearchParams(location.search).get("3d");
    // la V4 : sur la page, la carte en 2D (légère, vivante) ; la 3D s'ouvre en grand avec le bouton « GRAND LINE en 3D »
    const salle = SALLE.ouverte;
    if (v4Ouverte() && !salle) { passerCarte2D(); return; }
    // (avec « réduire les animations », la carte reste en 2D, même dans la salle)
    if ((salle || choix3d !== "non") && !navigator.connection?.saveData && !reduit.matches) {
      try {
        const essai = document.createElement("canvas").getContext("webgl2");
        const info = essai?.getExtension("WEBGL_debug_renderer_info");
        const logiciel = info && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(essai.getParameter(info.UNMASKED_RENDERER_WEBGL)));
        essai?.getExtension("WEBGL_lose_context")?.loseContext();
        if (essai && (!logiciel || choix3d === "oui" || salle)) {
          const { creerGrandLine3D } = await import("/js/grandline-3d.js");
          const toile = el("canvas", { class: "gl-toile", "aria-label": "La carte de GRAND LINE en 3D : glisse pour te déplacer, clique sur une île", role: "img" });
          vider(zone, toile);
          // les îles V4 (la démo : le Phare), seulement une fois la V4 ouverte
          const ilesV4 = v4Ouverte() && !window.__ileV3 ? ILES_V4 : [];
          const rendu = creerGrandLine3D(toile, { positions: GL_PLACES, couche: $("grandline-etiquettes"), ilesV4, ilesV5: niveau5() && window.__niveau5 !== "navire" ? ILES_V5 : [], ambiance: ambianceGL(), surIle: infoIleGL, surNavire: (id) => choisirVueFlotte(id), surBouteille: () => (moi?.connecte && monNavireGL() ? agirGL("grandline-bouteille") : (glMessage = { texte: moi?.connecte ? `Seul l'équipage de ${commuRegardee()?.nom} peut l'ouvrir.` : "Connecte-toi avec Discord pour ouvrir la bouteille !", erreur: true }, rendreMerGL(infosGL()))) });
          if (choix3d !== "oui" && !salle && rendu.tropLent()) { rendu.detruire(); throw new Error("trop lent"); }
          // la carte passe en 2D seulement si c'est elle qui perd la 3D (pas une ancienne carte qu'on vient de refaire)
          toile.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (carteGL?.rendu === rendu) passerCarte2D(); });
          carteGL = { type: "3d", rendu };
          tailleCarteGL();
          if (infosGL()) rendu.maj(donneesCarteGL(infosGL()));
          if (glVue) rendu.demarrer();
          $("grandline-scene")?.classList.add("en-3d");
          if (choix3d) window.__grandline3d = rendu; // pour les essais (?3d=oui)
          rendreHudGL(infosGL() || { voyage: 1, etape: 0, etapes: 11 });
          return;
        }
      } catch {}
    }
    passerCarte2D();
  }
  function passerCarte2D() {
    if (carteGL?.type === "3d") { try { carteGL.rendu.detruire(); } catch {} }
    $("grandline-scene")?.classList.remove("en-3d");
    vider($("grandline-etiquettes"));
    carteGL = { type: "2d", rendu: carte2D($("grandline-carte")) };
    if (infosGL()) carteGL.rendu.maj(donneesCarteGL(infosGL()));
    const b = $("gl-ouvrir-3d");
    if (b) b.hidden = !v4Ouverte() || SALLE.ouverte;
    navireNoir(); // le site secret : la nuit, le Dernier Mot longe la carte
  }

  // ---------- la salle GRAND LINE (V4) : la carte en 3D en plein écran, la mer qui vit ; #grandline-3d l'ouvre directement ----------
  const SALLE = { ouverte: false, el: null, retour: null };
  const salleVoulue = () => location.hash === "#grandline-3d";
  function ouvrirSalleGL() {
    if (SALLE.ouverte || !v4Ouverte() || !glOuvert()) return;
    const scene = $("grandline-scene");
    const barre = $("flotte-barre");
    if (!scene) return;
    SALLE.ouverte = true;
    SALLE.retour = { scene: [scene.parentNode, scene.nextSibling], barre: barre ? [barre.parentNode, barre.nextSibling] : null, focus: document.activeElement, haut: scrollY };
    const fermer = el("button", { class: "gl-salle-fermer", type: "button", "aria-label": "Fermer la carte en 3D et revenir au site", onclick: () => fermerSalleGL() }, el("span", { "aria-hidden": "true", text: "✕" }), el("span", { class: "gl-salle-fermer-texte", text: "Revenir" }));
    const g = infosGL();
    const o = el("div", { class: "gl-salle", role: "dialog", "aria-modal": "true", "aria-label": "GRAND LINE en 3D" },
      el("div", { class: "gl-salle-haut" },
        el("p", { class: "gl-salle-titre" }, el("span", { class: "gl-salle-kanji", "aria-hidden": "true", text: "大航海" }), "GRAND LINE",
          el("small", { id: "gl-salle-sous", text: flotteActive() ? commuRegardee()?.nom || "" : g?.cible ? `Cap sur ${g.cible.nom}` : "" })),
        fermer));
    if (barre && !barre.hidden) o.firstChild.insertBefore(barre, fermer);
    o.append(scene);
    document.body.append(o);
    SALLE.el = o;
    document.documentElement.classList.add("gl-salle-ouverte");
    if (!salleVoulue()) history.pushState(null, "", "#grandline-3d");
    $("gl-ouvrir-3d").hidden = true;
    // la carte 2D laisse la place à la 3D (à la taille de l'écran)
    if (carteGL?.type) { try { carteGL.rendu.detruire(); } catch {} }
    carteGL = null;
    glVue = true;
    preparerCarteGL().then(() => { tailleCarteGL(); fermer.focus({ preventScroll: true }); });
    document.addEventListener("keydown", toucheSalle);
    merSon(true);
  }
  function toucheSalle(e) { if (e.key === "Escape" && !$("grandline-info")?.matches(":not([hidden])")) fermerSalleGL(); }
  function fermerSalleGL({ hash = true } = {}) {
    if (!SALLE.ouverte) return;
    document.removeEventListener("keydown", toucheSalle);
    const { scene, barre, focus, haut } = SALLE.retour;
    if (carteGL?.type) { try { carteGL.rendu.detruire(); } catch {} }
    carteGL = null;
    scene[0].insertBefore($("grandline-scene"), scene[1]);
    if (barre) barre[0].insertBefore($("flotte-barre"), barre[1]);
    SALLE.el?.remove();
    SALLE.el = null;
    SALLE.ouverte = false;
    merSon(false);
    document.documentElement.classList.remove("gl-salle-ouverte");
    if (hash && salleVoulue()) history.replaceState(null, "", "#grandline");
    passerCarte2D();
    scrollTo({ top: haut, behavior: "auto" });
    (focus?.isConnected ? focus : $("gl-ouvrir-3d"))?.focus?.({ preventScroll: true });
  }
  window.addEventListener("hashchange", () => { if (salleVoulue()) ouvrirSalleGL(); else if (SALLE.ouverte) fermerSalleGL({ hash: false }); });
  function tailleCarteGL() {
    const z = $("grandline-carte");
    if (carteGL?.type === "3d" && z) carteGL.rendu.taille(z.clientWidth, z.clientHeight);
  }

  // ---------- La Traversée (V4) : le mini-jeu de GRAND LINE ----------
  // On barre le navire de sa commu dans une mer sans fin : on évite les rochers, les bras du monstre et les tourbillons,
  // on ramasse les tonneaux (+25 points), une bouteille répare la coque, l'esprit du vent protège 5 s (et attire les
  // tonneaux). 3 cœurs. Le score : la distance (m) + 25 par tonneau. Le bot ouvre la partie et vérifie la distance
  // (la vitesse suit ses règles) et le nombre de tonneaux (le site en sème au plus 30 par km, le bot en accepte 36).
  // Le jeu s'ouvre en plein écran (#la-traversee). La 3D (js/traversee-3d.js) se charge à l'ouverture ; sans elle
  // (pas de carte graphique, appareil trop lent, ?3d=non), le même jeu se joue dessiné en 2D.
  const TV = { V0: 12, ACC: 0.25, VMAX: 32, BORD: 8.2, LAT: 12.5, TONNEAU: 25, COEURS: 3, PAR_KM: 30, DEVANT: 175, AVANT: 1.7, ARRIERE: -1.5, R: 0.95 };
  // les formes qui cognent (x vers l'avant, z sur le côté, rayon), avant l'échelle et la rotation de chaque pièce
  const FORMES_TV = {
    aiguille: [[0, 0, 1.75]],
    jumeaux: [[0.1, 1.05, 1.3], [-0.1, -1.0, 1.15]],
    recif: [[-1.6, 0, 1.15], [0, 0, 1.25], [1.6, 0, 1.15]],
    tentacule: [[0, 0, 0.9], [-1.3, 0, 0.6]],
  };
  let idsTV = 0; // un numéro par objet, jamais deux fois (même d'une partie à l'autre)
  function moteurTraversee(regles = {}, hasard = Math.random) {
    const V0 = Number(regles.v0) || TV.V0;
    const ACC = Number(regles.acceleration) || TV.ACC;
    const VMAX = Number(regles.vMax) || TV.VMAX;
    const m = { t: 0, dist: 0, v: V0, x: 0, vx: 0, coeurs: TV.COEURS, tonneaux: 0, objets: [], prochain: 60, poses: 0, frein: 1, invincible: 0, vent: 0, fini: false, cause: "", palier: 0, bonus: 380 };
    const R = (a, b) => a + hasard() * (b - a);
    const borne = (z, b = 7) => Math.max(-b, Math.min(b, z));
    // les tonneaux posés jusqu'à une distance : jamais plus que ce que le bot accepte
    const permis = (pos) => Math.floor((pos / 1000) * TV.PAR_KM) + 3;
    const ajouter = (o) => { o.id = ++idsTV; o.phase = hasard() * 6.28; m.objets.push(o); return o; };
    function cercles(o) {
      const c = Math.cos(o.rot || 0);
      const s = Math.sin(o.rot || 0);
      const e = o.ech || 1;
      return (FORMES_TV[o.modele] || []).map(([x, z, r]) => [(x * c + z * s) * e, (-x * s + z * c) * e, r * e]);
    }
    function rocher(x, z, modele, ech = R(0.9, 1.1)) {
      modele ||= hasard() < 0.6 ? "aiguille" : "jumeaux";
      const rot = modele === "recif" ? Math.PI / 2 : modele === "jumeaux" ? (hasard() < 0.5 ? Math.PI : 0) + R(-0.2, 0.2) : R(-3, 3);
      const o = ajouter({ type: "rocher", modele, x, z, ech, rot });
      o.cercles = cercles(o);
      return o;
    }
    function tonneau(x, z) {
      if (m.poses + 1 > permis(x)) return;
      m.poses++;
      ajouter({ type: "tonneau", modele: "tonneau", x, z: borne(z, 7.6), r: 1.4 });
    }
    function motif(p) {
      const n = Math.min(1, p / 3000);
      const choix = [["rocher", 3], ["porte", p > 150 ? 2.6 : 0], ["tonneaux", 2], ["tourbillon", p > 320 ? 1.1 + n : 0], ["tentacules", p > 480 ? 1 + n * 1.4 : 0], ["recif", p > 700 ? 0.9 + n : 0], ["slalom", p > 950 ? 0.9 + n : 0]];
      let u = hasard() * choix.reduce((a, c) => a + c[1], 0);
      let k = "rocher";
      for (const [nom, w] of choix) { if (w && (u -= w) < 0) { k = nom; break; } }
      if (k === "porte") {
        // deux aiguilles et un passage (de plus en plus étroit), des tonneaux pour viser le milieu
        const w = 6.8 - n * 1.4;
        const g = R(-3.5, 3.5);
        rocher(p, g - w / 2 - 1.75, "aiguille", 1);
        rocher(p, g + w / 2 + 1.75, "aiguille", 1);
        if (g - w / 2 - 5.6 > -9.5) rocher(p + 2, g - w / 2 - 5.6, "jumeaux", 0.9);
        if (g + w / 2 + 5.6 < 9.5) rocher(p + 2, g + w / 2 + 5.6, "jumeaux", 0.9);
        for (let j = 0; j < 3; j++) tonneau(p - 14 + j * 7, g);
        return 6;
      }
      if (k === "tonneaux") {
        const z0 = R(-5.5, 5.5);
        const amp = R(1.5, 3);
        for (let j = 0; j < 5; j++) tonneau(p + j * 7, borne(z0 + Math.sin(j * 0.8) * amp));
        if (n > 0.3) rocher(p + 14, z0 > 0 ? z0 - 6.8 : z0 + 6.8, "aiguille");
        return 30;
      }
      if (k === "tourbillon") {
        const z = R(-4.5, 4.5);
        ajouter({ type: "tourbillon", modele: "tourbillon", x: p + 5, z, ech: 1, rot: R(0, 6.28), attire: 6.4, coeur: 1.5 });
        // des tonneaux sur le bord : risqué
        const cote = z > 0 ? -1 : 1;
        for (let j = 0; j < 3; j++) { const a = (j - 1) * 0.6; tonneau(p + 5 + Math.sin(a) * 4.8, z + cote * Math.cos(a) * 4.8); }
        return 12;
      }
      if (k === "tentacules") {
        const z1 = R(-6, 6);
        const t1 = ajouter({ type: "tentacule", modele: "tentacule", x: p, z: z1, ech: R(0.9, 1.1), rot: R(-0.25, 0.25), etat: "attente", montee: 0 });
        t1.cercles = cercles(t1);
        if (n > 0.35 && hasard() < 0.55) {
          const z2 = z1 > 0 ? z1 - R(5, 7.5) : z1 + R(5, 7.5);
          const t2 = ajouter({ type: "tentacule", modele: "tentacule", x: p + 9, z: z2, ech: R(0.9, 1.1), rot: R(-0.25, 0.25), etat: "attente", montee: 0 });
          t2.cercles = cercles(t2);
        }
        return 10;
      }
      if (k === "recif") {
        // un mur de récifs d'un bord à l'autre, avec un passage
        const w = 6.6 - n;
        const g = R(-4.5, 4.5);
        for (let z = g - w / 2 - 2.75; z > -12; z -= 5.2) rocher(p, z, "recif", 1);
        for (let z = g + w / 2 + 2.75; z < 12; z += 5.2) rocher(p, z, "recif", 1);
        tonneau(p, g);
        return 5;
      }
      if (k === "slalom") {
        const s = hasard() < 0.5 ? -1 : 1;
        for (let j = 0; j < 3; j++) {
          const z = s * (j % 2 ? -1 : 1) * R(2.5, 4.2);
          rocher(p + j * 17, z, "aiguille");
          tonneau(p + j * 17 + 2, borne(-Math.sign(z) * R(3, 5)));
        }
        return 36;
      }
      // un rocher seul, parfois des tonneaux à côté
      const z = R(-6.5, 6.5);
      rocher(p, z);
      if (hasard() < 0.55) { const c = z > 0 ? -1 : 1; for (let j = 0; j < 3; j++) tonneau(p - 8 + j * 6, z + c * R(3.5, 5)); }
      return 6;
    }
    function semer() {
      while (m.prochain < m.dist + TV.DEVANT) {
        const p = m.prochain;
        if (p >= m.bonus) {
          // la bouteille (elle compte pour 2 tonneaux si la coque est déjà intacte) ou l'esprit du vent
          if ((m.coeurs < TV.COEURS || hasard() < 0.4) && m.poses + 2 <= permis(p)) { m.poses += 2; ajouter({ type: "bouteille", modele: "bouteille", x: p, z: R(-6, 6), r: 1.6 }); }
          else ajouter({ type: "bourrasque", modele: "bourrasque", x: p, z: R(-6, 6), r: 1.9 });
          m.bonus = p + R(420, 650);
          m.prochain = p + 16;
          continue;
        }
        const longueur = motif(p);
        m.prochain = p + longueur + Math.max(15, 34 - p / 140) + R(0, 8);
      }
    }
    function choc(o, ev) {
      o.touche = true;
      m.coeurs -= 1;
      m.invincible = 1.6;
      m.frein = 0.5;
      m.vx = -Math.sign((o.z - m.x) || 1) * 9;
      ev.push({ type: "choc", objet: o, x: m.dist + 1, z: m.x });
      if (m.coeurs <= 0) { m.fini = true; m.cause = o.type; ev.push({ type: "naufrage", objet: o, x: m.dist, z: m.x }); }
    }
    function prendre(o, ev) {
      o.pris = true;
      if (o.type === "tonneau") { m.tonneaux++; ev.push({ type: "tonneau", objet: o }); }
      else if (o.type === "bouteille") {
        if (m.coeurs < TV.COEURS) { m.coeurs++; ev.push({ type: "coeur", objet: o }); }
        else { m.tonneaux += 2; ev.push({ type: "bouteille", objet: o }); }
      } else if (o.type === "bourrasque") { m.vent = 5; ev.push({ type: "vent", objet: o }); }
    }
    // entree : { dir: −1 à 1 (le clavier, les boutons) } ou { cible: la place visée sur le côté (le doigt, la souris) }
    function avancer(dt, entree = {}) {
      const ev = [];
      if (m.fini) return ev;
      // la vitesse avant d'avancer (jamais plus que ce que le bot calcule)
      m.frein = Math.min(1, m.frein + dt * 0.5);
      m.v = Math.min(VMAX, V0 + ACC * m.t) * m.frein;
      m.dist += m.v * dt;
      m.t += dt;
      let vise = (entree.dir || 0) * TV.LAT;
      if (typeof entree.cible === "number") vise = Math.max(-TV.LAT * 1.25, Math.min(TV.LAT * 1.25, (entree.cible - m.x) * 5.5));
      m.vx += (vise - m.vx) * Math.min(1, dt * 8);
      for (const o of m.objets) {
        if (o.type !== "tourbillon") continue;
        const dz = o.z - m.x;
        const d = Math.hypot(o.x - m.dist, dz);
        if (d < o.attire && d > 0.01) { const f = 1 - d / o.attire; m.vx += Math.sign(dz) * 26 * f * dt; m.frein = Math.min(m.frein, 1 - f * 0.25); }
      }
      m.x += m.vx * dt;
      if (Math.abs(m.x) > TV.BORD) { m.x = Math.sign(m.x) * TV.BORD; m.vx *= -0.3; }
      m.invincible = Math.max(0, m.invincible - dt);
      m.vent = Math.max(0, m.vent - dt);
      // les bras du monstre : l'eau bouillonne de loin, ils sortent juste avant que le navire arrive
      for (const o of m.objets) {
        if (o.type !== "tentacule") continue;
        const devant = o.x - m.dist;
        if (o.etat === "attente" && devant < m.v * 1.25 + 8) { o.etat = "monte"; ev.push({ type: "alerte", objet: o }); }
        if (o.etat === "monte") o.montee = Math.min(1, o.montee + dt / 0.6);
        if (o.etat === "monte" && devant < -10) o.etat = "descend";
        if (o.etat === "descend") o.montee = Math.max(0, o.montee - dt / 0.8);
      }
      const pts = [[m.dist + TV.AVANT, m.x], [m.dist + TV.ARRIERE, m.x]];
      const touche = (cx, cz, r) => pts.some(([px, pz]) => (px - cx) ** 2 + (pz - cz) ** 2 < (r + TV.R) ** 2);
      for (const o of m.objets) {
        if (o.pris || o.touche || o.brise || Math.abs(o.x - m.dist) > 11) continue;
        if (o.type === "rocher" || (o.type === "tentacule" && o.montee > 0.55)) {
          if (!o.cercles.some(([cx, cz, r]) => touche(o.x + cx, o.z + cz, r))) continue;
          // le bouclier du vent : on passe à travers (les rochers volent en éclats)
          if (m.vent > 0) { if (o.type === "rocher") o.brise = m.t; else o.touche = true; ev.push({ type: "brise", objet: o }); continue; }
          if (m.invincible > 0) continue;
          choc(o, ev);
        } else if (o.type === "tourbillon") {
          if (m.invincible <= 0 && m.vent <= 0 && Math.hypot(o.x - m.dist, o.z - m.x) < o.coeur + 0.6) choc(o, ev);
        } else {
          const dx = o.x - (m.dist + 0.3);
          const dz = o.z - m.x;
          const d = Math.hypot(dx, dz);
          if (m.vent > 0 && o.type === "tonneau" && d < 8.5 && d > 0.01) { const k = Math.min(1, (24 * dt) / d); o.x -= dx * k; o.z -= dz * k; }
          if (d < o.r + 0.6) prendre(o, ev);
        }
      }
      semer();
      m.objets = m.objets.filter((o) => !o.pris && o.x > m.dist - 30);
      const p = Math.floor(m.dist / 500);
      if (p > m.palier) { m.palier = p; ev.push({ type: "palier", metres: p * 500 }); }
      return ev;
    }
    semer();
    return { m, avancer, score: () => Math.floor(m.dist) + m.tonneaux * TV.TONNEAU };
  }
  if (new URLSearchParams(location.search).has("3d")) window.__moteurTraversee = moteurTraversee; // pour les essais

  const tv = { etat: "ferme", moteur: null, partie: "", fin: null, boucle: 0, dernier: 0, rendu: null, ctx: null, el: null, retour: null, entree: { g: 0, d: 0, cible: null, glisse: null }, record: 0, regles: null, hud: "", essai3d: "", demande: 0 };
  try { tv.record = Number(localStorage.getItem("barhaw-traversee")) || 0; } catch {}
  if (new URLSearchParams(location.search).has("3d")) window.__tv = tv; // pour les essais
  const CAUSES_TV = { rocher: "La coque a cédé sur les rochers !", tentacule: "Le monstre a emporté ton navire !", tourbillon: "Aspiré par le tourbillon !" };
  const traverseeVoulue = () => location.hash === "#la-traversee";
  const traverseeOuverte = () => v4Ouverte() && glOuvert();
  // le navire qu'on barre : celui de son équipage ; sinon celui de la commu qu'on regarde
  const commuTraversee = () => commu(maFlotte?.equipage) || commuRegardee?.() || commu("barhaw") || null;
  const scoreTV = (x) => `${nombre(x.score)} pts`;

  function rendreTraversee() {
    const z = $("traversee");
    if (!z) return;
    const ouvert = traverseeOuverte();
    z.hidden = !ouvert;
    if (!ouvert) { if (z.firstChild) { vider(z); delete z.dataset.cle; } return; }
    if (traverseeVoulue() && tv.etat === "ferme") ouvrirTraversee();
    const s = infosJeux()?.traversee || null;
    const moiT = mesJeux?.traversee || null;
    const c = commuTraversee();
    const meilleur = Math.max(moiT?.meilleur || 0, tv.record);
    const cle = JSON.stringify([s, moiT, c?.id, c?.couleurs, meilleur, Boolean(moi?.connecte), mesJeux?.eclatsDuJour]);
    if (z.dataset.cle === cle) return;
    z.dataset.cle = cle;
    const ligne = (x, k) => {
      const eq = commu(x.equipe);
      return el("li", {}, el("span", { class: "tv-rang", text: String(k + 1) }), eq ? drapeauCommu(eq, "tv-fanion") : el("span", { class: "tv-fanion-vide" }), el("span", { class: "tv-nom", text: x.nom }),
        el("small", { text: `${nombre(x.distance ?? x.score)} m · ${nombre(x.tonneaux || 0)} 🛢️` }), el("b", { text: scoreTV(x) }));
    };
    vider(z,
      el("div", { class: "tv-affiche", "aria-hidden": "true" },
        el("span", { class: "tv-kanji", text: "航路" }),
        el("span", { class: "tv-soleil" }),
        el("span", { class: "tv-houle" }),
        el("span", { class: "tv-bateau", style: c ? styleCommu(c) : "" }, el("i", { class: "tv-voile" }), el("i", { class: "tv-coque" })),
        el("span", { class: "tv-roc" }), el("span", { class: "tv-roc tv-roc2" }), el("span", { class: "tv-tonneau-mini" })),
      el("div", { class: "tv-texte" },
        el("p", { class: "gl-sur", text: "Le mini-jeu de GRAND LINE" }),
        el("h3", { class: "tv-titre" }, "La ", el("span", { class: "degrade", text: "Traversée" })),
        el("p", { class: "tv-pitch", text: `Prends la barre du navire ${c ? `de ${c.nom}` : "de ta commu"} et file droit devant, de plus en plus vite. Chaque partie fait aussi avancer ton navire sur GRAND LINE.` }),
        el("ul", { class: "tv-regles" },
          el("li", { text: "🪨 Évite les rochers, les bras du monstre et les tourbillons : ta coque tient 3 coups." }),
          el("li", { text: `🛢️ Ramasse les tonneaux : +${TV.TONNEAU} points chacun, en plus des mètres parcourus.` }),
          el("li", { text: "🍾 La bouteille répare la coque. 🌬️ L'esprit du vent te protège 5 s et attire les tonneaux." })),
        el("div", { class: "tv-actions" },
          el("a", { class: "btn btn-plein tv-jouer", href: "#la-traversee", id: "tv-jouer", onclick: (e) => { e.preventDefault(); ouvrirTraversee(); } }, el("span", { "aria-hidden": "true", text: "⛵" }), " Prendre la barre"),
          el("p", { class: "note", text: `${meilleur ? `Ton meilleur : ${nombre(meilleur)} points. ` : ""}${noteEclat(moiT, `${nombre(s?.eclat || 2000)} points`)}` }))),
      el("div", { class: "tv-classement" },
        el("p", { class: "jeu-classement-titre", text: "Les meilleurs barreurs de la semaine" }),
        el("p", { class: "jeu-record" }, el("span", { text: "Record" }), s?.record ? `${scoreTV(s.record)} · ${s.record.nom}` : "à prendre !"),
        s?.semaine?.length ? el("ol", {}, s.semaine.map(ligne)) : el("p", { class: "note", text: "Personne n'a encore pris la mer cette semaine." })),
    );
  }

  // ---------- la salle de jeu (plein écran) ----------
  function ouvrirTraversee() {
    if (tv.etat !== "ferme" || !traverseeOuverte()) return;
    const c = commuTraversee();
    tv.etat = "accueil";
    tv.retour = { focus: document.activeElement, haut: scrollY };
    const fermer = el("button", { class: "gl-salle-fermer", type: "button", "aria-label": "Quitter La Traversée et revenir au site", onclick: () => fermerTraversee() }, el("span", { "aria-hidden": "true", text: "✕" }), el("span", { class: "gl-salle-fermer-texte", text: "Revenir" }));
    const pause = el("button", { class: "tv-bouton-pause", type: "button", id: "tv-pause", "aria-label": "Pause", hidden: true, onclick: () => mettreEnPause(tv.etat !== "pause") }, el("span", { "aria-hidden": "true", text: "⏸" }));
    const toile = el("canvas", { class: "tv-toile", id: "tv-toile", role: "img", "aria-label": "La Traversée : le navire file sur la mer, évite les obstacles et ramasse les tonneaux" });
    const o = el("div", { class: "tv-salle", role: "dialog", "aria-modal": "true", "aria-label": "La Traversée", style: c ? styleCommu(c) : "" },
      el("div", { class: "gl-salle-haut tv-haut" },
        el("p", { class: "gl-salle-titre" }, el("span", { class: "gl-salle-kanji", "aria-hidden": "true", text: "航路" }), "LA TRAVERSÉE",
          el("small", { text: c ? `Le navire de ${c.nom}` : "" })),
        pause, fermer),
      el("div", { class: "tv-scene", id: "tv-scene" },
        toile,
        el("div", { class: "tv-hud", id: "tv-hud", "aria-hidden": "true" }),
        el("div", { class: "tv-pops", id: "tv-pops", "aria-hidden": "true" }),
        el("span", { class: "sfx tv-sfx", id: "tv-sfx", "aria-hidden": "true" }),
        el("div", { class: "tv-touches", "aria-hidden": "true" },
          el("button", { class: "tv-touche", type: "button", tabindex: "-1", "data-dir": "-1", text: "◀" }),
          el("button", { class: "tv-touche", type: "button", tabindex: "-1", "data-dir": "1", text: "▶" })),
        el("div", { class: "tv-ecran", id: "tv-ecran", "aria-live": "polite" }),
      ));
    document.body.append(o);
    tv.el = o;
    document.documentElement.classList.add("gl-salle-ouverte");
    if (!traverseeVoulue()) history.pushState(null, "", "#la-traversee");
    brancherCommandesTV(o);
    document.addEventListener("keydown", toucheTV);
    document.addEventListener("keyup", relacheTV);
    window.addEventListener("resize", tailleTV);
    tailleTV();
    ecranTV("accueil");
    fermer.focus({ preventScroll: true });
    preparerRenduTV();
  }
  function fermerTraversee({ hash = true } = {}) {
    if (tv.etat === "ferme") return;
    cancelAnimationFrame(tv.boucle);
    const envoi = tv.etat === "jeu" || tv.etat === "pause" ? finTraversee({ abandon: true }) : null; // une partie quittée compte quand même
    tv.etat = "ferme";
    document.removeEventListener("keydown", toucheTV);
    document.removeEventListener("keyup", relacheTV);
    window.removeEventListener("resize", tailleTV);
    try { tv.rendu?.detruire?.(); } catch {}
    tv.rendu = null;
    tv.ctx = null;
    tv.el?.remove();
    tv.el = null;
    tv.moteur = null;
    document.documentElement.classList.remove("gl-salle-ouverte");
    if (hash && traverseeVoulue()) history.replaceState(null, "", "#traversee");
    const { focus, haut } = tv.retour || {};
    scrollTo({ top: haut || 0, behavior: "auto" });
    (focus?.isConnected ? focus : $("tv-jouer"))?.focus?.({ preventScroll: true });
    envoi?.then?.(() => rendreTraversee());
  }
  window.addEventListener("hashchange", () => { if (traverseeVoulue()) { if (traverseeOuverte()) ouvrirTraversee(); } else if (tv.etat !== "ferme") fermerTraversee({ hash: false }); });

  // la 3D, si l'appareil sait la faire ; sinon le même jeu en 2D
  async function preparerRenduTV() {
    const toile = $("tv-toile");
    const choix = new URLSearchParams(location.search).get("3d");
    tv.essai3d = "";
    if (choix !== "non" && !navigator.connection?.saveData) {
      try {
        const essai = document.createElement("canvas").getContext("webgl2");
        if (!essai) throw new Error("pas de WebGL 2");
        const info = essai.getExtension("WEBGL_debug_renderer_info");
        const logiciel = info && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(essai.getParameter(info.UNMASKED_RENDERER_WEBGL)));
        essai.getExtension("WEBGL_lose_context")?.loseContext();
        if (logiciel && choix !== "oui") throw new Error("rendu logiciel");
        ecranTV("charge");
        const { creerTraversee3D } = await import("/js/traversee-3d.js");
        if (tv.etat === "ferme" || $("tv-toile") !== toile) return;
        const c = commuTraversee();
        const rendu = creerTraversee3D(toile, { navire: c ? { couleurs: c.couleurs, embleme: c.embleme, drapeau: drapeauImage(c), modele: modeleNavireGL(c) || "navire-v4.glb", trainee: traineeCommu(c) } : { modele: "navire-v4.glb" }, reduit: reduit.matches, niveau5: niveau5() }); // la VF 1.0 : le navire et les pièces du niveau 5
        tailleTV(rendu);
        if (choix !== "oui" && rendu.tropLent()) { rendu.detruire(); throw new Error("trop lent"); }
        toile.addEventListener("webglcontextlost", (e) => { e.preventDefault(); passerTV2D(); });
        // les modèles (le navire, les rochers…) : on les attend un peu, pas trop
        await Promise.race([rendu.pret, new Promise((ok) => setTimeout(ok, 9000))]);
        if (tv.etat === "ferme") { rendu.detruire(); return; }
        tv.rendu = rendu;
        tv.essai3d = "3d";
        if (choix) window.__traversee3D = rendu;
        apercuTV();
        ecranTV("accueil");
        return;
      } catch (e) { tv.essai3d = `2d (${e.message})`; }
    }
    passerTV2D();
  }
  function passerTV2D() {
    if (tv.etat === "ferme") return;
    try { tv.rendu?.detruire?.(); } catch {}
    tv.rendu = null;
    // le canvas a peut-être servi à WebGL : un neuf pour dessiner en 2D
    const ancien = $("tv-toile");
    const toile = el("canvas", { class: "tv-toile", id: "tv-toile", role: "img", "aria-label": ancien?.getAttribute("aria-label") || "La Traversée" });
    ancien?.replaceWith(toile);
    brancherCommandesTV(tv.el);
    tv.ctx = toile.getContext("2d");
    tailleTV();
    apercuTV();
    if (tv.etat === "accueil") ecranTV("accueil");
  }
  function tailleTV(rendu = tv.rendu) {
    const s = $("tv-scene");
    const toile = $("tv-toile");
    if (!s || !toile) return;
    const l = s.clientWidth || 360;
    const h = s.clientHeight || 640;
    if (rendu) { rendu.taille(l, h); return; }
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    toile.width = Math.round(l * dpr);
    toile.height = Math.round(h * dpr);
    tv.echelle = dpr;
    if (tv.etat !== "jeu") apercuTV();
  }
  // avant de partir : la mer, le navire au port
  function apercuTV() {
    const m = (tv.moteur || moteurTraversee(reglesTV())).m;
    if (tv.rendu) tv.rendu.dessiner(m, 0.016);
    else if (tv.ctx) dessinerTV2D(m, 0.016);
  }
  const reglesTV = () => {
    const r = infosJeux()?.traversee;
    return { v0: Number(r?.v0) || TV.V0, acceleration: Number(r?.acceleration) || TV.ACC, vMax: Number(r?.vMax) || TV.VMAX };
  };

  // les écrans par-dessus le jeu : l'accueil, le chargement, le départ, la pause, la fin
  function ecranTV(type, f = null) {
    const z = $("tv-ecran");
    if (!z) return;
    const c = commuTraversee();
    const tactile = matchMedia("(pointer: coarse)").matches;
    z.className = `tv-ecran tv-ecran-${type}`;
    z.hidden = type === "jeu";
    if (type === "jeu") { vider(z); return; }
    if (type === "charge") { vider(z, el("p", { class: "tv-charge" }, el("span", { class: "tv-roue", "aria-hidden": "true", text: "☸" }), "Le navire se prépare…")); return; }
    if (type === "depart") { vider(z, el("p", { class: "tv-decompte", id: "tv-decompte", text: "3" })); return; }
    if (type === "pause") {
      vider(z, el("div", { class: "tv-panneau" },
        el("p", { class: "tv-gros", text: "Pause" }),
        el("p", { class: "note", text: "Le navire t'attend." }),
        el("div", { class: "tv-boutons" },
          el("button", { class: "btn btn-plein", type: "button", onclick: () => mettreEnPause(false), text: "Reprendre" }),
          el("button", { class: "btn btn-contour", type: "button", onclick: () => fermerTraversee(), text: "Quitter" }))));
      z.querySelector("button")?.focus({ preventScroll: true });
      return;
    }
    if (type === "fin" && f) {
      vider(z, el("div", { class: "tv-panneau tv-fin" },
        el("p", { class: "tv-cause", text: CAUSES_TV[f.cause] || (f.abandon ? "Retour au port." : "Naufrage !") }),
        el("p", { class: "tv-gros degrade", text: `${nombre(f.score)} pts` }),
        el("p", { class: "tv-detail", text: `${nombre(f.distance)} m parcourus · ${nombre(f.tonneaux)} tonneau${f.tonneaux > 1 ? "x" : ""}` }),
        f.envoi ? el("p", { class: "note", text: "Le bot note ton score…" }) : null,
        f.message ? el("p", { class: "note", text: f.message }) : null,
        ...messagesFin(f),
        f.milles ? el("p", { class: "jeu-butin", text: `⛵ +${nombre(f.milles)} milles pour ${c?.nom || "ton navire"} sur GRAND LINE` }) : null,
        el("div", { class: "tv-boutons" },
          el("button", { class: "btn btn-plein", type: "button", id: "tv-rejouer", onclick: lancerTraversee, disabled: f.envoi ? true : null, text: "Repartir" }),
          el("button", { class: "btn btn-contour", type: "button", onclick: () => fermerTraversee(), text: "Revenir à la carte" }))));
      if (!f.envoi) $("tv-rejouer")?.focus({ preventScroll: true });
      return;
    }
    // l'accueil
    const s = infosJeux()?.traversee;
    vider(z, el("div", { class: "tv-panneau" },
      el("p", { class: "gl-sur", text: c ? `Le navire de ${c.nom}` : "Ton navire" }),
      el("p", { class: "tv-gros", text: "Prends la barre !" }),
      el("ul", { class: "tv-regles" },
        el("li", { text: tactile ? "👆 Glisse le doigt (ou appuie sur ◀ ▶) pour barrer." : "⌨️ ← → (ou Q et D) pour barrer, ou glisse la souris en restant appuyé." }),
        el("li", { text: "🪨 Évite les rochers, les bras du monstre et les tourbillons. 3 cœurs." }),
        el("li", { text: `🛢️ Tonneaux : +${TV.TONNEAU} points. 🍾 Bouteille : +1 cœur. 🌬️ Vent : bouclier 5 s.` })),
      el("div", { class: "tv-boutons" }, el("button", { class: "btn btn-plein", type: "button", id: "tv-partir", onclick: lancerTraversee, text: "Larguer les amarres !" })),
      el("p", { class: "note", text: moi?.connecte ? `${s?.record ? `Record de la semaine : ${scoreTV(s.record)} (${s.record.nom}). ` : ""}${noteEclat(mesJeux?.traversee, `${nombre(s?.eclat || 2000)} points`)}` : "Connecte-toi avec Discord pour que ton score compte (et fasse ramer ton navire)." })));
    $("tv-partir")?.focus({ preventScroll: true });
  }

  // ---------- une partie ----------
  async function lancerTraversee() {
    if (!["accueil", "fin"].includes(tv.etat) || !tv.el) return;
    if (!tv.rendu && !tv.ctx) return; // le rendu n'est pas prêt
    tv.etat = "depart";
    tv.partie = "";
    tv.fin = null;
    tv.moteur = moteurTraversee(reglesTV());
    tv.entree = { g: 0, d: 0, cible: null, glisse: null };
    tv.hud = "";
    $("tv-pops") && vider($("tv-pops"));
    ecranTV("depart");
    majHudTV();
    apercuTV();
    // en aperçu de la VF (avant le 22/12), la partie se joue pour du beurre : rien n'est demandé au bot
    const pourDuBeurre = apercuVF.actif && !v4Officielle();
    const ouverture = moi?.connecte && !pourDuBeurre ? demanderJeux("jeu-ouvrir", { jeu: "traversee" }) : null;
    const d = $("tv-decompte");
    for (const t of ["3", "2", "1", "Larguez les amarres !"]) {
      if (tv.etat !== "depart") return;
      if (d) { d.textContent = t; d.classList.remove("pop"); void d.offsetWidth; d.classList.add("pop"); }
      await new Promise((ok) => setTimeout(ok, reduit.matches ? 260 : t.length > 1 ? 650 : 560));
    }
    if (tv.etat !== "depart") return;
    if (ouverture) { const r = await ouverture; if (r.d.partie) tv.partie = r.d.partie; else if (r.d.erreur) tv.messageOuverture = r.d.erreur; }
    else tv.messageOuverture = pourDuBeurre ? "Aperçu de la VF 1.0 : cette partie ne compte pas encore (ouverture le 22 décembre à 21 h 30)." : "";
    if (tv.etat !== "depart") return;
    tv.etat = "jeu";
    ecranTV("jeu");
    $("tv-pause").hidden = false;
    tv.dernier = performance.now();
    tv.images = 0;
    tv.tempsImages = 0;
    cancelAnimationFrame(tv.boucle);
    tv.boucle = requestAnimationFrame(imageTV);
  }
  function imageTV(t) {
    if (tv.etat !== "jeu") return;
    const dt = Math.min(0.05, Math.max(0, (t - tv.dernier) / 1000));
    // la 3D trop lourde pour l'appareil (moins de 24 images par seconde) : le jeu passe en 2D
    if (tv.rendu && new URLSearchParams(location.search).get("3d") !== "oui" && ++tv.images > 10) {
      tv.tempsImages += t - tv.dernier;
      if (tv.images === 70 && tv.tempsImages / 60 > 1000 / 24) passerTV2D();
    }
    tv.dernier = t;
    const e = tv.entree;
    const dir = (e.d ? 1 : 0) - (e.g ? 1 : 0);
    const evs = tv.moteur.avancer(dt, dir ? { dir } : { cible: e.cible });
    for (const ev of evs) evenementTV(ev);
    if (tv.rendu) tv.rendu.dessiner(tv.moteur.m, dt);
    else dessinerTV2D(tv.moteur.m, dt);
    majHudTV();
    if (tv.moteur.m.fini) { finTraversee(); return; }
    tv.boucle = requestAnimationFrame(imageTV);
  }
  const SFX_TV = { choc: ["ドカン！", "ガン！", "バキッ！"], tonneau: ["ゲット！"], vent: ["ビュー！"], brise: ["バリン！"], coeur: ["キラッ！"], naufrage: ["ザブーン！"] };
  function evenementTV(ev) {
    tv.rendu?.evenement?.(ev);
    tv.effets2D?.push({ ...ev, age: 0 });
    const m = tv.moteur.m;
    const o = ev.objet;
    if (ev.type === "tonneau") popTV(o.x, o.z, `+${TV.TONNEAU}`, "or");
    else if (ev.type === "bouteille") popTV(o.x, o.z, `+${TV.TONNEAU * 2}`, "or");
    else if (ev.type === "coeur") popTV(o.x, o.z, "+1 ❤", "rose");
    else if (ev.type === "vent") popTV(o.x, o.z, "Bouclier !", "vent");
    else if (ev.type === "palier") sfxTV(`${nombre(ev.metres)} m!`);
    if (SFX_TV[ev.type] && ev.type !== "tonneau") sfxTV(SFX_TV[ev.type][Math.floor(Math.random() * SFX_TV[ev.type].length)]);
    if (ev.type === "choc") {
      const s = $("tv-scene");
      s?.classList.remove("tv-touche-coque"); void s?.offsetWidth; s?.classList.add("tv-touche-coque");
      navigator.vibrate?.(reduit.matches ? 0 : 60);
    }
    if (ev.type === "tonneau" && m.tonneaux % 10 === 0) sfxTV("ゲット！");
  }
  function sfxTV(texte) {
    const s = $("tv-sfx");
    if (!s) return;
    s.textContent = texte;
    s.classList.remove("eclat"); void s.offsetWidth; s.classList.add("eclat");
  }
  // un « +25 » qui monte au-dessus de ce qu'on vient de ramasser
  function popTV(x, z, texte, genre) {
    const zone = $("tv-pops");
    if (!zone) return;
    const [sx, sy] = tv.rendu ? tv.rendu.versEcran(x, 2.2, z) : projeterTV2D(x, z, 2.2);
    const p = el("span", { class: `tv-pop tv-pop-${genre}`, text: texte, style: `left:${(Math.max(0.06, Math.min(0.94, sx)) * 100).toFixed(1)}%;top:${(Math.max(0.1, Math.min(0.9, sy)) * 100).toFixed(1)}%` });
    zone.append(p);
    setTimeout(() => p.remove(), 1000);
    while (zone.children.length > 8) zone.firstChild.remove();
  }
  function majHudTV() {
    const z = $("tv-hud");
    const mo = tv.moteur;
    if (!z || !mo) return;
    const m = mo.m;
    const cle = `${m.coeurs}|${Math.floor(m.dist)}|${m.tonneaux}|${m.vent > 0 ? Math.ceil(m.vent * 4) : 0}|${Math.round(m.v)}`;
    if (cle === tv.hud) return;
    tv.hud = cle;
    vider(z,
      el("div", { class: "tv-coeurs", title: "La coque" }, Array.from({ length: TV.COEURS }, (_, k) => el("span", { class: `tv-coeur${k < m.coeurs ? "" : " vide"}` }))),
      el("div", { class: "tv-compteurs" },
        el("p", { class: "tv-score" }, el("b", { text: nombre(mo.score()) }), el("small", { text: " pts" })),
        el("p", { class: "tv-petit", text: `${nombre(Math.floor(m.dist))} m · 🛢️ ${nombre(m.tonneaux)} · ${Math.round(m.v * 1.94)} nœuds` })),
      m.vent > 0 ? el("div", { class: "tv-vent" }, el("span", { text: "🌬️" }), el("i", { style: `--v:${(m.vent / 5).toFixed(2)}` })) : null);
  }
  function mettreEnPause(oui) {
    if (oui && tv.etat === "jeu") {
      tv.etat = "pause";
      cancelAnimationFrame(tv.boucle);
      ecranTV("pause");
    } else if (!oui && tv.etat === "pause") {
      tv.etat = "jeu";
      ecranTV("jeu");
      tv.dernier = performance.now();
      tv.boucle = requestAnimationFrame(imageTV);
      $("tv-scene")?.focus?.({ preventScroll: true });
    }
  }
  async function finTraversee({ abandon = false } = {}) {
    const mo = tv.moteur;
    if (!mo) return;
    const m = mo.m;
    cancelAnimationFrame(tv.boucle);
    const distance = Math.floor(m.dist);
    const score = mo.score();
    if (score > tv.record) { tv.record = score; try { localStorage.setItem("barhaw-traversee", String(score)); } catch {} }
    let fin = { distance, tonneaux: m.tonneaux, score, cause: m.cause, abandon, message: "" };
    const partie = tv.partie;
    tv.partie = "";
    if (!abandon) {
      tv.etat = "envoi";
      $("tv-pause").hidden = true;
      // le naufrage, le temps de le voir
      const fond = performance.now();
      const couler = (t) => {
        if (tv.etat !== "envoi" && tv.etat !== "fin") return;
        const dt = Math.min(0.05, (t - (couler.d || t)) / 1000);
        couler.d = t;
        if (tv.rendu) tv.rendu.dessiner(m, dt); else dessinerTV2D(m, dt);
        if (t - fond < 1400) requestAnimationFrame(couler);
      };
      requestAnimationFrame(couler);
      ecranTV("fin", { ...fin, envoi: Boolean(partie) });
    }
    if (partie) {
      const { d } = await demanderJeux("traversee-fin", { partie, distance, tonneaux: m.tonneaux });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin, milles: d.milles };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ton score compte.";
    else if (tv.messageOuverture) fin.message = tv.messageOuverture;
    if (abandon) { if (fin.record || fin.perso) setTimeout(charger, 1500); return fin; }
    tv.fin = fin;
    if (tv.etat === "envoi") { tv.etat = "fin"; ecranTV("fin", fin); }
    rendreTraversee();
    if (fin.record || fin.perso || fin.milles) setTimeout(charger, 1500);
    return fin;
  }

  // ---------- les commandes : le clavier, le doigt (ou la souris), les boutons ◀ ▶ ----------
  function brancherCommandesTV(o) {
    const toile = $("tv-toile");
    if (!o || !toile || toile.dataset.branche) return;
    toile.dataset.branche = "1";
    toile.addEventListener("pointerdown", (e) => {
      if (tv.etat !== "jeu" || !tv.moteur) return;
      e.preventDefault();
      toile.setPointerCapture?.(e.pointerId);
      tv.entree.glisse = { x0: e.clientX, n0: tv.moteur.m.x, id: e.pointerId };
      tv.entree.cible = tv.moteur.m.x;
    });
    toile.addEventListener("pointermove", (e) => {
      const g = tv.entree.glisse;
      if (!g || g.id !== e.pointerId || !tv.moteur) return;
      const l = toile.clientWidth || 360;
      // tout le chenal en un peu moins que la largeur de l'écran
      tv.entree.cible = Math.max(-TV.BORD, Math.min(TV.BORD, g.n0 + ((e.clientX - g.x0) / l) * TV.BORD * 2.6));
    });
    for (const ev of ["pointerup", "pointercancel"]) toile.addEventListener(ev, (e) => { if (tv.entree.glisse?.id === e.pointerId) { tv.entree.glisse = null; tv.entree.cible = null; } });
    if (o.dataset.boutons) return;
    o.dataset.boutons = "1";
    for (const b of o.querySelectorAll(".tv-touche")) {
      const cote = b.dataset.dir === "1" ? "d" : "g";
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); tv.entree[cote] = 1; b.classList.add("appui"); });
      for (const ev of ["pointerup", "pointercancel", "pointerleave"]) b.addEventListener(ev, () => { tv.entree[cote] = 0; b.classList.remove("appui"); });
    }
  }
  const GAUCHE_TV = ["ArrowLeft", "KeyA", "KeyQ"];
  const DROITE_TV = ["ArrowRight", "KeyD"];
  function toucheTV(e) {
    if (e.target?.closest?.("input, textarea, select")) return;
    if (e.key === "Escape") { e.preventDefault(); if (tv.etat === "jeu") mettreEnPause(true); else if (tv.etat !== "depart" && tv.etat !== "envoi") fermerTraversee(); return; }
    if (e.code === "KeyP" || (e.code === "Space" && tv.etat === "pause")) { e.preventDefault(); mettreEnPause(tv.etat === "jeu"); return; }
    if (GAUCHE_TV.includes(e.code)) { e.preventDefault(); tv.entree.g = 1; }
    else if (DROITE_TV.includes(e.code)) { e.preventDefault(); tv.entree.d = 1; }
    else if ((e.code === "Space" || e.code === "Enter") && (tv.etat === "accueil" || tv.etat === "fin") && !e.target?.closest?.("button, a")) { e.preventDefault(); lancerTraversee(); }
  }
  function relacheTV(e) {
    if (GAUCHE_TV.includes(e.code)) tv.entree.g = 0;
    if (DROITE_TV.includes(e.code)) tv.entree.d = 0;
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && tv.etat === "jeu") mettreEnPause(true); });

  // ---------- la Traversée en 2D (sans 3D) : la même mer, vue de derrière le navire, en fausse perspective ----------
  tv.effets2D = [];
  const TV2 = { D0: 14, HORIZON: 0.34, NAVIRE: 0.86 };
  function projeterTV2D(x, z, y = 0, m = tv.moteur?.m) {
    const toile = $("tv-toile");
    if (!toile || !m) return [0.5, 0.5, 0];
    const l = toile.width;
    const h = toile.height;
    const D = Math.max(1.5, x - m.dist + TV2.D0);
    const f = TV2.D0 / D;
    const hor = h * TV2.HORIZON;
    const basN = h * TV2.NAVIRE;
    const s = (l / 2 / (portraitTV() ? 8.5 : 12)) * f;
    const cz = m.x * (portraitTV() ? 1 : 0.6);
    return [(l / 2 + (z - cz) * s) / l, (hor + (basN - hor) * f - y * s) / h, s];
  }
  const portraitTV = () => { const t = $("tv-toile"); return t ? t.width / t.height < 0.9 : false; };
  function dessinerTV2D(m, dt) {
    const ctx = tv.ctx;
    if (!ctx) return;
    const toile = ctx.canvas;
    const l = toile.width;
    const h = toile.height;
    const t = (tv.t2 = (tv.t2 || 0) + dt);
    const hor = h * TV2.HORIZON;
    const proj = (x, z, y = 0) => { const [a, b, s] = projeterTV2D(x, z, y, m); return [a * l, b * h, s]; };
    // le ciel du soir, le soleil à bandes, les nuages
    const ciel = ctx.createLinearGradient(0, 0, 0, hor);
    ciel.addColorStop(0, "#24092f"); ciel.addColorStop(0.55, "#7a2a6a"); ciel.addColorStop(1, "#ffa9bf");
    ctx.fillStyle = ciel; ctx.fillRect(0, 0, l, hor + 1);
    const sx = l * 0.68;
    const sr = Math.min(l, h) * 0.09;
    const soleil = ctx.createRadialGradient(sx, hor - sr * 0.3, 2, sx, hor - sr * 0.3, sr * 2.4);
    soleil.addColorStop(0, "rgba(255,240,214,.95)"); soleil.addColorStop(0.35, "rgba(255,190,150,.55)"); soleil.addColorStop(1, "rgba(255,150,180,0)");
    ctx.fillStyle = soleil; ctx.beginPath(); ctx.arc(sx, hor - sr * 0.3, sr * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff3dc"; ctx.beginPath(); ctx.arc(sx, hor - sr * 0.3, sr, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#ff8fb0";
    for (let k = 0; k < 3; k++) ctx.fillRect(sx - sr, hor - sr * 0.3 - sr * (0.2 + k * 0.22), sr * 2, sr * 0.06);
    ctx.fillStyle = "rgba(255,210,226,.55)";
    for (let k = 0; k < 4; k++) {
      const cx = ((k * 0.31 + 0.1 - m.dist * 0.00004) % 1.2 + 1.2) % 1.2 * l - l * 0.1;
      const cy = hor * (0.45 + (k % 2) * 0.2);
      ctx.beginPath(); ctx.ellipse(cx, cy, l * 0.09, h * 0.012, 0, 0, Math.PI * 2); ctx.ellipse(cx + l * 0.04, cy - h * 0.012, l * 0.05, h * 0.01, 0, 0, Math.PI * 2); ctx.fill();
    }
    // la mer, et ses lignes de vagues qui arrivent
    const mer = ctx.createLinearGradient(0, hor, 0, h);
    mer.addColorStop(0, "#f08ab8"); mer.addColorStop(0.12, "#5b7fd0"); mer.addColorStop(1, "#22377e");
    ctx.fillStyle = mer; ctx.fillRect(0, hor, l, h - hor);
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = Math.max(1, l / 500);
    const pas = 7;
    for (let k = Math.ceil(m.dist / pas); k < m.dist / pas + 26; k++) {
      const x = k * pas;
      const [, y, s] = proj(x, 0);
      if (y < hor) continue;
      ctx.beginPath();
      for (let j = -3; j <= 3; j++) {
        const [a] = proj(x, j * 4 + ((k * 13) % 5) - 2);
        ctx.moveTo(a - s * 0.9, y);
        ctx.quadraticCurveTo(a, y - s * 0.25, a + s * 0.9, y);
      }
      ctx.stroke();
    }
    // les bords du chenal : des rangées de récifs lointains (des petites dents sombres)
    // ce qu'on croise, du plus loin au plus près
    const vus = m.objets.filter((o) => !o.pris && o.x > m.dist - 4 && o.x < m.dist + 160).sort((a, b) => b.x - a.x);
    ctx.lineJoin = "round";
    for (const o of vus) dessinerObjetTV2D(ctx, o, proj, t, m);
    // le sillage et le navire
    dessinerNavireTV2D(ctx, m, proj, t, l, h);
    // les éclats
    tv.effets2D = tv.effets2D.filter((e) => (e.age += dt) < 0.8);
    for (const e of tv.effets2D) {
      const o = e.objet || {};
      const [a, b, s] = proj(e.x ?? o.x ?? m.dist, e.z ?? o.z ?? m.x, 1);
      const c = { choc: "#ffffff", naufrage: "#ffffff", tonneau: "#ffd36b", coeur: "#ff8fcb", bouteille: "#ffd36b", vent: "#9ff5ee", brise: "#e3dccf" }[e.type];
      if (!c) continue;
      ctx.strokeStyle = c;
      ctx.globalAlpha = 1 - e.age / 0.8;
      ctx.lineWidth = s * 0.25;
      ctx.beginPath(); ctx.ellipse(a, b + s, s * (1 + e.age * 5), s * (0.3 + e.age * 1.5), 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (m.invincible > 0 && !reduit.matches) { ctx.fillStyle = `rgba(255,45,85,${(m.invincible / 1.6) * 0.18})`; ctx.fillRect(0, 0, l, h); }
  }
  function trait(ctx, s) { ctx.strokeStyle = "#12050d"; ctx.lineWidth = Math.max(1.2, s * 0.12); ctx.stroke(); }
  function dessinerObjetTV2D(ctx, o, proj, t, m) {
    const [a, b, s] = proj(o.x, o.z);
    const e = o.ech || 1;
    if (o.type === "rocher") {
      const enfonce = o.brise ? Math.min(1, (m.t - o.brise) * 1.5) : 0;
      if (enfonce >= 1) return;
      const formes = o.modele === "jumeaux" ? [[1.05, 1.25, 2.6], [-1.0, 1.1, 2.2]] : o.modele === "recif" ? [[-1.6, 1.1, 0.9], [0, 1.3, 1.1], [1.6, 1.1, 0.9]] : [[0, 1.6, 4.6]];
      for (const [dz, r, hh] of formes) {
        const z = o.modele === "recif" ? dz : dz * Math.cos(o.rot || 0);
        const [x0] = proj(o.x, o.z + z * e);
        const w = r * e * s;
        const hp = hh * e * s * (1 - enfonce);
        ctx.fillStyle = o.modele === "jumeaux" && dz > 0 ? "#3b3236" : "#8f867a";
        ctx.beginPath();
        ctx.moveTo(x0 - w, b);
        ctx.quadraticCurveTo(x0 - w * 1.05, b - hp * 0.7, x0 - w * 0.3, b - hp);
        ctx.quadraticCurveTo(x0 + w * 0.2, b - hp * 1.05, x0 + w * 0.5, b - hp * 0.8);
        ctx.quadraticCurveTo(x0 + w * 1.1, b - hp * 0.5, x0 + w, b);
        ctx.closePath(); ctx.fill(); trait(ctx, s);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x0, b - hp * 0.7, w * 0.6, hp * 0.6);
        if (o.modele === "aiguille") { ctx.fillStyle = "#5f7a3a"; ctx.beginPath(); ctx.ellipse(x0 - w * 0.05, b - hp * 0.95, w * 0.5, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); trait(ctx, s); }
        if (o.modele === "recif") { for (let k = 0; k < 3; k++) { ctx.fillStyle = ["#ff7a8a", "#9b4dff", "#ff4f9a"][k]; ctx.beginPath(); ctx.arc(x0 + (k - 1) * w * 0.5, b - hp * 0.9, s * 0.28, 0, Math.PI * 2); ctx.fill(); } }
      }
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.ellipse(a, b, s * 2.4 * e, s * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === "tourbillon") {
      for (let k = 0; k < 5; k++) {
        const r = (4.2 - k * 0.8) * s;
        ctx.strokeStyle = k % 2 ? "#ffffff" : "#5fd0d8";
        ctx.lineWidth = s * 0.3;
        ctx.beginPath(); ctx.ellipse(a, b, r, r * 0.28, 0, t * (2 + k) % 6.28, t * (2 + k) % 6.28 + 4.4); ctx.stroke();
      }
      ctx.fillStyle = "#1c2a66"; ctx.beginPath(); ctx.ellipse(a, b, s * 0.9, s * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    } else if (o.type === "tentacule") {
      const mo = o.montee || 0;
      if (mo < 0.98) {
        ctx.fillStyle = "#ffffff";
        for (let k = 0; k < 7; k++) { const u = t * 3 + k; ctx.beginPath(); ctx.arc(a + Math.cos(u) * s * 1.3, b - Math.abs(Math.sin(u * 2)) * s * 0.4, s * 0.25, 0, Math.PI * 2); ctx.fill(); }
        if (o.etat === "attente" && Math.floor(t * 6) % 2 === 0) { ctx.fillStyle = "#ff2d55"; ctx.beginPath(); ctx.arc(a, b - s * 3.2, s * 0.8, 0, Math.PI * 2); ctx.fill(); trait(ctx, s); ctx.fillStyle = "#fff"; ctx.font = `900 ${Math.round(s * 1.2)}px 'Dela Gothic One', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", a, b - s * 3.1); }
      }
      if (mo > 0.02) {
        const hp = 5 * e * s * mo;
        const bal = Math.sin(t * 2 + o.phase) * s * 0.6;
        ctx.fillStyle = "#5e2bb0";
        ctx.beginPath();
        ctx.moveTo(a - s * 0.8 * e, b);
        ctx.quadraticCurveTo(a - s * 0.9 + bal, b - hp * 0.6, a - s * 0.3 + bal, b - hp);
        ctx.quadraticCurveTo(a - s * 1.4 + bal, b - hp * 1.08, a - s * 1.2 + bal, b - hp * 0.8);
        ctx.quadraticCurveTo(a + s * 0.3 + bal, b - hp * 0.95, a + s * 0.8 * e, b);
        ctx.closePath(); ctx.fill(); trait(ctx, s);
        ctx.fillStyle = "#ffc6dc";
        for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.arc(a - s * 0.45 + bal * (k / 5), b - hp * (k / 6), s * 0.16, 0, Math.PI * 2); ctx.fill(); }
      }
    } else if (o.type === "tonneau" || o.type === "bouteille") {
      const y = b - s * (0.5 + Math.sin(t * 3 + o.phase) * 0.12);
      ctx.fillStyle = "rgba(255,211,107,.35)"; ctx.beginPath(); ctx.ellipse(a, b, s * 1.6, s * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      if (o.type === "tonneau") {
        ctx.fillStyle = "#c08a55"; ctx.beginPath(); ctx.ellipse(a, y, s * 0.75, s * 0.55, 0, 0, Math.PI * 2); ctx.fill(); trait(ctx, s);
        ctx.strokeStyle = "#2a2a33"; ctx.lineWidth = s * 0.1;
        for (const k of [-0.35, 0.35]) { ctx.beginPath(); ctx.moveTo(a + k * s, y - s * 0.52); ctx.lineTo(a + k * s, y + s * 0.52); ctx.stroke(); }
      } else {
        ctx.fillStyle = "rgba(95,211,154,.8)"; ctx.beginPath(); ctx.ellipse(a, y, s * 0.6, s * 0.25, -0.3, 0, Math.PI * 2); ctx.fill(); trait(ctx, s);
        ctx.fillStyle = "#fbf1df"; ctx.fillRect(a - s * 0.3, y - s * 0.08, s * 0.45, s * 0.16);
      }
    } else if (o.type === "bourrasque") {
      const y = b - s * (2.4 + Math.sin(t * 2 + o.phase) * 0.35);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(a, y, s * 0.8, 0, Math.PI * 2); ctx.arc(a - s * 0.6, y + s * 0.2, s * 0.5, 0, Math.PI * 2); ctx.arc(a + s * 0.6, y + s * 0.2, s * 0.5, 0, Math.PI * 2); ctx.fill(); trait(ctx, s);
      ctx.fillStyle = "#12050d"; ctx.beginPath(); ctx.arc(a - s * 0.25, y - s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.arc(a + s * 0.25, y - s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffb3d1"; ctx.beginPath(); ctx.arc(a, y + s * 0.25, s * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#3fd0c9"; ctx.lineWidth = s * 0.15; ctx.beginPath(); ctx.ellipse(a, y, s * 1.4, s * 0.45, 0, t * 3, t * 3 + 3.5); ctx.stroke();
    }
  }
  function dessinerNavireTV2D(ctx, m, proj, t, l, h) {
    const [a, b, s] = proj(m.dist, m.x);
    const c = commuTraversee();
    const c1 = hexaCommu(c, "principale");
    const c2 = hexaCommu(c, "secondaire");
    // le sillage : deux traînées d'écume qui s'écartent
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = s * 0.35;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a + k * s * 1.0, b + s * 0.4);
      ctx.quadraticCurveTo(a + k * s * 2.5, b + s * 2.5, a + k * s * 4.6 - m.vx * s * 0.08, h + s);
      ctx.stroke();
    }
    if (m.invincible > 0 && !reduit.matches && Math.floor(m.invincible * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(a, b + Math.sin(t * 2.2) * s * 0.06);
    ctx.scale(0.8, 0.8);
    ctx.rotate(Math.max(-0.25, Math.min(0.25, m.vx * 0.018)));
    // la coque vue de l'arrière, le mât, la voile aux couleurs de la commu
    ctx.fillStyle = "#7a3b2e";
    ctx.beginPath(); ctx.moveTo(-s * 1.35, -s * 1.2); ctx.lineTo(s * 1.35, -s * 1.2); ctx.quadraticCurveTo(s * 1.25, s * 0.4, 0, s * 0.55); ctx.quadraticCurveTo(-s * 1.25, s * 0.4, -s * 1.35, -s * 1.2); ctx.fill(); trait(ctx, s);
    ctx.fillStyle = "#d2a676"; ctx.fillRect(-s * 1.2, -s * 1.05, s * 2.4, s * 0.22);
    ctx.fillStyle = "#4a2219"; ctx.fillRect(-s * 0.09, -s * 5.2, s * 0.18, s * 4.1);
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.moveTo(-s * 1.6, -s * 4.6); ctx.quadraticCurveTo(0, -s * (4.2 - (m.vent > 0 ? 0.6 : 0.25)), s * 1.6, -s * 4.6); ctx.lineTo(s * 1.45, -s * 2.0); ctx.quadraticCurveTo(0, -s * 1.7, -s * 1.45, -s * 2.0); ctx.closePath(); ctx.fill(); trait(ctx, s);
    ctx.fillStyle = c2; ctx.fillRect(-s * 1.5, -s * 3.0, s * 3.0, s * 0.35);
    ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(0, -s * 5.2); ctx.lineTo(s * 0.9, -s * 5.0 + Math.sin(t * 6) * s * 0.1); ctx.lineTo(0, -s * 4.75); ctx.fill();
    ctx.restore();
    if (m.vent > 0) {
      ctx.strokeStyle = `rgba(159,245,238,${m.vent < 1 && Math.floor(m.vent * 8) % 2 ? 0.25 : 0.85})`;
      ctx.lineWidth = s * 0.2;
      ctx.beginPath(); ctx.ellipse(a, b - s * 2.2, s * 3.1, s * 3.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // la carte en 2D (SVG) : la même carte, à plat, pour les appareils sans 3D et les mouvements réduits
  function carte2D(zone) {
    const NS = "http://www.w3.org/2000/svg";
    const s = (tag, attrs = {}, ...enfants) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); e.append(...enfants.flat().filter(Boolean)); return e; };
    const X = (x) => x + 118;
    const Y = (z) => z + 73;
    // la V4 : une carte dessinée qui vit (la houle, les fonds autour des îles, la rose des vents, des baleines, des dauphins,
    // des navires marchands, des mouettes, un serpent de mer, des nuages qui passent) ; tout en SVG, rien à charger
    const anime = (tag, attrs) => s(tag, { repeatCount: "indefinite", ...attrs });
    function vie2D(svg, g) {
      const defs = s("defs", {},
        s("pattern", { id: "gl2-vagues", width: 12, height: 7, patternUnits: "userSpaceOnUse" }, s("path", { d: "M0 4 q1.5 -2 3 0 t3 0", class: "gl2-vague" }), s("path", { d: "M6 1.2 q1.5 -2 3 0 t3 0", class: "gl2-vague" })),
        s("radialGradient", { id: "gl2-fond", cx: "50%", cy: "50%", r: "62%" }, s("stop", { offset: "0%", "stop-color": "#8ec3dd" }), s("stop", { offset: "100%", "stop-color": "#b9dceb" })),
        s("radialGradient", { id: "gl2-lueur" }, s("stop", { offset: "0%", "stop-color": "#ffe9a8", "stop-opacity": 0.95 }), s("stop", { offset: "55%", "stop-color": "#ffb85c", "stop-opacity": 0.35 }), s("stop", { offset: "100%", "stop-color": "#ffb85c", "stop-opacity": 0 })),
        s("clipPath", { id: "gl2-mer" }, s("rect", { x: 14, y: 15, width: 208, height: 116, rx: 10 })));
      svg.append(defs);
      const mer = s("g", { "clip-path": "url(#gl2-mer)", class: "gl2-vie", "aria-hidden": "true" });
      mer.append(s("rect", { x: 14, y: 15, width: 208, height: 116, fill: "url(#gl2-fond)" }));
      // la houle : un motif de vaguelettes qui glisse
      mer.append(s("g", { class: "gl2-houle" }, s("rect", { x: 2, y: 9, width: 236, height: 130, fill: "url(#gl2-vagues)" })));
      // les lignes de rhumb depuis la rose des vents
      const rose = [36, 112];
      const rhumbs = s("g", { class: "gl2-rhumbs" });
      for (let k = 0; k < 16; k++) { const a = (k * Math.PI) / 8; rhumbs.append(s("line", { x1: rose[0], y1: rose[1], x2: rose[0] + Math.cos(a) * 260, y2: rose[1] + Math.sin(a) * 260 })); }
      mer.append(rhumbs);
      // les fonds autour des îles connues (des courbes de niveau) et l'écume qui respire
      for (const e of g.route.flat()) {
        if (e.etat === "inconnue" || e.etat === "ecartee") continue;
        const [x, z] = GL_PLACES[e.id] || [0, 0];
        mer.append(s("circle", { cx: X(x), cy: Y(z), r: 13.5, class: "gl2-fond" }), s("circle", { cx: X(x), cy: Y(z), r: 10, class: "gl2-fond" }),
          s("circle", { cx: X(x), cy: Y(z), r: 8, class: "gl2-ecume" }, anime("animate", { attributeName: "r", values: "7.5;9.5;7.5", dur: `${4 + (x % 3)}s` }), anime("animate", { attributeName: "opacity", values: "0.8;0.1;0.8", dur: `${4 + (x % 3)}s` })));
      }
      // deux baleines qui font le tour de la mer, et leur jet d'eau
      [["M30 40 C70 20 140 22 200 38 S210 120 150 118 S30 110 30 40Z", 90, 0], ["M60 120 C110 128 180 125 205 100 S190 30 130 32 S50 80 60 120Z", 120, -40]].forEach(([d, dur, debut], k) => {
        const b = s("g", { class: "gl2-baleine" },
          s("path", { d: "M-5 0 C-4 -2.6 3 -2.8 5 -0.6 C6 0.4 5 1.6 3 1.8 L-3 1.6 C-4.4 1.4 -5.2 0.8 -5 0Z", class: "gl2-baleine-corps" }),
          s("path", { d: "M-5 0 L-7.4 -1.6 L-6.6 0.2 L-7.4 1.8Z", class: "gl2-baleine-corps" }),
          s("circle", { cx: 3.4, cy: -0.6, r: 0.35, fill: "#12050d" }),
          s("g", { class: "gl2-jet", transform: "translate(1.4 -2.6)" }, s("path", { d: "M0 0 C-1 -1.6 -2 -2 -2.6 -1.6 M0 0 C0 -2 0 -2.6 0 -3 M0 0 C1 -1.6 2 -2 2.6 -1.6" }),
            anime("animate", { attributeName: "opacity", values: "0;0;1;0", keyTimes: "0;0.7;0.8;1", dur: "7s", begin: `${k * 2.5}s` })),
          anime("animateMotion", { path: d, dur: `${dur}s`, begin: `${debut}s`, rotate: "auto" }));
        mer.append(b);
      });
      // des dauphins qui sautent (trois, l'un après l'autre), près du milieu
      const dauphins = s("g", { class: "gl2-dauphins", transform: "translate(92 98)" });
      for (let k = 0; k < 3; k++) {
        dauphins.append(s("path", { d: "M-2 0 C-1 -1.4 1.2 -1.4 2.2 -0.2 L2.8 -0.4 L2.4 0.3 C1 0.6 -1 0.6 -2 0Z M0 -1 L0.4 -1.8 L0.9 -1Z", class: "gl2-dauphin" },
          anime("animateTransform", { attributeName: "transform", type: "translate", values: `${k * 5} 2;${k * 5 + 4} -4;${k * 5 + 8} 2;${k * 5 + 8} 2`, keyTimes: "0;0.18;0.36;1", dur: "5s", begin: `${k * 0.35}s` }),
          anime("animate", { attributeName: "opacity", values: "0;1;1;0;0", keyTimes: "0;0.05;0.33;0.38;1", dur: "5s", begin: `${k * 0.35}s` })));
      }
      mer.append(dauphins);
      // deux navires marchands qui font la navette entre les îles (des petites voiles crème)
      [["M20 70 C60 50 100 90 150 60 S215 70 220 90", 75], ["M215 40 C170 30 120 60 80 45 S30 60 18 90", 95]].forEach(([d, dur], k) => {
        mer.append(s("g", { class: "gl2-marchand" },
          s("path", { d: "M-2.6 0.4 L2.6 0.4 L1.8 1.6 L-1.8 1.6Z", class: "gl2-coque" }),
          s("path", { d: "M0 0.4 L0 -3.6 L2.2 -0.2Z", class: "gl2-voile" }), s("path", { d: "M-0.3 0 L-0.3 -2.8 L-2 -0.2Z", class: "gl2-voile" }),
          anime("animateMotion", { path: d, dur: `${dur}s`, begin: `${-k * 30}s` })));
      });
      // le serpent de mer, au bord de la carte : ses bosses sortent et replongent
      const serpent = s("g", { class: "gl2-serpent", transform: "translate(196 118)" });
      for (let k = 0; k < 4; k++) {
        serpent.append(s("path", { d: `M${k * 3.4 - 6} 0 a1.7 1.9 0 0 1 3.4 0`, class: "gl2-bosse" },
          anime("animate", { attributeName: "opacity", values: "0;1;1;0;0", keyTimes: "0;0.1;0.4;0.5;1", dur: "11s", begin: `${k * 0.4}s` })));
      }
      serpent.append(s("path", { d: "M7.6 0 c0 -2.4 1.6 -3.4 2.8 -2.6 c0.8 0.6 0.4 1.4 -0.4 1.4", class: "gl2-bosse" }, anime("animate", { attributeName: "opacity", values: "0;1;1;0;0", keyTimes: "0;0.1;0.4;0.5;1", dur: "11s", begin: "1.6s" })));
      mer.append(serpent);
      svg.append(mer, s("rect", { x: 14, y: 15, width: 208, height: 116, rx: 10, class: "gl2-bord" }));
      // au-dessus de la mer : la rose des vents, les mouettes, les nuages et leur ombre, le sceau
      const haut = s("g", { class: "gl2-vie", "aria-hidden": "true" });
      const r = s("g", { class: "gl2-rose", transform: `translate(${rose[0]} ${rose[1]})` },
        s("circle", { r: 7.4, class: "gl2-rose-cercle" }), s("circle", { r: 5.6, class: "gl2-rose-cercle" }),
        s("path", { d: "M0 -8 L1.3 -1.3 L8 0 L1.3 1.3 L0 8 L-1.3 1.3 L-8 0 L-1.3 -1.3Z", class: "gl2-rose-etoile" }),
        s("path", { d: "M0 -8 L1.3 -1.3 L0 0Z M8 0 L1.3 1.3 L0 0Z M0 8 L-1.3 1.3 L0 0Z M-8 0 L-1.3 -1.3 L0 0Z", class: "gl2-rose-ombre" }),
        s("text", { y: -9.4, class: "gl2-rose-n" }, "N"));
      haut.append(r);
      for (let k = 0; k < 4; k++) {
        haut.append(s("path", { d: "M-1.6 0 Q-0.8 -0.9 0 0 Q0.8 -0.9 1.6 0", class: "gl2-mouette" },
          anime("animateMotion", { path: `M${-10 - k * 6} ${30 + k * 9} C60 ${10 + k * 12} 160 ${50 + k * 6} 250 ${22 + k * 10}`, dur: `${34 + k * 7}s`, begin: `${-k * 9}s` }),
          anime("animateTransform", { attributeName: "transform", type: "scale", values: "1 1;1 0.4;1 1", dur: "0.9s", additive: "sum" })));
      }
      for (let k = 0; k < 2; k++) {
        const y = 32 + k * 52;
        const nuage = s("g", { class: "gl2-nuage" },
          s("ellipse", { cx: 3, cy: 9, rx: 13, ry: 3.4, class: "gl2-nuage-ombre" }),
          s("path", { d: "M-10 2 a4 4 0 0 1 5 -4 a6 6 0 0 1 11 0 a4 4 0 0 1 4 4 Z", class: "gl2-nuage-corps" }),
          anime("animateTransform", { attributeName: "transform", type: "translate", values: `-30 ${y};260 ${y}`, dur: `${70 + k * 30}s`, begin: `${-k * 40}s` }));
        haut.append(nuage);
      }
      haut.append(s("g", { class: "gl2-sceau", transform: "translate(208 27) rotate(-8)" }, s("rect", { x: -5, y: -5, width: 10, height: 10, rx: 1.4 }), s("text", { y: 2.8 }, "海")));
      svg.append(haut);
    }
    let signature = "";
    let visible2D = true;
    const io2D = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => {
      visible2D = e.isIntersecting && !document.hidden;
      const svg = zone.querySelector("svg");
      if (!svg) return;
      try { if (visible2D && !reduit.matches) svg.unpauseAnimations(); else svg.pauseAnimations(); } catch {}
      zone.classList.toggle("gl2-pause", !visible2D || reduit.matches);
    }) : null;
    io2D?.observe(zone);
    return {
      maj(g) {
        // la carte n'est redessinée que si quelque chose a changé (les images et les animations ne repartent pas à zéro)
        const sig = JSON.stringify([g.route?.map((e) => e.map((x) => [x.id, x.etat])), Math.round(g.milles || 0), g.longueur, Boolean(g.vote), g.flotte?.id, g.flotte?.autres?.map((o) => [o.id, o.etape, Math.round(o.milles || 0)]), v4Ouverte(), g.defi?.phase, g.defi?.gagnant, g.regne]);
        if (sig === signature && zone.querySelector("svg")) return;
        signature = sig;
        const pos = (id) => GL_PLACES[id] || [0, 0];
        // pendant un défi : deux sabres au-dessus des navires qui s'affrontent ; après : la couronne du vainqueur
        // (et la couronne de la commu qui règne : la Guerre des commus)
        const marque = (id, y) => (!id ? null : g.defi?.phase === "combat" && g.defi.commus?.includes(id) ? s("text", { y, class: "gl-svg-marque" }, "⚔️") : g.defi?.gagnant === id || g.regne === id ? s("text", { y, class: "gl-svg-marque" }, "👑") : null);
        const svg = s("svg", { viewBox: "0 0 236 146", class: "gl-svg", role: "img", "aria-label": `La carte de GRAND LINE : ${g.vote ? "le navire attend au carrefour" : g.cible ? `cap sur ${g.cible.nom}` : "en mer"}, ${pourcentGL(g)} % de l'étape` });
        svg.append(s("rect", { x: 14, y: 15, width: 208, height: 116, rx: 10, class: "gl-svg-mer" }));
        if (v4Ouverte()) vie2D(svg, g);
        const traits = s("g", { class: "gl-svg-route" });
        let navire = null;
        g.route.forEach((etape, k) => {
          if (!k) return;
          const avant = g.route[k - 1].find((x) => x.etat === "atteinte" || x.etat === "cible") ? [g.route[k - 1].find((x) => x.etat === "atteinte" || x.etat === "cible")] : g.route[k - 1].filter((x) => x.etat !== "ecartee");
          for (const a of avant) for (const b of etape.filter((x) => x.etat !== "ecartee")) {
            const [ax, az] = pos(a.id);
            const [bx, bz] = pos(b.id);
            const d = `M${X(ax)} ${Y(az)} Q${X((ax + bx) / 2 - (bz - az) * 0.15)} ${Y((az + bz) / 2 + (bx - ax) * 0.15)} ${X(bx)} ${Y(bz)}`;
            const fait = k <= g.etape;
            const courante = k === g.etape + 1;
            const chemin = s("path", { d, class: fait ? "fait" : courante ? "courante" : "loin" });
            traits.append(chemin);
            if (courante && (!g.vote || b === etape[0])) navire ||= { chemin, p: g.vote ? Math.min(0.5, g.milles / g.longueur) : g.milles / g.longueur };
          }
        });
        svg.append(traits);
        // la V4 : le voile de l'heure (l'aube, le crépuscule, la nuit : la classe est sur la scène), sous les îles, qui gardent leur lueur
        if (v4Ouverte()) svg.append(s("rect", { x: 0, y: 0, width: 236, height: 146, class: "gl2-heure", "aria-hidden": "true" }));
        for (const e of g.route.flat()) {
          const [x, z] = pos(e.id);
          const inconnue = e.etat === "inconnue" || e.etat === "ecartee";
          const vue = !inconnue && imageIle(e.id);
          svg.append(s("g", { class: `gl-svg-ile ${e.etat}${vue ? " en-image" : ""}`, transform: `translate(${X(x)} ${Y(z)})` },
            !inconnue && v4Ouverte() ? s("circle", { r: 15, class: "gl2-lueur" }) : null,
            vue ? s("ellipse", { rx: 10.5, ry: 6.2, cy: 1.4, class: "gl-svg-halo" }) : s("circle", { r: 6.5 }),
            vue ? s("image", { href: imageIle(e.id), x: -10, y: -9, width: 20, height: 16.7 }) : s("text", { y: 2.2, class: "gl-svg-emoji" }, inconnue ? "☁️" : e.emoji),
            inconnue ? null : s("text", { y: 11.5, class: "gl-svg-nom" }, e.nom.replace(/^(L'|Le |La |Les )/, "")),
          ));
        }
        vider(zone, svg);
        // la flotte (V4) : les autres navires, chacun sur l'étape en cours de sa route
        for (const o of g.flotte?.autres || []) {
          const k = (o.etape || 0) + 1;
          const de = o.route?.[k - 1]?.find((x) => x.etat === "atteinte" || x.etat === "cible") || o.route?.[k - 1]?.[0];
          const vers = o.route?.[k]?.filter((x) => x.etat !== "ecartee");
          if (!de || !vers?.length) continue;
          const [ax, az] = pos(de.id);
          const cible = vers.find((x) => x.etat === "cible") || vers[0];
          let [bx, bz] = pos(cible.id);
          if (o.vote && vers.length > 1) { bx = (ax + vers.reduce((m, x) => m + pos(x.id)[0], 0) / vers.length) / 2; bz = (az + vers.reduce((m, x) => m + pos(x.id)[1], 0) / vers.length) / 2; }
          const chemin = s("path", { d: `M${X(ax)} ${Y(az)} Q${X((ax + bx) / 2 - (bz - az) * 0.15)} ${Y((az + bz) / 2 + (bx - ax) * 0.15)} ${X(bx)} ${Y(bz)}`, fill: "none" });
          svg.append(chemin);
          const L = chemin.getTotalLength();
          const p = chemin.getPointAtLength(L * Math.min(1, (o.milles || 0) / Math.max(1, o.longueur || 1)));
          chemin.remove();
          const c1 = /^#[0-9a-f]{6}$/i.test(String(o.couleurs?.principale || "")) ? o.couleurs.principale : "#9b4dff";
          svg.append(s("g", { class: "gl-svg-flotte", transform: `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})` }, s("circle", { r: 4.2, fill: c1 }), s("text", { y: 1.6 }, "⛵"), marque(o.id, -5.2), s("title", {}, o.nom || "")));
        }
        if (navire) {
          const L = navire.chemin.getTotalLength();
          const p = navire.chemin.getPointAtLength(L * Math.min(1, navire.p));
          svg.append(s("g", { class: "gl-svg-navire", transform: `translate(${p.x} ${p.y})` }, s("text", { y: 2, text: "" }, "⛵"), marque(g.flotte?.id, -6.5)));
        }
        // un défi entre commus : l'annonce en haut de la carte (en 3D, les navires se font face dans l'arène)
        if (g.defi?.phase === "combat") svg.append(s("g", { class: "gl-svg-defi", transform: "translate(118 24.5)" }, s("rect", { x: -31, y: -5, width: 62, height: 8.6, rx: 4.3 }), s("text", { y: 1.4 }, "⚔️ Défi en cours")));
        // les animations de la carte vivante s'arrêtent avec les mouvements réduits, et quand la carte n'est pas à l'écran
        if (reduit.matches || !visible2D) try { svg.pauseAnimations(); } catch {}
        zone.classList.toggle("gl2-pause", reduit.matches || !visible2D);
      },
      taille() {},
      detruire() { io2D?.disconnect(); zone.classList.remove("gl2-pause"); vider(zone); },
    };
  }

  // l'entrée sur la partie (une fois par visite) : la carte se déplie, les panneaux arrivent, les chiffres comptent
  // la cinématique de départ (rendue dans Blender) : une fois par navigateur, la première fois qu'on arrive sur
  // GRAND LINE ouverte (pas avec les mouvements réduits ni en économie de données)
  // ---------- BOSS LIVE : un boss se réveille quand Liliano tape « !boss » en live (l'état vient du bot : /api/bosslive) ----------
  // MORGHAST, VORAXIA ou KRAKOR ; tous ceux qui sont sur le site (ou qui arrivent pendant le combat) ont l'alerte « LE BOSS EST LÀ !!! »
  const BL = { d: null, decal: 0, vu: false, rendu: null, charge: false, minuteur: 0, chrono: 0, son: null, coupe: false, pv: null, combat: 0, etat: "", occupe: false, boss: "", musique: 0, intro: null };
  const BL_NOMS = { morghast: "MORGHAST", voraxia: "VORAXIA", krakor: "KRAKOR" };
  try { BL.coupe = localStorage.getItem("barhaw-bl-son") === "non"; } catch {}
  const blFmt = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString("fr-FR");
  const blMaintenant = () => Date.now() + BL.decal;
  const BL_SOURCES = { chat: "💬 chat", frappe: "🗡️ !frappe", lurk: "📺 live", discord: "💜 Discord", site: "⚔️ site", jeux: "🎮 jeux" };
  // la musique de la victoire (une fois, quand la commu a battu le boss) : elle prend le relais de la musique du combat
  function blVictoire(jouer) {
    if (!jouer) { if (BL.victoire) { BL.victoire.pause(); BL.victoire.currentTime = 0; } return; }
    if (BL.coupe) return;
    if (!BL.victoire) { BL.victoire = new Audio("/musique/boss-victoire.mp3"); BL.victoire.volume = 0.55; BL.victoire.preload = "none"; }
    try { BL.victoire.currentTime = 0; } catch {}
    BL.victoire.play().catch(() => {});
  }
  function blSon(jouer, { debut = false, fondu = false, victoire = false } = {}) {
    if (!BL.son) { BL.son = new Audio("/musique/boss-live.mp3"); BL.son.loop = true; BL.son.volume = 0.5; BL.son.preload = "none"; BL.son.addEventListener("play", () => finMusiqueJeu(0.4)); }
    const b = $("bl-son");
    clearInterval(BL.fondu);
    if (jouer) blVictoire(false);
    if (fondu && !jouer && !BL.son.paused) {
      // la fin du combat : la musique baisse doucement, repart au début pour le prochain boss ; si la commu a gagné, la musique de la victoire suit
      BL.fondu = setInterval(() => {
        BL.son.volume = Math.max(0, BL.son.volume - 0.05);
        if (BL.son.volume <= 0.01) { clearInterval(BL.fondu); BL.son.pause(); BL.son.currentTime = 0; BL.son.volume = 0.5; if (victoire) blVictoire(true); }
      }, 150);
      if (b) { b.textContent = "🔇 Musique"; b.setAttribute("aria-pressed", "false"); }
      return;
    }
    if (fondu && victoire) blVictoire(true);
    BL.son.volume = 0.5;
    if (debut) { try { BL.son.currentTime = 0; } catch {} }
    if (jouer) {
      BL.son.play().then(() => { b?.classList.remove("bl-appel-son"); if (b) { b.textContent = "🔊 Musique"; b.setAttribute("aria-pressed", "true"); } })
        .catch(() => { b?.classList.add("bl-appel-son"); if (b) b.textContent = "🔊 Lancer la musique"; });
    } else {
      BL.son.pause();
      if (b) { b.textContent = "🔇 Musique"; b.setAttribute("aria-pressed", "false"); b.classList.remove("bl-appel-son"); }
    }
  }
  function blDegats(n, crit = false) {
    const z = $("bl-degats");
    if (!z || n <= 0 || reduit.matches) return;
    const s = el("span", { class: crit ? "bl-crit" : "", text: `${crit ? "💥 " : "−"}${blFmt(n)}` });
    s.style.left = `${30 + Math.random() * 40}%`;
    s.style.top = `${30 + Math.random() * 30}%`;
    z.append(s);
    setTimeout(() => s.remove(), 1200);
    if (z.childElementCount > 14) z.firstElementChild.remove();
  }
  function blIntro(c) {
    BL.intro?.remove();
    try { localStorage.setItem("barhaw-bl-intro", String(c.id)); } catch {}
    const id = BL_NOMS[c.boss] ? c.boss : "morghast";
    // en VF : il jaillit de la mer (une petite vidéo rendue dans Blender ; au niveau 5, le boss du niveau 5 : <id>-v5) ;
    // l'impact sonne quand il sort de l'eau
    const video = videosPermises() ? videoVF(`/videos/boss/${id}${niveau5() ? "-v5" : ""}`, "bl-intro-video") : null;
    const bande = "⚠ WARNING ⚠ BOSS LIVE ⚠ WARNING ⚠ BOSS LIVE ".repeat(6);
    const fermer = () => { if (!o.isConnected) return; o.classList.add("bl-intro-fin"); setTimeout(() => o.remove(), 500); };
    const go = el("button", { class: "bl-intro-go", type: "button", text: "⚔️ AU COMBAT !", onclick: () => {
      fermer();
      $("boss-live")?.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth" });
      BL.coupe = false;
      try { localStorage.setItem("barhaw-bl-son", "oui"); } catch {}
      blSon(true, { debut: BL.musique !== c.id });
      BL.musique = c.id;
    } });
    const o = el("div", { class: `bl-intro bl-intro-${id}`, role: "dialog", "aria-label": `Le boss est là : ${c.nom}` },
      el("div", { class: "bl-intro-flash" }),
      el("div", { class: "bl-intro-bande bl-intro-haut" }, el("span", { text: bande })),
      el("div", { class: "bl-intro-bande bl-intro-bas" }, el("span", { text: bande })),
      el("div", { class: "bl-intro-coeur" },
        el("div", { class: "bl-intro-visuel" }, el("img", { class: "bl-intro-boss", src: `/img/boss/${id}${niveau5() ? "-v5" : ""}.webp`, alt: "" }), video),
        el("p", { class: "bl-intro-cri", text: "LE BOSS EST LÀ !!!" }),
        el("h2", { class: "bl-intro-nom", text: c.nom }),
        el("p", { class: "bl-intro-titre", text: `${c.titre} · niveau ${c.niveau} · ${blFmt(c.pvMax)} PV` }),
        el("p", { class: "bl-intro-temps", text: "5 minutes pour le détruire, tous ensemble !" }),
        go),
      el("button", { class: "bl-intro-fermer", type: "button", "aria-label": "Fermer", text: "✕", onclick: fermer }));
    o.addEventListener("click", (ev) => { if (ev.target === o) fermer(); });
    document.body.append(o);
    BL.intro = o;
    let impact = setTimeout(() => { impact = 0; video?.remove(); jouerSon("impact"); }, video ? 900 : 150);
    video?.addEventListener("playing", () => {
      if (!impact) return;
      clearTimeout(impact);
      impact = 0;
      o.querySelector(".bl-intro-visuel")?.classList.add("video-prete");
      jouerSon("impact", { retard: 0.55 });
    }, { once: true });
    if (!reduit.matches) { document.body.classList.add("bl-tremble"); setTimeout(() => document.body.classList.remove("bl-tremble"), 900); }
    setTimeout(() => go.focus({ preventScroll: true }), 900);
    setTimeout(fermer, 12_000);
  }
  function blFin(c) {
    const scene = $("bl-scene");
    if (!scene) return;
    scene.querySelector(".bl-tampon")?.remove();
    const t = el("div", { class: `bl-tampon ${c.gagne ? "bl-gagne" : "bl-perdu"}` },
      el("p", { class: "bl-tampon-titre", text: c.gagne ? "🏆 VICTOIRE !" : "💨 IL S'ENFUIT…" }),
      el("p", { class: "bl-tampon-sous", text: c.gagne ? `${c.nom} est détruit ! Berrys et milles pour ${c.membres} membre${c.membres > 1 ? "s" : ""}.` : `${c.nom} reviendra… et plus fort.` }));
    scene.append(t);
    if (c.gagne && !reduit.matches) {
      const couleurs = ["#ff4f9a", "#ffd36b", "#9b4dff", "#3fd0c9", "#ffffff", "#ff8a3d"];
      for (let k = 0; k < 90; k++) {
        const f = el("i", { class: "bl-confetti" });
        f.style.left = `${Math.random() * 100}%`;
        f.style.background = couleurs[k % couleurs.length];
        f.style.animationDelay = `${Math.random() * 0.9}s`;
        f.style.animationDuration = `${2.2 + Math.random() * 1.8}s`;
        f.style.setProperty("--x", `${(Math.random() - 0.5) * 160}px`);
        t.append(f);
      }
    }
    setTimeout(() => t.classList.add("bl-tampon-fin"), 6500);
    setTimeout(() => t.remove(), 7200);
  }
  function blChrono() {
    const c = BL.d?.combat;
    const ch = $("bl-chrono");
    if (!ch) return;
    if (!BL.d?.actif || !c) { ch.textContent = c?.fini ? (c.gagne ? "🏆" : "💨") : "💤"; ch.classList.remove("bl-urgent"); return; }
    const reste = Math.max(0, c.fin - blMaintenant());
    ch.textContent = `${Math.floor(reste / 60000)}:${String(Math.floor((reste % 60000) / 1000)).padStart(2, "0")}`;
    ch.classList.toggle("bl-urgent", reste <= 30_000);
    const a = $("bl-alerte-texte");
    if (a) a.textContent = `${c.nom} attaque ! ${ch.textContent} · ${Math.round((c.pv / c.pvMax) * 100)} % de vie`;
  }
  function blRendre() {
    const d = BL.d;
    const scene = $("bl-scene");
    if (!scene || !d) return;
    const c = d.combat;
    const horsLigne = Boolean(d.horsLigne || d.absent);
    const actif = Boolean(d.actif && c);
    const recent = c?.fini && blMaintenant() - (c.finiLe || 0) < 3 * 60_000;
    const etat = actif ? (c.rage ? "rage" : "combat") : recent ? (c.gagne ? "mort" : "fuite") : "dort";
    // quel boss : celui du combat, sinon le prochain
    const boss = BL_NOMS[c?.boss] && (actif || recent) ? c.boss : BL_NOMS[d.prochain?.id] ? d.prochain.id : "morghast";
    if (boss !== BL.boss) {
      BL.boss = boss;
      $("bl-affiche").src = `/img/boss/${boss}${niveau5() ? "-v5" : ""}.webp`; // au niveau 5 : le boss du niveau 5
      if (BL.rendu && BL.rendu.boss !== boss) { BL.rendu.arreter(); BL.rendu = null; BL.charge = false; scene.classList.remove("bl-3d"); }
    }
    // un nouveau combat : l'alerte pour tout le monde (une fois par combat), le boss qui sort du cercle, la musique au début
    const nouveau = actif && c.id !== BL.combat;
    if (actif) {
      let dejaVu = false;
      try { dejaVu = localStorage.getItem("barhaw-bl-intro") === String(c.id); } catch {}
      if (!dejaVu) blIntro(c);
      if (nouveau) { BL.rendu?.apparition(); BL.pv = null; }
      if (BL.musique !== c.id && !BL.coupe) { blSon(true, { debut: true }); BL.musique = c.id; }
    }
    if ((BL.etat === "combat" || BL.etat === "rage") && (etat === "mort" || etat === "fuite")) { blFin(c); blSon(false, { fondu: true, victoire: c.gagne }); }
    scene.classList.toggle("bl-dort", etat === "dort");
    scene.classList.toggle("bl-rage", etat === "rage");
    if (BL.rendu && etat !== BL.etat) BL.rendu.etat(etat);
    // les coups depuis la dernière fois : les chiffres qui montent, la secousse
    if (c && c.id === BL.combat && BL.pv !== null && c.pv < BL.pv) {
      const perdu = BL.pv - c.pv;
      const morceaux = Math.min(4, Math.max(1, Math.round(perdu / 60)));
      for (let k = 0; k < morceaux; k++) setTimeout(() => blDegats(perdu / morceaux), k * 180);
      BL.rendu?.frappe(Math.min(2, 0.6 + perdu / 300));
      if (perdu >= 200 && !reduit.matches) { scene.classList.remove("bl-secoue"); void scene.offsetWidth; scene.classList.add("bl-secoue"); }
    }
    if (c) { BL.combat = c.id; BL.pv = c.pv; }
    BL.etat = etat;
    $("etat-boss").textContent = horsLigne ? "⚓ Au port" : actif ? (c.rage ? "🔥 EN RAGE" : "⚔️ EN COMBAT") : recent ? (c.gagne ? "🏆 Détruit" : "💨 Enfui") : "💤 Il dort";
    $("bl-nom").textContent = c && (actif || recent) ? c.nom : d.prochain?.nom || BL_NOMS[boss];
    $("bl-titre").textContent = c && (actif || recent) ? c.titre : d.prochain?.titre || "";
    $("bl-gl-titre").textContent = c ? `${c.nom} attaque le navire !` : "";
    $("bl-niveau").textContent = c ? `niv. ${c.niveau}` : d.niveau ? `niv. ${d.niveau + 1}` : "";
    const part = c && (actif || recent) ? Math.max(0, c.pv / c.pvMax) : 1;
    $("bl-barre").style.width = `${part * 100}%`;
    $("bl-trainee").style.width = `${part * 100}%`;
    $("bl-vie").setAttribute("aria-valuenow", String(Math.round(part * 100)));
    $("bl-pv").textContent = c && (actif || recent) ? `${blFmt(c.pv)} / ${blFmt(c.pvMax)} PV` : "??? PV";
    const dernier = d.historique?.[0];
    $("bl-etat").textContent = horsLigne
      ? "⚓ Le bateau fait une pause au port pour prendre des provisions, il revient vite."
      : actif ? ""
      : recent ? (c.gagne ? `🏆 ${c.nom} est détruit ! ${c.membres} membre${c.membres > 1 ? "s" : ""} ont frappé.` : `💨 ${c.nom} s'est enfui avec ${blFmt(c.pv)} PV… il reviendra plus fort.`)
      : `💤 ${d.prochain?.nom || BL_NOMS[boss]} dort. Il se réveille quand Liliano tape !boss en live.${dernier ? ` La dernière fois : ${dernier.nom || "le boss"} ${dernier.gagne ? "détruit 🏆" : "s'est enfui 💨"}` : ""}`;
    const bouton = $("bl-frapper");
    bouton.disabled = !actif;
    bouton.textContent = actif ? "⚔️ FRAPPER" : "⚔️ FRAPPER (pendant le combat)";
    // le podium, les sources, le journal
    const top = c && (actif || recent) ? c.top : dernier?.top || [];
    vider($("bl-top"), ...(top.length ? top.map((f, k) => el("li", {},
      el("span", { class: "bl-rang", text: ["🥇", "🥈", "🥉"][k] || String(k + 1) }),
      f.avatar ? el("img", { src: f.avatar, alt: "", width: 30, height: 30, loading: "lazy" }) : el("span"),
      el("span", { text: f.nom }), el("span", { class: "bl-dgt", text: blFmt(f.degats) }))) : [el("li", { class: "bl-vide", text: "Personne pour l'instant." })]));
    $("bl-sources").textContent = c && (actif || recent) ? Object.entries(c.sources || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${BL_SOURCES[k] || k} ${blFmt(v)}`).join(" · ") : "";
    const j = c && (actif || recent) ? c.journal : [];
    vider($("bl-journal"), ...(j.length ? j.map((x) => el("li", { text: x.texte })) : [el("li", { class: "bl-vide", text: horsLigne ? "⚓ Le bateau fait une pause au port." : "Le boss dort." })]));
    // la V4 : le BOSS LIVE VS (deux commus, le même boss)
    const regleVs = $("bl-regle-vs");
    if (regleVs) regleVs.hidden = !v4Ouverte();
    blVs(c, actif, recent);
    // partout sur le site : la pastille du menu, l'alerte en bas, le bandeau sur GRAND LINE
    $("pastille-boss").hidden = !actif;
    $("bl-gl").hidden = !actif;
    $("bl-alerte").hidden = !actif || BL.vu;
    blChrono();
    clearInterval(BL.chrono);
    if (actif) BL.chrono = setInterval(blChrono, 250);
    if ((actif || BL.vu) && !BL.charge) blCharger3D();
  }
  // ---------- le BOSS LIVE VS : le bandeau des deux commus ; à la fin, 10 s de suspense puis les jauges ----------
  function blVs(c, actif, recent) {
    const scene = $("bl-scene");
    const vs = c?.vs && (actif || recent) ? c.vs : null;
    scene.classList.toggle("bl-en-vs", Boolean(vs));
    let bandeau = $("bl-vs");
    if (!vs) { bandeau?.remove(); $("bl-vs-fin")?.remove(); clearInterval(BL.vsMinuteur); BL.vsVu = ""; return; }
    const [a, z] = vs.equipes;
    const cle = `${c.id}`;
    if (!bandeau || bandeau.dataset.cle !== cle) {
      bandeau?.remove();
      bandeau = el("div", { class: "bl-vs", id: "bl-vs", "data-cle": cle, "aria-label": `${a.nom} contre ${z.nom}` },
        el("span", { class: "bl-vs-equipe", style: styleCommu(a) }, drapeauCommu(a, "bl-vs-drapeau"), el("b", { text: a.nom })),
        el("span", { class: "bl-vs-x", "aria-hidden": "true", text: "VS" }),
        el("span", { class: "bl-vs-equipe", style: styleCommu(z) }, drapeauCommu(z, "bl-vs-drapeau"), el("b", { text: z.nom })),
        el("span", { class: "kanji bl-vs-kanji", "aria-hidden": "true", text: "対決" }));
      scene.append(bandeau);
    }
    if (!c.fini) { $("bl-vs-fin")?.remove(); return; }
    // la fin : le décompte (10 → 1), puis les jauges dès que le résultat arrive
    let fin = $("bl-vs-fin");
    if (!fin || fin.dataset.cle !== cle) {
      fin?.remove();
      fin = el("div", { class: "bl-vs-fin", id: "bl-vs-fin", "data-cle": cle, role: "status", "aria-live": "polite" });
      scene.append(fin);
    }
    const majVs = () => {
      const reste = Math.ceil((vs.revele - blMaintenant()) / 1000);
      const res = BL.d?.combat?.id === c.id ? BL.d.combat.vs?.resultat : null;
      if (res && reste <= 0) {
        clearInterval(BL.vsMinuteur);
        if (fin.dataset.etat === "jauges") return;
        fin.dataset.etat = "jauges";
        const max = Math.max(...res.map((e) => e.part));
        const egalite = res.length > 1 && Math.round(res[0].part * 100) === Math.round(res[1].part * 100);
        vider(fin,
          el("p", { class: "bl-vs-question", text: egalite ? "ÉGALITÉ PARFAITE !" : "QUI A FRAPPÉ LE PLUS FORT ?" }),
          el("span", { class: "sfx bl-vs-sfx", "aria-hidden": "true", text: "ドン！" }),
          ...res.map((e, k) => el("div", { class: `bl-jauge${!egalite && e.part === max ? " bl-jauge-gagne" : ""}`, style: `${styleCommu(e)};--p:${Math.round(e.part * 1000) / 10}%;--retard:${k * 0.45}s` },
            el("p", { class: "bl-jauge-nom" }, drapeauCommu(e, "bl-vs-drapeau"), el("b", { text: e.nom }), !egalite && e.part === max ? el("span", { class: "bl-jauge-couronne", "aria-hidden": "true", text: "👑" }) : null),
            el("div", { class: "bl-jauge-barre" }, el("i")),
            el("p", { class: "bl-jauge-chiffres", text: `${Math.round(e.part * 100)} % · ${blFmt(e.degats)} dégâts${e.membres ? ` · ${pluriel(e.membres, "membre")}` : ""}` }))),
          el("p", { class: "bl-vs-milles", text: "Les milles sont partis au navire de chaque commu sur GRAND LINE." }));
        return;
      }
      if (fin.dataset.etat === "jauges") return;
      fin.dataset.etat = "decompte";
      const n = Math.max(0, reste);
      if (fin.dataset.n === String(n) && fin.firstChild) return;
      fin.dataset.n = String(n);
      vider(fin,
        el("p", { class: "bl-vs-question", text: "QUI A FRAPPÉ LE PLUS FORT ?" }),
        el("p", { class: `bl-vs-decompte${n <= 3 ? " bl-vs-chaud" : ""}`, text: n > 0 ? String(n) : "…" }),
        el("p", { class: "bl-vs-sous", text: `${c.gagne ? `🏆 ${c.nom} est détruit !` : `💨 ${c.nom} s'est enfui…`} ${a.nom} ou ${z.nom} ?` }));
    };
    majVs();
    clearInterval(BL.vsMinuteur);
    if (fin.dataset.etat !== "jauges") BL.vsMinuteur = setInterval(majVs, 200);
  }
  async function blCharger3D() {
    if (BL.charge) return;
    BL.charge = true;
    const toile = $("bl-toile");
    try {
      const { creerBoss3D } = await import("/js/boss-3d.js");
      BL.rendu = creerBoss3D(toile, { boss: BL.boss || "morghast", niveau5: niveau5() }); // la VF 1.0 : les boss du niveau 5
      toile.addEventListener("boss-pret", () => $("bl-scene").classList.add("bl-3d"), { once: true });
      if (BL.etat) BL.rendu.etat(BL.etat);
      const c = BL.d?.combat;
      if (BL.d?.actif && c && blMaintenant() - c.debut < 12_000) BL.rendu.apparition();
      BL.rendu.pause(!BL.vu);
    } catch {
      BL.rendu = null; // pas de WebGL : l'image rendue dans Blender reste
    }
  }
  async function blCharger() {
    clearTimeout(BL.minuteur);
    let d;
    try {
      const r = await fetch("/api/bosslive", { headers: { Accept: "application/json" } });
      d = await r.json();
      if (d.maintenant) BL.decal = d.maintenant - Date.now();
    } catch { d = { horsLigne: true }; }
    BL.d = d;
    blRendre();
    const vs = d.combat?.vs;
    const suspense = Boolean(vs && d.combat.fini && !vs.resultat && blMaintenant() < (vs.revele || 0) + 30_000);
    const ms = document.hidden ? 30_000 : suspense ? 1000 : d.actif ? 2500 : BL.vu ? 12_000 : 40_000;
    BL.minuteur = setTimeout(blCharger, ms);
  }
  async function blFrapper() {
    if (!BL.d?.actif || BL.occupe) return;
    if (!moi?.connecte) { $("bl-etat").textContent = `Connecte-toi avec Discord (en haut à droite) pour frapper ${BL.d?.combat?.nom || "le boss"} !`; return; }
    BL.occupe = true;
    BL.rendu?.frappe(0.8);
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "boss-live-frapper" }) });
      const d = await r.json().catch(() => ({}));
      if (d.boss) {
        if (d.degats) { BL.pv = d.boss.combat?.pv ?? BL.pv; blDegats(d.degats, d.critique); BL.rendu?.frappe(d.critique ? 2 : 1); }
        BL.d = d.boss;
        blRendre();
      }
      if (d.erreur && d.texte) $("bl-etat").textContent = d.texte;
    } catch {
      $("bl-etat").textContent = "Le coup n'est pas parti, réessaie.";
    }
    setTimeout(() => { BL.occupe = false; }, 450);
  }
  function blDemarrer() {
    const s = $("boss-live");
    if (!s) return;
    $("bl-frapper").addEventListener("click", blFrapper);
    $("bl-son").addEventListener("click", () => {
      const joue = Boolean((BL.son && !BL.son.paused) || (BL.victoire && !BL.victoire.paused));
      BL.coupe = joue;
      if (joue) blVictoire(false);
      try { localStorage.setItem("barhaw-bl-son", joue ? "non" : "oui"); } catch {}
      blSon(!joue);
      if (!joue && BL.d?.combat) BL.musique = BL.d.combat.id;
    });
    new IntersectionObserver(([e]) => {
      BL.vu = e.isIntersecting;
      BL.rendu?.pause(!BL.vu || document.hidden);
      if (BL.vu && !BL.charge) blCharger3D();
      $("bl-alerte").hidden = !BL.d?.actif || BL.vu;
      if (BL.vu && !BL.d?.actif) blCharger();
    }, { threshold: 0.12 }).observe(s);
    document.addEventListener("visibilitychange", () => { BL.rendu?.pause(!BL.vu || document.hidden); if (!document.hidden) blCharger(); });
    blCharger();
  }
  blDemarrer();

  // le générique de GRAND LINE (VF 1.0) : 45 s, à la première entrée dans GRAND LINE (une fois), puis à la demande
  // (« ▶ Le générique ») ; la vidéo en 720p, ou en 480p sur un petit écran ; le son si les sons du site sont allumés
  // (ou si on l'a demandé), sinon muet avec un bouton pour l'allumer (un navigateur refuse le son sans un clic)
  function generiqueGL(demande = false) {
    if (document.querySelector(".cine")) return;
    if (!demande) {
      if (reduit.matches || navigator.connection?.saveData) return;
      try { if (localStorage.getItem("barhaw-generique-vf") === "vu") return; localStorage.setItem("barhaw-generique-vf", "vu"); } catch { return; }
    }
    const t = Math.min(innerWidth, screen?.width || innerWidth) < 700 ? "480" : "720";
    const v = el("video", { class: "gen-video", poster: "/videos/generique-gl.jpg", playsinline: "", preload: "auto", width: 1280, height: 720 },
      el("source", { src: `/videos/generique-gl-${t}.webm`, type: "video/webm" }),
      el("source", { src: `/videos/generique-gl-${t}.mp4`, type: "video/mp4" }));
    const son = el("button", { class: "gen-son", type: "button", "aria-pressed": "false" });
    const retour = document.activeElement;
    let fini = false;
    // pendant que le générique passe avec le son, la musique du site et la mer de la carte se font toutes petites
    let baisse = null;
    const baisser = (oui) => {
      if (oui && !baisse) {
        baisse = { musique: SON.musiqueSite ? SON.musiqueSite.volume : null, maitre: SON.maitre ? SON.maitre.gain.value : null };
        if (baisse.musique !== null) SON.musiqueSite.volume = baisse.musique * 0.1;
        if (baisse.maitre !== null) SON.maitre.gain.value = baisse.maitre * 0.15;
      } else if (!oui && baisse) {
        if (baisse.musique !== null && SON.musiqueSite) SON.musiqueSite.volume = baisse.musique;
        if (baisse.maitre !== null && SON.maitre) SON.maitre.gain.value = baisse.maitre;
        baisse = null;
      }
    };
    const reglerSons = () => baisser(!fini && !v.muted && !v.paused);
    // Échap ferme le générique (et seulement lui) ; Tab reste sur ses deux boutons
    const touche = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); fermer(); }
      else if (e.key === "Tab") { e.preventDefault(); (document.activeElement === passer ? son : passer).focus(); }
    };
    const fermer = () => {
      if (fini) return;
      fini = true;
      v.pause();
      baisser(false);
      window.removeEventListener("keydown", touche, true);
      o.classList.add("cine-fin");
      setTimeout(() => o.remove(), 600);
      if (retour?.isConnected) retour.focus?.({ preventScroll: true });
    };
    const passer = el("button", { class: "gen-passer", type: "button", onclick: fermer, text: "Passer ✕" });
    const o = el("div", { class: "cine gen", role: "dialog", "aria-modal": "true", "aria-label": "Le générique de GRAND LINE" },
      el("div", { class: "gen-cadre" }, v), el("div", { class: "gen-boutons" }, son, passer));
    const avecSon = (oui) => {
      v.muted = !oui;
      son.setAttribute("aria-pressed", String(oui));
      son.textContent = oui ? "🔇 Sans le son" : "🔊 Avec le son";
    };
    son.addEventListener("click", () => { avecSon(v.muted); v.play?.()?.catch?.(() => {}); });
    for (const ev of ["play", "pause", "volumechange"]) v.addEventListener(ev, reglerSons);
    v.addEventListener("ended", () => setTimeout(fermer, 500));
    v.querySelector("source:last-child").addEventListener("error", fermer); // aucune des deux vidéos ne passe
    o.addEventListener("click", (ev) => { if (ev.target === o) fermer(); });
    window.addEventListener("keydown", touche, true);
    (document.fullscreenElement || document.body).append(o);
    passer.focus({ preventScroll: true });
    avecSon(demande || sonActif());
    v.play?.()?.catch?.(() => { avecSon(false); v.play?.()?.catch?.(() => fermer()); });
    setTimeout(() => { if (!fini && v.paused && v.currentTime === 0) fermer(); }, 9000); // rien ne démarre : on ne bloque pas la page
  }
  function cinematiqueGL() {
    if (v4Ouverte()) return generiqueGL();
    if (reduit.matches || navigator.connection?.saveData) return;
    try { if (localStorage.getItem("barhaw-cine-gl2") === "vu") return; localStorage.setItem("barhaw-cine-gl2", "vu"); } catch { return; }
    const v = el("video", { class: "cine-video", poster: "/videos/grandline-depart.jpg", playsinline: "", autoplay: "", preload: "auto", width: 960, height: 540 },
      el("source", { src: "/videos/grandline-depart.webm", type: "video/webm" }),
      el("source", { src: "/videos/grandline-depart.mp4", type: "video/mp4" }));
    v.muted = true;
    let fini = false;
    const fermer = () => { if (fini) return; fini = true; o.classList.add("cine-fin"); setTimeout(() => o.remove(), 600); };
    const o = el("div", { class: "cine", role: "dialog", "aria-label": "Le navire de la commu quitte Port Barhaw" },
      el("div", { class: "cine-cadre" }, v, el("p", { class: "cine-titre", text: "⚓ Le voyage commence !" })),
      el("button", { class: "cine-passer", type: "button", onclick: fermer, text: "Passer ✕" }));
    v.addEventListener("ended", () => setTimeout(fermer, 700));
    v.querySelector("source:last-child").addEventListener("error", fermer); // aucune des deux vidéos ne passe
    o.addEventListener("click", (ev) => { if (ev.target === o) fermer(); });
    document.body.append(o);
    v.play?.()?.catch?.(() => fermer());
    setTimeout(fermer, 10_000);
  }
  // l'entrée aussi quand le haut de la partie passe le milieu de l'écran : sur un téléphone, GRAND LINE est si haute
  // que 12 % d'elle ne tiennent pas toujours dans l'écran (et le générique ne partait pas)
  function guetterEntreeGL(s) {
    if (!("IntersectionObserver" in window)) return;
    new IntersectionObserver((entrees, io) => {
      for (const e of entrees) if (e.isIntersecting && !s.dataset.entree) { entreeGL(s); io.disconnect(); }
    }, { rootMargin: "0px 0px -50% 0px" }).observe(s);
  }
  // la VF vient de s'ouvrir sous nos yeux (le 22/12 à 21 h 30, sans recharger) : si on regarde GRAND LINE, le générique
  // part tout de suite ; si on y est déjà passé, il partira à la prochaine entrée dans GRAND LINE
  function vfEnDirect() {
    const s = $("grandline");
    if (!s?.dataset.entree) return; // pas encore entré : l'entrée normale s'en chargera
    const r = s.getBoundingClientRect();
    if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.3) {
      let essais = 0; // une autre vidéo à l'écran (l'ancienne cinématique) : on attend qu'elle se ferme
      const lancer = () => (document.querySelector(".cine") && ++essais < 15 ? setTimeout(lancer, 1000) : generiqueGL());
      setTimeout(lancer, 1200);
      return;
    }
    delete s.dataset.entree;
    guetterEntreeGL(s);
  }
  function entreeGL(s) {
    s.dataset.entree = "1";
    if (reduit.matches) return;
    if (glOuvert()) cinematiqueGL();
    s.classList.add("gl-entree");
    setTimeout(() => s.classList.remove("gl-entree"), 3200);
    s.querySelectorAll("[data-compte]").forEach((b, k) => compterGL(b, 260 + k * 120));
  }
  function compterGL(b, delai = 0) {
    const fin = Number(b.dataset.compte) || 0;
    const suffixe = b.dataset.suffixe || "";
    if (fin <= 0) return;
    const debut = performance.now() + delai;
    const pas = (t) => {
      if (!b.isConnected || b.dataset.compte !== String(fin)) return;
      const k = Math.min(1, Math.max(0, (t - debut) / 1300));
      b.textContent = `${nombre(Math.round(fin * (1 - Math.pow(1 - k, 3))))}${suffixe}`;
      if (k < 1) requestAnimationFrame(pas);
    };
    b.textContent = `0${suffixe}`;
    requestAnimationFrame(pas);
  }
  function confettisGL() {
    if (reduit.matches) return;
    const z = $("grandline-mer");
    if (!z) return;
    const pluie = el("span", { class: "gl-confettis", "aria-hidden": "true" }, Array.from({ length: 22 }, (_, k) => el("i", { style: `--x:${Math.round((Math.random() - 0.5) * 260)}px;--y:${Math.round(-60 - Math.random() * 140)}px;--r:${Math.round(Math.random() * 720 - 360)}deg;--c:${["#ff4f9a", "#ffd36b", "#9b4dff", "#5fd0d8", "#fff"][k % 5]};animation-delay:${(Math.random() * 0.12).toFixed(2)}s` })));
    z.append(pluie);
    setTimeout(() => pluie.remove(), 1600);
  }

  function suivreGrandLine() {
    rendreRamerGL();
    const s = $("grandline");
    if (!s) return;
    $("gl-generique")?.addEventListener("click", () => generiqueGL(true));
    window.addEventListener("resize", () => tailleCarteGL());
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entrees) => {
        for (const e of entrees) {
          glVue = e.isIntersecting;
          if (glVue && !carteGL && glOuvert()) preparerCarteGL();
          if (carteGL?.type === "3d") { if (glVue && !document.hidden) carteGL.rendu.demarrer(); else carteGL.rendu.arreter(); }
        }
      }, { rootMargin: "300px 0px" }).observe(s);
      new IntersectionObserver((entrees) => {
        for (const e of entrees) {
          s.classList.toggle("gl-hors", !e.isIntersecting);
          if (e.isIntersecting && e.intersectionRatio > 0.12 && !s.dataset.entree) entreeGL(s);
        }
      }, { threshold: [0, 0.12, 0.3] }).observe(s);
      guetterEntreeGL(s);
    } else { glVue = true; if (glOuvert()) preparerCarteGL(); }
    document.addEventListener("visibilitychange", () => {
      if (carteGL?.type !== "3d") return;
      if (!document.hidden && glVue) carteGL.rendu.demarrer(); else carteGL.rendu.arreter();
    });
    // pendant un vote ou un événement en mer, la page se met à jour plus souvent quand la carte est à l'écran
    setInterval(() => {
      const g = infosGL();
      if (glVue && !document.hidden && (g?.vote || g?.evenement)) charger();
    }, 30_000);
  }

  // ---------- chargement ----------
  let vfRendue = null; // la VF au rendu d'avant (null : premier rendu)
  // ---------- LES CRÉATURES DE GRAND LINE : la créature sauvage du Discord, le Bestiaire, la fiche ----------
  // Des créatures marines inventées surgissent sur le Discord quand ça discute (le bot compte les messages, il ne les lit pas).
  // Chaque membre lance un filet par créature, sur Discord ou ici : trois secousses, puis elle est attrapée… ou elle s'échappe
  // (« 1 filet sur 2 » pour une commune, « 1 sur 8 » pour une épique). Le bot dit quelle créature est sur le Discord
  // (donnees.creatures.sauvage) et ce que le membre a attrapé (action « creatures ») ; ce qu'est chaque créature (nom, type,
  // texte, statistiques) et son dessin en 3D sont dans js/creatures-3d.js, chargé à l'approche de la partie.
  // Actions du bot : « creatures » (le Bestiaire), « creatures-filet » { apparition }, « creatures-evoluer » { espece }.
  const SONS_CREATURES = ["clic", "br-tic", "victoire", "quiz-faux", "br-paillettes", "br-monte", "br-onde", "br-boum", "br-roulement", "br-cymbale", "br-fanfare", "br-acclame", "br-feux",
    "cr-plouf", "cr-bulles", "cr-filet", "cr-mignon", "cr-envol", "cr-nacree", "cr-baleine", "cr-pieces", "cr-feu", "cr-cristal"];
  // le bruitage propre à certaines espèces, quand elles arrivent : [son, volume, retard]
  const CR_SON_ESPECE = { celeste: ["cr-baleine", 0.9, 0.15], doublon: ["cr-pieces", 0.85, 0.2], braisilotl: ["cr-feu", 0.9, 0.1], narvelin: ["cr-cristal", 0.85, 0.2] };
  const cr = {
    mod: null, charge: false, vueSauvage: null, vueFiche: null, vueFicheNacree: false, atelier: null, ui: null, // la 3D
    moi: null, demande: 0, occupe: false, message: null, // le Bestiaire du membre, ce que dit le bot
    fiche: "piquebulle", nacree: false, sauvageVue: "", tampon: "", tamponRang: 0, discord: [], sig: "", sigSauvage: "", banniere: null,
  };
  const crInfos = () => (donnees?.creatures && typeof donnees.creatures === "object" ? donnees.creatures : null);
  const crNum = (n) => `#${String(n).padStart(3, "0")}`;
  const crReste = (fin) => {
    const s = Math.max(0, Math.round((ms(fin) - Date.now()) / 1000));
    return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}` : `${s} s`;
  };
  const crPossede = (id) => cr.moi?.attrapees?.[id] || null;
  const crPuce = (texte, couleur, classe = "") => el("span", { class: `cr-puce ${classe}`, style: `--c:${couleur}`, text: texte });
  // la rareté (commune → or) : son rang de 0 à 5 ; l'annonce quand elle surgit ; son émoji et son mot sur le Discord
  const crRarete = (e) => (cr.mod && e ? cr.mod.RARETES[e.rarete] || cr.mod.RARETES.commune : null);
  const CR_ANNONCE = ["", "PEU COMMUNE", "RARE\u00a0!", "ÉPIQUE\u00a0!", "LÉGENDAIRE\u00a0!", "EN OR\u00a0!"];
  const CR_EMOJI = ["🌊", "🌊", "💎", "⚡", "🔥", "👑"];
  const CR_MOT = ["sauvage", "peu commune", "RARE", "ÉPIQUE", "LÉGENDAIRE", "EN OR"];
  const crPuceRarete = (R) => crPuce(R.nom, R.couleur, `rarete r${R.rang}`);
  const crRgba = (hex, a) => { const n = Number.parseInt(String(hex).slice(1), 16); return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
  // la créature sur le Discord, si elle y est encore (et si on sait la dessiner)
  const crSauvage = (s) => (s?.sauvage && cr.mod?.ESPECES?.[s.sauvage.espece] && ms(s.sauvage.fin) > Date.now() ? s.sauvage : null);
  async function chargerCreatures3D() {
    if (cr.charge) return;
    cr.charge = true;
    try {
      cr.mod = await import("/js/creatures-3d.js");
      cr.atelier = cr.mod.creerAtelier();
      prechargerSons(SONS_CREATURES);
      cr.sig = cr.sigSauvage = "";
      rendreCreatures();
    } catch { cr.charge = false; /* sans 3D : la partie dit ce qu'elle peut, en texte */ }
  }
  // (differer : la réponse est gardée pour après l'animation, pour ne rien dévoiler avant la fin du filet ou de l'évolution)
  async function agirCreatures(action, extra = {}, { differer = false } = {}) {
    let d = {};
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
    } catch { d = { erreur: "reseau", texte: "Impossible de joindre le bot. Vérifie ta connexion." }; }
    if (!differer || d.erreur) appliquerCreatures(d);
    return d;
  }
  function appliquerCreatures(d) {
    if (d.creatures) cr.moi = d.creatures;
    if (d.public) donnees.creatures = d.public; // ce qui a changé pour tout le monde (une créature attrapée, la suivante)
  }

  // ---------- la structure de la partie (faite une fois : les toiles 3D restent en place) ----------
  function construireCreatures(z) {
    const ui = {};
    ui.toile = el("canvas", { class: "cr-toile", "aria-label": "La créature sauvage, sur l'eau" });
    ui.tampon = el("div", { class: "cr-tampon", "aria-hidden": "true" });
    ui.banniere = el("div", { class: "cr-banniere", "aria-hidden": "true" });
    ui.nom = el("div", { class: "cr-sauvage-nom" });
    ui.puces = el("div", { class: "cr-puces" });
    ui.chrono = el("span", { class: "cr-chrono" });
    ui.enVue = el("span", { class: "cr-en-vue" });
    ui.action = el("div", { class: "cr-action" });
    ui.texte = el("p", { class: "cr-sauvage-texte", role: "status" });
    const sauvage = el("div", { class: "cr-sauvage carte" },
      el("div", { class: "cr-scene" }, ui.toile, ui.banniere, ui.tampon,
        ui.enVue, ui.chrono),
      el("div", { class: "cr-sauvage-bas" }, el("div", { class: "cr-sauvage-titre" }, ui.nom, ui.puces), ui.texte, ui.action));
    ui.carte = sauvage;
    // la maquette du Discord : le message du bot, son bouton, et la suite (qui l'a attrapée)
    ui.dImage = el("canvas", { class: "cr-d-image", width: 640, height: 360, "aria-hidden": "true" });
    ui.dTitre = el("div", { class: "cr-d-titre" });
    ui.dTexte = el("div", { class: "cr-d-texte" });
    ui.dChamps = el("div", { class: "cr-d-champs" });
    ui.dReste = el("span", {});
    ui.dPied = el("div", { class: "cr-d-pied" });
    ui.dBouton = el("button", { class: "cr-d-bouton", type: "button", onclick: () => lancerFiletCreature("discord") }, "🪢 Lancer le filet");
    ui.dSuite = el("div", { class: "cr-d-suite" });
    ui.dEmbed = el("div", { class: "cr-d-embed" }, ui.dTitre, ui.dTexte, ui.dChamps, ui.dImage, ui.dPied);
    const discord = el("div", { class: "cr-discord" },
      el("div", { class: "cr-d-salon" }, el("span", { class: "cr-d-diese", text: "#" }), "général", el("span", { class: "cr-d-etiquette", text: "Aperçu du Discord" })),
      el("div", { class: "cr-d-message" }, el("img", { class: "cr-d-avatar", src: "/img/favicon-32.png", alt: "", width: 40, height: 40 }),
        el("div", { class: "cr-d-corps" },
          el("div", { class: "cr-d-auteur" }, el("b", { text: "BarhawBot" }), el("span", { class: "cr-d-app", text: "APP" }), el("time", { text: `Aujourd'hui à ${fmtHeure.format(new Date())}` })),
          ui.dEmbed,
          el("div", { class: "cr-d-boutons" }, ui.dBouton, el("a", { class: "cr-d-bouton gris", href: "#creatures-bestiaire" }, "📖 Mon Bestiaire")))),
      ui.dSuite);
    const rencontre = el("div", { class: "cr-rencontre" },
      el("div", { class: "cr-cote" }, el("p", { class: "cr-legende", text: "Sur le site" }), sauvage),
      el("div", { class: "cr-cote" }, el("p", { class: "cr-legende", text: "Sur le Discord" }), discord));
    // le Bestiaire
    ui.compte = el("span", { class: "cr-compte" });
    ui.grille = el("ol", { class: "cr-grille", "aria-label": "Le Bestiaire" });
    ui.raretes = el("div", { class: "cr-raretes", "aria-label": "Les raretés, de la plus courante à la plus rare" });
    ui.connexion = el("div", { class: "cr-connexion" });
    const bestiaire = el("div", { class: "cr-bestiaire", id: "creatures-bestiaire" },
      el("div", { class: "cr-bloc-tete" }, el("h3", { class: "cr-h3" }, "Mon Bestiaire ", ui.compte), ui.connexion),
      ui.raretes, ui.grille);
    // la fiche
    ui.fToile = el("canvas", { class: "cr-toile cr-fiche-toile", "aria-label": "La créature en 3D : fais-la tourner" });
    ui.fNacree = el("button", { class: "cr-nacree", type: "button", "aria-pressed": "false", onclick: () => basculerNacree() }, "✨ Voir la nacrée");
    ui.fNum = el("span", { class: "cr-f-num" });
    ui.fNom = el("h3", { class: "cr-f-nom" });
    ui.fPuces = el("div", { class: "cr-puces" });
    ui.fIle = el("p", { class: "cr-f-ile" });
    ui.fTexte = el("p", { class: "cr-f-texte" });
    ui.fStats = el("div", { class: "cr-stats" });
    ui.fLigne = el("div", { class: "cr-ligne", "aria-label": "Son évolution" });
    ui.fAction = el("div", { class: "cr-f-action" });
    ui.fiche = el("div", { class: "cr-fiche carte", id: "creatures-fiche" },
      el("div", { class: "cr-f-vue" }, ui.fToile, el("span", { class: "cr-f-aide", text: "↻ Fais-la tourner" }), ui.fNacree),
      el("div", { class: "cr-f-infos" }, el("div", { class: "cr-f-tete" }, ui.fNum, ui.fNom), ui.fPuces, ui.fIle, ui.fTexte, ui.fStats,
        el("p", { class: "cr-f-sous", text: "Son évolution" }), ui.fLigne, ui.fAction));
    const bientot = el("p", { class: "cr-bientot" }, el("b", { text: "Et ensuite : " }),
      "les combats entre membres (/defi sur le Discord), les créatures légendaires qui surgissent pendant le live (!filet dans le chat Twitch) et les échanges.");
    vider(z, rencontre, bestiaire, ui.fiche, bientot);
    cr.ui = ui;
    // le temps qui reste à la créature sauvage (sans refaire la carte)
    setInterval(() => { if (!$("creatures")?.hidden && !document.hidden) majChrono(); }, 1000);
  }

  function rendreCreatures() {
    const section = $("creatures"), z = $("creatures-zone");
    const s = crInfos();
    if (!section || !z) return;
    section.hidden = !s || !document.documentElement.classList.contains("v4");
    const lien = document.querySelector('a[data-lien="creatures"]');
    if (lien) lien.hidden = section.hidden;
    if (!s || section.hidden) return;
    if (!cr.ui) {
      construireCreatures(z);
      const o = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { o.disconnect(); chargerCreatures3D(); } }, { rootMargin: "600px 0px" });
      o.observe(section);
    }
    // le Bestiaire du membre : demandé au bot à l'arrivée, puis toutes les 5 minutes
    if (moi?.connecte && !cr.occupe && (!cr.demande || Date.now() - cr.demande > 300_000)) {
      cr.demande = Date.now();
      agirCreatures("creatures").then(() => { cr.sig = cr.sigSauvage = ""; rendreCreatures(); });
    }
    if (!moi?.connecte) cr.moi = null;
    majSauvage(s);
    const sig = JSON.stringify([Boolean(cr.mod), cr.moi, Boolean(moi?.connecte), cr.fiche, cr.nacree, cr.occupe, s.total, s.connues, s.regles]);
    if (sig !== cr.sig) { cr.sig = sig; majBestiaire(s); majFiche(s); }
  }

  // ---------- la créature sauvage (en 3D sur l'eau) et le message du bot sur le Discord, côte à côte ----------
  function majSauvage(s) {
    const ui = cr.ui;
    if (!ui || !s) return;
    const w = crSauvage(s);
    const e = w ? cr.mod.ESPECES[w.espece] : null;
    const R = w ? crRarete(e) : null;
    // la vue 3D : créée une fois ; quand une autre créature surgit, elle sort de l'eau
    if (cr.mod && !cr.vueSauvage) {
      cr.vueSauvage = cr.mod.creerVueCreature(ui.toile, { espece: w?.espece || "piquebulle", nacree: Boolean(w?.nacree), mode: "sauvage", vide: !w, reduit: reduit.matches, surEvenement: evenementCreature });
      cr.sauvageVue = w ? w.id : "";
    } else if (cr.vueSauvage && !w && cr.sauvageVue && !cr.occupe) {
      // elle repart au large
      cr.sauvageVue = "";
      cr.vueSauvage.partir();
    } else if (cr.vueSauvage && w && w.id !== cr.sauvageVue && !cr.occupe) {
      cr.sauvageVue = w.id;
      cr.tampon = "";
      cr.discord = [];
      cr.message = null;
      cr.vueSauvage.changer(w.espece, { nacree: Boolean(w.nacree) });
    }
    const tente = Boolean(w && cr.moi?.tente === w.id);
    const sig = JSON.stringify([w, Boolean(cr.mod), Boolean(moi?.connecte), cr.moi?.filets, tente, cr.occupe, cr.message, cr.tampon, cr.discord]);
    if (sig === cr.sigSauvage) return;
    cr.sigSauvage = sig;
    ui.enVue.classList.toggle("calme", !w);
    ui.carte.dataset.rang = R ? String(R.rang) : "0";
    ui.carte.style.setProperty("--rc", R ? R.couleur : "transparent");
    vider(ui.enVue, el("i", { class: "point", "aria-hidden": "true" }), el("span", {}, w ? "Sur le Discord" : "La mer est calme", w ? el("span", { class: "cr-long", text: " en ce moment" }) : null));
    vider(ui.tampon, tamponCreature());
    if (!w) {
      ui.nom.textContent = cr.mod ? "Calme plat" : "…";
      vider(ui.puces);
      ui.texte.textContent = cr.message?.texte || (cr.mod ? "Aucune créature en vue. Elles surgissent sur le Discord quand ça discute : reviens voir pendant le live !" : "Les créatures arrivent…");
      ui.texte.classList.toggle("erreur", Boolean(cr.message?.erreur));
      vider(ui.action);
    } else {
      const t = cr.mod.TYPES[e.type], rr = R;
      ui.nom.textContent = `${e.nom} ${w.nacree ? "nacrée " : ""}sauvage\u00a0!`;
      vider(ui.puces, crPuce(crNum(e.n), "#e3c1d9", "num"), crPuce(t.nom, t.couleur), crPuceRarete(rr), w.nacree ? crPuce("✨ Nacrée", "#ffe58a") : null);
      ui.texte.textContent = cr.message?.texte || `Un filet par créature et par membre : ${rr.filet} l'attrape${w.nacree ? ". Et elle est nacrée : rarissime !" : "."}`;
      ui.texte.classList.toggle("erreur", Boolean(cr.message?.erreur));
      if (!moi?.connecte) vider(ui.action, el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter pour lancer un filet" }));
      else {
        const f = cr.moi?.filets;
        const libelle = cr.occupe ? "🪢 Le filet est lancé…" : tente ? "✓ Filet lancé sur celle-ci" : "🪢 Lancer le filet";
        vider(ui.action,
          el("button", { class: "btn btn-plein cr-lancer", type: "button", disabled: cr.occupe || tente || f === 0, onclick: () => lancerFiletCreature("site") }, libelle),
          typeof f === "number" ? el("span", { class: "cr-filets", text: f ? `${f} filet${f > 1 ? "s" : ""} aujourd'hui` : "Plus de filet aujourd'hui" }) : null);
      }
    }
    // le Discord : le même moment, vu du serveur
    // (la couleur du message : celle de sa rareté ; le titre dit si elle est rare, épique, légendaire, en or, nacrée)
    ui.dEmbed.style.setProperty("--c", w ? R.couleur : "#4e5058");
    const motRarete = w ? [R.rang ? CR_MOT[R.rang] : w.nacree ? "" : "sauvage", w.nacree ? "NACRÉE" : ""].filter(Boolean).join(" et ") : "";
    ui.dTitre.textContent = w ? `${CR_EMOJI[R.rang]}${w.nacree ? "✨" : ""} Une créature ${motRarete} surgit des flots\u00a0: ${e.nom}\u00a0!` : "🌊 La mer est calme…";
    ui.dTexte.textContent = w ? "Vos messages l'ont attirée ici. Lancez vos filets avant qu'elle reparte : un filet chacun !" : "Aucune créature pour l'instant. Discutez : elles arrivent quand le salon s'anime.";
    vider(ui.dChamps, ...(w ? [
      el("div", { class: "cr-d-champ" }, el("b", { text: "Rareté" }), el("span", { text: `${R.nom} · ${R.filet}` })),
      el("div", { class: "cr-d-champ" }, el("b", { text: "Type" }), el("span", { text: cr.mod.TYPES[e.type].nom })),
      el("div", { class: "cr-d-champ" }, el("b", { text: "Repart dans" }), ui.dReste),
    ] : []));
    ui.dPied.textContent = w ? `${crNum(e.n)} · ${e.ile} · Les Créatures de GRAND LINE` : "Les Créatures de GRAND LINE";
    ui.dImage.hidden = !w;
    ui.dBouton.disabled = !w || cr.occupe || tente;
    const cleImage = w ? `${w.id}|${w.espece}|${w.nacree}` : "";
    if (w && cr.atelier && ui.dImage.dataset.cle !== cleImage) { ui.dImage.dataset.cle = cleImage; dessinerImageDiscord(ui.dImage, w.espece, Boolean(w.nacree)); }
    vider(ui.dSuite, ...cr.discord.map((t) => el("div", { class: "cr-d-message suite" }, el("img", { class: "cr-d-avatar", src: "/img/favicon-32.png", alt: "", width: 40, height: 40 }),
      el("div", { class: "cr-d-corps" }, el("div", { class: "cr-d-auteur" }, el("b", { text: "BarhawBot" }), el("span", { class: "cr-d-app", text: "APP" })), el("div", { class: "cr-d-ligne", text: t })))));
    majChrono();
  }
  function majChrono() {
    const ui = cr.ui, s = crInfos();
    if (!ui || !s) return;
    const w = crSauvage(s);
    // elle vient de repartir : la carte change
    if (Boolean(w) !== Boolean(ui.chrono.textContent) && !cr.occupe) { cr.sigSauvage = ""; if (!w) { ui.chrono.textContent = ""; majSauvage(s); return; } }
    const r = w ? crReste(w.fin) : "";
    ui.chrono.textContent = w ? `Repart dans ${r}` : "";
    ui.chrono.hidden = !w;
    ui.dReste.textContent = r;
  }
  const tamponCreature = () => (cr.tampon ? el("span", { class: `cr-tampon-mot${/ATTRAP/.test(cr.tampon) ? ` or r${cr.tamponRang}` : /CHAPP/.test(cr.tampon) ? " gris" : ""}`, text: cr.tampon }) : null);
  // une créature peu commune, rare, épique, légendaire ou en or surgit : le mot s'affiche sur l'eau, avec son bruitage
  function annoncerRarete(rang) {
    const ui = cr.ui;
    if (!ui || !cr.mod || !(rang >= 1)) return;
    const R = Object.values(cr.mod.RARETES).find((x) => x.rang === rang);
    if (!R) return;
    clearTimeout(cr.banniere);
    vider(ui.banniere, el("span", { class: `cr-banniere-mot r${rang}`, style: `--c:${R.couleur};--l:${R.lueur}`, text: CR_ANNONCE[rang] }));
    cr.banniere = setTimeout(() => vider(ui.banniere), rang >= 4 ? 3300 : 2500);
    const sons = [[], [["br-onde", 0.6, 0]], [["br-paillettes", 0.85, 0]], [["br-boum", 0.6, 0], ["br-monte", 0.8, 0.12]],
      [["br-roulement", 0.7, 0], ["br-cymbale", 0.9, 0.85]], [["br-roulement", 0.7, 0], ["br-fanfare", 0.9, 0.85], ["br-feux", 0.6, 1.3]]][rang] || [];
    for (const [nom, volume, retard] of sons) jouerSon(nom, { volume, retard });
  }
  // l'image du message Discord : la créature sur un bout de mer (dessinée par l'atelier)
  function dessinerImageDiscord(toile, id, nacree) {
    const ctx = toile.getContext("2d");
    const l = toile.width, h = toile.height;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#a9dcff"); g.addColorStop(0.4, "#6cc0f2"); g.addColorStop(0.42, "#2f8fd6"); g.addColorStop(1, "#14528f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, l, h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    for (let k = 0; k < 16; k++) { const x = (k * 97 + 31) % l, y = h * 0.47 + ((k * 53) % (h * 0.5)); ctx.beginPath(); ctx.ellipse(x, y, 16 + (k % 4) * 9, 3 + (k % 3), 0, 0, Math.PI * 2); ctx.fill(); }
    const R = crRarete(cr.mod.ESPECES[id]);
    if (R?.rang >= 2) {
      const cx = l / 2, cy = h * 0.5;
      if (R.rang >= 4) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = crRgba(R.lueur, 0.2);
        for (let k = 0; k < 14; k++) { ctx.rotate((Math.PI * 2) / 14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l, -l * 0.1); ctx.lineTo(l, l * 0.1); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      const halo = ctx.createRadialGradient(cx, cy, 8, cx, cy, h * (0.42 + R.rang * 0.03));
      halo.addColorStop(0, crRgba(R.lueur, 0.8)); halo.addColorStop(0.45, crRgba(R.couleur, 0.32)); halo.addColorStop(1, crRgba(R.couleur, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, l, h);
      if (R.rang === 5) {
        for (let k = 0; k < 12; k++) {
          const x = (k * 131 + 47) % l, y = 18 + ((k * 71) % (h * 0.42)), r = 7 + (k % 3) * 2;
          ctx.fillStyle = "#c88a12"; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, k, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(x - 1, y - 1, r * 0.78, r * 0.6, k, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    const creature = document.createElement("canvas");
    creature.width = l; creature.height = h;
    cr.atelier.dessiner(creature.getContext("2d"), id, { nacree, angle: -0.45, marge: 0.98, hauteur: 0.2 });
    ctx.drawImage(creature, 0, 0);
  }

  // ---------- le filet : le bot décide, la 3D joue (trois secousses), le Discord raconte ----------
  async function lancerFiletCreature(depuis) {
    const s = crInfos();
    const w = crSauvage(s);
    if (!w || cr.occupe || !cr.vueSauvage) return;
    if (!moi?.connecte) { location.href = "/api/auth/login"; return; }
    cr.occupe = true;
    cr.message = null;
    cr.tampon = "";
    const e = cr.mod.ESPECES[w.espece];
    const qui = moi.nom || "Toi";
    cr.discord = [`🪢 ${qui} lance son filet ${depuis === "discord" ? "depuis le Discord" : "depuis le site"}…`];
    majSauvage(s);
    jouerSon("clic", { volume: 0.6 });
    const d = await agirCreatures("creatures-filet", { apparition: w.id }, { differer: true });
    if (d.erreur || !["attrape", "echappe"].includes(d.issue)) {
      cr.occupe = false;
      cr.discord = [];
      cr.message = { texte: d.texte || "Ça n'a pas marché, réessaie.", erreur: true };
      cr.sig = cr.sigSauvage = "";
      rendreCreatures();
      return;
    }
    jouerSon("cr-filet", { volume: 0.9 });
    await cr.vueSauvage.lancerFilet(d.issue);
    appliquerCreatures(d);
    cr.occupe = false;
    const nouvelle = d.issue === "attrape" && d.nouvelle;
    cr.message = d.issue === "attrape"
      ? { texte: `Attrapée ! ${e.nom}${w.nacree ? " nacrée" : ""} rejoint ton Bestiaire${nouvelle ? " : c'est ta toute première !" : "."}` }
      : { texte: `${e.nom} s'est échappée… Ton filet est perdu, mais la prochaine sera peut-être la bonne.` };
    cr.discord.push(d.issue === "attrape"
      ? `🎉 ${qui} a attrapé ${e.nom}${w.nacree ? " nacrée ✨" : ""} (${crNum(e.n)}) !${nouvelle ? " Nouvelle dans son Bestiaire." : ""}`
      : `💨 ${e.nom} s'échappe du filet de ${qui}… Elle est toujours là : à vous !`);
    if (d.issue === "attrape") { cr.fiche = w.espece; cr.nacree = Boolean(w.nacree); }
    cr.sig = cr.sigSauvage = "";
    rendreCreatures();
  }
  function evenementCreature(quoi, n) {
    const vole = Boolean(cr.vueSauvage?.vole?.());
    if (quoi === "entree") {
      // elle sort de l'eau (ou descend du ciel), avec son bruitage à elle, et le carillon si elle est nacrée
      jouerSon(vole ? "cr-envol" : "cr-plouf", { volume: vole ? 0.9 : 0.8 });
      const propre = CR_SON_ESPECE[cr.vueSauvage?.espece?.()];
      if (propre) jouerSon(propre[0], { volume: propre[1], retard: propre[2] });
      if (crSauvage(crInfos())?.nacree) jouerSon("cr-nacree", { volume: 0.8, retard: 0.45 });
      annoncerRarete(n);
      return;
    }
    if (quoi === "partir") { jouerSon(vole ? "cr-envol" : "cr-plouf", { volume: 0.45 }); return; }
    if (quoi === "filet") { if (!vole) jouerSon("cr-plouf", { volume: 0.4 }); return; }
    cr.tamponRang = 0;
    if (quoi === "secousse") {
      cr.tampon = `${n}…`;
      jouerSon("br-tic", { volume: 0.6 });
      if (!vole) jouerSon("cr-bulles", { volume: 0.55 + 0.15 * (Number(n) || 1) });
    }
    else if (quoi === "attrape") {
      cr.tampon = "ATTRAPÉE\u00a0!";
      cr.tamponRang = Number(n) || 0;
      jouerSon("victoire", { volume: 0.8 });
      jouerSon("cr-mignon", { volume: 0.85, retard: 0.08 });
      if (n >= 3) jouerSon("br-acclame", { volume: 0.8, retard: 0.25 });
      if (n >= 4) jouerSon("br-fanfare", { volume: 0.8, retard: 0.15 });
      if (n >= 5) jouerSon("br-feux", { volume: 0.7, retard: 0.6 });
    }
    else if (quoi === "echappe") { cr.tampon = "ÉCHAPPÉE…"; jouerSon("quiz-faux", { volume: 0.7 }); jouerSon(vole ? "cr-envol" : "cr-plouf", { volume: 0.6, retard: 0.35 }); }
    else if (quoi === "evolution") { jouerSon("br-monte", { volume: 0.8 }); return; }
    else if (quoi === "flash") { jouerSon("br-paillettes", { volume: 0.9 }); return; }
    else return;
    if (cr.ui) vider(cr.ui.tampon, tamponCreature());
  }

  // ---------- le Bestiaire : 30 cases ; attrapées en couleur, croisées en silhouette, les autres en point d'interrogation ----------
  function majBestiaire(s) {
    const ui = cr.ui;
    if (!ui) return;
    const total = Math.min(200, Math.max(1, Number(s.total) || 30));
    const especes = cr.mod ? Object.entries(cr.mod.ESPECES) : [];
    const parNum = new Map(especes.map(([id, e]) => [e.n, id]));
    const pris = cr.moi?.attrapees || {};
    const nb = Object.keys(pris).filter((id) => cr.mod?.ESPECES?.[id]).length;
    ui.compte.textContent = moi?.connecte && cr.moi ? `${nb}/${total}` : "";
    vider(ui.connexion, moi?.connecte ? null : el("a", { class: "btn btn-contour btn-petit", href: "/api/auth/login", text: "Se connecter avec Discord pour voir le tien" }));
    if (cr.mod && !ui.raretes.childElementCount) {
      vider(ui.raretes, ...Object.values(cr.mod.RARETES).sort((a, b) => a.rang - b.rang).map((R) =>
        el("span", { class: `cr-rarete r${R.rang}`, style: `--c:${R.couleur}`, title: `${R.filet} l'attrape` }, el("i", { "aria-hidden": "true" }), R.nom)));
    }
    const vues = new Set((s.connues || []).filter((id) => cr.mod?.ESPECES?.[id]));
    const cases = [];
    for (let n = 1; n <= total; n++) {
      const id = parNum.get(n);
      const e = id ? cr.mod.ESPECES[id] : null;
      const a = id ? pris[id] : null;
      const etat = a ? "pris" : id && (vues.has(id) || e.ligne?.some((x) => x && pris[x])) ? "vu" : "inconnu";
      const contenu = [el("span", { class: "cr-case-num", text: crNum(n) })];
      if (etat !== "inconnu") {
        contenu.push(el("canvas", { class: "cr-vignette", width: 160, height: 160, "data-espece": id, "data-silhouette": etat === "vu" ? "1" : "", "aria-hidden": "true" }),
          el("span", { class: "cr-case-nom", text: etat === "pris" ? e.nom : "???" }));
        if (a) contenu.push(el("span", { class: "cr-case-type", style: `--c:${cr.mod.TYPES[e.type].couleur}`, text: cr.mod.TYPES[e.type].nom }));
        if (a?.n > 1) contenu.push(el("span", { class: "cr-case-x", text: `×${a.n}` }));
        if (a?.nacree) contenu.push(el("span", { class: "cr-case-nacree", title: "Tu as sa version nacrée", text: "✨" }));
      } else contenu.push(el("span", { class: "cr-case-mystere", "aria-hidden": "true", text: "?" }));
      const ouvrir = () => {
        cr.fiche = id;
        cr.nacree = false;
        cr.sig = "";
        rendreCreatures();
        cr.ui?.fiche.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth", block: "nearest" });
      };
      const R = etat !== "inconnu" ? crRarete(e) : null;
      if (R && etat === "pris" && R.rang) contenu.push(el("span", { class: "cr-case-gemme", "aria-hidden": "true" }));
      cases.push(el("li", { class: `cr-case ${etat}${id && id === cr.fiche && a ? " choisie" : ""}`, "data-rang": R ? String(R.rang) : null, style: R ? `--rc:${R.couleur};--rl:${R.lueur}` : null },
        etat === "pris" ? el("button", { type: "button", class: "cr-case-bouton", "aria-label": `${e.nom} (${R.nom}), voir sa fiche`, onclick: ouvrir }, ...contenu)
          : el("div", { class: "cr-case-bouton", title: etat === "vu" ? "Croisée, pas encore attrapée" : "Pas encore découverte" }, ...contenu)));
    }
    if (v4Ouverte()) cases.push(caseRaturee()); // le site secret : la marque III, une 31e case rayée
    vider(ui.grille, ...cases);
    if (cr.atelier) {
      for (const c of ui.grille.querySelectorAll("canvas.cr-vignette")) {
        try { cr.atelier.dessiner(c.getContext("2d"), c.dataset.espece, { silhouette: c.dataset.silhouette === "1", angle: -0.5, t: 1.2 }); } catch { /* une case vide */ }
      }
    }
  }

  // ---------- la fiche : la créature en grand (on la tourne au doigt), ce qu'elle est, son évolution ----------
  function majFiche(s) {
    const ui = cr.ui;
    if (!ui || !cr.mod) return;
    // la fiche montre une créature attrapée (sans compte : la première, pour l'exemple)
    if (cr.moi && !crPossede(cr.fiche)) cr.fiche = Object.keys(cr.moi.attrapees || {}).find((id) => cr.mod.ESPECES[id]) || cr.fiche;
    const id = cr.fiche, e = cr.mod.ESPECES[id];
    if (!e) return;
    const a = crPossede(id);
    const t = cr.mod.TYPES[e.type], rr = crRarete(e);
    ui.fNum.textContent = crNum(e.n);
    ui.fNom.textContent = e.nom;
    ui.fiche.dataset.rang = String(rr.rang);
    ui.fiche.style.setProperty("--rc", rr.couleur);
    ui.fiche.style.setProperty("--rl", rr.lueur);
    vider(ui.fPuces, crPuce(t.nom, t.couleur), crPuceRarete(rr), a?.n ? crPuce(`×${a.n} dans ton Bestiaire`, "#e3c1d9", "num") : null);
    ui.fIle.textContent = `Vit autour de ${e.ile.replace(/^L'/, "l'").replace(/^Le /, "le ").replace(/^La /, "la ")}.`;
    ui.fTexte.textContent = e.texte;
    vider(ui.fStats, ...[["Force", e.stats.force], ["Résistance", e.stats.resistance], ["Vitesse", e.stats.vitesse]].map(([k, v]) =>
      el("div", { class: "cr-stat" }, el("span", { text: k }), el("i", { class: "cr-barre" }, el("i", { style: `width:${v}%` })), el("b", { text: v }))));
    // la ligne d'évolution : chaque étape attrapée s'ouvre, les autres restent en silhouette
    const ligne = e.ligne || [id];
    const etapes = ligne.filter(Boolean);
    vider(ui.fLigne, ...etapes.flatMap((x, k) => {
      const pris = Boolean(crPossede(x));
      const c = el("canvas", { class: "cr-mini", width: 96, height: 96, "aria-hidden": "true" });
      const bloc = el(pris && x !== id ? "button" : "div", { class: `cr-etape${x === id ? " ici" : ""}${pris || x === id ? "" : " cachee"}`, ...(pris && x !== id ? { type: "button", onclick: () => { cr.fiche = x; cr.nacree = false; cr.sig = ""; rendreCreatures(); } } : {}) },
        c, el("span", { text: pris || x === id ? cr.mod.ESPECES[x].nom : "???" }));
      if (cr.atelier) { try { cr.atelier.dessiner(c.getContext("2d"), x, { silhouette: !pris && x !== id, angle: -0.5 }); } catch { /* vide */ } }
      return k ? [el("span", { class: "cr-fleche", "aria-hidden": "true", text: "→" }), bloc] : [bloc];
    }));
    if (etapes.length < 2) ui.fLigne.append(el("span", { class: "cr-f-regle", text: rr.rang >= 3 ? "Pas d'évolution : elle est déjà au sommet." : "Pas d'évolution connue… pour l'instant." }));
    // faire évoluer : la suivante dans la ligne, avec assez d'exemplaires
    const k = ligne.indexOf(id);
    const vers = k >= 0 ? ligne[k + 1] || null : null;
    const besoin = Math.max(1, Number(s.regles?.evolution) || 3);
    if (vers && a) {
      const ok = (a.n || 0) >= besoin && !cr.occupe;
      vider(ui.fAction,
        el("button", { class: "btn btn-plein", type: "button", disabled: !ok, onclick: () => evoluerCreature(id, vers) }, cr.occupe ? "✨ Elle évolue…" : `✨ Faire évoluer en ${crPossede(vers) ? cr.mod.ESPECES[vers].nom : "???"}`),
        el("span", { class: "cr-f-regle", text: ok ? `${besoin} ${e.nom} deviennent 1 ${crPossede(vers) ? cr.mod.ESPECES[vers].nom : "créature inconnue"} : tu en as ${a.n}.` : `Il faut ${besoin} ${e.nom} (tu en as ${a.n || 0}).` }));
    } else vider(ui.fAction, el("span", { class: "cr-f-regle", text: !a ? "Attrape-la pour la faire évoluer." : k > 0 && !vers && etapes.length > 1 ? "Elle est à sa forme finale." : "" }));
    // la 3D, et le bouton « nacrée » pour qui l'a dans sa version nacrée
    const nacreeOk = Boolean(a?.nacree);
    ui.fNacree.hidden = !nacreeOk;
    if (!nacreeOk) cr.nacree = false;
    ui.fNacree.setAttribute("aria-pressed", cr.nacree ? "true" : "false");
    ui.fNacree.textContent = cr.nacree ? "✨ Nacrée" : "✨ Voir la nacrée";
    if (!cr.vueFiche) cr.vueFiche = cr.mod.creerVueCreature(ui.fToile, { espece: id, nacree: cr.nacree, mode: "fiche", reduit: reduit.matches, surEvenement: evenementCreature });
    else if (!cr.occupe && (cr.vueFiche.espece() !== id || cr.vueFicheNacree !== cr.nacree)) cr.vueFiche.changer(id, { nacree: cr.nacree });
    cr.vueFicheNacree = cr.nacree;
    ui.fiche.classList.toggle("nacree", cr.nacree);
  }
  function basculerNacree() {
    cr.nacree = !cr.nacree;
    if (cr.nacree) jouerSon("cr-nacree", { volume: 0.7 });
    cr.sig = "";
    rendreCreatures();
  }
  async function evoluerCreature(id, vers) {
    if (cr.occupe || !cr.vueFiche) return;
    cr.occupe = true;
    cr.sig = "";
    rendreCreatures();
    const d = await agirCreatures("creatures-evoluer", { espece: id }, { differer: true });
    if (d.erreur || !d.ok) {
      cr.occupe = false;
      cr.sig = "";
      rendreCreatures();
      return;
    }
    await cr.vueFiche.evoluer(vers);
    appliquerCreatures(d);
    cr.occupe = false;
    cr.fiche = vers;
    cr.nacree = false;
    cr.vueFicheNacree = false;
    cr.sig = "";
    rendreCreatures();
  }

  // ---------- LE SITE SECRET (VF 1.0) : « La Rature » ----------
  // Une tache d'encre tout en bas du site cache un cadenas à 4 molettes. Les 4 marques qui donnent le code sont semées
  // dans GRAND LINE : le récit de Port Barhaw (I), le navire noir qui longe la carte la nuit (II), la case rayée du
  // Bestiaire (III), la présentation de GRAND LINE à 3 h du matin (IV). Le serveur garde le code, les marques et tout ce
  // que Rature écrit (api/rature.js) : ici, il n'y a que la mécanique. Le cadenas ouvert, Rature prend le site : ses
  // ratures sur les titres, ses murmures, ce qui change quand on a le dos tourné, son journal de bord. « Refermer le
  // cadenas » rend le site normal ; la tache le rouvre sans redemander le code.
  const RT_SYMBOLES = ["plume", "ancre", "bougie", "cle", "lune", "vague", "sablier", "rouage", "coquillage", "pavillon", "etoile", "cloche"];
  const RT_NOMS = { plume: "la plume", ancre: "l'ancre", bougie: "la bougie", cle: "la clé", lune: "la lune", vague: "la vague", sablier: "le sablier", rouage: "le rouage", coquillage: "le coquillage", pavillon: "le pavillon", etoile: "l'étoile", cloche: "la cloche" };
  const RT_CHIFFRES = ["I", "II", "III", "IV"];
  const RT_TRACES = {
    plume: "M19.5 3.5c-6.5 1-11.5 5.5-13.6 12.4L4.6 20.4l3.2-2.1c6.6-2.3 11.4-7.4 11.7-14.8zM5.6 19.3 15 9.6M9.4 13.6l3.4.4M11.7 10.9l3 .3",
    ancre: "M12 3.2a2 2 0 1 0 0 4 2 2 0 1 0 0-4zM12 7.2V20.6M8.2 10.4h7.6M4.6 13.6c.3 4.4 3.4 7 7.4 7s7.1-2.6 7.4-7M3.2 15.4l1.4-1.8 1.9 1.4M20.8 15.4l-1.4-1.8-1.9 1.4",
    bougie: "M9.2 10.2h5.6v9.6H9.2zM12 3.2c1.9 1.7 2.1 3.6.1 5-2-1.3-1.8-3.2-.1-5zM12 8.2v2M6.6 19.8h10.8M14.8 12.4c-.8.3-1.1 1.2-.9 2.1",
    cle: "M7.6 8.4m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M11.6 8.4h9M17.6 8.4v3.2M20.6 8.4v4.2M7.6 7.2v2.4",
    lune: "M15.2 3.4a8.8 8.8 0 1 0 5.6 13.3A7.2 7.2 0 0 1 15.2 3.4zM9 9.5l.6.4M7.5 14.2l.5.2",
    vague: "M2.4 10.4c2.6-3.2 5.6-3.2 8.2 0s5.6 3.2 8.2 0c.8-1 1.6-1.6 2.6-1.8M2.4 16.2c2.6-3.2 5.6-3.2 8.2 0s5.6 3.2 8.2 0c.8-1 1.6-1.6 2.6-1.8",
    sablier: "M6.4 3.4h11.2M6.4 20.6h11.2M7.6 3.4c0 4.8 8.8 5.6 8.8 8.6s-8.8 3.8-8.8 8.6M16.4 3.4c0 4.8-8.8 5.6-8.8 8.6s8.8 3.8 8.8 8.6M10.4 18.6h3.2",
    rouage: "M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 1 0 0-7.2zM12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1",
    coquillage: "M12 20.4 3.8 10.6C5.6 4.2 18.4 4.2 20.2 10.6zM12 20.4 7.8 6.2M12 20.4V5.4M12 20.4l4.2-14.2M12 20.4 5.4 8.4M12 20.4l6.6-12M10.2 20.6h3.6",
    pavillon: "M5.4 21V3M5.4 4.2h13.2l-3.2 4.2 3.2 4.2H5.4",
    etoile: "M12 3.2l2.6 5.6 6.1.7-4.5 4.1 1.2 6.1L12 16.7l-5.4 3 1.2-6.1-4.5-4.1 6.1-.7z",
    cloche: "M6.2 16.8c1-1.8 1.1-3.8 1.1-6.6a4.7 4.7 0 0 1 9.4 0c0 2.8.1 4.8 1.1 6.6zM4.4 16.8h15.2M10.8 19.8a1.3 1.3 0 0 0 2.4 0M12 3.4V5.4",
  };
  const RT = { contenu: null, actif: false, minuteur: 0, prochain: {}, cache: 0, retours: 0, depuisCache: 0, voie: null, observateur: null, derniereRature: 0, inactif: 0 };
  const RT_CLE = "barhaw-rature", RT_ETEINT = "barhaw-rature-off", RT_SESSION = "barhaw-rature-contenu";
  const SONS_RATURE = ["rt-drone", "rt-murmure", "rt-voix", "rt-plume", "rt-cadenas", "rt-ouvert", "rt-goutte", "rt-grince", "rt-page", "rt-cliquet"];
  const rtLire = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const rtEcrire = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
  const rtCode = () => { const c = String(rtLire(RT_CLE) || "").split("-"); return c.length === 4 && c.every((x) => RT_SYMBOLES.includes(x)) ? c : null; };
  // (des fonctions, pas des constantes : la carte 2D peut demander le navire noir avant que ce bloc soit lu)
  function rtHeure() { return Number.isInteger(window.__rtHeure) ? window.__rtHeure : Number.parseInt(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" }).format(new Date()), 10) % 24; }
  function rtNuit() { const h = rtHeure(); return h >= 22 || h < 6; }
  const rtHasard = (a, b) => a + Math.random() * (b - a);
  const rtUn = (l) => l[Math.floor(Math.random() * l.length)];
  function rtSymbole(nom, taille = 24) {
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", taille);
    s.setAttribute("height", taille);
    s.setAttribute("class", "rt-symbole");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", RT_TRACES[nom] || "");
    s.append(p);
    return s;
  }
  // une tache d'encre (le cadenas en bas, les marques) : un pâté irrégulier et deux éclaboussures
  function rtTache(taille = 18) {
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 32 32");
    s.setAttribute("width", taille);
    s.setAttribute("height", taille);
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("class", "rt-tache-svg");
    for (const d of ["M16 5c4 0 5 3 8 4s4 5 2 8 1 6-3 8-6 2-9 1-6-2-7-6 1-6 0-9 5-6 9-6z", "M27 4a1.6 1.6 0 1 0 0 .1z", "M5 26a1.2 1.2 0 1 0 0 .1z"]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      s.append(p);
    }
    return s;
  }
  async function rtApi(corps = null, marque = 0) {
    try {
      const r = await fetch(marque ? `/api/rature?marque=${marque}` : "/api/rature", corps ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) } : {});
      return await r.json().catch(() => ({ erreur: "reseau" }));
    } catch { return { erreur: "reseau" }; }
  }
  // un bruitage de Rature (seulement si les sons du site sont allumés), jamais deux fois le même en moins de 0,4 s
  const rtDernierSon = {};
  function rtSon(nom, o = {}) {
    if (performance.now() - (rtDernierSon[nom] || -1e9) < 400) return;
    rtDernierSon[nom] = performance.now();
    jouerSon(nom, o);
  }

  // ---------- les 4 marques ----------
  // une marque se montre : son chiffre, son symbole, ce que Rature a écrit (ou « pas maintenant »)
  async function montrerMarque(n, ancre) {
    if (!ancre || ancre.classList.contains("rt-lue")) return;
    ancre.classList.add("rt-occupee");
    rtSon("rt-goutte", { volume: 0.8 });
    const d = await rtApi(null, n);
    ancre.classList.remove("rt-occupee");
    document.querySelectorAll(`.rt-sceau[data-marque="${n}"]`).forEach((x) => x.remove());
    const sceau = el("div", { class: "rt-sceau", "data-marque": String(n), role: "status" });
    if (d.symbole && RT_SYMBOLES.includes(d.symbole)) {
      sceau.append(el("span", { class: "rt-sceau-chiffre", text: RT_CHIFFRES[n - 1] }), rtSymbole(d.symbole, 34),
        el("span", { class: "rt-main rt-sceau-note", text: String(d.note || "") }),
        el("span", { class: "rt-lecteur", text: `Marque ${RT_CHIFFRES[n - 1]} : ${RT_NOMS[d.symbole]}.` }));
      ancre.classList.add("rt-lue");
      rtSon("rt-murmure", { volume: 0.5, retard: 0.3 });
    } else sceau.append(el("span", { class: "rt-main rt-sceau-note", text: d.ferme ? "…" : String(d.texte || "…") }));
    const scene = ancre.closest("#grandline-scene");
    if (scene) {
      const a = ancre.getBoundingClientRect(), b = scene.getBoundingClientRect();
      sceau.style.left = `${Math.round(Math.min(Math.max(8, a.left - b.left - 40), b.width - 230))}px`;
      sceau.style.top = `${Math.round(Math.min(a.bottom - b.top + 4, b.height - 120))}px`;
    }
    ancre.after(sceau);
    setTimeout(() => { sceau.classList.add("part"); setTimeout(() => sceau.remove(), 900); ancre.classList.remove("rt-lue", "arrete"); }, 14_000);
  }
  // la marque I : une tache au bas de la page de Port Barhaw, dans le récit
  function marqueRecit(feuille) {
    if (!v4Ouverte() || !feuille || feuille.querySelector(".rt-marque")) return;
    const b = el("button", { type: "button", class: "rt-marque rt-marque-recit", "aria-label": "Une tache d'encre au bas de la page", onclick: (ev) => montrerMarque(1, ev.currentTarget) }, rtTache(26));
    feuille.append(b);
  }
  // la marque III : une 31e case, rayée, au bout du Bestiaire
  function caseRaturee() {
    const b = el("button", { type: "button", class: "cr-case-bouton rt-case-bouton", "aria-label": "Une case rayée, après la dernière", onclick: (ev) => montrerMarque(3, ev.currentTarget) },
      el("span", { class: "cr-case-num", text: "#031" }), el("span", { class: "cr-case-mystere rt-case-mystere", "aria-hidden": "true", text: "?" }), el("span", { class: "rt-case-trait", "aria-hidden": "true" }));
    return el("li", { class: "cr-case inconnu rt-case" }, b);
  }
  // la marque II : le Dernier Mot longe la carte, la nuit (22 h à 6 h, heure de Paris), sans laisser de sillage
  function navireNoir() {
    const scene = $("grandline-scene");
    let n = scene?.querySelector(".rt-navire");
    const voulu = Boolean(scene) && v4Ouverte() && carteGL?.type === "2d" && rtNuit() && !SALLE.ouverte;
    if (!voulu) { n?.remove(); return; }
    if (n) return;
    const NS = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 64 48");
    s.setAttribute("aria-hidden", "true");
    for (const [d, c] of [["M6 34h52l-7 9H14z", "coque"], ["M31 4v30M31 6 15 30h16zM33 8l15 22H33z", "voiles"], ["M31 4h9l-3 3 3 3h-9", "pavillon"]]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", `rt-navire-${c}`);
      s.append(p);
    }
    n = el("button", { type: "button", class: "rt-navire", "aria-label": "Un navire noir, au loin", onclick: (ev) => { ev.currentTarget.classList.add("arrete"); montrerMarque(2, ev.currentTarget); } }, s);
    scene.append(n);
  }
  // la marque IV : à 3 h du matin, Rature raye le trésor dans la présentation de GRAND LINE
  function marqueTroisHeures() {
    const p = document.querySelector("#grandline .entete-section .sous");
    if (!p) return;
    const voulu = v4Ouverte() && rtHeure() === 3;
    const deja = p.querySelector(".rt-glisse-iv");
    if (!voulu) {
      if (deja) { deja.replaceWith(document.createTextNode(deja.dataset.mot)); p.normalize(); }
      p.parentNode.querySelector(".rt-marque-iv")?.remove();
      return;
    }
    if (!deja) {
      const t = [...p.childNodes].find((x) => x.nodeType === 3 && x.nodeValue.includes("trésor"));
      if (t) {
        const fin = t.splitText(t.nodeValue.indexOf("trésor"));
        fin.splitText("trésor".length);
        fin.replaceWith(el("span", { class: "rt-glisse rt-glisse-iv raye", "data-mot": "trésor" }, el("span", { class: "rt-barre", text: "trésor" }), el("span", { class: "rt-mot", "aria-hidden": "true", text: "néant" })));
      }
    }
    if (!p.parentNode.querySelector(".rt-marque-iv")) p.after(el("button", { type: "button", class: "rt-marque rt-marque-iv", "aria-label": "Une tache d'encre, sous la présentation", onclick: (ev) => montrerMarque(4, ev.currentTarget) }, rtTache(22)));
  }

  // ---------- le cadenas ----------
  function ouvrirCadenas(depuis) {
    if ($("rt-cadenas")) return;
    const etat = [0, 0, 0, 0];
    let occupe = false;
    const reponse = el("p", { class: "rt-main rt-reponse", role: "status", "aria-live": "polite" });
    const molettes = etat.map((_, k) => {
      const fenetre = el("div", { class: "rt-fenetre", role: "spinbutton", tabindex: "0", "aria-label": `Molette ${RT_CHIFFRES[k]}`, "aria-valuemin": "0", "aria-valuemax": String(RT_SYMBOLES.length - 1) });
      const tourner = (sens) => {
        if (occupe) return;
        etat[k] = (etat[k] + sens + RT_SYMBOLES.length) % RT_SYMBOLES.length;
        dessiner();
        rtSon("rt-cliquet", { volume: 0.9 });
        fenetre.classList.remove("tourne-haut", "tourne-bas");
        void fenetre.offsetWidth;
        fenetre.classList.add(sens > 0 ? "tourne-bas" : "tourne-haut");
      };
      const dessiner = () => {
        const i = etat[k], N = RT_SYMBOLES.length;
        vider(fenetre, el("span", { class: "rt-voisin" }, rtSymbole(RT_SYMBOLES[(i - 1 + N) % N], 22)), el("span", { class: "rt-courant" }, rtSymbole(RT_SYMBOLES[i], 40)), el("span", { class: "rt-voisin" }, rtSymbole(RT_SYMBOLES[(i + 1) % N], 22)));
        fenetre.setAttribute("aria-valuenow", String(i));
        fenetre.setAttribute("aria-valuetext", RT_NOMS[RT_SYMBOLES[i]]);
      };
      dessiner();
      fenetre.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowUp") { ev.preventDefault(); tourner(-1); }
        else if (ev.key === "ArrowDown") { ev.preventDefault(); tourner(1); }
      });
      fenetre.addEventListener("wheel", (ev) => { ev.preventDefault(); tourner(ev.deltaY > 0 ? 1 : -1); }, { passive: false });
      let y0 = null;
      fenetre.addEventListener("pointerdown", (ev) => { y0 = ev.clientY; });
      fenetre.addEventListener("pointerup", (ev) => { if (y0 !== null && Math.abs(ev.clientY - y0) > 14) tourner(ev.clientY < y0 ? 1 : -1); y0 = null; });
      return el("div", { class: "rt-molette" },
        el("button", { type: "button", class: "rt-fleche", "aria-label": `Molette ${RT_CHIFFRES[k]} : symbole précédent`, onclick: () => tourner(-1), text: "▲" }),
        fenetre,
        el("button", { type: "button", class: "rt-fleche", "aria-label": `Molette ${RT_CHIFFRES[k]} : symbole suivant`, onclick: () => tourner(1), text: "▼" }),
        el("span", { class: "rt-chiffre", "aria-hidden": "true", text: RT_CHIFFRES[k] }));
    });
    const anse = el("div", { class: "rt-anse", "aria-hidden": "true" });
    const corps = el("div", { class: "rt-corps" }, ...molettes);
    const tirer = el("button", { type: "button", class: "rt-tirer", onclick: () => essayer() }, "Tirer sur l'anse");
    const fermer = () => { voile.remove(); document.removeEventListener("keydown", echap); document.documentElement.classList.remove("rt-cadenas-ouvert"); (depuis || $("rt-tache"))?.focus?.(); };
    const echap = (ev) => { if (ev.key === "Escape" && !occupe) fermer(); };
    const voile = el("div", { class: "rt-voile", id: "rt-cadenas", role: "dialog", "aria-modal": "true", "aria-labelledby": "rt-cadenas-titre" },
      el("div", { class: "rt-boite" },
        el("button", { type: "button", class: "rt-fermer", "aria-label": "Laisser le cadenas", onclick: () => !occupe && fermer(), text: "✕" }),
        el("p", { class: "rt-main rt-titre", id: "rt-cadenas-titre", text: "Quatre marques, dans ma mer." }),
        el("p", { class: "rt-main rt-indices", text: "Une au départ. Une la nuit, sur l'eau. Une dans ce que vous attrapez. Une à l'heure où plus personne ne lit." }),
        el("div", { class: "rt-cadenas" }, anse, corps),
        tirer, reponse));
    voile.addEventListener("click", (ev) => { if (ev.target === voile && !occupe) fermer(); });
    document.body.append(voile);
    document.documentElement.classList.add("rt-cadenas-ouvert");
    document.addEventListener("keydown", echap);
    voile.querySelector(".rt-fenetre").focus();
    prechargerSons(SONS_RATURE);
    const NON = ["Non.", "Pas comme ça.", "Tu as mal lu.", "Encore ?", "Ce n'est pas mon nom.", "Regarde mieux."];
    let essais = 0;
    async function essayer() {
      if (occupe) return;
      occupe = true;
      tirer.disabled = true;
      reponse.textContent = "";
      const code = etat.map((i) => RT_SYMBOLES[i]);
      const d = await rtApi({ code });
      if (d.ok && d.journal) {
        rtEcrire(RT_CLE, code.join("-"));
        rtEcrire(RT_ETEINT, null);
        try { sessionStorage.setItem(RT_SESSION, JSON.stringify(d)); } catch {}
        RT.contenu = d;
        anse.classList.add("ouverte");
        rtSon("rt-ouvert", { volume: 1 });
        setTimeout(() => inondation(voile.querySelector(".rt-cadenas"), () => { fermer(); activerRature({ premiere: true }); }), reduit.matches ? 200 : 650);
        return;
      }
      occupe = false;
      tirer.disabled = false;
      voile.querySelector(".rt-cadenas").classList.remove("refuse");
      void voile.offsetWidth;
      voile.querySelector(".rt-cadenas").classList.add("refuse");
      rtSon("rt-cadenas", { volume: 1 });
      reponse.textContent = d.ferme ? "Pas encore." : d.erreur === "trop" ? String(d.texte || "Doucement.") : d.erreur === "reseau" ? "Le cadenas ne répond pas. Réessaie plus tard." : NON[essais++ % NON.length];
    }
  }
  // l'encre envahit l'écran depuis le cadenas, puis le site revient… raturé
  function inondation(depuis, ensuite) {
    const r = depuis?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight / 2;
    const v = el("div", { class: "rt-inondation", style: `--x:${Math.round(x)}px;--y:${Math.round(y)}px`, "aria-hidden": "true" }, el("p", { class: "rt-main rt-inondation-mot", text: "Tu n'aurais pas dû." }));
    document.body.append(v);
    rtSon("rt-voix", { volume: 0.9 });
    rtSon("rt-goutte", { volume: 0.9, retard: 0.5 });
    const lent = !reduit.matches;
    setTimeout(() => { ensuite(); v.classList.add("mot"); }, lent ? 1500 : 100);
    setTimeout(() => v.classList.add("part"), lent ? 4300 : 1600);
    setTimeout(() => { v.remove(); ouvrirJournal(); }, lent ? 5900 : 2000);
  }

  // ---------- le site raturé ----------
  function rayer(e, par, anime) {
    if (!e || e.dataset.rature) return;
    e.dataset.rature = "1";
    const barre = el("span", { class: "rt-barre" });
    barre.append(...e.childNodes);
    e.append(barre, el("span", { class: "rt-mot", "aria-hidden": "true", text: par }));
    if (!anime) e.classList.add("raye");
    else RT.observateur?.observe(e);
  }
  function derayer(e) {
    if (!e?.dataset.rature) return;
    const barre = e.querySelector(":scope > .rt-barre");
    if (barre) e.replaceChildren(...barre.childNodes);
    delete e.dataset.rature;
    e.classList.remove("raye");
  }
  function appliquerRatures() {
    if (!RT.actif || !RT.contenu) return;
    for (const r of RT.contenu.ratures || []) {
      let e = null;
      try { e = document.querySelector(String(r.cible || "")); } catch {}
      if (e) rayer(e, String(r.par || ""), true);
    }
  }
  // un mot raturé de plus, quand on revient sur l'onglet : dans un paragraphe qu'on a sous les yeux
  function glisserMot() {
    const mots = RT.contenu?.mots || [];
    if (!mots.length) return false;
    const candidats = [...document.querySelectorAll("main p, section p, .carte p")].filter((p) => {
      if (p.closest(".rt-voile, .rt-journal, .rt-sceau, [hidden]") || p.querySelector(".rt-glisse")) return false;
      const r = p.getBoundingClientRect();
      return r.bottom > 80 && r.top < innerHeight - 40 && (p.textContent || "").length > 40;
    });
    for (const p of candidats.sort(() => Math.random() - 0.5)) {
      const textes = [...p.childNodes].filter((x) => x.nodeType === 3 && /\p{L}{5,}/u.test(x.nodeValue));
      if (!textes.length) continue;
      const t = rtUn(textes);
      const l = [...t.nodeValue.matchAll(/\p{L}{5,}/gu)];
      const m = rtUn(l);
      const fin = t.splitText(m.index);
      fin.splitText(m[0].length);
      const s = el("span", { class: "rt-glisse", "data-mot": m[0] }, el("span", { class: "rt-barre", text: m[0] }), el("span", { class: "rt-mot", "aria-hidden": "true", text: rtUn(mots) }));
      fin.replaceWith(s);
      requestAnimationFrame(() => requestAnimationFrame(() => s.classList.add("raye")));
      return true;
    }
    return false;
  }
  function empreinte() {
    const e = el("i", { class: "rt-empreinte", "aria-hidden": "true", style: `left:${Math.round(rtHasard(6, 82))}vw;top:${Math.round(scrollY + rtHasard(0.15, 0.8) * innerHeight)}px;--r:${Math.round(rtHasard(-40, 40))}deg` });
    document.body.append(e);
  }
  function murmure(texte, ou = null) {
    if (!texte || document.querySelectorAll(".rt-murmure").length > 1) return;
    const etroit = innerWidth < 700;
    let style = etroit ? `left:${Math.round(rtHasard(6, 40))}vw;top:${Math.round(rtHasard(58, 74))}vh` : `left:${Math.round(Math.random() < 0.5 ? rtHasard(2, 14) : rtHasard(74, 84))}vw;top:${Math.round(rtHasard(22, 74))}vh`;
    const r = ou?.getBoundingClientRect();
    // près d'un bouton : en dessous s'il est en haut de l'écran, au-dessus s'il est en bas (et au-dessus du bouton du journal)
    if (r && r.bottom > 0 && r.top < innerHeight - 20) style = `left:${Math.max(8, Math.min(innerWidth - 220, Math.round(r.left - 10)))}px;top:${Math.round(r.top > innerHeight / 2 ? r.top - 118 : Math.min(r.bottom + 6, innerHeight - 70))}px`;
    const m = el("p", { class: "rt-main rt-murmure", style, "aria-hidden": "true", text: texte });
    document.body.append(m);
    setTimeout(() => m.classList.add("part"), 5200);
    setTimeout(() => m.remove(), 7000);
  }
  function battement() {
    if (!RT.actif || document.hidden) return;
    const t = performance.now(), P = RT.prochain;
    if (t > P.murmure) { P.murmure = t + rtHasard(45_000, 95_000); murmure(rtUn(RT.contenu?.murmures || [])); if (Math.random() < 0.35) rtSon("rt-murmure", { volume: 0.35 }); }
    if (t > P.grince) { P.grince = t + rtHasard(70_000, 160_000); rtSon("rt-grince", { volume: 0.6 }); }
    if (!reduit.matches && t > P.tremble) {
      P.tremble = t + rtHasard(50_000, 110_000);
      const titres = [...document.querySelectorAll("h2.titre-section")].filter((h) => { const r = h.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
      const h = titres.length ? rtUn(titres) : null;
      if (h) { h.classList.add("rt-tremble"); setTimeout(() => h.classList.remove("rt-tremble"), 520); }
    }
    if (!reduit.matches && t > P.navire) {
      P.navire = t + rtHasard(150_000, 260_000);
      const o = document.querySelector(".rt-ombre-navire");
      if (o) { o.classList.remove("passe"); void o.offsetWidth; o.classList.add("passe"); }
    }
    if (t - RT.inactif > 28_000 && !P.inactifDit) { P.inactifDit = true; murmure("Tu lis encore ?"); }
  }
  const rtBouge = () => { RT.inactif = performance.now(); RT.prochain.inactifDit = false; };
  function rtVisibilite() {
    if (!RT.actif) return;
    if (document.hidden) { RT.cache = Date.now(); return; }
    if (RT.cache && Date.now() - RT.cache > 2000 && RT.retours < 8) {
      RT.retours += 1;
      if (Math.random() < 0.65 ? glisserMot() : (empreinte(), true)) rtSon("rt-goutte", { volume: 0.7, retard: 0.2 });
    }
    RT.cache = 0;
    if (sonActif()) lancerBoucle("rature", "rt-drone", SON_NIVEAUX["rt-drone"]);
  }
  async function activerRature({ premiere = false } = {}) {
    if (RT.actif || !v4Ouverte()) return;
    if (!RT.contenu) {
      try { RT.contenu = JSON.parse(sessionStorage.getItem(RT_SESSION) || "null"); } catch {}
      if (!RT.contenu?.journal) {
        const code = rtCode();
        if (!code) return;
        const d = await rtApi({ code });
        if (d.ok && d.journal) { RT.contenu = d; try { sessionStorage.setItem(RT_SESSION, JSON.stringify(d)); } catch {} }
        else { if (d.ok === false) rtEcrire(RT_CLE, null); RT.contenu = null; rendreTache(); return; }
      }
    }
    if (RT.actif || !v4Ouverte()) return;
    RT.actif = true;
    document.documentElement.classList.add("rature");
    RT.observateur = "IntersectionObserver" in window ? new IntersectionObserver((l) => {
      for (const x of l) {
        if (!x.isIntersecting) continue;
        RT.observateur.unobserve(x.target);
        const attente = Math.max(0, RT.derniereRature + 700 - performance.now());
        RT.derniereRature = performance.now() + attente;
        setTimeout(() => { x.target.classList.add("raye"); rtSon("rt-plume", { volume: 0.8 }); }, attente + 350);
      }
    }, { threshold: 0.9 }) : null;
    appliquerRatures();
    document.body.append(
      el("div", { class: "rt-coulures", "aria-hidden": "true" }, ...Array.from({ length: 7 }, (_, k) => el("i", { style: `left:${Math.round(4 + k * 14 + rtHasard(-4, 4))}%;--h:${Math.round(rtHasard(40, 190))}px;--d:${Math.round(rtHasard(40, 90))}s;--w:${rtHasard(3, 7).toFixed(1)}px;animation-delay:-${Math.round(rtHasard(0, 60))}s` }))),
      el("div", { class: "rt-ombre-navire", "aria-hidden": "true" }),
      el("div", { class: "rt-vignette", "aria-hidden": "true" }),
      el("button", { type: "button", class: "rt-journal-bouton", id: "rt-journal-bouton", onclick: () => ouvrirJournal() }, rtSymbole("plume", 18), el("span", { text: "Le journal du Dernier Mot" })));
    const t = performance.now();
    RT.prochain = { murmure: t + (premiere ? 30_000 : 12_000), grince: t + 20_000, tremble: t + 25_000, navire: t + 40_000, inactifDit: false };
    RT.inactif = t;
    RT.retours = 0;
    clearInterval(RT.minuteur);
    RT.minuteur = setInterval(battement, 3000);
    for (const ev of ["pointermove", "scroll", "keydown", "touchstart"]) window.addEventListener(ev, rtBouge, { passive: true });
    document.addEventListener("visibilitychange", rtVisibilite);
    prechargerSons(SONS_RATURE);
    if (sonActif()) lancerBoucle("rature", "rt-drone", SON_NIVEAUX["rt-drone"]);
    else if (premiere) setTimeout(() => murmure("Mets le son.", $("sons")), 9000);
    rendreTache();
  }
  function eteindreRature({ choisi = true } = {}) {
    if (!RT.actif) return;
    RT.actif = false;
    if (choisi) rtEcrire(RT_ETEINT, "1");
    clearInterval(RT.minuteur);
    RT.observateur?.disconnect();
    RT.observateur = null;
    for (const ev of ["pointermove", "scroll", "keydown", "touchstart"]) window.removeEventListener(ev, rtBouge);
    document.removeEventListener("visibilitychange", rtVisibilite);
    arreterBoucle("rature", 1.2);
    document.querySelectorAll("[data-rature]").forEach(derayer);
    document.querySelectorAll(".rt-glisse:not(.rt-glisse-iv)").forEach((s) => s.replaceWith(document.createTextNode(s.dataset.mot || "")));
    document.querySelectorAll(".rt-coulures, .rt-ombre-navire, .rt-vignette, .rt-journal-bouton, .rt-murmure, .rt-empreinte").forEach((x) => x.remove());
    document.documentElement.classList.remove("rature");
    rendreTache();
    if (choisi) murmure("Je reviendrai.", $("rt-tache"));
  }

  // ---------- le journal de bord du Dernier Mot ----------
  function ouvrirJournal(k = 0) {
    const pages = RT.contenu?.journal || [];
    if (!pages.length || $("rt-journal")) return;
    let n = Math.max(0, Math.min(pages.length - 1, k));
    const feuille = el("div", { class: "rt-page" });
    const compte = el("span", { class: "rt-compte" });
    const avant = el("button", { type: "button", class: "rt-tourne", "aria-label": "Page précédente", onclick: () => aller(n - 1), text: "◀" });
    const apres = el("button", { type: "button", class: "rt-tourne", "aria-label": "Page suivante", onclick: () => aller(n + 1), text: "▶" });
    const fermer = () => { v.remove(); document.removeEventListener("keydown", touche); document.documentElement.classList.remove("rt-journal-ouvert"); $("rt-journal-bouton")?.focus(); };
    const touche = (ev) => { if (ev.key === "Escape") fermer(); else if (ev.key === "ArrowLeft") aller(n - 1); else if (ev.key === "ArrowRight") aller(n + 1); };
    const v = el("div", { class: "rt-journal", id: "rt-journal", role: "dialog", "aria-modal": "true", "aria-label": "Le journal de bord du Dernier Mot" },
      el("div", { class: "rt-livre" },
        el("p", { class: "rt-livre-titre", text: "Journal de bord du Dernier Mot" }),
        feuille,
        el("div", { class: "rt-livre-bas" }, avant, compte, apres),
        el("div", { class: "rt-livre-actions" },
          el("button", { type: "button", class: "rt-lien", onclick: () => fermer(), text: "Refermer le journal" }),
          el("button", { type: "button", class: "rt-lien rt-lien-cadenas", onclick: () => { fermer(); eteindreRature(); }, text: "Refermer le cadenas" }))));
    v.addEventListener("click", (ev) => { if (ev.target === v) fermer(); });
    function aller(i) {
      if (i < 0 || i >= pages.length) return;
      if (i !== n || !feuille.childElementCount) rtSon("rt-page", { volume: 0.9 });
      n = i;
      const p = pages[n];
      const mots = String(p.texte || "").split(" ");
      const corps = el("p", { class: "rt-texte", "aria-label": p.texte }, ...mots.map((m, j) => el("span", { style: `--i:${j}`, "aria-hidden": "true", text: `${m} ` })));
      vider(feuille,
        el("p", { class: "rt-jour", text: String(p.jour || "") }),
        el("h3", { class: "rt-page-titre", text: String(p.titre || "") }),
        corps,
        p.nom ? el("p", { class: "rt-signature" }, el("span", { class: "rt-main rt-nom", text: String(p.nom) })) : null);
      feuille.classList.remove("ecrit");
      void feuille.offsetWidth;
      feuille.classList.add("ecrit");
      if (p.nom) setTimeout(() => { const s = feuille.querySelector(".rt-nom"); if (s) { s.classList.add("raye"); rtSon("rt-plume", { volume: 0.9 }); } }, reduit.matches ? 400 : mots.length * 45 + 1800);
      compte.textContent = `${n + 1} / ${pages.length}`;
      avant.disabled = n === 0;
      apres.disabled = n === pages.length - 1;
    }
    document.body.append(v);
    document.documentElement.classList.add("rt-journal-ouvert");
    document.addEventListener("keydown", touche);
    aller(n);
    apres.focus();
  }

  // la tache d'encre en bas du site : le cadenas (ou, une fois ouvert, de quoi rappeler ou renvoyer Rature)
  function rendreTache() {
    const pied = document.querySelector(".pied-petit");
    let t = $("rt-tache");
    if (!v4Ouverte() || !pied) { t?.remove(); return; }
    if (!t) {
      t = el("button", { type: "button", class: "rt-tache", id: "rt-tache", onclick: (ev) => {
        if (RT.actif) { eteindreRature(); return; }
        if (rtCode()) { rtEcrire(RT_ETEINT, null); activerRature(); return; }
        ouvrirCadenas(ev.currentTarget);
      } }, rtTache(16));
      pied.append(" ", t);
    }
    const ouvert = Boolean(rtCode());
    t.classList.toggle("ouverte", ouvert);
    t.setAttribute("aria-label", RT.actif ? "Refermer le cadenas" : ouvert ? "Rouvrir le cadenas" : "Une tache d'encre");
  }
  function rendreRature() {
    rendreTache();
    navireNoir();
    marqueTroisHeures();
    if (!v4Ouverte()) { if (RT.actif) eteindreRature({ choisi: false }); return; }
    if (RT.actif) appliquerRatures();
    else if (rtCode() && rtLire(RT_ETEINT) !== "1") activerRature();
  }
  setInterval(() => { if (!document.hidden) { navireNoir(); marqueTroisHeures(); } }, 60_000);

  function rendreTout() {
    const vf = v4Ouverte();
    if (vfRendue === false && vf) vfEnDirect();
    vfRendue = vf;
    document.documentElement.classList.toggle("v4", vf);
    rendreMenuVF();
    rendreAccueilVF();
    rendreCaritatif();
    if (!ancreFaite && location.hash.length > 1) setTimeout(retourAncre, 60);
    rendreEscale();
    rendreEntete();
    rendreFideles();
    rendreBahriot();
    rendreGuerre();
    rendreCreatures();
    rendreRature();
    rendreMer();
    rendreShow();
    rendreMaintenant();
    rendreEvenements();
    bulleAccueil();
    rendreChaine();
    rendrePotes();
    surveillerPotes();
    rendreYoutube();
    rendreDiscord();
    rendreChopper();
    rendreTournoi();
    rendreClassementJeu();
    if (!tirageEnCours) { rendreAlbum(); rendreCollectionneurs(); if (!$("tirage")?.querySelector(".retourne")) rendreTirage(); }
    rendreJeux();
    rendreChasse();
    rendreFaille();
    rendreGrandLine();
  }

  async function charger() {
    try {
      const r = await fetch("/api/public", { headers: { Accept: "application/json" } });
      donnees = recevoirPublic(await r.json());
    } catch {
      donnees = { horsLigne: true };
    }
    if (!donnees || typeof donnees !== "object") donnees = { horsLigne: true };
    if (!donnees.evenements) donnees.evenements = evenementsSecours();
    rendreTout();
  }

  // ---------- l'escale : quand le bot ne répond pas (maintenance, redémarrage), le site le dit à sa façon ----------
  // « Le navire fait escale au port pour prendre des provisions » : un bandeau, une carte dans chaque partie qui dépend
  // du bot, GRAND LINE à quai ; la page redemande toutes les 20 s, et dit « Le navire est reparti ! » au retour.
  const PARTIES_BOT = {
    chaine: "Le lecteur, le statut du live et les fidèles du stream reviennent dès que le navire repart.",
    potes: "Les lives de tes potes reviennent dès que le navire repart.",
    youtube: "Les dernières vidéos reviennent dès que le navire repart.",
    chopper: "Chopper est descendu à terre chercher des pommes 🍎. Il revient vite, promis !",
    cartes: "Les cartes sont rangées à l'abri dans la cale le temps de l'escale. Ton album n'a rien perdu.",
    jeux: "Les jeux reprennent dès que le navire repart (tes scores et tes records sont gardés).",
    chasse: "Les avis de recherche sont à l'abri au port : les primes reprennent au départ du navire.",
    faille: "Les games jouées pendant l'escale seront notées au retour du navire.",
    tournoi: "Le tableau du tournoi revient au départ du navire.",
  };
  let escaleAvant = false;
  let minuteurEscale = null;
  function carteEscale(texte) {
    return el("div", { class: "escale-carte", role: "status" },
      el("div", { class: "escale-image", "aria-hidden": "true" },
        el("img", { src: "/img/grandline-port.webp", alt: "", width: 820, height: 505, loading: "lazy", decoding: "async" }),
        el("span", { class: "escale-caisse", text: "📦" })),
      el("div", {},
        el("p", { class: "escale-sur", text: "⚓ Escale au port" }),
        el("p", { class: "escale-titre", text: "Le navire fait le plein de provisions" }),
        el("p", { class: "escale-texte", text: texte })));
  }
  function rendreEscale() {
    const escale = Boolean(donnees?.horsLigne);
    document.documentElement.classList.toggle("en-escale", escale);
    let b = $("escale");
    if (escale && !b && lireSession("barhaw-escale") !== "replie") {
      b = el("div", { class: "escale-bandeau", id: "escale", role: "status" },
        el("span", { class: "escale-navire", "aria-hidden": "true" }, el("b", { text: "⛵" })),
        el("p", {}, el("strong", { text: "Escale au port !" }), " Le navire fait une pause pour prendre des provisions (le bot est en maintenance). Il revient vite : tout ce que vous avez fait est gardé."),
        el("button", { type: "button", class: "escale-fermer", "aria-label": "Replier", onclick: () => { ecrireSession("barhaw-escale", "replie"); $("escale")?.remove(); }, text: "✕" }));
      document.body.append(b);
    }
    if (!escale && b) b.remove();
    for (const [id, texte] of Object.entries(PARTIES_BOT)) {
      const partie = $(id);
      if (!partie) continue;
      const c = partie.querySelector(":scope > .escale-carte");
      if (escale && !c) partie.querySelector(":scope > .entete-section")?.after(carteEscale(texte));
      if (!escale && c) c.remove();
    }
    if (escaleAvant && !escale) {
      ecrireSession("barhaw-escale", "");
      const t = el("div", { class: "escale-retour", role: "status", text: "⛵ Le navire est reparti ! Tout est revenu." });
      document.body.append(t);
      setTimeout(() => t.remove(), 4200);
    }
    escaleAvant = escale;
    clearInterval(minuteurEscale);
    minuteurEscale = escale ? setInterval(() => { if (!document.hidden) charger(); }, 20_000) : null;
  }

  // ---------- les fidèles du stream : le temps passé sur le live, même sans écrire (lib/fideles.js du bot) ----------
  let mesFideles = null;
  let fidelesOccupe = false;
  let fidelesOnglet = "mois";
  let fidelesMessage = null;
  let guetteFideles = null;
  let fidRetrait = false;
  const dureeFid = (m) => { m = Math.max(0, Math.round(Number(m) || 0)); if (m < 60) return `${m} min`; const h = Math.floor(m / 60); return m % 60 ? `${h} h ${String(m % 60).padStart(2, "0")}` : `${h} h`; };
  function rendreFideles() {
    const z = $("fideles");
    if (!z) return;
    const f = donnees?.fideles;
    if (!f) { z.hidden = true; return; }
    z.hidden = false;
    const liste = f[fidelesOnglet] || [];
    const max = Math.max(1, ...liste.map((x) => x.minutes));
    const rec = f.recompense || { minutes: 10, berrys: 2000, milles: 2 };
    const m = mesFideles;
    let toi;
    if (!moi?.connecte) {
      toi = [el("p", { class: "gl-texte", text: "Connecte-toi avec Discord, puis relie ton Twitch une fois : ton temps sur le live compte, même si tu n'écris rien." }),
        el("a", { class: "btn btn-plein btn-petit", href: "/api/auth/login", text: "Connexion avec Discord" })];
    } else if (!m) {
      toi = [el("p", { class: "gl-texte", text: "Chargement…" })];
    } else if (m.lie) {
      toi = [
        el("p", { class: "fid-relie" }, "Relié à ", el("a", { href: `https://twitch.tv/${m.login}`, target: "_blank", rel: "noopener", text: `twitch.tv/${m.login}` })),
        el("div", { class: "gl-moi-chiffres" },
          el("p", {}, el("b", { text: dureeFid(m.minutes.mois) }), el("span", { text: `ce mois-ci${m.rang ? ` (${m.rang}e)` : ""}` })),
          el("p", {}, el("b", { text: dureeFid(m.minutes.total) }), el("span", { text: "en tout" })),
          f.enLive ? el("p", {}, el("b", { text: dureeFid(m.minutes.live) }), el("span", { text: "ce live" })) : null),
        el("button", { type: "button", class: `lien-discret${fidRetrait ? " danger" : ""}`, disabled: fidelesOccupe, onclick: () => { if (!fidRetrait) { fidRetrait = true; rendreFideles(); setTimeout(() => { fidRetrait = false; rendreFideles(); }, 6000); return; } fidRetrait = false; agirFideles("fideles-retirer"); }, text: fidRetrait ? "Sûr ? Ton temps compté sera effacé. Clique encore pour retirer." : "Retirer mon Twitch (efface tout)" }),
      ];
    } else if (m.code) {
      const commande = `!lier ${m.code}`;
      toi = [
        el("p", { class: "gl-texte", text: "Tape ça dans le chat de mon live (même hors live, le bot lit le chat) :" }),
        el("div", { class: "fid-code" },
          el("code", { text: commande }),
          el("button", { type: "button", class: "btn btn-contour btn-petit", onclick: (ev) => { navigator.clipboard?.writeText(commande).then(() => { ev.target.textContent = "Copié ✓"; }).catch(() => {}); }, text: "Copier" }),
          el("a", { class: "btn btn-plein btn-petit", href: "https://www.twitch.tv/popout/lilianobarhaw/chat", target: "_blank", rel: "noopener", text: "Ouvrir le chat" })),
        el("p", { class: "note", text: `Le code marche ${Math.max(1, Math.round((m.expire - Date.now()) / 60_000))} min. Cette carte se met à jour toute seule dès que c'est relié.` }),
      ];
    } else {
      toi = [el("p", { class: "gl-texte", text: "Relie ton Twitch une fois (un code à taper dans le chat), et chaque minute passée sur le live compte, même sans écrire." }),
        el("button", { type: "button", class: "btn btn-plein btn-petit", disabled: fidelesOccupe, onclick: () => agirFideles("fideles-code"), text: "📺 Relier mon Twitch" })];
    }
    vider(z,
      el("div", { class: "fid-tete" },
        el("div", {},
          el("p", { class: "gl-sur", text: "Les fidèles du stream" }),
          el("h3", { class: "gl-titre", text: "Ceux qui restent le plus longtemps" }),
          el("p", { class: "gl-texte", text: `Même sans écrire : toutes les ${rec.minutes} min sur le live, +${nombre(rec.berrys)} ฿ sur ton avis de recherche et +${rec.milles} milles pour le navire de GRAND LINE (jusqu'à 6 h par live).` })),
        f.enLive ? el("span", { class: "fid-direct" }, el("i"), "Live en cours : ça compte !") : null),
      el("div", { class: "fid-corps" },
        el("div", { class: "fid-classement" },
          el("div", { class: "fid-onglets", role: "tablist" },
            [["mois", "Ce mois-ci"], ["tout", "Depuis toujours"]].map(([k, t]) => el("button", { type: "button", role: "tab", "aria-selected": String(fidelesOnglet === k), class: "fid-onglet", onclick: () => { fidelesOnglet = k; rendreFideles(); }, text: t }))),
          liste.length
            ? el("ol", { class: "fid-liste" }, liste.map((x, k) => el("li", { class: `fid-ligne${k < 3 ? ` podium-${k + 1}` : ""}`, style: `--part:${Math.max(6, Math.round((x.minutes / max) * 100))}%` },
                el("span", { class: "gl-rang", text: k < 3 ? ["🥇", "🥈", "🥉"][k] : `${k + 1}` }),
                el("img", { class: "gl-avatar", src: lienSur(x.avatar) || "/img/chopper-visage.jpg", alt: "", width: 34, height: 34, loading: "lazy" }),
                el("span", { class: "gl-nom", text: x.nom }),
                el("b", { text: dureeFid(x.minutes) }))))
            : el("p", { class: "vide", text: fidelesOnglet === "mois" ? "Personne encore ce mois-ci : relie ton Twitch et viens sur le live pour ouvrir le classement !" : "Le classement s'ouvre au premier live après avoir relié son Twitch." })),
        el("div", { class: "fid-toi" }, el("p", { class: "gl-petit-titre", text: "Toi" }), toi,
          fidelesMessage ? el("p", { class: `gl-message${fidelesMessage.erreur ? " erreur" : ""}`, role: "status", text: fidelesMessage.texte }) : null)),
      el("p", { class: "note", text: `${nombre(f.relies || 0)} ${(f.relies || 0) > 1 ? "fidèles reliés" : "fidèle relié"} · seuls ceux qui ont relié leur Twitch apparaissent, avec leur pseudo Discord. Twitch ne compte que les viewers connectés au chat (connectés à leur compte, chat ouvert).` }),
    );
  }
  // ---------- la VF 1.0 : LE BARHAW SHOW (février 2027) ----------
  // 4 équipes de 5, chacune menée par un streameur qui joue aussi. 4 semaines : chaque semaine, un petit tournoi sur le jeu
  // d'une des équipes (elle joue « à domicile ») : les demi-finales le vendredi à 21 h, la finale et le match pour la 3e place
  // le samedi à 21 h. 10, 6, 3 et 1 points selon la place ; au bout du mois, le meilleur total gagne le Show.
  // Tout le monde peut streamer sa partie. Les résultats et les joueurs viendront du bot (donnees.show : { resultats:
  // { "1": [1er, 2e, 3e, 4e] (identifiants d'équipe) }, equipes: { kikso: { joueurs: [...] } } }) ; sans eux : le programme,
  // les équipes (4 joueurs à révéler chacune) et un classement à zéro. L'ordre des semaines et les soirs se changent ici.
  const SHOW = {
    titre: "Le Barhaw Show",
    points: [10, 6, 3, 1],
    equipes: [
      { id: "liliano", capitaine: "Liliano", twitch: "lilianobarhaw", c1: "#ff5aae", c2: "#55ccff", vif: "#ff5aae" },
      { id: "kikso", capitaine: "Kikso", twitch: "kikso06", c1: "#6d2790", c2: "#d9a8ff", vif: "#c98bff" },
      { id: "veyzo", capitaine: "Veyzo", twitch: "veyzo_off", c1: "#ffc23d", c2: "#c8150f", vif: "#ffc23d" },
      { id: "moode", capitaine: "Moode", twitch: "m_oo_de", c1: "#2fc4a8", c2: "#1e5fd6", vif: "#3fdcbf" },
    ],
    semaines: [
      { n: 1, equipe: "kikso", jeu: "VALORANT", mode: "5 contre 5", icone: "viseur", du: "2027-02-01", au: "2027-02-07", demies: "2027-02-05T21:00:00+01:00", finale: "2027-02-06T21:00:00+01:00" },
      { n: 2, equipe: "veyzo", jeu: "Rainbow Six Siege", mode: "5 contre 5", icone: "bouclier", du: "2027-02-08", au: "2027-02-14", demies: "2027-02-12T21:00:00+01:00", finale: "2027-02-13T21:00:00+01:00" },
      { n: 3, equipe: "moode", jeu: "Fortnite", mode: "Zone Wars, 5 contre 5", icone: "zone", du: "2027-02-15", au: "2027-02-21", demies: "2027-02-19T21:00:00+01:00", finale: "2027-02-20T21:00:00+01:00" },
      { n: 4, equipe: "liliano", jeu: "League of Legends", mode: "5 contre 5", icone: "epees", du: "2027-02-22", au: "2027-02-28", demies: "2027-02-26T21:00:00+01:00", finale: "2027-02-27T21:00:00+01:00" },
    ],
  };
  const SOIR_SHOW = 4 * 3_600_000; // un soir de match dure environ 4 h
  const fmtSoir = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" });
  const fmtMoisLong = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", month: "long" });
  const jourParis = (t) => new Date(t).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }); // « 2027-02-05 »
  const equipeShow = (id) => SHOW.equipes.find((e) => e.id === id) || SHOW.equipes[0];
  const placeTexte = (p) => (p === 1 ? "1er" : `${p}e`);
  const ptsTexte = (n) => `${n} pt${n > 1 ? "s" : ""}`;
  const soirShow = (t) => `${majuscule(fmtSoir.format(new Date(ms(t))))} · ${heure(ms(t))}`; // « Ven. 5 févr. · 21 h »
  function periodeShow(w) {
    const j = (d) => { const n = Number(d.slice(8, 10)); return n === 1 ? "1er" : String(n); };
    return `du ${j(w.du)} au ${j(w.au)} ${fmtMoisLong.format(new Date(`${w.au}T12:00:00+01:00`))}`;
  }
  const styleEquipe = (e) => `--c1:${e.c1};--c2:${e.c2};--sh-vif:${e.vif};--sh-texte:${clair(e.c1) ? "#12050d" : "#fff"}`;
  const emblemeShow = (e, classe = "") => el("span", { class: `sh-embleme${classe ? ` ${classe}` : ""}`, style: styleEquipe(e), "aria-hidden": "true", text: e.capitaine[0] });
  // les petites icônes des jeux (dessinées pour le site, pas les logos des jeux)
  const ICONES_SHOW = {
    viseur: [["circle", { cx: 12, cy: 12, r: 7 }], ["path", { d: "M12 2v5M12 17v5M2 12h5M17 12h5" }], ["circle", { cx: 12, cy: 12, r: 1.4, class: "plein" }]],
    bouclier: [["path", { d: "M12 2.5 19.5 5.5V11c0 4.6-3.1 8.4-7.5 10.5C7.6 19.4 4.5 15.6 4.5 11V5.5z" }], ["path", { d: "M12 6.5v11M8 10.5h8" }]],
    zone: [["circle", { cx: 12, cy: 12, r: 9.5, class: "pointille" }], ["circle", { cx: 13.5, cy: 10.5, r: 4.5 }], ["path", { d: "M13.5 8.5v4M11.5 10.5h4" }]],
    epees: [["path", { d: "M4 4l11 11M20 4 9 15" }], ["path", { d: "M13 17l4-4M7 13l4 4M15.5 15.5l3.5 3.5M8.5 15.5 5 19" }]],
  };
  function iconeShow(nom) {
    const s = (tag, attrs = {}) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };
    const svg = s("svg", { viewBox: "0 0 24 24", class: "sh-icone", "aria-hidden": "true" });
    for (const [tag, attrs] of ICONES_SHOW[nom] || []) svg.append(s(tag, attrs));
    return svg;
  }
  function enLiveShow(e) {
    if (e.twitch === MA_CHAINE) return Boolean(donnees?.chaine?.enLive);
    return Boolean((donnees?.amis || []).find((a) => String(a?.login || "").toLowerCase() === e.twitch)?.enLive);
  }
  // où en est le Show : avant (le compte à rebours), en cours (la semaine, un soir de match en direct), fini (le vainqueur)
  function etatShow() {
    const t = Date.now();
    const S = SHOW.semaines;
    const res = donnees?.show?.resultats && typeof donnees.show.resultats === "object" ? donnees.show.resultats : {};
    const faite = (w) => Array.isArray(res[w.n]) && res[w.n].length === SHOW.equipes.length && res[w.n].every((id) => SHOW.equipes.some((e) => e.id === id));
    const faites = S.filter(faite);
    const jour = jourParis(t);
    const semaine = S.find((w) => jour >= w.du && jour <= w.au) || null;
    const soir = S.flatMap((w) => [[w, "demies"], [w, "finale"]]).find(([w, k]) => t >= ms(w[k]) - 1_800_000 && t < ms(w[k]) + SOIR_SHOW && !(k === "finale" && faite(w))) || null;
    const prochain = S.flatMap((w) => [[w, "demies"], [w, "finale"]]).find(([w, k]) => ms(w[k]) > t) || null;
    const fin = ms(S.at(-1).finale) + SOIR_SHOW;
    const phase = faites.length === S.length || t >= fin ? "fini" : jour >= S[0].du ? "en-cours" : "avant";
    return { t, phase, semaine, soir, prochain, res, faites, faite };
  }
  // le classement : les points de chaque semaine jouée, puis le total (à égalité : le plus de victoires)
  function classementShow(res) {
    const l = SHOW.equipes.map((e, ordre) => {
      const parSemaine = SHOW.semaines.map((w) => {
        const r = Array.isArray(res[w.n]) ? res[w.n] : [];
        const k = r.indexOf(e.id);
        return k >= 0 ? { place: k + 1, points: SHOW.points[k] || 0 } : null;
      });
      return { e, ordre, parSemaine, total: parSemaine.reduce((a, x) => a + (x?.points || 0), 0), victoires: parSemaine.filter((x) => x?.place === 1).length };
    });
    return l.sort((a, b) => b.total - a.total || b.victoires - a.victoires || a.ordre - b.ordre);
  }
  // l'agenda : le Barhaw Show y entre avec la VF 1.0 (sauf si le bot l'a déjà, ajouté avec /evenement)
  function agendaAvecShow(ev) {
    if (!v4Ouverte() || !ev) return ev;
    if ([...(ev.aVenir || []), ...(ev.passes || [])].some((e) => /barhaw\s*show/i.test(String(e?.titre || "")))) return ev;
    const t = Date.now();
    const debut = ms(SHOW.semaines[0].demies);
    const fin = ms(`${SHOW.semaines.at(-1).finale.slice(0, 10)}T00:00:00+01:00`);
    const show = {
      id: "barhaw-show", type: "show", titre: SHOW.titre, debut, heure: true, fin, ancre: "barhaw-show",
      description: "4 équipes de 5 menées par Liliano, Kikso, Veyzo et Moode. Un jeu par semaine : VALORANT, Rainbow Six Siege, Fortnite (Zone Wars) et League of Legends. Une seule équipe gagne le Show.",
    };
    if (finDe(show) < t) return { ...ev, passes: [show, ...(ev.passes || [])].slice(0, 3) };
    return { ...ev, aVenir: [...(ev.aVenir || []), { ...show, enCours: debut <= t }].sort((a, b) => ms(a.debut) - ms(b.debut)) };
  }
  // l'agenda : la SEMAINE BAHRIOT y entre aussi avec la VF 1.0, aux dates que donne le bot (du lundi au dimanche),
  // sauf si le bot l'a déjà (ajoutée avec /evenement) ; son bouton mène à sa partie (s'inscrire, puis le classement)
  function agendaAvecBahriot(ev) {
    const b = donnees?.bahriot;
    if (!v4Ouverte() || !ev || !b?.debut || !b?.fin) return ev;
    if ([...(ev.aVenir || []), ...(ev.passes || [])].some((e) => /bahriot/i.test(String(e?.titre || "")))) return ev;
    const t = Date.now();
    const jeux = [["lol", "LoL"], ["valorant", "VALORANT"], ["tft", "TFT"]].filter(([k]) => b.jeux?.[k]).map(([, n]) => n);
    const lesJeux = jeux.length > 1 ? `${jeux.slice(0, -1).join(", ")} et ${jeux.at(-1)}` : jeux[0] || "les jeux Riot";
    const debut = ms(b.debut);
    const bahriot = {
      id: String(b.id || "bahriot"), type: "bahriot", titre: b.nom || "SEMAINE BAHRIOT", debut, heure: false,
      fin: ms(b.fin) - 86_400_000, ancre: "bahriot", ancreTexte: b.phase === "inscriptions" ? "S'inscrire" : "Voir le classement",
      description: `Les commus de la flotte s'affrontent pendant une semaine sur ${lesJeux} : toutes les parties comptent.${b.lot ? ` Le n° 1 gagne ${b.lot}.` : ""}`,
    };
    if (finDe(bahriot) < t) return { ...ev, passes: [bahriot, ...(ev.passes || [])].sort((x, y) => ms(y.debut) - ms(x.debut)).slice(0, 3) };
    return { ...ev, aVenir: [...(ev.aVenir || []), { ...bahriot, enCours: debut <= t }].sort((x, y) => ms(x.debut) - ms(y.debut)) };
  }
  // la Guerre des commus entre aussi dans l'agenda avec la VF (aux dates que donne le bot), sauf si le bot l'a déjà
  function agendaAvecGuerre(ev) {
    const g = donnees?.guerre;
    if (!v4Ouverte() || !ev || !g?.debut || !g?.fin || g.essai) return ev; // (la saison d'essai n'entre pas dans l'agenda)
    if ([...(ev.aVenir || []), ...(ev.passes || [])].some((e) => /guerre des commus/i.test(String(e?.titre || "")))) return ev;
    const t = Date.now();
    const debut = ms(g.debut);
    const guerre = {
      id: `guerre-${g.saison || 1}`, type: "guerre", titre: `La Guerre des commus · saison ${g.saison || 1}`, debut, heure: false, fin: ms(g.fin),
      ancre: "guerre", ancreTexte: g.phase === "bientot" ? "Les règles" : g.phase === "annonce" ? "Je m'engage" : "Voir la carte",
      description: `Les commus de la flotte se disputent les îles de GRAND LINE : une bataille chaque soir à ${g.heure || "21 h"}. La commu qui tient le plus d'îles à la fin règne.`,
    };
    if (finDe(guerre) < t) return { ...ev, passes: [guerre, ...(ev.passes || [])].sort((x, y) => ms(y.debut) - ms(x.debut)).slice(0, 3) };
    return { ...ev, aVenir: [...(ev.aVenir || []), { ...guerre, enCours: debut <= t }].sort((x, y) => ms(x.debut) - ms(y.debut)) };
  }
  function agendaVF(ev) { return agendaAvecGuerre(agendaAvecBahriot(agendaAvecShow(ev))); }

  let minuteurShow = null;
  let cleShow = "";
  function rendreShow() {
    const section = $("barhaw-show");
    if (!section) return;
    const vf = document.documentElement.classList.contains("v4");
    const s = etatShow();
    const pastille = $("pastille-show");
    if (pastille) pastille.hidden = !(vf && s.soir);
    if (!vf) { clearInterval(minuteurShow); cleShow = ""; return; }
    const lives = SHOW.equipes.map(enLiveShow);
    const joueurs = donnees?.show?.equipes || null;
    const cle = JSON.stringify([s.phase, s.semaine?.n || 0, s.soir ? `${s.soir[0].n}${s.soir[1]}` : "", s.prochain ? `${s.prochain[0].n}${s.prochain[1]}` : "", s.res, lives, joueurs]);
    if (cle === cleShow) return;
    cleShow = cle;
    afficheShow(s);
    const zEq = $("show-equipes");
    const vuEq = dejaVu(zEq);
    const cartes = equipesShow(s, lives);
    vider(zEq, cartes);
    apparaitre(cartes, vuEq);
    vider($("show-programme"), programmeShow(s));
    vider($("show-classement"), blocClassementShow(s));
    vider($("show-regles"), reglesShow());
    vider($("show-lives"), livesShow(lives));
  }

  function afficheShow(s) {
    const z = $("show-affiche");
    clearInterval(minuteurShow);
    let statut;
    let tic = null;
    if (s.phase === "avant") {
      const cible = ms(SHOW.semaines[0].demies);
      const rebours = el("div", { class: "rebours sh-rebours", role: "timer", "aria-label": "Avant le premier match du Barhaw Show" });
      tic = () => {
        if (enVeille(rebours)) return;
        const reste = cible - Date.now();
        if (reste <= 0) { clearInterval(minuteurShow); cleShow = ""; rendreShow(); return; }
        const x = Math.floor(reste / 1000);
        const parts = [[Math.floor(x / 86400), "jours"], [Math.floor((x % 86400) / 3600), "heures"], [Math.floor((x % 3600) / 60), "min"], [x % 60, "sec"]];
        vider(rebours, parts.map(([v, u]) => el("div", {}, el("b", { text: String(v).padStart(2, "0") }), el("small", { text: u }))));
      };
      statut = [el("p", { class: "sh-statut", text: `Premier match : ${dateLongue(cible, true)}` }), rebours];
    } else if (s.phase === "en-cours") {
      const w = s.semaine || s.prochain?.[0] || SHOW.semaines[0];
      const dom = equipeShow(w.equipe);
      const soir = s.soir;
      const suite = s.prochain && !soir
        ? `Prochain soir : ${s.prochain[1] === "demies" ? "les demi-finales" : "la finale"}, ${dateLongue(ms(s.prochain[0][s.prochain[1]]), true)} (${dansCombien(ms(s.prochain[0][s.prochain[1]]))})`
        : soir ? (soir[1] === "demies" ? "Les demi-finales, ce soir : deux matchs, quatre équipes." : "La finale et le match pour la 3e place, ce soir.") : "";
      statut = [
        el("p", { class: "sh-statut" },
          soir ? el("span", { class: "sh-direct" }, el("i", { class: "sh-point", "aria-hidden": "true" }), "En direct") : null,
          `Semaine ${w.n} · ${w.jeu}, chez ${dom.capitaine}`),
        suite ? el("p", { class: "sh-sous", text: suite }) : null,
      ];
    } else {
      const [g, ...reste] = classementShow(s.res);
      statut = [
        el("p", { class: "sh-gagnant" }, emblemeShow(g.e, "grand"), el("span", {}, el("small", { text: "Le Barhaw Show est gagné par" }), el("b", { text: `l'équipe de ${g.e.capitaine}` }))),
        el("p", { class: "sh-sous", text: `${g.total} points sur ${SHOW.points[0] * SHOW.semaines.length}${reste[0] ? `, devant l'équipe de ${reste[0].e.capitaine} (${reste[0].total})` : ""}.` }),
      ];
    }
    vider(z,
      el("div", { class: "sh-ampoules", "aria-hidden": "true" }),
      el("div", { class: "sh-projecteurs", "aria-hidden": "true" }, el("i"), el("i")),
      el("div", { class: "sh-scene" },
        el("p", { class: "sh-surtitre", text: "Février 2027 · 4 semaines · 4 jeux" }),
        el("p", { class: "sh-logo", "aria-hidden": "true" }, el("span", { text: "Le Barhaw" }), el("b", { text: "Show" })),
        el("ul", { class: "sh-capitaines", "aria-label": "Les quatre capitaines" }, SHOW.equipes.map((e) => el("li", { style: styleEquipe(e) },
          emblemeShow(e, "grand"),
          el("b", { text: e.capitaine }),
          el("small", { text: SHOW.semaines.find((w) => w.equipe === e.id)?.jeu || "" })))),
        el("div", { class: "sh-statut-bloc", "aria-live": "polite" }, statut),
        el("div", { class: "boutons sh-boutons" },
          el("button", { class: "btn btn-plein btn-petit", type: "button", onclick: () => lancerTrailerShow(true), text: "▶ Le trailer" }),
          el("a", { class: "btn btn-contour btn-petit", href: "#show-programme", text: "Le programme ↓" }),
          el("a", { class: "btn btn-contour btn-petit", href: "#show-lives", text: "Où regarder ↓" })),
      ),
    );
    z.classList.toggle("en-direct", Boolean(s.soir));
    z.classList.toggle("fini", s.phase === "fini");
    if (tic) { tic(); minuteurShow = setInterval(tic, 1000); } // le compte à rebours, une fois dans la page
  }

  // le trailer du Show (1 min 48) : l'image du film et son bouton ; au clic, la vidéo démarre avec le son et ses commandes.
  // Rien ne se charge avant le clic ; en 480p sur un petit écran ou en économie de données. Pendant qu'il passe avec le son,
  // la musique du site s'arrête (comme pour toute vidéo) et les autres sons du site se font tout petits.
  // À la fin, l'image et le bouton reviennent (« le revoir »).
  function lancerTrailerShow(defiler = false) {
    const v = $("st-video");
    const b = $("st-lancer");
    if (!v || !b) return;
    if (!v.dataset.pret) {
      v.dataset.pret = "1";
      if (Math.min(innerWidth, screen?.width || innerWidth) < 700 || navigator.connection?.saveData) {
        for (const s of v.querySelectorAll("source")) s.src = s.getAttribute("src").replace("-720.", "-480.");
        v.load();
      }
    }
    if (defiler) $("show-trailer")?.scrollIntoView({ behavior: reduit.matches ? "auto" : "smooth", block: "center" });
    b.hidden = true;
    v.controls = true;
    v.muted = false;
    v.play?.()?.catch?.(() => { b.hidden = false; v.controls = false; });
    v.focus?.({ preventScroll: true });
  }
  function suivreTrailerShow() {
    const v = $("st-video");
    const b = $("st-lancer");
    if (!v || !b) return;
    b.addEventListener("click", () => lancerTrailerShow());
    let baisse = null;
    const regler = () => {
      const oui = !v.paused && !v.ended && !v.muted && v.volume > 0;
      if (oui && baisse === null && SON.maitre) { baisse = SON.maitre.gain.value; SON.maitre.gain.value = baisse * 0.15; }
      else if (!oui && baisse !== null) { if (SON.maitre) SON.maitre.gain.value = baisse; baisse = null; }
    };
    for (const ev of ["play", "pause", "ended", "volumechange"]) v.addEventListener(ev, regler);
    v.addEventListener("ended", () => {
      if (document.fullscreenElement === v) document.exitFullscreen?.()?.catch?.(() => {});
      v.controls = false;
      b.hidden = false;
      const sous = $("st-sous");
      if (sous) sous.textContent = "1 min 48 · le revoir";
    });
    // aucune des deux vidéos ne passe : l'image reste, avec un mot
    v.querySelector("source:last-child")?.addEventListener("error", () => {
      v.controls = false;
      b.hidden = false;
      const sous = $("st-sous");
      if (sous) sous.textContent = "La vidéo ne se charge pas, réessaie plus tard";
    });
  }

  function equipesShow(s, lives) {
    return SHOW.equipes.map((e, k) => {
      const w = SHOW.semaines.find((x) => x.equipe === e.id);
      const noms = Array.isArray(donnees?.show?.equipes?.[e.id]?.joueurs) ? donnees.show.equipes[e.id].joueurs.filter((n) => typeof n === "string" && n.trim()).slice(0, 4) : [];
      const joueurs = [
        el("li", { class: "sh-joueur capitaine" }, el("b", { text: e.capitaine }), el("small", { text: "capitaine" })),
        ...Array.from({ length: 4 }, (_, i) => (noms[i]
          ? el("li", { class: "sh-joueur" }, el("b", { text: noms[i] }))
          : el("li", { class: "sh-joueur scelle", "aria-label": "Joueur à révéler" }, el("span", { "aria-hidden": "true", text: "?" })))),
      ];
      const ligne = classementShow(s.res).find((x) => x.e.id === e.id);
      return el("article", { class: "carte sh-equipe", style: styleEquipe(e), "aria-label": `Équipe ${e.capitaine}` },
        el("div", { class: "sh-equipe-tete" },
          emblemeShow(e, "moyen"),
          el("div", {}, el("small", { class: "sh-equipe-label", text: "Équipe" }), el("h3", { text: e.capitaine }), el("p", {}, iconeShow(w.icone), w.jeu))),
        el("ul", { class: "sh-joueurs", "aria-label": `Les joueurs de l'équipe ${e.capitaine}` }, joueurs),
        el("p", { class: "sh-domicile" }, el("b", { text: `Semaine ${w.n}` }), ` : elle joue à domicile, ${periodeShow(w)}.`),
        el("div", { class: "sh-equipe-bas" },
          el("a", { class: `sh-chaine${lives[k] ? " allume" : ""}`, href: `https://www.twitch.tv/${e.twitch}`, title: `twitch.tv/${e.twitch}`, ...externe },
            el("i", { class: "sh-point", "aria-hidden": "true" }), lives[k] ? "En live" : "Sa chaîne Twitch"),
          s.faites.length ? el("b", { class: "sh-total", text: ptsTexte(ligne.total) }) : null),
      );
    });
  }

  function programmeShow(s) {
    const lignes = SHOW.semaines.map((w) => {
      const dom = equipeShow(w.equipe);
      const r = s.res[w.n];
      const fini = s.faite(w);
      const enCours = !fini && s.semaine?.n === w.n;
      const direct = s.soir && s.soir[0].n === w.n ? s.soir[1] : "";
      const etat = fini
        ? el("span", { class: "sh-vainqueur" }, emblemeShow(equipeShow(r[0])), el("span", {}, el("small", { text: "1er" }), el("b", { text: equipeShow(r[0]).capitaine })))
        : direct ? el("span", { class: "sh-direct" }, el("i", { class: "sh-point", "aria-hidden": "true" }), direct === "demies" ? "Demies en direct" : "Finale en direct")
          : enCours ? el("span", { class: "tampon", text: "Cette semaine" }) : el("span", { class: "sh-avenir", text: "À venir" });
      return el("li", { class: `sh-semaine${enCours ? " en-cours" : ""}${fini ? " fini" : ""}`, style: styleEquipe(dom) },
        el("div", { class: "sh-sem-num" }, el("small", { text: "Semaine" }), el("b", { text: String(w.n) })),
        el("div", { class: "sh-sem-jeu" }, iconeShow(w.icone), el("div", {}, el("b", { text: w.jeu }), el("small", { text: `${w.mode} · ${periodeShow(w)}` }))),
        el("div", { class: "sh-sem-dom" }, emblemeShow(dom), el("span", {}, el("small", { text: "à domicile" }), el("b", { text: dom.capitaine }))),
        el("ul", { class: "sh-soirs" },
          el("li", { class: direct === "demies" ? "allume" : null }, el("b", { text: soirShow(w.demies) }), el("span", { text: "demi-finales" })),
          el("li", { class: direct === "finale" ? "allume" : null }, el("b", { text: soirShow(w.finale) }), el("span", { text: "finale et 3e place" }))),
        el("div", { class: "sh-sem-etat" }, etat),
      );
    });
    return [el("h3", { class: "sh-titre", text: "Le programme du mois" }), el("ol", { class: "sh-programme" }, lignes)];
  }

  function blocClassementShow(s) {
    const l = classementShow(s.res);
    const commence = s.faites.length > 0;
    const max = Math.max(1, ...l.map((x) => x.total));
    return [
      el("h3", { class: "sh-titre", text: "Le classement" }),
      el("ol", { class: "sh-classement" }, l.map((x, k) => el("li", { class: `sh-ligne${commence && k === 0 ? " en-tete" : ""}`, style: styleEquipe(x.e) },
        el("span", { class: "sh-rang", text: commence ? String(k + 1) : "·" }),
        emblemeShow(x.e),
        el("span", { class: "sh-nom" },
          el("b", { text: `Équipe ${x.e.capitaine}` }),
          el("span", { class: "sh-cases" }, x.parSemaine.map((p, i) => el("i", {
            class: `sh-case${p ? ` p${p.place}` : ""}`,
            title: `Semaine ${i + 1} (${SHOW.semaines[i].jeu}) : ${p ? `${placeTexte(p.place)}, ${ptsTexte(p.points)}` : "pas encore jouée"}`,
            text: p ? String(p.points) : "–",
          })))),
        el("b", { class: "sh-points", text: ptsTexte(x.total) }),
        el("span", { class: "sh-barre", "aria-hidden": "true" }, el("i", { style: `width:${commence ? Math.max(3, Math.round((x.total / max) * 100)) : 0}%` })),
      ))),
      el("p", { class: "sh-bareme" }, "Chaque semaine : ", el("b", { text: "1er 10 pts" }), " · 2e 6 · 3e 3 · 4e 1.", commence ? "" : " Tout le monde part de 0."),
    ];
  }

  function reglesShow() {
    const regles = [
      ["5", "4 équipes de 5", "Un streameur capitaine, qui joue aussi, et 4 joueurs."],
      ["1", "Un jeu par semaine", "Le jeu d'une des équipes : elle joue à domicile, les autres doivent la battre chez elle."],
      ["2", "Deux soirs", "Le vendredi à 21 h, les demi-finales. Le samedi à 21 h, la finale et le match pour la 3e place."],
      ["40", "Les points", "10, 6, 3 et 1 selon la place. Au bout du mois, le meilleur total gagne le Show."],
    ];
    return [
      el("h3", { class: "sh-titre", text: "Comment ça marche" }),
      el("ul", { class: "sh-regles" }, regles.map(([n, t, d]) => el("li", {}, el("b", { class: "sh-chiffre", "aria-hidden": "true", text: n }), el("strong", { text: t }), el("span", { text: d })))),
    ];
  }

  function livesShow(lives) {
    const items = SHOW.equipes.map((e, k) => ({ e, live: lives[k] })).sort((a, b) => Number(b.live) - Number(a.live));
    return [
      el("h3", { class: "sh-titre", text: "Où regarder" }),
      el("p", { class: "sh-sous", text: "Tout le monde peut streamer sa partie : les capitaines, et les joueurs des équipes aussi." }),
      el("ul", { class: "sh-lives" }, items.map(({ e, live }) => el("li", {},
        el("a", { class: `sh-live${live ? " allume" : ""}`, href: `https://www.twitch.tv/${e.twitch}`, ...externe, style: styleEquipe(e) },
          emblemeShow(e),
          el("span", {}, el("b", { text: e.capitaine }), el("small", { text: live ? "en live maintenant" : `twitch.tv/${e.twitch}` })),
          el("i", { class: "sh-point", "aria-hidden": "true" }))))),
    ];
  }

  // ---------- la VF 1.0 : la SEMAINE BAHRIOT (le bot compte : lib/bahriot.js) ----------
  // Une semaine tous les 3 mois où toute la flotte s'affronte sur les jeux Riot. Avant : les dates, le compte à rebours,
  // l'inscription. Pendant : le score des commus (recalculé toutes les 5 minutes) et les lives de la flotte. Après : le
  // podium. Jamais le pseudo d'un autre joueur : seulement les commus, et ses propres points.
  const BAHRIOT_JEUX = [
    { id: "lol", nom: "League of Legends", auto: true },
    { id: "valorant", nom: "VALORANT", auto: true },
    { id: "tft", nom: "Teamfight Tactics", auto: true },
  ];
  let monBahriot = null, bahriotOccupe = false, bahriotMessage = null, bahriotDemande = 0, bahriotPhase = "";
  // les animations (js/bahriot-anim.js) : chargées seulement si l'appareil ne demande pas moins d'animations
  let animBr = null, animBrCharge = false, bahriotSig = "", bahriotFete = null;
  function animBahriotPret() { return Boolean(animBr); }
  async function chargerAnimBahriot() {
    if (animBrCharge || reduit.matches) return;
    animBrCharge = true;
    try {
      const { creerAnimBahriot } = await import("/js/bahriot-anim.js");
      animBr = creerAnimBahriot({ zero: () => { bahriotSig = ""; charger(); setTimeout(charger, 25_000); }, son: (nom, o) => jouerSon(nom, o) });
      prechargerSons(SONS_BAHRIOT);
      bahriotSig = "";
      rendreBahriot();
    } catch { /* sans animations, la page marche pareil */ }
  }
  // les données publiques (phase, score) viennent toujours de /api/public ; la réponse du bot pour le membre ne sert que pour « moi »
  const infosBahriot = () => (donnees?.bahriot ? { ...donnees.bahriot, moi: monBahriot ? monBahriot.moi : donnees.bahriot.moi } : null);
  const jourBahriot = (t, o = {}) => new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", ...o });
  const datesBahriot = (s) => `du ${jourBahriot(s.debut)} au ${jourBahriot(s.fin - 3600_000)}`;
  // une commu de la flotte : son drapeau (ou son emblème sur ses couleurs) et son nom
  function commuBahriot(id, nom = "") {
    const c = commu(id) || (Array.isArray(donnees?.flotte?.commus) ? donnees.flotte.commus.find((x) => x?.id === id) : null) || { id, nom };
    const n = String(c.nom || nom || id);
    return { id, nom: n, image: drapeauImage(c), style: styleCommu(c), embleme: String(c.embleme || n[0] || "?").slice(0, 2), twitch: c.twitch || "", live: Boolean(c.live) };
  }
  const drapeauBahriot = (c, taille) => (c.image
    ? el("img", { class: "br-drapeau", src: c.image, alt: "", width: taille, height: taille, loading: "lazy", decoding: "async" })
    : el("span", { class: "br-drapeau br-embleme", style: c.style, "aria-hidden": "true", text: c.embleme }));
  // le bandeau en haut de la carte : la phase en très grand, l'édition, le compte à rebours
  function phaseBahriot(s) {
    if (s.phase === "en-cours" && s.derniereSoiree) return { cle: "derniere", titre: "Dernière soirée", libelle: "Fin dans", cible: s.fin };
    if (s.phase === "bientot") return { cle: "bientot", titre: "Bientôt", libelle: "Inscriptions dans", cible: s.inscriptions };
    if (s.phase === "inscriptions") return { cle: "inscriptions", titre: "Inscriptions ouvertes", libelle: "Ça commence dans", cible: s.debut };
    if (s.phase === "en-cours") return { cle: "en-cours", titre: "C'est parti", libelle: "Fin dans", cible: s.fin };
    if (s.phase === "comptage") return { cle: "comptage", titre: "Le comptage", libelle: "Podium dans", cible: s.resultat };
    return { cle: "fini", titre: "Le podium", libelle: s.prochaine ? "Prochaine édition dans" : "", cible: s.prochaine?.debut || 0 };
  }
  // un compte à rebours en tuiles (jours, heures, minutes, secondes)
  function compteBahriot(cible, libelle) {
    const r = Math.max(0, cible - Date.now());
    const j = Math.floor(r / 86_400_000), h = Math.floor(r / 3_600_000) % 24, m = Math.floor(r / 60_000) % 60, sec = Math.floor(r / 1000) % 60;
    const groupe = (v, u, nom) => el("span", { class: "br-groupe", "data-u": u, hidden: u === "j" && !v },
      el("span", { class: "br-chiffres" }, String(v).padStart(2, "0").split("").map((c) => el("span", { class: "br-chiffre", text: c }))),
      el("small", { text: nom }));
    return el("div", { class: "br-rebours", "data-cible": String(cible), role: "timer", "aria-label": `${libelle} ${dureeCourte(cible)}` },
      el("p", { class: "br-compte-libelle", "aria-hidden": "true", text: libelle }),
      el("div", { class: "br-tuiles", "aria-hidden": "true" }, groupe(j, "j", j > 1 ? "jours" : "jour"), groupe(h, "h", "h"), groupe(m, "m", "min"), groupe(sec, "s", "s")));
  }
  function banniereBahriot(s) {
    const p = phaseBahriot(s);
    const lettres = (texte) => texte.split(" ").map((mot, k) => el("span", { class: "br-mot" }, mot.split("").map((c, i) => el("span", { class: "br-lettre", style: `--i:${k * 6 + i}`, text: c }))));
    const defile = tickerBahriot(s);
    return el("div", { class: `br-banniere phase-${p.cle}${defile ? " avec-ticker" : ""}`, "data-br-banniere": p.cle },
      el("canvas", { class: "br-fond", "aria-hidden": "true" }),
      el("span", { class: "br-faille", "aria-hidden": "true" }),
      el("p", { class: "br-etat" }, el("b", { text: `Édition n° ${nombre(s.numero)}` }), ` · ${datesBahriot(s)}`),
      el("p", { class: "br-grand" }, el("span", { class: "br-lu", text: p.titre }), el("span", { class: "br-lettres", "aria-hidden": "true" }, ...lettres(p.titre))),
      p.cible > Date.now() ? compteBahriot(p.cible, p.libelle) : el("p", { class: "br-compte-libelle", text: s.phase === "comptage" ? "Le podium arrive…" : "Merci à tous !" }),
      multiBahriot(s),
      defile);
  }
  // ×2 toute la semaine, ×3 pendant les lives de Liliano (la pastille ×3 s'allume quand il est en live)
  function multiBahriot(s) {
    const f = s.facteurs;
    if (!f || s.phase === "fini" || s.phase === "comptage") return null;
    return el("p", { class: "br-multi" },
      el("span", { class: "br-x x2" }, el("b", { text: `×${f.semaine}` }), " toute la semaine"),
      el("span", { class: `br-x x3${s.enLive ? " allume" : ""}` }, el("b", { text: `×${f.live}` }), s.enLive ? " Liliano est en live !" : " pendant les lives de Liliano"));
  }
  // le bandeau défilant (ce qu'on lit déjà plus bas, en boucle : il est caché aux lecteurs d'écran)
  function tickerBahriot(s) {
    const c = (s.classement || []).filter((x) => x.inscrits > 0 || x.points > 0);
    const j = s.joueurs || [];
    const morceaux = [];
    if (s.phase === "fini") {
      const p = (s.valide?.podium || c).filter((x) => x.points > 0);
      if (p[0]) morceaux.push(`🏆 ${p[0].nom} remporte la SEMAINE BAHRIOT n° ${s.numero}`);
      if (j[0] && s.lot) morceaux.push(`👑 ${j[0].nom} gagne ${s.lot}`);
      if (p[1]) morceaux.push(`🥈 ${p[1].nom} · ${nombre(p[1].points)} pts`);
      if (p[2]) morceaux.push(`🥉 ${p[2].nom} · ${nombre(p[2].points)} pts`);
      if (s.prochaine) morceaux.push(`⏭️ Prochaine édition le ${jourBahriot(s.prochaine.debut)}`);
    } else if (s.phase === "en-cours" || s.phase === "comptage") {
      morceaux.push(s.phase === "comptage" ? "🧮 Le comptage est en cours" : s.derniereSoiree ? "🏴‍☠️ DERNIÈRE SOIRÉE" : "🔴 EN DIRECT");
      if (s.enLive && s.facteurs) morceaux.push(`🔥 Liliano est en live : tes parties comptent ×${s.facteurs.live}`);
      else if (s.facteurs && s.phase === "en-cours") morceaux.push(`⚡ ×${s.facteurs.semaine} toute la semaine · ×${s.facteurs.live} pendant les lives de Liliano`);
      c.slice(0, 8).forEach((x, k) => morceaux.push(`${k + 1}. ${x.nom} · ${nombre(x.points)} pts`));
      if (j[0]) morceaux.push(`👑 ${j[0].nom} mène chez les joueurs · ${nombre(j[0].total)} pts`);
      if (s.lot) morceaux.push(`🎁 À gagner : ${s.lot}`);
    } else if (s.phase === "inscriptions") {
      morceaux.push("✍️ Les inscriptions sont ouvertes");
      if (s.inscrits) morceaux.push(`${nombre(s.inscrits)} inscrit${s.inscrits > 1 ? "s" : ""}`);
      c.slice(0, 8).forEach((x) => morceaux.push(`${x.nom} · ${pluriel(Number(x.inscrits) || 0, "inscrit")}`));
      if (s.lot) morceaux.push(`🎁 À gagner : ${s.lot}`);
      if (s.facteurs) morceaux.push(`⚡ Toutes les parties ×${s.facteurs.semaine} · ×${s.facteurs.live} pendant les lives de Liliano`);
      morceaux.push("LoL · VALORANT · TFT");
    }
    if (morceaux.length < 2) return null;
    const ligne = () => el("span", { class: "br-ticker-ligne" }, morceaux.map((m) => el("span", { class: "br-ticker-item", text: m })));
    const duree = Math.max(18, Math.round(morceaux.join(" ").length * 0.22));
    return el("div", { class: "br-ticker", "aria-hidden": "true" }, el("div", { class: "br-ticker-piste", style: `--duree:${duree}s` }, ligne(), ligne()));
  }
  function rendreBahriot() {
    const section = $("bahriot"), z = $("bahriot-carte");
    const s = infosBahriot();
    if (!section || !z) return;
    section.hidden = !s || !document.documentElement.classList.contains("v4");
    const pastille = $("pastille-bahriot");
    if (pastille) pastille.hidden = s?.phase !== "en-cours";
    if (!s || section.hidden) return;
    // connecté : on demande au bot s'il est inscrit et ses points (toutes les 5 minutes pendant la semaine)
    // (et de nouveau dès que la phase change : la semaine commence, le podium tombe)
    if (bahriotPhase && s.phase !== bahriotPhase) bahriotMessage = null;
    if (moi?.connecte && s.phase !== "bientot" && (!bahriotDemande || s.phase !== bahriotPhase || Date.now() - bahriotDemande > (s.phase === "en-cours" ? 300_000 : 3_600_000))) { bahriotDemande = Date.now(); bahriotPhase = s.phase; agirBahriot("bahriot"); }
    chargerAnimBahriot();
    // on ne refait la carte que si quelque chose a changé (sans animations : chaque minute, pour le compte à rebours)
    const sig = JSON.stringify([s, Boolean(moi?.connecte), bahriotMessage, bahriotOccupe, bahriotFete, animBr ? 1 : Math.floor(Date.now() / 60_000)]);
    if (sig === bahriotSig && z.childElementCount) return;
    bahriotSig = sig;
    z.classList.toggle("br-alerte", s.phase === "en-cours" && Boolean(s.derniereSoiree));
    const bloc = [];
    bloc.push(banniereBahriot(s));
    if (s.phase === "en-cours" && s.enLive && s.facteurs) {
      bloc.push(el("a", { class: "br-live-x3", href: `https://www.twitch.tv/${MA_CHAINE}`, ...externe },
        el("span", { class: "br-point", "aria-hidden": "true" }),
        el("span", {}, el("b", { text: "Liliano est en live !" }), ` Tes parties comptent ×${s.facteurs.live} tant qu'il est en live.`),
        el("span", { class: "br-live-x3-cta", text: "Regarder ↗" })));
    }
    bloc.push(jeuxBahriot(s));
    if (s.lot) bloc.push(lotBahriot(s));
    if (s.phase === "en-cours" && s.derniereSoiree) bloc.push(el("p", { class: "br-finale", role: "status", text: "🏴‍☠️ Dernière ligne droite : jusqu'à minuit, chaque partie compte encore. Sur GRAND LINE, les navires des premières commus se font face." }));
    if (s.phase === "comptage") {
      bloc.push(el("div", { class: "br-comptage", role: "status" },
        el("span", { class: "br-radar", "aria-hidden": "true" }),
        el("p", { class: "br-quand", text: "Minuit est passé : les dernières parties se terminent." }),
        el("p", { text: "Dernier calcul à 0 h 20, le podium tombe ici à 0 h 30." })));
    }
    if (s.phase === "fini") bloc.push(podiumBahriot(s));
    bloc.push(scoresBahriot(s));
    if (Array.isArray(s.joueurs) && s.joueurs.length) bloc.push(joueursBahriot(s));
    if (s.phase === "en-cours" || s.phase === "comptage") bloc.push(livesBahriot());
    bloc.push(moiBahriot(s));
    if (bahriotMessage) bloc.push(el("p", { class: bahriotMessage.erreur ? "note erreur" : "jeu-bravo", role: "status", text: bahriotMessage.texte }));
    bloc.push(reglesBahriot(s));
    if (s.historique?.length) bloc.push(historiqueBahriot(s));
    bloc.push(el("p", { class: "note br-mention", text: "Un événement de la commu Barhaw, ni organisé ni soutenu par Riot Games. League of Legends, VALORANT et Teamfight Tactics sont des marques de Riot Games, Inc." }));
    const avant = animBr?.avant(z);
    vider(z, ...bloc);
    animBr?.apres(z, s, { avant, fete: bahriotFete });
    bahriotFete = null;
  }
  // les jeux de la semaine, et comment chacun compte ; chacun a un petit emblème dessiné ici (jamais leurs logos)
  const EMBLEMES_BR = {
    lol: "M5 19 17 7M17 7l2.5-2.5M8 13l3 3M19 19 7 7M7 7 4.5 4.5M16 13l-3 3",
    valorant: "M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M12 6a6 6 0 1 0 .01 0Z",
    tft: "M5 5h14v14H5ZM9 9h.01M15 9h.01M12 12h.01M9 15h.01M15 15h.01",
  };
  function emblemeBr(id) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "br-sigle");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", EMBLEMES_BR[id] || "");
    p.setAttribute("pathLength", "1");
    svg.append(p);
    return svg;
  }
  function jeuxBahriot(s) {
    const comment = (j) => (j.id === "tft" && !s.jeux?.tft ? "arrive bientôt" : "compté tout seul");
    return el("ul", { class: "br-jeux", "aria-label": "Les jeux de la semaine" }, BAHRIOT_JEUX.map((j, k) => el("li", { class: `br-jeu${j.auto && (j.id !== "tft" || s.jeux?.tft) ? " auto" : j.auto ? " bientot" : ""}`, style: `--i:${k}`, "data-jeu": j.id },
      emblemeBr(j.id), el("span", { class: "br-jeu-txt" }, el("b", { text: j.nom }), el("small", { text: comment(j) })))));
  }
  // le score des commus : une barre chacune, à leurs couleurs (les commus seulement, jamais les joueurs)
  function scoresBahriot(s) {
    const avant = s.phase === "bientot" || s.phase === "inscriptions";
    const c = (s.classement || []).filter((x) => !avant || x.inscrits > 0 || (s.classement || []).length <= 8);
    if (!c.length) return el("p", { class: "note", text: "Les commus de la flotte apparaîtront ici dès les premières inscriptions." });
    const max = Math.max(1, ...c.map((x) => Number(x.points) || 0));
    const mienne = s.moi?.inscrit ? s.moi.commu : "";
    const titre = avant ? "Les commus de la flotte" : s.phase === "en-cours" ? "Le score en direct (recalculé toutes les 5 minutes)" : s.phase === "comptage" ? "Le score provisoire" : "Le classement final";
    const detail = (x) => {
      const d = x.detail || {};
      const morceaux = [["LoL", d.lol], ["VALORANT", d.valorant], ["TFT", d.tft], ["bonus", d.bonus]].filter(([, v]) => v);
      return morceaux.length ? morceaux.map(([k, v]) => `${k} ${nombre(v)}`).join(" · ") : "";
    };
    return el("div", { class: "br-scores" },
      el("p", { class: "br-titre", text: titre }),
      el("ol", { class: "br-liste", "aria-label": titre }, c.map((x, k) => {
        const m = commuBahriot(x.id, x.nom);
        const sous = [`${pluriel(Number(x.inscrits) || 0, "inscrit")}`, !avant && x.actifs !== undefined ? pluriel(Number(x.actifs) || 0, "actif") : "", x.id === mienne ? "ta commu" : ""].filter(Boolean).join(" · ");
        const d = avant ? "" : detail(x);
        return el("li", { class: `br-score${avant ? " sans-points" : ""}${k === 0 && x.points > 0 ? " en-tete" : ""}${x.id === mienne ? " br-moi" : ""}`, style: m.style, "data-br-id": x.id, "data-br-nom": m.nom },
          el("span", { class: "br-rang", text: String(k + 1) }),
          k === 0 && x.points > 0 && !avant ? el("span", { class: "br-drapeau-tete" }, drapeauBahriot(m, 40), el("span", { class: "br-couronne-mini", "aria-hidden": "true", text: "👑" })) : drapeauBahriot(m, 40),
          el("span", { class: "br-nom" }, el("b", { text: m.nom }), el("small", { text: sous }), d ? el("small", { class: "br-detail", text: d }) : null),
          avant ? null : el("span", { class: "br-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.round(((Number(x.points) || 0) / max) * 100)}%` })),
          avant ? null : el("b", { class: "br-points", "data-points": String(Number(x.points) || 0), text: `${nombre(x.points)} pts` }));
      })));
  }
  // les lives de la flotte pendant la semaine (les chaînes Twitch des commus ; en live d'abord)
  function livesBahriot() {
    const commus = Array.isArray(donnees?.flotte?.commus) ? donnees.flotte.commus : [];
    const lives = commus.filter((c) => c?.twitch && /^[a-z0-9_]{3,25}$/i.test(c.twitch)).sort((a, b) => Number(Boolean(b.live)) - Number(Boolean(a.live))).slice(0, 8);
    if (!lives.length) return null;
    return el("div", { class: "br-lives" },
      el("p", { class: "br-titre", text: "Les lives de la flotte" }),
      el("ul", {}, lives.map((c) => el("li", {}, el("a", { class: `br-live${c.live ? " allume" : ""}`, href: `https://www.twitch.tv/${encodeURIComponent(c.twitch)}`, target: "_blank", rel: "noopener" },
        el("span", { class: "br-point", "aria-hidden": "true" }),
        el("b", { text: c.nom || c.id }),
        el("small", { text: c.live ? "en live" : "hors ligne" }))))));
  }
  // le lot : ce que gagne le n° 1 du classement des joueurs (et, le podium tombé, qui l'a gagné)
  function lotBahriot(s) {
    const g = s.phase === "fini" ? s.joueurs?.[0] : null;
    if (g) {
      return el("div", { class: "br-lot gagne", role: "status", "data-br-lot": s.id },
        paillettesBr(),
        el("span", { class: "br-lot-icone", "aria-hidden": "true", text: "👑" }),
        el("p", {}, el("b", { text: g.nom }), ` (${g.nomCommu}, ${nombre(g.total)} pts) gagne ${s.lot} !`),
        el("span", { class: "br-lot-dos", "aria-hidden": "true" }, el("span", { text: "🎁" }), el("b", { text: "Et le gagnant du lot est…" })));
    }
    return el("div", { class: "br-lot" },
      paillettesBr(),
      el("span", { class: "br-lot-icone", "aria-hidden": "true", text: "🎁" }),
      el("p", {}, el("small", { text: "À gagner" }), el("b", { text: s.lot }), el("small", { text: "pour le n° 1 du classement des joueurs" })));
  }
  // des paillettes dorées qui scintillent sur la carte du lot
  const paillettesBr = () => el("span", { class: "br-paillettes", "aria-hidden": "true" },
    [[8, 20, 0], [22, 78, 0.6], [46, 12, 1.3], [63, 70, 0.3], [80, 26, 1.8], [93, 66, 1], [35, 50, 2.2], [72, 46, 2.7]].map(([x, y, d]) => el("i", { style: `--x:${x}%;--y:${y}%;--d:${d}s` })));
  // le classement des joueurs : le top 10 (pseudo Discord, commu, total), jamais leurs parties
  function joueursBahriot(s) {
    const l = s.joueurs;
    const max = Math.max(1, ...l.map((j) => Number(j.total) || 0));
    const place = Number(s.moi?.place) || 0;
    const titre = s.phase === "fini" ? "Le classement final des joueurs" : "Le top 10 des joueurs";
    const reste = Number(s.nbJoueurs) > l.length ? Number(s.nbJoueurs) - l.length : 0;
    return el("div", { class: "br-scores br-joueurs" },
      el("p", { class: "br-titre", text: titre }),
      el("ol", { class: "br-liste", "aria-label": titre }, l.map((j) => {
        const m = commuBahriot(j.commu, j.nomCommu);
        return el("li", { class: `br-joueur${j.rang === 1 ? " premier" : ""}${j.rang === place ? " br-moi" : ""}`, style: m.style, "data-br-j": j.nom },
          el("span", { class: "br-rang", text: j.rang === 1 ? "👑" : String(j.rang) }),
          drapeauBahriot(m, 26),
          el("span", { class: "br-nom" }, el("b", { text: j.nom }), el("small", { text: j.rang === place ? `${m.nom} · toi` : m.nom })),
          el("span", { class: "br-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.round(((Number(j.total) || 0) / max) * 100)}%` })),
          el("b", { class: "br-points", "data-points": String(Number(j.total) || 0), text: `${nombre(j.total)} pts` }));
      })),
      reste || place > l.length ? el("p", { class: "note", text: [reste ? `… et ${nombre(reste)} autre${reste > 1 ? "s" : ""} joueur${reste > 1 ? "s" : ""}` : "", place > l.length ? `toi : ${place}e` : ""].filter(Boolean).join(" · ") }) : null);
  }
  // le podium : la commu gagnante au milieu, plus haut, et ses milles sur GRAND LINE
  function podiumBahriot(s) {
    const p = (s.valide?.podium || s.classement || []).filter((x) => x.points > 0).slice(0, 3);
    if (!p.length) return el("p", { class: "br-quand", text: "Pas de points cette fois : rendez-vous à la prochaine !" });
    const milles = s.regles?.milles || [];
    const marche = (x, place) => {
      if (!x) return null;
      const m = commuBahriot(x.id, x.nom);
      return el("li", { class: `br-marche place-${place}`, style: m.style },
        place === 1 ? el("span", { class: "br-couronne", "aria-hidden": "true", text: "👑" }) : null,
        drapeauBahriot(m, 88),
        el("b", { text: m.nom }),
        el("span", { text: `${nombre(x.points)} pts` }),
        milles[place - 1] ? el("small", { text: `+${nombre(milles[place - 1])} milles` }) : null,
        el("span", { class: "br-socle", text: String(place) }));
    };
    return el("div", { class: "br-podium-bloc" },
      el("p", { class: "br-quand" }, "La commu gagnante : ", el("b", { text: commuBahriot(p[0].id, p[0].nom).nom }), " !"),
      el("ol", { class: "br-podium", "aria-label": "Le podium des commus", "data-br-podium": `${s.id}`, "data-br-couleurs": p.map((x) => commuBahriot(x.id, x.nom).style).join("|") }, marche(p[1], 2), marche(p[0], 1), marche(p[2], 3)),
      el("p", { class: "note", text: "Merci à tous les joueurs ! Les milles sont déjà sur les navires de GRAND LINE." }),
      animBr ? el("button", { class: "lien-discret", type: "button", onclick: () => animBr.rejouerPodium(), text: "▶ Revoir l'annonce" }) : null);
  }
  // son inscription, ses comptes reliés et ses points
  function moiBahriot(s) {
    if (s.phase === "bientot") return el("p", { class: "note", text: "Les inscriptions ouvrent le 22 décembre à 21 h 30." });
    if (!moi?.connecte) return el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter pour s'inscrire" });
    const m = s.moi;
    if (!m) return el("p", { class: "note", role: "status", text: "On regarde ton inscription…" });
    const c = m.comptes || {};
    const compte = (ok, nom, texteOk, lien, texteLien) => el("li", { class: `br-compte${ok ? " ok" : ""}` },
      el("b", { text: nom }), " ", ok ? el("span", { text: texteOk }) : lien ? el("a", { href: lien, text: texteLien }) : el("span", { text: texteLien }));
    const comptes = el("ul", { class: "br-comptes", "aria-label": "Tes comptes reliés" },
      compte(c.lol, "LoL", "✅ relié", "#faille", "relier dans La Faille"),
      compte(c.valorant, "VALORANT", "✅ relié", "/valorant", "relier mon compte"),
      compte(c.tft, "TFT", "✅ avec ton compte LoL", s.jeux?.tft && !c.lol ? "#faille" : "", s.jeux?.tft ? "relie ton compte LoL" : "arrive bientôt"));
    const nomCommu = commuBahriot(m.commu, m.nomCommu).nom;
    if (!m.inscrit) {
      const ouvert = s.phase !== "comptage";
      return el("div", { class: "br-moi-bloc" },
        el("p", {}, "Tu joueras pour ", el("b", { text: nomCommu }), " : l'équipage pour lequel tu rames sur GRAND LINE."),
        ouvert ? el("button", { class: "btn btn-plein", type: "button", disabled: bahriotOccupe, onclick: () => agirBahriot("bahriot-inscrire"), text: s.phase === "en-cours" ? "Je m'inscris (ça compte tout de suite)" : s.phase === "fini" ? "Je m'inscris pour la prochaine" : "Je m'inscris" })
          : el("p", { class: "note", text: "Les inscriptions pour la prochaine édition rouvrent avec le podium." }),
        comptes,
        el("p", { class: "note", text: "LoL et VALORANT comptent grâce à tes comptes reliés (La Faille, Valorant des potes) ; TFT passe par ton compte LoL. Aucun mot de passe, jamais. Si tu es dans le top 10, ton pseudo Discord s'affiche dans le classement des joueurs." }));
    }
    const p = m.points;
    const parJeu = p ? [["LoL", p.lol], ["VALORANT", p.valorant], ["TFT", p.tft], ["bonus", p.bonus]].filter(([, v]) => v).map(([k, v]) => `${k} ${nombre(v)}`).join(" · ") : "";
    return el("div", { class: "br-moi-bloc" },
      el("p", { class: "br-inscrit", style: commuBahriot(m.commu, m.nomCommu).style }, "✅ Inscrit pour ", el("b", { text: nomCommu }), m.enJeu || s.phase === "inscriptions" ? "." : " pour la prochaine édition."),
      p && (m.enJeu || s.phase === "fini") ? el("p", { class: "br-mes-points", text: `${s.phase === "fini" ? "Tu as marqué" : "Tes points"} : ${nombre(p.total)}` }) : null,
      m.place ? el("p", { class: "br-ma-place", text: `${m.place === 1 ? "👑 Tu es 1er" : `Tu es ${m.place}e`}${m.joueurs ? ` sur ${nombre(m.joueurs)} joueurs` : ""}${m.place === 1 && s.lot && s.phase !== "fini" ? " : le lot est pour toi si ça tient !" : ""}` }) : null,
      parJeu ? el("p", { class: "note", text: parJeu }) : null,
      comptes,
      !c.lol && !c.valorant ? el("p", { class: "note erreur", text: "Relie au moins un compte (LoL ou VALORANT) pour marquer des points." }) : null,
      m.peutPartir ? el("button", { class: "lien-discret", type: "button", disabled: bahriotOccupe, onclick: () => agirBahriot("bahriot-desinscrire"), text: "Me désinscrire" }) : null);
  }
  function reglesBahriot(s) {
    const r = s.regles || {};
    const b = r.bonusJeux || {};
    return el("details", { class: "br-regles" },
      el("summary", { text: "Comment ça compte" }),
      el("ul", {},
        el("li", { text: "Toutes tes parties de la semaine comptent, à partir de ton inscription, pour la commu de ton équipage." }),
        s.facteurs ? el("li", { text: `Pendant la semaine, chaque partie compte ×${s.facteurs.semaine}. Une partie jouée, même en partie, pendant un live de Liliano compte ×${s.facteurs.live}. Les points ci-dessous sont avant ce ×${s.facteurs.semaine} / ×${s.facteurs.live}.` }) : null,
        el("li", { text: "League of Legends : la note de chaque game de La Faille des potes (S+ 10 pts, S 7, A 5, B 3, C 1), et aussi ARAM, Arena, URF… (victoire 3, défaite 1)." }),
        el("li", { text: "VALORANT : la note de chaque partie de Valorant des potes." }),
        el("li", { text: `Teamfight Tactics : ta place (1re 10 pts, 2e 7, 3e 5, 4e 3, 5e et 6e 1), avec ton compte LoL relié.${s.jeux?.tft ? "" : " Arrive bientôt."}` }),
        el("li", { text: `Tes ${r.meilleuresParties || 10} meilleures parties de chaque jeu comptent. Jouer à 2 jeux : +${b[2] || 5}, aux 3 : +${b[3] || 10}.` }),
        el("li", { text: `Le score d'une commu : la somme de ses ${r.meilleursJoueurs || 5} meilleurs joueurs. Une grosse commu ne gagne pas juste par le nombre.` }),
        s.facteurs ? el("li", { text: `Sur GRAND LINE aussi : pendant la semaine, tes games notées (LoL, VALORANT) font avancer le navire de ta commu ×${s.facteurs.semaine}, et ×${s.facteurs.live} pendant les lives de Liliano.` }) : null,
        el("li", { text: `Les 3 premières commus gagnent ${(r.milles || [500, 250, 100]).map((x) => nombre(x)).join(", ").replace(/, ([^,]*)$/, " et $1")} milles sur GRAND LINE.` }),
        s.lot ? el("li", { text: `Le n° 1 du classement des joueurs gagne ${s.lot}. Ton total se calcule comme pour ta commu ; à égalité, c'est celui qui a atteint ce total le premier qui gagne.` }) : null,
        s.lot ? el("li", { text: "Gratuit, sans obligation d'achat. Le lot est remis par Liliano (un code ou une carte cadeau Riot) ; pour un joueur mineur, avec l'accord d'un parent." }) : null,
        el("li", { text: "Pas de MMR, pas de rang, pas de paris. Le site montre le score des commus et le top 10 des joueurs (pseudo Discord et total), jamais tes parties." })));
  }
  function historiqueBahriot(s) {
    return el("p", { class: "br-histo" }, "Les éditions d'avant : ", ...s.historique.flatMap((h, k) => [k ? " · " : "", `n° ${h.numero} (${new Date(Date.parse(`${h.jour}T12:00:00Z`)).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}) : 👑 `, el("b", { text: commuBahriot(h.gagnant.id, h.gagnant.nom).nom })]));
  }
  async function agirBahriot(action) {
    if (bahriotOccupe) return;
    bahriotOccupe = true;
    if (action !== "bahriot") bahriotMessage = null;
    if (action !== "bahriot") rendreBahriot();
    let d = {};
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
    } catch { d = { erreur: "reseau", texte: "Impossible de joindre le bot. Vérifie ta connexion." }; }
    bahriotOccupe = false;
    if (d.bahriot) monBahriot = d.bahriot;
    const s = infosBahriot();
    if (d.erreur) bahriotMessage = { texte: d.texte || (typeof d.erreur === "string" && d.erreur.length > 12 ? d.erreur : "Ça n'a pas marché, réessaie."), erreur: true };
    else if (action === "bahriot-inscrire" && d.ok) {
      bahriotMessage = { texte: s?.phase === "en-cours" ? "C'est parti : tes parties comptent dès maintenant !" : `C'est noté ! Rendez-vous le ${jourBahriot(s?.debut || Date.now())}.` };
      if (!d.deja) bahriotFete = "inscription";
    }
    else if (action === "bahriot-desinscrire" && d.ok) bahriotMessage = { texte: "Tu n'es plus inscrit." };
    rendreBahriot();
  }

  // ---------- la VF 1.0 : la Guerre des commus (le bot compte : lib/guerre.js) ----------
  // Les commus de la flotte se disputent les îles de GRAND LINE, avec une bataille chaque soir à 21 h (saison 1 : du
  // lundi 1er au dimanche 21 mars 2027 ; la carte se dévoile le samedi 27 février). Avant : les dates et le compte à
  // rebours. Ensuite : la carte (en 3D quand l'appareil suit, js/guerre-3d.js ; sinon en 2D, avec les images des îles),
  // le vote, ses troupes, les armées du jour, le journal des batailles. Jamais le pseudo d'un joueur : seulement les
  // commus, et ses propres troupes ; les votes de sa commu ne se voient que dans sa commu.
  // La place des 9 îles à prendre (le repère de GRAND LINE : x de −104 à 104, z de −58 à 58)
  const GUERRE_ILES = { vents: [-56, 2], arbre: [56, -2], marais: [-2, -36], ambre: [2, 38], cristal: [-31, -22], horloge: [-31, 22], geants: [31, 22], tonnerre: [31, -22], forteresse: [0, 0] };
  // les ports, un par commu dans l'ordre de la flotte (Barhaw d'abord), et la place de son navire, au mouillage à côté
  const GUERRE_PORTS = {
    1: [{ x: -84, z: 0, n: [-66, -16] }],
    2: [{ x: -84, z: 0, n: [-66, -16] }, { x: 84, z: 0, n: [66, 16] }],
    3: [{ x: -84, z: 0, n: [-66, -16] }, { x: 80, z: -38, n: [58, -42] }, { x: 80, z: 38, n: [58, 42] }],
    4: [{ x: -80, z: -38, n: [-58, -42] }, { x: 80, z: -38, n: [58, -42] }, { x: 80, z: 38, n: [58, 42] }, { x: -80, z: 38, n: [-58, 42] }],
  };
  // le port de Barhaw est Port Barhaw ; les autres commus prennent une île-port de GRAND LINE (inventée, comme le reste)
  const GUERRE_PORTS_MODELES = ["marche", "moussaillons", "lucioles"];
  const GUERRE_RAYON = 8.2 * 1.35; // le rayon d'une île sur la carte (les modèles sont un peu agrandis : js/guerre-3d.js)
  let maGuerre = null, guerreOccupe = false, guerreMessage = null, guerreDemande = 0, guerrePhase = "", guerreSaison = null, guerreVue = false;
  let guerreIle = ""; // l'île choisie sur la carte
  let carteGuerre = null; // { type: "3d" | "2d", rendu, cle }
  let guerrePrepare = false, guerreVoulu3D = null; // null : le choix de l'appareil ; true / false : celui du visiteur
  const sigGuerre = {};
  // les données publiques viennent de /api/public ; la réponse du bot pour le membre ne sert que pour « moi »
  const infosGuerre = () => (donnees?.guerre ? { ...donnees.guerre, moi: maGuerre && maGuerre.saison === donnees.guerre.saison ? maGuerre.moi : donnees.guerre.moi } : null);
  const jourGuerre = (t, o = {}) => new Date(t).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", ...o });
  const momentGuerre = (t) => `${jourGuerre(t)} à ${heure(t)}`;
  const datesGuerre = (g) => `du ${jourGuerre(g.debut)} au ${jourGuerre(g.fin)}`;
  // une commu : ses couleurs et son emblème (la flotte), son drapeau (jamais img/flotte/barhaw.webp)
  function commuGuerre(id, nom = "") {
    const c = commu(id) || (Array.isArray(donnees?.flotte?.commus) ? donnees.flotte.commus.find((x) => x?.id === id) : null) || { id, nom, couleurs: id === "barhaw" ? { principale: "#ff5aae", secondaire: "#55ccff" } : null };
    const n = String(c.nom || nom || (donnees?.guerre?.commus || []).find((x) => x.id === id)?.nom || id);
    const image = id === "barhaw" ? "" : drapeauImage(c);
    return { id, nom: n, c1: hexaCommu(c, "principale"), c2: hexaCommu(c, "secondaire"), style: styleCommu(c), embleme: String(c.embleme || n[0] || "?").slice(0, 2), image, twitch: c.twitch || "" };
  }
  const drapeauGuerre = (c, taille) => (c.image
    ? el("img", { class: "gu-drapeau", src: c.image, alt: "", width: taille, height: taille, loading: "lazy", decoding: "async" })
    : el("span", { class: "gu-drapeau gu-embleme", style: c.style, "aria-hidden": "true", text: c.embleme }));
  const ileGuerre = (g, id) => (g?.iles || []).find((i) => i.id === id) || null;
  const ileDans = (n) => String(n || "").replace(/^(L'|Le |La |Les )/, (m) => m.toLowerCase());
  // devant le nom d'une commu : « à Barhaw », mais « aux Navigateurs », « au Grand Large » ; « de » de même (« des », « du »)
  const aCommu = (n) => (/^Les /.test(n) ? `aux ${n.slice(4)}` : /^Le /.test(n) ? `au ${n.slice(3)}` : `à ${n}`);
  const deCommu = (n) => (/^Les /.test(n) ? `des ${n.slice(4)}` : /^Le /.test(n) ? `du ${n.slice(3)}` : `de ${n}`);
  const listeCommus = (l) => (l.length < 2 ? l.join("") : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`);
  const nomCourtIle = (n) => String(n || "").replace(/^(L'|Le |La |Les )/, "").replace(/^Île (des |du |de la |de l')?/i, "").replace(/^Île-/, "");

  // ---------- la carte : où est chaque île ----------
  function placesGuerre(g) {
    const ports = (g.iles || []).filter((i) => i.port);
    const places = GUERRE_PORTS[Math.min(4, Math.max(1, ports.length))];
    let autre = 0;
    const iles = (g.iles || []).map((i) => {
      if (i.port) {
        const p = places[ports.indexOf(i)] || places[0];
        const m = i.port === "barhaw" ? "port" : GUERRE_PORTS_MODELES[autre++ % GUERRE_PORTS_MODELES.length];
        return { id: i.id, x: p.x, z: p.z, modele: `ile-${m}-v5`, image: `/img/iles/${m}-v5.webp`, port: i.port, navire: p.n };
      }
      const [x, z] = GUERRE_ILES[i.id] || [0, 0];
      return { id: i.id, x, z, modele: `ile-${i.id}-v5`, image: `/img/iles/${i.id}-v5.webp`, bonus: Boolean(i.bonus) };
    });
    return iles;
  }
  // les navires des commus, au mouillage devant leur port (le même navire que sur GRAND LINE), le nez vers le large
  function naviresGuerre(places) {
    return places.filter((p) => p.port).map((p) => {
      const c = commuGuerre(p.port);
      const [x, z] = p.navire;
      const dx = -x, dz = -z;
      return { commu: p.port, x, z, cap: Math.atan2(-dz, dx), modele: `navire-${NAVIRES_V5[p.port] || "brick"}.glb`, couleurs: { principale: c.c1, secondaire: c.c2 }, embleme: c.embleme, drapeau: c.image };
    });
  }
  function donnees3DGuerre(g) {
    const m = g.moi || {};
    return {
      iles: (g.iles || []).map((i) => {
        if (!i.commu) return { id: i.id, commu: null };
        const c = commuGuerre(i.commu);
        return { id: i.id, commu: i.commu, c1: c.c1, c2: c.c2, embleme: c.embleme, drapeau: c.image };
      }),
      choix: guerreIle, vote: m.vote || "", regne: g.regne?.commu || "",
    };
  }
  // la carte se prépare quand on arrive près de la partie : en 3D si l'appareil suit (ou si on l'a demandée), sinon en 2D
  function troisDPossible() {
    if (navigator.connection?.saveData) return false;
    try {
      const essai = document.createElement("canvas").getContext("webgl2");
      const info = essai?.getExtension("WEBGL_debug_renderer_info");
      const logiciel = info && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(String(essai.getParameter(info.UNMASKED_RENDERER_WEBGL)));
      essai?.getExtension("WEBGL_lose_context")?.loseContext();
      return Boolean(essai) && (!logiciel || new URLSearchParams(location.search).get("3d") === "oui");
    } catch { return false; }
  }
  const appareilLeger = () => { try { return matchMedia("(max-width: 760px), (pointer: coarse)").matches || (navigator.deviceMemory || 8) <= 4; } catch { return false; } };
  async function preparerCarteGuerre(g) {
    const zone = $("gu-plateau");
    if (!zone || guerrePrepare) return;
    const places = placesGuerre(g);
    const cle = places.map((p) => `${p.id}:${p.modele}`).join(",");
    const voulu3D = guerreVoulu3D ?? ((navigator.deviceMemory || 8) > 2 && troisDPossible());
    if (carteGuerre && carteGuerre.cle === cle && (carteGuerre.type === "3d") === voulu3D) return;
    guerrePrepare = true;
    // une bataille en train de se rejouer reprend sur la nouvelle carte (la 3D trop lente passe en 2D, le bouton 2D / 3D)
    const reprendre = guerreRejeu && !guerreRejeu.fini ? guerreRejeu.n : 0;
    const relancer = () => { if (reprendre && !guerreRejeu) setTimeout(() => rejouerBataille(reprendre), 0); };
    try {
      if (carteGuerre) { arreterRejeuGuerre(); try { carteGuerre.rendu.detruire(); } catch {} carteGuerre = null; }
      vider($("gu-etiquettes"));
      if (voulu3D) {
        try {
          const { creerGuerre3D } = await import("/js/guerre-3d.js");
          const toile = el("canvas", { class: "gu-toile", role: "img", "aria-label": "La carte de la Guerre des commus en 3D : clique sur une île (ou sur son étiquette)" });
          vider(zone, toile);
          zone.classList.add("en-3d");
          const etiquettes = new Map();
          const rendu = creerGuerre3D(toile, {
            iles: places, navires: naviresGuerre(places), reduit: reduit.matches, leger: appareilLeger(),
            surIle: (id) => choisirIleGuerre(id), surSurvol: (id) => survolGuerre(id),
            placer: (liste) => placerEtiquettesGuerre(liste, etiquettes),
          });
          toile.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (carteGuerre?.rendu === rendu) { guerreVoulu3D = false; guerrePrepare = false; carteGuerre = null; preparerCarteGuerre(infosGuerre()); } });
          carteGuerre = { type: "3d", rendu, cle, etiquettes };
          tailleCarteGuerre();
          rendu.maj(donnees3DGuerre(g));
          if (guerreVue) rendu.demarrer();
          // trop lent : la carte passe en 2D (on le regarde après les premières images)
          setTimeout(() => { if (carteGuerre?.rendu === rendu && guerreVoulu3D === null && rendu.tropLent()) { guerreVoulu3D = false; guerrePrepare = false; preparerCarteGuerre(infosGuerre()); } }, 6000);
          rendreEtiquettesGuerre(g);
          rendreBascule3DGuerre();
          majRevoirGuerre();
          relancer();
          return;
        } catch { zone.classList.remove("en-3d"); }
      }
      zone.classList.remove("en-3d");
      carteGuerre = { type: "2d", rendu: carte2DGuerre(zone, places), cle };
      carteGuerre.rendu.maj(g);
      rendreEtiquettesGuerre(g);
      rendreBascule3DGuerre();
      majRevoirGuerre();
      relancer();
    } finally { guerrePrepare = false; }
  }
  function tailleCarteGuerre() {
    const zone = $("gu-plateau");
    if (!zone || carteGuerre?.type !== "3d") return;
    const b = zone.getBoundingClientRect();
    if (b.width > 10 && b.height > 10) carteGuerre.rendu.taille(b.width, b.height);
  }
  // le bouton « la carte en 2D / en 3D »
  function rendreBascule3DGuerre() {
    const b = $("gu-bascule");
    if (!b) return;
    b.hidden = !carteGuerre;
    b.textContent = carteGuerre?.type === "3d" ? "Voir la carte en 2D" : "Voir la carte en 3D";
  }
  function basculerCarteGuerre() {
    guerreVoulu3D = carteGuerre?.type !== "3d";
    const g = infosGuerre();
    if (g) preparerCarteGuerre(g);
  }

  // ---------- la carte en 2D : les images des îles (rendues dans Blender) posées sur la mer ----------
  function carte2DGuerre(zone, places) {
    const plateau = el("div", { class: "gu-2d", role: "img", "aria-label": "La carte de la Guerre des commus : clique sur une île (ou sur son étiquette)" });
    const parId = new Map();
    for (const p of places) {
      const b = el("button", { type: "button", class: `gu-2d-ile${p.port ? " port" : ""}`, style: `--x:${p.x};--z:${p.z}`, "data-ile": p.id, tabindex: "-1", "aria-hidden": "true", onclick: () => choisirIleGuerre(p.id) },
        el("img", { src: p.image, alt: "", width: 360, height: 234, loading: "lazy", decoding: "async" }),
        el("span", { class: "gu-2d-anneau" }),
        el("span", { class: "gu-2d-fanion" }));
      parId.set(p.id, b);
      plateau.append(b);
    }
    vider(zone, plateau);
    return {
      maj(g) {
        const m = g.moi || {};
        for (const i of g.iles || []) {
          const b = parId.get(i.id);
          if (!b) continue;
          const c = i.commu ? commuGuerre(i.commu) : null;
          b.classList.toggle("tenue", Boolean(c));
          b.classList.toggle("choisie", i.id === guerreIle);
          b.classList.toggle("mon-vote", i.id === m.vote);
          if (c) b.setAttribute("style", `--x:${placesGuerreX(places, i.id)};--z:${placesGuerreZ(places, i.id)};${c.style}`);
          const f = b.querySelector(".gu-2d-fanion");
          // (le fanion à ses couleurs : jamais d'image de drapeau ici, et jamais img/flotte/barhaw.webp)
          vider(f, c ? drapeauCommu({ id: `${c.id}-`, nom: c.nom, couleurs: { principale: c.c1, secondaire: c.c2 }, embleme: c.embleme, drapeau: "" }, "gu-fanion") : null);
        }
      },
      // la bataille rejouée : un effet sur une île (feu, prise, tient, renfort) ; sa flotte s'efface quand son sort est joué
      effet(id, genre) {
        const b = parId.get(id);
        if (!b) return;
        b.classList.remove("bat-feu", "bat-prise", "bat-tient", "bat-renfort");
        void b.offsetWidth;
        b.classList.add(`bat-${genre}`);
        setTimeout(() => b.classList.remove(`bat-${genre}`), genre === "feu" ? 1100 : 1500);
        if (genre !== "feu") for (const v of plateau.querySelectorAll(`.gu-2d-voile[data-ile="${id}"]`)) { v.classList.add("part"); setTimeout(() => v.remove(), 700); }
      },
      // les flottes partent des ports vers leur île (un petit navire par commu, à ses couleurs)
      voguer(liste, duree) {
        for (const { commu: c, de, vers } of liste) {
          const p = places.find((x) => x.id === de), q = places.find((x) => x.id === vers);
          if (!p || !q) continue;
          const couleurs = commuGuerre(c);
          const v = el("span", { class: "gu-2d-voile", "data-ile": vers, "aria-hidden": "true", style: `--x:${p.x};--z:${p.z};${couleurs.style};--duree:${duree}ms` });
          plateau.append(v);
          // il s'arrête au bord de l'île (un peu avant, du côté de son port)
          requestAnimationFrame(() => requestAnimationFrame(() => v.setAttribute("style", `--x:${q.x - (q.x - p.x) * 0.13};--z:${q.z - (q.z - p.z) * 0.13};${couleurs.style};--duree:${duree}ms`)));
        }
      },
      nettoyer() { for (const v of plateau.querySelectorAll(".gu-2d-voile")) v.remove(); },
      detruire() { vider(zone); },
      demarrer() {}, arreter() {},
    };
  }
  const placesGuerreX = (places, id) => places.find((p) => p.id === id)?.x ?? 0;
  const placesGuerreZ = (places, id) => places.find((p) => p.id === id)?.z ?? 0;

  // ---------- les étiquettes des îles (sur la carte) : la garnison, la commu, le bonus, les votes de sa commu ----------
  function rendreEtiquettesGuerre(g) {
    const couche = $("gu-etiquettes");
    if (!couche || !carteGuerre) return;
    const m = g.moi || {};
    const places = placesGuerre(g);
    const R = guerreRejeu;
    const sig = JSON.stringify([carteGuerre.type, carteGuerre.cle, g.iles, m.votes, m.vote, guerreIle, g.commus?.map((c) => c.id), R ? [R.n, R.vient, R.k] : 0]);
    if (sig === sigGuerre.etiquettes && couche.childElementCount) return;
    sigGuerre.etiquettes = sig;
    const liste = (g.iles || []).map((i) => {
      const c = i.commu ? commuGuerre(i.commu) : null;
      const votes = Number(m.votes?.[i.id]) || 0;
      const p = places.find((x) => x.id === i.id);
      const e = el("button", {
        type: "button", class: `gu-etiquette${i.port ? " port" : ""}${c ? " tenue" : ""}${i.id === guerreIle ? " choisie" : ""}${i.id === m.vote ? " mon-vote" : ""}${R && R.vient === i.id ? ` bat bat-${R.genre}` : ""}`,
        style: `${c ? c.style : ""}${carteGuerre.type === "2d" && p ? `;--x:${p.x};--z:${p.z}` : ""}`,
        "data-ile": i.id, title: i.nom, onclick: () => choisirIleGuerre(i.id),
        "aria-label": `${i.nom} : ${i.port ? `le port de ${c?.nom || ""}, imprenable` : `${c ? `tenue par ${c.nom}` : "libre"}, ${nombre(i.garnison)} troupes`}${i.bonus ? ", +10 % de troupes" : ""}${votes ? `, ${pluriel(votes, "vote")} de ta commu` : ""}`,
      },
      el("span", { class: "gu-et-nom", text: i.port ? (c?.nom || "Port") : nomCourtIle(i.nom) }),
      i.port ? null : el("b", { class: "gu-et-garnison", text: nombre(i.garnison) }),
      i.bonus ? el("span", { class: "gu-et-bonus", title: "+10 % de troupes pour la commu qui la tient", text: "+10 %" }) : null,
      votes ? el("span", { class: "gu-et-votes", text: `🗳 ${votes}` }) : null);
      return e;
    });
    vider(couche, ...liste);
    if (carteGuerre.type === "2d") requestAnimationFrame(recadrerEtiquettes2D);
    if (carteGuerre.type === "3d") {
      carteGuerre.etiquettes.clear();
      for (const e of liste) carteGuerre.etiquettes.set(e.dataset.ile, e);
    }
  }
  // en 2D, une étiquette au bord de la carte reste entière : elle glisse un peu vers l'intérieur (un long nom de commu)
  function recadrerEtiquettes2D() {
    const z = $("gu-plateau");
    if (!z || carteGuerre?.type !== "2d" || enVeille(z)) return;
    const b = z.getBoundingClientRect();
    for (const e of $("gu-etiquettes")?.children || []) {
      e.style.removeProperty("--dx");
      const r = e.getBoundingClientRect();
      const dx = r.left < b.left + 4 ? b.left + 4 - r.left : r.right > b.right - 4 ? b.right - 4 - r.right : 0;
      if (Math.abs(dx) >= 1) e.style.setProperty("--dx", `${Math.round(dx)}px`);
    }
  }
  function placerEtiquettesGuerre(positions, etiquettes) {
    const L = $("gu-plateau")?.clientWidth || 0;
    for (const p of positions) {
      const e = etiquettes.get(p.id);
      if (!e) continue;
      // une étiquette au bord de la carte reste entière (elle glisse un peu vers l'intérieur)
      const w = (e._largeur ||= e.offsetWidth || 0);
      const x = L && w ? Math.min(Math.max(p.x, w / 2 + 4), L - w / 2 - 4) : p.x;
      const t = `translate(${Math.round(x)}px, ${Math.round(p.y)}px)`;
      if (e.dataset.t !== t) { e.dataset.t = t; e.style.transform = `${t} translate(-50%, -100%)`; }
      e.hidden = !p.visible;
    }
  }
  function survolGuerre(id) {
    for (const e of $("gu-etiquettes")?.children || []) e.classList.toggle("survol", e.dataset.ile === id);
  }
  function choisirIleGuerre(id) {
    guerreIle = guerreIle === id ? "" : id;
    const g = infosGuerre();
    if (!g) return;
    rendreGuerre();
    if (guerreIle) $("gu-info")?.scrollIntoView?.({ block: "nearest", behavior: reduit.matches ? "auto" : "smooth" });
  }

  // ---------- le bandeau : la phase en grand et le compte à rebours ----------
  // 21 h est passé et le journal n'a pas encore la bataille : elle se joue (le bot la compte dans la minute)
  function enRageGuerre(g) {
    if (g?.phase !== "en-cours") return false;
    const faites = Number(g.journal?.[0]?.n) || 0;
    const attendues = g.bataille ? g.bataille - 1 : g.batailles;
    return attendues > faites || Boolean(g.prochaine && Date.now() >= g.prochaine);
  }
  function phaseGuerre(g) {
    if (enRageGuerre(g)) return { cle: "rage", titre: "La bataille fait rage…", libelle: "", cible: 0 };
    if (g.phase === "bientot") return { cle: "bientot", titre: "Bientôt", libelle: "La carte se dévoile dans", cible: g.ouverture };
    if (g.phase === "annonce") return { cle: "annonce", titre: "Aux armes", libelle: "La guerre commence dans", cible: g.debut };
    if (g.phase === "en-cours") return { cle: "en-cours", titre: g.bataille >= g.batailles ? "Dernière bataille" : `Bataille ${g.bataille} sur ${g.batailles}`, libelle: "Bataille dans", cible: g.prochaine };
    const r = g.fini?.gagnant ? commuGuerre(g.fini.gagnant).nom : "";
    return { cle: "fini", titre: r ? `${r} ${g.essai ? "aurait régné" : "règne"}` : "La paix revient", libelle: "", cible: 0 };
  }
  function texteRebours(cible) {
    const r = Math.max(0, cible - Date.now());
    const j = Math.floor(r / 86_400_000), h = Math.floor(r / 3_600_000) % 24, m = Math.floor(r / 60_000) % 60, s = Math.floor(r / 1000) % 60;
    return `${j ? `${j} j ` : ""}${String(h).padStart(2, "0")} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  }
  function banniereGuerre(g) {
    const p = phaseGuerre(g);
    return el("div", { class: `gu-banniere phase-${p.cle}` },
      g.essai
        ? el("p", { class: "gu-etat" }, el("b", { class: "gu-essai", text: "🧪 Saison d'essai" }), ` · de ${heure(g.debut)} à ${heure(g.fin)} · une bataille toutes les ${pluriel(Number(g.periode) || 10, "minute")}`)
        : el("p", { class: "gu-etat" }, el("b", { text: `Saison ${nombre(g.saison)}` }), ` · ${datesGuerre(g)} · une bataille chaque soir à ${g.heure || "21 h"}`),
      el("p", { class: "gu-grand", text: p.titre }),
      p.cible > Date.now() ? el("p", { class: "gu-rebours", role: "timer", "data-cible": String(p.cible), "aria-label": `${p.libelle} ${dureeCourte(p.cible)}` },
        el("span", { class: "gu-rebours-libelle", text: p.libelle }), el("b", { class: "gu-rebours-temps", "aria-hidden": "true", text: texteRebours(p.cible) })) : null,
      g.phase === "bientot" ? el("p", { class: "gu-quand", text: `La carte se dévoile le ${momentGuerre(g.ouverture)}. Ensuite, on s'engage pour son équipage et la guerre commence le ${jourGuerre(g.debut)}.` }) : null,
      p.cle === "rage" ? el("p", { class: "gu-quand", role: "status", text: "Les flottes se battent en ce moment. Les résultats arrivent dans un instant, et la bataille se rejoue sur la carte." }) : null,
      g.essai ? el("p", { class: "gu-quand gu-essai-note", text: "Une répétition, pour tout vérifier avant la vraie : tout va plus vite, de faux joueurs remplissent les commus, et rien ne compte pour de vrai (ni couronne, ni milles, ni titre). Avant la VF, toi seul la vois." }) : null);
  }
  let minuteurReboursGuerre = null;
  function suivreReboursGuerre() {
    clearInterval(minuteurReboursGuerre);
    minuteurReboursGuerre = setInterval(() => {
      if (document.hidden || !guerreVue) return;
      for (const r of document.querySelectorAll(".gu-rebours[data-cible]")) {
        const cible = Number(r.dataset.cible);
        if (cible <= Date.now()) { clearInterval(minuteurReboursGuerre); setTimeout(charger, 2500); return; }
        const t = r.querySelector(".gu-rebours-temps");
        if (t) t.textContent = texteRebours(cible);
      }
    }, 1000);
  }

  // ---------- l'île choisie ----------
  function infoIleGuerre(g) {
    const i = ileGuerre(g, guerreIle);
    if (!i) return el("p", { class: "gu-astuce", text: "Clique sur une île de la carte pour voir qui la tient et voter." });
    const m = g.moi || {};
    const c = i.commu ? commuGuerre(i.commu) : null;
    const mienne = Boolean(m.engage && i.commu === m.commu);
    const votes = Number(m.votes?.[i.id]) || 0;
    const ouvert = g.phase === "annonce" || g.phase === "en-cours";
    let action = null;
    if (i.port) action = el("p", { class: "note", text: `Le port de ${c?.nom || "sa commu"} : imprenable. Les troupes partent d'ici.` });
    else if (!ouvert) action = null;
    else if (!moi?.connecte) action = el("a", { class: "btn btn-plein btn-petit", href: "/api/auth/login", text: "Se connecter pour voter" });
    else if (!m.engage) action = el("p", { class: "note", text: "Engage-toi pour ton équipage (juste en dessous) pour voter." });
    else if (m.vote === i.id) action = el("div", { class: "gu-vote-fait" }, el("p", { class: "gu-ok", text: `✓ Ton vote : ce soir, ${mienne ? "on la renforce" : "on l'attaque"}.` }), el("button", { class: "lien-discret", type: "button", disabled: guerreOccupe, onclick: () => agirGuerre("guerre-voter", { ile: "" }), text: "Retirer mon vote" }));
    else action = el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: guerreOccupe, onclick: () => agirGuerre("guerre-voter", { ile: i.id }), text: mienne ? "Voter pour la renforcer" : "Voter pour l'attaquer" });
    return el("div", { class: "gu-ile", style: c ? c.style : null },
      el("button", { class: "gu-fermer", type: "button", "aria-label": "Fermer", onclick: () => choisirIleGuerre(guerreIle), text: "✕" }),
      el("p", { class: "gu-ile-sur", text: i.port ? "Port" : i.bonus ? "Île bonus · +10 % de troupes" : "Île" }),
      el("h3", { class: "gu-ile-nom", text: i.nom }),
      i.port ? null : el("p", { class: "gu-ile-tient" }, c ? [drapeauGuerre(c, 28), " Tenue par ", el("b", { text: c.nom })] : "Libre : personne ne la tient encore."),
      i.port ? null : el("p", { class: "gu-ile-garnison" }, el("b", { text: nombre(i.garnison) }), " troupes la gardent"),
      i.bonus && !i.port ? el("p", { class: "note", text: "La commu qui la tient a 10 % de troupes en plus à chaque bataille." }) : null,
      m.engage && !i.port && ouvert ? el("p", { class: "gu-ile-votes", text: votes ? `${pluriel(votes, "vote")} de ta commu pour cette île` : "Pas encore de vote de ta commu ici" }) : null,
      action);
  }

  // ---------- son camp : s'engager, ses troupes du jour, son vote ----------
  function moiGuerre(g) {
    if (g.phase === "bientot") return null; // (le bandeau dit déjà quand la carte se dévoile)
    if (!moi?.connecte) return el("div", { class: "gu-moi-bloc" }, el("p", { text: "Connecte-toi avec Discord pour t'engager pour ton équipage." }), el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter" }));
    const m = g.moi;
    if (!m) return el("p", { class: "note", role: "status", text: "On regarde ton camp…" });
    const titres = (m.titres || []).length ? el("p", { class: "gu-titres" }, (m.titres || []).map((t) => el("span", { class: "gu-titre", text: `👑 ${t}` }))) : null;
    if (g.phase === "fini") return el("div", { class: "gu-moi-bloc" }, (!g.essai && titres) || el("p", { class: "note", text: g.essai ? "L'essai est fini : rien ne compte pour de vrai. La vraie saison reprend sa place dans 2 h." : "La saison est finie : merci à tous les soldats ! Rendez-vous à la prochaine." }));
    if (!m.engage) {
      if (!m.commu) {
        return el("div", { class: "gu-moi-bloc" },
          el("p", { text: "Tu es sur plusieurs Discord de la flotte : choisis d'abord ton équipage dans GRAND LINE, puis reviens t'engager." }),
          el("a", { class: "btn btn-contour btn-petit", href: "#grandline", text: "Choisir mon équipage" }), titres);
      }
      const c = commuGuerre(m.commu, m.nomCommu);
      return el("div", { class: "gu-moi-bloc", style: c.style },
        el("p", {}, "Tu te battras pour ", el("b", { text: c.nom }), " : l'équipage pour lequel tu rames sur GRAND LINE."),
        el("button", { class: "btn btn-plein", type: "button", disabled: guerreOccupe || !m.peutEngager, onclick: () => agirGuerre("guerre-engager"), text: g.phase === "en-cours" ? "Je m'engage (ça compte tout de suite)" : "Je m'engage" }),
        el("p", { class: "note", text: "Engagé, tes games LoL et VALORANT (comptes reliés), ton temps sur les lives des capitaines (Twitch relié), tes messages sur les Discord de la flotte (comptés, jamais lus) et tes parties des jeux du site font des troupes pour ta commu. Une fois la guerre lancée, on ne change plus de camp." }),
        titres);
    }
    const c = commuGuerre(m.commu, m.nomCommu);
    const t = m.troupes || { total: 0 };
    const r = g.regles || {};
    const plafond = Number(r.plafond) || 200;
    const sources = [["partie", "Parties"], ["live", "Live"], ["message", "Messages"], ["jeu", "Jeux du site"]].filter(([k]) => t[k]).map(([k, n]) => `${n} ${nombre(t[k])}`).join(" · ");
    const vote = ileGuerre(g, m.vote);
    return el("div", { class: "gu-moi-bloc engage", style: c.style },
      el("p", { class: "gu-engage" }, drapeauGuerre(c, 32), " Engagé pour ", el("b", { text: c.nom })),
      m.capitaineEnLive && g.phase === "en-cours" ? el("p", { class: "gu-x2", role: "status", text: "🔴 Ton capitaine est en live : tes troupes comptent double !" }) : null,
      g.phase === "en-cours" ? el("div", { class: "gu-mes-troupes" },
        el("p", {}, g.essai ? "Tes troupes pour la prochaine bataille : " : "Tes troupes du jour : ", el("b", { text: `${nombre(t.total)} / ${nombre(plafond)}` })),
        el("span", { class: "gu-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.min(100, Math.round((Number(t.total) / plafond) * 100))}%` })),
        sources ? el("p", { class: "note", text: sources }) : el("p", { class: "note", text: "Pas encore de troupes aujourd'hui : une game, un passage sur un live ou une partie du site, et c'est parti." }),
        m.rang ? el("p", { class: "note", text: `Tu es ${m.rang === 1 ? "1er" : `${m.rang}e`} de ta commu aujourd'hui${m.compte ? " : tes troupes partent à la bataille ce soir." : ` : seuls les ${r.meilleurs || 10} meilleurs comptent, encore un effort !`}` }) : null) : null,
      el("p", { class: "gu-mon-vote" }, vote ? ["Ton vote : ", el("b", { text: vote.nom })] : g.phase === "annonce" ? "Tu peux déjà voter pour la 1re bataille : clique sur une île." : "Tu n'as pas encore voté ce soir : clique sur une île."),
      m.peutQuitter ? el("button", { class: "lien-discret", type: "button", disabled: guerreOccupe, onclick: () => agirGuerre("guerre-quitter"), text: "Ne plus m'engager" }) : null,
      titres);
  }

  // ---------- les armées du jour, les îles de chaque commu ----------
  function armeesGuerre(g) {
    const l = [...(g.commus || [])];
    if (!l.length) return null;
    const enCours = g.phase === "en-cours";
    const max = Math.max(1, ...l.map((x) => Number(enCours ? x.armee : x.garnison) || 0));
    const mienne = g.moi?.engage ? g.moi.commu : "";
    const titre = enCours ? (g.essai ? `Les armées (elles partent à ${heure(g.prochaine || g.fin)})` : "Les armées du jour (elles partent à 21 h)") : g.phase === "fini" ? "Les commus à la fin" : "Les commus de la flotte";
    return el("div", { class: "gu-armees" },
      el("p", { class: "gu-titre-bloc", text: titre }),
      el("ol", { class: "gu-liste", "aria-label": titre }, l.map((x) => {
        const c = commuGuerre(x.id, x.nom);
        const sous = [pluriel(Number(x.iles) || 0, "île"), x.bonus ? `${x.bonus} île${x.bonus > 1 ? "s" : ""} bonus` : "", pluriel(Number(x.engages) || 0, "engagé"), enCours && x.actifs ? `${pluriel(x.actifs, "actif")} aujourd'hui` : "", x.id === mienne ? "ta commu" : ""].filter(Boolean).join(" · ");
        const v = Number(enCours ? x.armee : x.garnison) || 0;
        return el("li", { class: `gu-commu${x.id === mienne ? " gu-moi" : ""}`, style: c.style },
          drapeauGuerre(c, 40),
          el("span", { class: "gu-nom" }, el("b", { text: c.nom }), el("small", { text: sous })),
          x.live ? el("span", { class: "gu-live", title: "Son capitaine est en live : ses troupes comptent double", text: "🔴 ×2" }) : null,
          el("span", { class: "gu-barre", "aria-hidden": "true" }, el("i", { style: `width:${Math.round((v / max) * 100)}%` })),
          el("b", { class: "gu-chiffre", text: enCours ? `${nombre(v)} troupes` : `${nombre(v)} en garnison` }));
      })));
  }

  // ---------- le journal des batailles (sans aucun nom de joueur) ----------
  function journalGuerre(g) {
    const l = g.journal || [];
    if (!l.length) return null;
    const ligne = (y) => {
      const de = (id) => commuGuerre(id).nom;
      if (y.prise) return el("li", { class: "prise", style: commuGuerre(y.apres.commu).style }, "🏴 ", el("b", { text: de(y.apres.commu) }), " prend ", el("b", { text: ileDans(y.nom) }), y.avant.commu ? ` ${aCommu(de(y.avant.commu))}` : "", ` (${nombre(y.apres.garnison)} restent)`);
      if (y.attaques?.length) return el("li", {}, "🛡️ ", el("b", { text: y.nom }), ` tient face ${aCommu(listeCommus(y.attaques.map((a) => de(a.commu))))} (garnison ${nombre(y.apres.garnison)})`);
      if (y.renfort) return el("li", {}, "🧱 ", el("b", { text: de(y.apres.commu) }), " renforce ", el("b", { text: ileDans(y.nom) }), ` (+${nombre(y.renfort)})`);
      return null;
    };
    const bataille = (b, ouverte) => el("details", { class: "gu-bataille", open: ouverte || null },
      el("summary", {}, el("b", { text: `Bataille ${b.n}` }), ` · ${g.essai ? heure(b.t) : jourGuerre(b.t)}`),
      el("ul", {}, (b.iles || []).map(ligne).filter(Boolean).length ? (b.iles || []).map(ligne) : el("li", { text: "Pas de troupes ce soir-là : la mer est restée calme." })),
      evenementsGuerre(b).length ? el("button", { class: "lien-discret gu-revoir-n", type: "button", onclick: () => { $("gu-scene")?.scrollIntoView?.({ block: "center", behavior: reduit.matches ? "auto" : "smooth" }); rejouerBataille(b.n); }, text: "▶ La revoir sur la carte" }) : null);
    return el("div", { class: "gu-journal" },
      el("p", { class: "gu-titre-bloc", text: "Le journal des batailles" }),
      l.slice(0, 7).map((b, k) => bataille(b, k === 0)));
  }

  // ---------- la fin : la commu qui règne ----------
  function finGuerre(g) {
    if (g.phase !== "fini" || !g.fini) return null;
    const c = g.fini.classement || [];
    if (g.essai) {
      const r = g.fini.gagnant ? commuGuerre(g.fini.gagnant) : null;
      return el("div", { class: "gu-fin gu-fin-essai", style: r?.style || null },
        el("p", { class: "gu-fin-titre" }, r ? [el("b", { text: r.nom }), " aurait régné"] : "Personne n'aurait régné"),
        el("ol", { class: "gu-classement" }, c.map((x, k) => el("li", { style: commuGuerre(x.id, x.nom).style }, el("span", { text: String(k + 1) }), el("b", { text: commuGuerre(x.id, x.nom).nom }), ` · ${pluriel(x.iles, "île")}`))),
        el("p", { class: "note", text: "C'était un essai : pas de couronne, pas de milles, pas de titre. La carte d'essai reste 2 h, puis la vraie saison reprend sa place." }));
    }
    if (!g.fini.gagnant) return el("p", { class: "gu-quand", text: "Aucune commu n'a gardé d'île : personne ne règne cette fois." });
    const r = commuGuerre(g.fini.gagnant);
    return el("div", { class: "gu-fin", style: r.style },
      el("span", { class: "gu-couronne", "aria-hidden": "true", text: "👑" }),
      drapeauGuerre(r, 88),
      el("p", { class: "gu-fin-titre" }, el("b", { text: r.nom }), " règne sur GRAND LINE !"),
      el("p", { class: "note", text: `Une couronne sur son navire jusqu'à la fin de la saison suivante, ${nombre(g.regles?.milles || 500)} milles, et le titre « Conquérant · saison ${g.saison} » pour ses soldats.` }),
      el("ol", { class: "gu-classement" }, c.map((x, k) => el("li", { style: commuGuerre(x.id, x.nom).style }, el("span", { text: String(k + 1) }), el("b", { text: commuGuerre(x.id, x.nom).nom }), ` · ${pluriel(x.iles, "île")}`))),
      c[1] && c[1].iles === c[0].iles ? el("p", { class: "note", text: "À égalité d'îles, c'est la plus grosse garnison qui l'emporte." }) : null);
  }

  // ---------- les règles ----------
  function reglesGuerre(g) {
    const r = g.regles || {};
    const p = r.partie || {};
    return el("details", { class: "gu-regles", open: g.phase === "bientot" || null },
      el("summary", { text: "Comment ça marche" }),
      el("ul", {},
        g.essai ? el("li", { class: "gu-essai-regle", text: `Saison d'essai : une bataille toutes les ${pluriel(Number(g.periode) || 10, "minute")} au lieu de chaque soir à 21 h, et les troupes « du jour » valent pour une bataille. Le reste est comme en vrai.` }) : null,
        el("li", { text: "On s'engage sur le site pour l'équipage pour lequel on rame dans GRAND LINE. Une fois la guerre lancée, on ne change plus de camp." }),
        el("li", { text: "La carte : un port par commu (imprenable) et 9 îles à prendre. Le Jardin de Cristal, l'Île des Géants Endormis et la Forteresse des Corsaires donnent +10 % de troupes à la commu qui les tient." }),
        el("li", { text: `Tes troupes du jour (de 21 h à 21 h) : une game LoL ou VALORANT notée (S+ ${p["S+"] || 50}, S ${p.S || 45}, A ${p.A || 40}, B ${p.B || 35}, C ${p.C || 30}, D ${p.D || 25}), ${r.live || 5} par tranche de 5 min sur le live d'un capitaine (${r.liveMax || 120} au plus), ${r.message || 1} par message sur un Discord de la flotte (${r.messageMax || 40} au plus), ${r.jeu || 10} par partie des jeux du site (${r.jeuMax || 50} au plus).` }),
        el("li", { text: `Tout compte double pendant le live du capitaine de ta commu. ${nombre(r.plafond || 200)} troupes au plus par joueur et par jour.` }),
        el("li", { text: `L'armée d'une commu : ses ${r.meilleurs || 10} meilleurs joueurs du jour. Une petite commu bien motivée peut battre une grosse.` }),
        el("li", { text: "Le vote : chacun vote pour l'île à attaquer, ou à renforcer si elle est à sa commu. À 21 h, toute l'armée y va. Sans vote, elle renforce son île la plus faible." }),
        el("li", { text: "La bataille : les attaquants se battent d'abord entre eux ; ce qui reste prend l'île s'il dépasse la garnison. Sinon, la garnison perd la moitié de l'attaque. À égalité, le défenseur garde l'île." }),
        el("li", { text: `La fin : la commu qui tient le plus d'îles règne. Couronne sur son navire, ${nombre(r.milles || 500)} milles sur GRAND LINE, le rôle Conquérants sur le Discord Barhaw et le titre « Conquérant » sur le site.` }),
        el("li", { text: "Sur la carte, personne ne voit les votes des autres commus. Pas de paris, pas de MMR : juste la commu." })));
  }

  // ---------- la bataille rejouée sur la carte ----------
  // Une fois par bataille, toute seule, la première fois qu'on voit la carte après 21 h ; puis quand on veut (« Revoir la
  // bataille », ou une bataille du journal). La carte reprend son état d'avant la bataille (en défaisant les batailles
  // d'après), les flottes partent des ports, puis chaque île prend son sort, l'une après l'autre, avec un petit récit en
  // bas de la carte (et les bruitages, si on les a allumés). En 3D : js/guerre-3d.js ; en 2D (ou si on réduit les
  // animations) : des minuteurs, et des effets sur les images des îles.
  const CLE_GUERRE_VUE = "barhaw-guerre-vue";
  const SONS_GUERRE = ["br-roulement", "br-boum", "impact", "souffle", "br-fanfare", "taiko", "br-monte", "br-cymbale"];
  let guerreRejeu = null; // { n, b, evts, etat : île → { commu, garnison }, vient, genre, k, stop, minuteurs, fini }
  let guerreSceneVue = false, minuteurRejeuAuto = null, attenteRejeuAuto = 0, minuteurRage = null, essaisRage = 0;
  const evenementsGuerre = (b) => (b?.iles || []).filter((y) => y.attaques?.length || y.renfort);
  // la carte juste avant la bataille n : les îles qui se sont battues depuis reprennent leur état d'alors
  function etatAvantGuerre(g, n) {
    const etat = new Map();
    for (const b of g.journal || []) { // (du plus récent au plus ancien)
      if (b.n < n) break;
      for (const y of b.iles || []) if (y.avant) etat.set(y.ile, { commu: y.avant.commu || null, garnison: y.avant.garnison });
    }
    return etat;
  }
  const ilesAffichees = (g) => (guerreRejeu && g ? { ...g, iles: (g.iles || []).map((i) => (guerreRejeu.etat.has(i.id) ? { ...i, ...guerreRejeu.etat.get(i.id) } : i)) } : g);
  const couleursGuerre = (g) => Object.fromEntries((g.commus || []).map((x) => { const c = commuGuerre(x.id, x.nom); return [x.id, { c1: c.c1, c2: c.c2, embleme: c.embleme, drapeau: c.image }]; }));
  const nomGuerre = (id) => (id ? commuGuerre(id).nom : "");
  const joindreGuerre = listeCommus;
  function texteCombatGuerre(y) {
    const att = (y.attaques || []).map((a) => nomGuerre(a.commu));
    if (!att.length) return `${nomGuerre(y.avant?.commu)} envoie des renforts sur ${ileDans(y.nom)}…`;
    return `⚔️ ${joindreGuerre(att)} ${att.length > 1 ? "attaquent" : "attaque"} ${ileDans(y.nom)}…`;
  }
  function detailCombatGuerre(y) {
    const l = (y.attaques || []).map((a) => `${nomGuerre(a.commu)} ${nombre(a.troupes)}`);
    if (y.renfort) l.push(`renfort ${nombre(y.renfort)}`);
    l.push(y.avant?.commu ? `garnison ${deCommu(nomGuerre(y.avant.commu))} ${nombre(y.avant.garnison)}` : `garnison ${nombre(y.avant?.garnison)}`);
    return l.join(" · ");
  }
  function texteSortGuerre(y) {
    if (y.prise) return `🏴 ${nomGuerre(y.apres.commu)} prend ${ileDans(y.nom)}${y.avant?.commu ? ` ${aCommu(nomGuerre(y.avant.commu))}` : ""} !`;
    if (y.attaques?.length) return y.avant?.commu ? `🛡️ ${y.nom} tient bon : ${nomGuerre(y.avant.commu)} la garde.` : `🛡️ ${y.nom} résiste et reste libre.`;
    return `🧱 ${nomGuerre(y.apres.commu)} renforce ${ileDans(y.nom)}.`;
  }
  function detailSortGuerre(y) {
    if (y.prise) return `${pluriel(Number(y.apres.garnison) || 0, "troupe")} y restent`;
    return `garnison : ${nombre(y.apres?.garnison)}${y.renfort && !y.attaques?.length ? ` (+${nombre(y.renfort)})` : ""}`;
  }
  // le récit, en bas de la carte
  function ouvrirRecitGuerre(R) {
    const z = $("gu-recit");
    if (!z) return;
    z.hidden = false;
    z.classList.remove("fini");
    vider(z,
      el("p", { class: "gu-recit-titre" }, el("b", { text: `Bataille ${R.n}` }), el("small", { text: jourGuerre(R.b.t, { weekday: "short", month: "short" }) })),
      el("div", { class: "gu-recit-corps" },
        el("p", { class: "gu-recit-texte", id: "gu-recit-texte", role: "status", "aria-live": "polite", text: R.evts.length ? "⛵ Les flottes prennent la mer…" : "Pas de troupes ce soir-là : la mer est restée calme." }),
        el("p", { class: "gu-recit-detail", id: "gu-recit-detail" })),
      el("button", { class: "gu-recit-passer", type: "button", onclick: () => passerRejeuGuerre(), text: "Passer ⏭" }),
      R.evts.length > 1 ? el("ol", { class: "gu-recit-points", "aria-hidden": "true" }, R.evts.map(() => el("li"))) : null);
    // au téléphone, le récit se met sous la carte (la carte garde sa taille, la partie grandit le temps de la bataille) :
    // posé dessus, il cacherait les îles du bas
    const sc = $("gu-scene");
    if (sc && matchMedia("(max-width: 760px)").matches) {
      const h = sc.getBoundingClientRect().height;
      const b = z.offsetHeight + 12;
      sc.classList.add("recit-dessous");
      sc.style.setProperty("--recit", `${b}px`);
      sc.style.height = `${Math.round(h + b)}px`;
    }
  }
  function rangerRecitGuerre() {
    const z = $("gu-recit"), sc = $("gu-scene");
    if (z) { z.hidden = true; vider(z); }
    if (sc?.classList.contains("recit-dessous")) { sc.classList.remove("recit-dessous"); sc.style.removeProperty("--recit"); sc.style.removeProperty("height"); }
  }
  function majRecitGuerre(texte, detail = "", k = -1, genre = "") {
    const t = $("gu-recit-texte"), d = $("gu-recit-detail");
    if (t) {
      t.textContent = texte;
      t.dataset.genre = genre;
      t.classList.remove("neuf");
      void t.offsetWidth;
      t.classList.add("neuf");
    }
    if (d) d.textContent = detail;
    ($("gu-recit")?.querySelectorAll(".gu-recit-points li") || []).forEach((p, n) => {
      p.classList.toggle("fait", n < k || (n === k && Boolean(genre)));
      p.classList.toggle("en-cours", n === k && !genre);
    });
  }
  async function rejouerBataille(n, { auto = false } = {}) {
    let g = infosGuerre();
    if (!g) return;
    if (!carteGuerre) { await preparerCarteGuerre(g); g = infosGuerre(); }
    const b = (g?.journal || []).find((x) => x.n === n);
    if (!b || !carteGuerre) return;
    arreterRejeuGuerre();
    const R = { n, b, evts: evenementsGuerre(b), etat: etatAvantGuerre(g, n), vient: "", genre: "", k: -1, stop: null, minuteurs: [], fini: false, auto };
    guerreRejeu = R;
    prechargerSons(SONS_GUERRE);
    ouvrirRecitGuerre(R);
    rendreGuerre(); // la carte d'avant la bataille
    const combat = (y, k) => {
      if (guerreRejeu !== R) return;
      R.k = k;
      R.vient = "";
      majRecitGuerre(texteCombatGuerre(y), detailCombatGuerre(y), k);
      if (y.attaques?.length) { jouerSon("br-boum", { volume: 0.9 }); jouerSon("impact", { volume: 0.55, retard: 0.3 }); jouerSon("br-boum", { volume: 0.6, retard: 0.6 }); }
      else jouerSon("souffle", { volume: 0.8 });
      if (carteGuerre?.type === "2d" && !reduit.matches) carteGuerre.rendu.effet?.(y.ile, "feu");
    };
    const etape = (y, k) => {
      if (guerreRejeu !== R) return;
      R.etat.set(y.ile, { commu: y.apres?.commu || null, garnison: y.apres?.garnison });
      R.vient = y.ile;
      R.genre = y.prise ? "prise" : y.attaques?.length ? "tient" : "renfort";
      majRecitGuerre(texteSortGuerre(y), detailSortGuerre(y), k, R.genre);
      jouerSon(R.genre === "prise" ? "br-fanfare" : R.genre === "tient" ? "taiko" : "br-monte", { volume: 0.85 });
      if (carteGuerre?.type === "2d" && !reduit.matches) carteGuerre.rendu.effet?.(y.ile, R.genre);
      rendreGuerre();
    };
    const fin = () => { if (guerreRejeu === R && !R.fini) finRecitGuerre(R); };
    if (!R.evts.length) { R.minuteurs.push(setTimeout(fin, 1800)); R.stop = fin; return; }
    jouerSon("br-roulement", { volume: 0.75 });
    if (carteGuerre.type === "3d" && !reduit.matches) {
      R.stop = carteGuerre.rendu.bataille(b, { couleurs: couleursGuerre(g), surCombat: combat, surEtape: etape, fin });
      return;
    }
    // en 2D (et quand on réduit les animations) : la même histoire, avec des minuteurs
    const anime = carteGuerre.type === "2d" && !reduit.matches;
    const voyage = anime ? 1900 : 1200, pas = 2600, boum = 1000;
    if (anime) {
      const ports = new Map((g.iles || []).filter((i) => i.port).map((i) => [i.port, i.id]));
      carteGuerre.rendu.voguer?.(R.evts.flatMap((y) => [...(y.attaques || []).map((a) => a.commu), ...(y.renfort && y.avant?.commu ? [y.avant.commu] : [])]
        .filter((c) => ports.has(c)).map((c) => ({ commu: c, de: ports.get(c), vers: y.ile }))), voyage - 200);
    }
    R.evts.forEach((y, k) => {
      R.minuteurs.push(setTimeout(() => combat(y, k), voyage + k * pas));
      R.minuteurs.push(setTimeout(() => etape(y, k), voyage + k * pas + boum));
    });
    R.minuteurs.push(setTimeout(fin, voyage + R.evts.length * pas + 300));
    R.stop = () => {
      R.minuteurs.forEach(clearTimeout);
      R.minuteurs = [];
      for (const y of R.evts) R.etat.set(y.ile, { commu: y.apres?.commu || null, garnison: y.apres?.garnison });
      carteGuerre?.rendu.nettoyer?.();
      fin();
      rendreGuerre();
    };
  }
  // la fin : le compte des îles après la bataille, quelques secondes, puis la carte revient à aujourd'hui
  function finRecitGuerre(R) {
    R.fini = true;
    R.vient = "";
    // (si on a passé : chaque île prend son sort d'un coup, en 3D comme en 2D)
    for (const y of R.evts) R.etat.set(y.ile, { commu: y.apres?.commu || null, garnison: y.apres?.garnison });
    carteGuerre?.rendu.nettoyer?.();
    const gv = ilesAffichees(infosGuerre());
    const compte = new Map();
    for (const i of gv?.iles || []) if (!i.port && i.commu) compte.set(i.commu, (compte.get(i.commu) || 0) + 1);
    const libres = (gv?.iles || []).filter((i) => !i.port && !i.commu).length;
    const ligne = [...[...compte.entries()].sort((a, b) => b[1] - a[1]).map(([c, k]) => `${nomGuerre(c)} ${pluriel(k, "île")}`), libres ? `${libres} libre${libres > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
    if (R.evts.length) {
      majRecitGuerre(`Fin de la bataille ${R.n}`, ligne, R.evts.length, "fin");
      jouerSon("br-cymbale", { volume: 0.7 });
    }
    $("gu-recit")?.classList.add("fini");
    const bouton = $("gu-recit")?.querySelector(".gu-recit-passer");
    if (bouton) bouton.textContent = "Fermer ✕";
    R.minuteurs.push(setTimeout(() => fermerRejeuGuerre(R), R.evts.length ? 3600 : 2200));
    rendreGuerre();
  }
  function fermerRejeuGuerre(R) {
    if (guerreRejeu !== R) return;
    arreterRejeuGuerre();
    rendreGuerre();
  }
  function passerRejeuGuerre() {
    const R = guerreRejeu;
    if (!R) return;
    if (R.fini) fermerRejeuGuerre(R);
    else R.stop?.();
  }
  // tout s'arrête (une autre bataille, la carte qui se refait) : pas de fin, le récit disparaît
  function arreterRejeuGuerre() {
    const R = guerreRejeu;
    if (!R) return;
    guerreRejeu = null;
    R.minuteurs.forEach(clearTimeout);
    if (!R.fini && carteGuerre?.type === "3d") { try { carteGuerre.rendu.finirBataille?.(); } catch {} }
    carteGuerre?.rendu.nettoyer?.();
    rangerRecitGuerre();
  }
  // la lecture toute seule : la dernière bataille (de moins d'un jour), une seule fois, quand la carte est bien en vue
  function rejeuAutoGuerre() {
    const g = infosGuerre();
    if (guerreRejeu || !g || !carteGuerre || !guerreSceneVue || document.hidden || reduit.matches) return;
    // (pendant que la bataille fait rage, on attend la nouvelle plutôt que de rejouer celle d'hier)
    if ((g.phase !== "en-cours" && g.phase !== "fini") || enRageGuerre(g)) return;
    const b = g.journal?.[0];
    if (!b || !evenementsGuerre(b).length || Date.now() - b.t > 26 * 3_600_000) return;
    const cle = `${g.saison}:${b.n}`;
    let vu = "";
    try { vu = localStorage.getItem(CLE_GUERRE_VUE) || ""; } catch {}
    if (vu === cle) return;
    // en 3D, on attend que les îles soient là (8 s au plus)
    if (carteGuerre.type === "3d" && !carteGuerre.rendu.pret?.() && Date.now() - (attenteRejeuAuto ||= Date.now()) < 8000) {
      clearTimeout(minuteurRejeuAuto);
      minuteurRejeuAuto = setTimeout(rejeuAutoGuerre, 400);
      return;
    }
    attenteRejeuAuto = 0;
    try { localStorage.setItem(CLE_GUERRE_VUE, cle); } catch {}
    rejouerBataille(b.n, { auto: true });
  }
  // le bouton « Revoir la bataille » (la dernière), sous la carte
  function majRevoirGuerre(g = infosGuerre()) {
    const revoir = $("gu-revoir");
    if (!revoir || !g) return;
    const b = g.journal?.[0];
    revoir.hidden = !b || !carteGuerre || Boolean(guerreRejeu) || !evenementsGuerre(b).length;
    revoir.setAttribute("aria-label", b ? `Revoir la bataille ${b.n} sur la carte` : "Revoir la bataille");
  }
  // pendant que la bataille fait rage : des coups de canon sur la carte, et la page redemande les résultats (15 s)
  function suivreRageGuerre(g) {
    const rage = enRageGuerre(g);
    carteGuerre?.rendu.agiter?.(rage && !guerreRejeu);
    if (!rage) { essaisRage = 0; clearTimeout(minuteurRage); minuteurRage = null; return; }
    if (minuteurRage || essaisRage >= 16) return;
    minuteurRage = setTimeout(() => { minuteurRage = null; essaisRage++; if (!document.hidden) charger(); }, 15_000);
  }

  // ---------- la partie ----------
  function squeletteGuerre(z) {
    if ($("gu-scene")) return;
    vider(z,
      el("div", { id: "gu-banniere" }),
      el("div", { class: "gu-scene", id: "gu-scene" },
        el("div", { class: "gu-plateau", id: "gu-plateau" }, el("p", { class: "gu-attente", text: "La carte se déplie…" })),
        el("div", { class: "gu-etiquettes", id: "gu-etiquettes" }),
        el("div", { class: "gu-recit", id: "gu-recit", hidden: true })),
      // sous la carte : ce que veulent dire les étiquettes, et le bouton 2D / 3D
      el("div", { class: "gu-sous-carte", id: "gu-sous-carte" },
        el("ul", { class: "gu-legende", "aria-label": "La légende de la carte" },
          el("li", {}, el("i", { class: "gu-pastille libre", "aria-hidden": "true" }), "libre"),
          el("li", {}, el("i", { class: "gu-pastille", "aria-hidden": "true" }), "tenue (aux couleurs de la commu)"),
          el("li", {}, el("b", { class: "gu-et-bonus", text: "+10 %" }), "île bonus"),
          el("li", {}, el("b", { class: "gu-et-votes", text: "🗳" }), "votes de ta commu"),
          el("li", {}, el("i", { class: "gu-pastille vote", "aria-hidden": "true" }), "ton vote")),
        el("div", { class: "gu-boutons-carte" },
          el("button", { class: "gu-revoir btn btn-plein btn-petit", id: "gu-revoir", type: "button", hidden: true, onclick: () => { const b = infosGuerre()?.journal?.[0]; if (b) rejouerBataille(b.n); }, text: "▶ Revoir la bataille" }),
          el("button", { class: "gu-bascule btn btn-contour btn-petit", id: "gu-bascule", type: "button", hidden: true, onclick: () => basculerCarteGuerre() }))),
      el("div", { class: "gu-grille" },
        el("div", { class: "gu-info", id: "gu-info", "aria-live": "polite" }),
        el("div", { class: "gu-moi", id: "gu-moi", "aria-live": "polite" })),
      el("div", { id: "gu-message" }),
      el("div", { id: "gu-fin" }),
      el("div", { id: "gu-armees" }),
      el("div", { id: "gu-journal" }),
      el("div", { id: "gu-regles" }));
    // la carte suit la taille de la partie ; elle ne bouge que quand on la voit
    if ("ResizeObserver" in window) new ResizeObserver(() => { tailleCarteGuerre(); recadrerEtiquettes2D(); }).observe($("gu-plateau"));
    // la bataille se rejoue toute seule quand la carte est bien en vue (plus de la moitié à l'écran)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => {
        guerreSceneVue = e.some((x) => x.isIntersecting && x.intersectionRatio >= 0.55);
        if (guerreSceneVue) rejeuAutoGuerre();
      }, { threshold: [0, 0.55, 1] }).observe($("gu-scene"));
    } else guerreSceneVue = true;
    const section = $("guerre");
    if (section && "IntersectionObserver" in window) {
      new IntersectionObserver((e) => {
        const vu = e.some((x) => x.isIntersecting);
        guerreVue = vu;
        if (vu) {
          const g = infosGuerre();
          if (g && g.phase !== "bientot") preparerCarteGuerre(g);
          carteGuerre?.rendu.demarrer?.();
          suivreReboursGuerre();
        } else carteGuerre?.rendu.arreter?.();
      }, { rootMargin: "300px 0px" }).observe(section);
    } else guerreVue = true;
  }
  function rendreZone(id, cle, fabrique) {
    const z = $(id);
    if (!z || sigGuerre[id] === cle) return;
    sigGuerre[id] = cle;
    vider(z, fabrique());
  }
  function rendreGuerre() {
    const section = $("guerre"), z = $("guerre-carte");
    const g = infosGuerre();
    if (!section || !z) return;
    section.hidden = !g || !document.documentElement.classList.contains("v4");
    const pastille = $("pastille-guerre");
    if (pastille) pastille.hidden = g?.phase !== "en-cours";
    if (!g || section.hidden) return;
    // connecté : on demande au bot son camp et ses troupes (toutes les 2 minutes pendant la guerre, une fois l'heure sinon)
    if (guerrePhase && g.phase !== guerrePhase) guerreMessage = null;
    // (une autre saison, la saison d'essai qui arrive ou s'efface : on redemande aussi)
    if (moi?.connecte && g.phase !== "bientot" && (!guerreDemande || g.phase !== guerrePhase || g.saison !== guerreSaison || Date.now() - guerreDemande > (g.phase === "en-cours" && guerreVue ? 120_000 : 3_600_000))) { guerreDemande = Date.now(); guerrePhase = g.phase; guerreSaison = g.saison; maGuerre = maGuerre?.saison === g.saison ? maGuerre : null; agirGuerre("guerre"); }
    squeletteGuerre(z);
    z.dataset.phase = g.phase;
    $("gu-scene").hidden = g.phase === "bientot";
    $("gu-sous-carte").hidden = g.phase === "bientot";
    rendreZone("gu-banniere", JSON.stringify([g.phase, g.saison, g.debut, g.fin, g.ouverture, g.bataille, g.prochaine, g.fini?.gagnant, enRageGuerre(g)]), () => banniereGuerre(g));
    if (g.phase !== "bientot") {
      if (guerreVue) preparerCarteGuerre(g);
      if (carteGuerre) {
        const gv = ilesAffichees(g);
        if (carteGuerre.type === "3d") carteGuerre.rendu.maj(donnees3DGuerre(gv));
        else carteGuerre.rendu.maj(gv);
        rendreEtiquettesGuerre(gv);
      }
    }
    majRevoirGuerre(g);
    suivreRageGuerre(g);
    rejeuAutoGuerre();
    rendreZone("gu-info", JSON.stringify([g.saison, g.phase === "bientot" ? 0 : 1, guerreIle, ileGuerre(g, guerreIle), g.moi?.vote, g.moi?.votes?.[guerreIle], g.moi?.engage, g.moi?.commu, Boolean(moi?.connecte), guerreOccupe]), () => (g.phase === "bientot" ? null : infoIleGuerre(g)));
    rendreZone("gu-moi", JSON.stringify([g.saison, g.phase, g.moi, Boolean(moi?.connecte), guerreOccupe, (g.iles || []).find((i) => i.id === g.moi?.vote)?.nom]), () => moiGuerre(g));
    rendreZone("gu-message", JSON.stringify(guerreMessage), () => (guerreMessage ? el("p", { class: guerreMessage.erreur ? "note erreur" : "jeu-bravo", role: "status", text: guerreMessage.texte }) : null));
    rendreZone("gu-fin", JSON.stringify([g.phase, g.fini]), () => finGuerre(g));
    rendreZone("gu-armees", JSON.stringify([g.phase, g.commus, g.moi?.engage, g.moi?.commu]), () => (g.phase === "bientot" ? null : armeesGuerre(g)));
    rendreZone("gu-journal", JSON.stringify(g.journal?.map((b) => b.n)), () => journalGuerre(g));
    rendreZone("gu-regles", JSON.stringify([g.saison, g.phase === "bientot", g.regles]), () => reglesGuerre(g));
    if (guerreVue) suivreReboursGuerre();
  }
  async function agirGuerre(action, extra = {}) {
    if (guerreOccupe) return;
    guerreOccupe = true;
    if (action !== "guerre") { guerreMessage = null; rendreGuerre(); }
    let d = {};
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
    } catch { d = { erreur: "reseau", texte: "Impossible de joindre le bot. Vérifie ta connexion." }; }
    guerreOccupe = false;
    if (d.guerre) maGuerre = d.guerre;
    const g = infosGuerre();
    if (d.erreur && action !== "guerre") guerreMessage = { texte: d.texte || (typeof d.erreur === "string" && d.erreur.length > 12 ? d.erreur : "Ça n'a pas marché, réessaie."), erreur: true };
    else if (action === "guerre-engager" && d.ok) guerreMessage = { texte: g?.phase === "en-cours" ? "Engagé ! Tes troupes comptent dès maintenant. Vote pour l'île de ce soir." : `Engagé ! La guerre commence le ${jourGuerre(g?.debut || Date.now())}. Tu peux déjà voter pour la 1re bataille.` };
    else if (action === "guerre-quitter" && d.ok) guerreMessage = { texte: "Tu n'es plus engagé." };
    else if (action === "guerre-voter" && d.ok) guerreMessage = { texte: extra.ile ? `Vote enregistré : ${ileGuerre(g, extra.ile)?.nom || "l'île"}, ${g?.essai ? `à la prochaine bataille (${heure(g.prochaine || g.debut)})` : `ce soir à ${g?.heure || "21 h"}`}.` : "Vote retiré." };
    rendreGuerre();
  }
  // ---------- la VF 1.0 : la mer en direct (la course se joue dans le bot : lib/mer.js) ----------
  // Un soir de live, Liliano (ou le capitaine d'une commu) lance une course : tout le monde sur la même mer, chacun sa
  // barque, 4 bouées à toucher dans l'ordre puis la ligne. js/mer-jeu.js fait la connexion et le suivi (les autres un
  // peu en retard pour être fluides, la sienne tout de suite) ; js/mer-3d.js ou js/mer-2d.js dessinent. On monte à
  // bord connecté avec Discord ; tout le monde peut regarder. Sans course : l'entraînement contre des barques d'essai,
  // joué dans la page (rien n'est envoyé). Les pseudos sont ceux de Discord, comme dans les classements du site.
  let maMer = null, merOccupe = false, merMessage = null, merDemande = 0, merVue = false;
  let sallesMer = null; // la liste à jour, reçue du bot (le salon d'attente), plus fraîche que /api/public
  let salonMer = null; // la connexion qui attend qu'une mer ouvre
  let partieMer = null; // la course à l'écran
  let modulesMer = null;
  let merHote = ""; // la mer choisie dans le panneau du capitaine
  let merVeut2D = null; // null : le choix de l'appareil ; true / false : celui du visiteur
  let minuteurMer = null;
  const sigMer = {};
  const zoneMer = (id, cle, fabrique) => { const z = $(id); if (!z || sigMer[id] === cle) return; sigMer[id] = cle; vider(z, fabrique()); };
  const PHASES_MER = { embarquement: "Embarquement", depart: "Au départ", course: "Course en cours", resultats: "Résultats", libre: "Entre deux courses" };
  const SONS_MER = ["br-tic", "br-cymbale", "pop", "impact", "victoire", "br-paillettes", "br-fanfare"];
  const tempsMer = (s) => { if (s === null || s === undefined) return "—"; const m = Math.floor(s / 60); const x = (s - m * 60).toFixed(2).replace(".", ","); return m ? `${m}:${x.padStart(5, "0")}` : `${x} s`; };
  const rangMer = (n) => (n === 1 ? "1er" : `${n}e`);
  function infosMer() {
    const pub = donnees?.mer || null;
    if (!pub && !maMer) return null;
    const parId = new Map();
    for (const s of [...(maMer?.salles || []), ...(pub?.salles || []), ...(sallesMer || [])]) if (s?.id) parId.set(s.id, s);
    // la liste du salon fait foi pour les vraies mers : une mer qui n'y est plus est fermée
    if (sallesMer) for (const [id, s] of parId) if (!s.essai && !sallesMer.some((x) => x.id === id)) parId.delete(id);
    return { ...(pub || {}), ...(maMer || {}), salles: [...parId.values()] };
  }
  // les couleurs des commus de la flotte (Barhaw d'abord)
  function paletteMer(ids = []) {
    const tous = new Set(["barhaw", ...ids, ...((donnees?.flotte?.commus || []).map((c) => c?.id).filter(Boolean))]);
    return Object.fromEntries([...tous].map((id) => { const c = commuGuerre(id); return [id, { nom: c.nom, c1: c.c1, c2: c.c2, embleme: c.embleme }]; }));
  }

  // ---------- la partie du site ----------
  function squeletteMer(z) {
    if ($("mer-salles")) return;
    vider(z,
      el("div", { class: "mer-salles", id: "mer-salles", "aria-live": "polite" }),
      el("div", { class: "mer-hote", id: "mer-hote" }),
      el("div", { id: "mer-message" }),
      el("div", { class: "mer-scene", id: "mer-scene", hidden: true }),
      el("div", { class: "mer-sous" },
        el("div", { class: "mer-regles", id: "mer-regles" }),
        el("div", { class: "mer-palmares", id: "mer-palmares" })));
  }
  function sallesMerHtml(m, ouvertes) {
    if (!ouvertes.length) {
      return el("div", { class: "mer-calme" },
        el("p", { class: "mer-calme-titre", text: "🌊 Pas de course en ce moment" }),
        el("p", { text: "Les courses se lancent pendant les lives de Liliano et des capitaines de la flotte : le chat et le Discord préviennent, et la mer s'ouvre ici." }),
        el("div", { class: "rangee" },
          el("button", { class: "btn btn-plein", type: "button", onclick: () => ouvrirPartieMer({ type: "entrainement" }), text: "🏝️ S'entraîner" }),
          el("span", { class: "note", text: "Contre 7 barques d'essai : rien n'est envoyé, rien ne compte." })));
    }
    return el("div", { class: "mer-liste" }, ouvertes.map((s) => {
      const c = commuGuerre(s.id);
      const reste = s.fin ? Math.max(0, Math.round((s.fin - Date.now()) / 1000)) : 0;
      const etat = s.phase === "embarquement" ? `Départ dans ${Math.floor(reste / 60)}:${String(reste % 60).padStart(2, "0")}` : PHASES_MER[s.phase] || "";
      const ici = partieMer?.salle === s.id;
      const boutons = !m.adresse && !s.essai
        ? [el("span", { class: "note", text: "La mer n'est pas encore installée sur le serveur." })]
        : [
            moi?.connecte
              ? el("button", { class: "btn btn-plein", type: "button", disabled: merOccupe || (ici && partieMer?.o.role === "joueur"), onclick: () => embarquerMer(s.id), text: ici && partieMer?.o.role === "joueur" ? "⛵ À bord" : "⛵ Monter à bord" })
              : el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord pour courir" }),
            el("button", { class: "btn btn-contour", type: "button", disabled: merOccupe || ici, onclick: () => regarderMer(s.id), text: "👀 Regarder" }),
          ];
      return el("div", { class: `mer-salle${s.essai ? " essai" : ""}` },
        el("span", { class: "mer-drapeau", style: `--c1:${c.c1};--c2:${c.c2}`, "aria-hidden": "true", text: c.embleme }),
        el("div", { class: "mer-salle-texte" },
          el("p", { class: "mer-salle-nom" }, el("b", { text: `La mer ${deCommu(c.nom)}` }), s.essai ? el("span", { class: "etiquette", text: "🧪 essai" }) : s.live ? el("span", { class: "pastille-live", text: "Live" }) : null),
          el("p", { class: "mer-salle-infos", text: `Course ${s.numero || 1} · ${s.parcours || ""}` }),
          el("p", { class: "mer-salle-etat" }, el("b", { text: etat }), ` · ${nombre(s.barques)} barque${s.barques > 1 ? "s" : ""} sur ${s.places || 50}`)),
        el("div", { class: "mer-boutons" }, boutons));
    }));
  }
  // le panneau de celui qui lance : toi (toutes les mers), un capitaine (celle de sa commu)
  function hoteMerHtml(m) {
    const hotes = m?.hotes || [];
    if (!hotes.length) return null;
    if (!hotes.includes(merHote)) merHote = hotes[0];
    const s = (m.salles || []).find((x) => x.id === merHote);
    const c = commuGuerre(merHote);
    const agir = (action, extra = {}) => () => agirMer(action, { salle: merHote, ...extra });
    return el("div", { class: "carte mer-hote-carte" },
      el("p", { class: "mer-hote-titre" }, el("b", { text: "🎙️ Ton panneau" }), hotes.length > 1 ? " · " : null,
        hotes.length > 1 ? el("select", { class: "mer-choix", "aria-label": "La mer de quelle commu", onchange: (e) => { merHote = e.target.value; sigMer["mer-hote"] = ""; rendreMer(); } },
          hotes.map((id) => el("option", { value: id, selected: id === merHote, text: commuGuerre(id).nom }))) : ` La mer ${deCommu(c.nom)}`),
      el("div", { class: "rangee" },
        !s ? el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: merOccupe || m.apercu, onclick: agir("mer-lancer"), text: "⛵ Ouvrir la mer" }) : null,
        !s ? el("button", { class: "btn btn-contour btn-petit", type: "button", disabled: merOccupe, onclick: agir("mer-lancer", { essai: true }), text: "🧪 Mer d'essai" }) : null,
        s && (s.phase === "libre" || s.phase === "resultats") ? el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: merOccupe, onclick: agir("mer-lancer", { essai: s.essai }), text: "⛵ Course suivante" }) : null,
        s?.phase === "embarquement" ? el("button", { class: "btn btn-plein btn-petit", type: "button", disabled: merOccupe || !s.barques, onclick: agir("mer-depart"), text: "🚩 Départ !" }) : null,
        s ? el("button", { class: "btn btn-contour btn-petit", type: "button", disabled: merOccupe, onclick: agir("mer-arreter"), text: "⚓ Fermer la mer" }) : null),
      el("p", { class: "note", text: m.apercu ? "Avant la VF 1.0, seulement des mers d'essai (12 fausses barques) : toi seul les vois." : "La mer s'ouvre pendant ton live (sinon : une mer d'essai, avec 12 fausses barques, qui ne compte pas). Dans ton chat : !mer, !mer go, !mer stop." }));
  }
  function reglesMerHtml(m) {
    return el("div", { class: "carte" },
      el("h3", { text: "Comment ça marche" }),
      el("ul", { class: "mer-liste-regles" },
        el("li", {}, el("b", { text: "⌨️ Au clavier" }), " : flèches ou Q / D pour tourner, espace (ou Z, ↑) pour ramer fort."),
        el("li", {}, el("b", { text: "👆 Au doigt" }), " : les deux grosses flèches pour tourner, le bouton RAME ! pour ramer fort."),
        el("li", {}, el("b", { text: "🚣 La rame" }), " se vide en 2 secondes et se recharge toute seule : garde-la pour les lignes droites."),
        el("li", {}, el("b", { text: "🎯 Les 4 bouées" }), " se touchent dans l'ordre (la flèche d'or montre la suivante), puis on repasse la ligne. Les rochers ralentissent, les autres barques se poussent."),
        el("li", {}, el("b", { text: "🏆 Le podium" }), " gagne 4 000, 2 500 et 1 500 berrys, chaque barque arrivée 400, et des milles pour le navire de chacun (pendant le live, à partir de 3 barques)."),
        el("li", {}, el("b", { text: "🪙 Le coffre" }), " apparaît entre deux courses : le premier qui l'atteint gagne 2 000 berrys.")),
      m?.aujourdhui !== undefined ? el("p", { class: "note", text: `Aujourd'hui : ${m.aujourdhui} course${m.aujourdhui > 1 ? "s" : ""} sur ${m.parJour || 10} qui rapportent.` }) : null);
  }
  function palmaresMerHtml(m) {
    const noms = Object.fromEntries((m?.parcours || []).map((p) => [p.id, p.nom]));
    const records = Object.entries(m?.records || {});
    const h = m?.historique || [];
    return el("div", { class: "carte" },
      el("h3", { text: "Records et dernières courses" }),
      records.length ? el("ul", { class: "mer-records" }, records.map(([id, r]) => el("li", {}, el("span", { text: noms[id] || id }), el("b", { text: tempsMer(r.temps) }), el("small", { text: r.nom })))) : el("p", { class: "note", text: "Pas encore de record : le premier sera le tien ?" }),
      h.length ? el("ol", { class: "mer-historique" }, h.slice(0, 5).map((c) => el("li", {},
        el("span", { class: "mer-h-quand", text: `${fmtCourt.format(new Date(c.le))} à ${heure(c.le)}` }),
        el("span", { text: `${c.nomParcours} · ${c.barques} barques` }),
        el("span", { class: "mer-h-podium", text: (c.podium || []).map((x, k) => `${["🥇", "🥈", "🥉"][k]} ${x.nom}`).join("  ") })))) : null);
  }

  function rendreMer() {
    const section = $("mer"), z = $("mer-carte");
    if (!section || !z) return;
    const m = infosMer();
    const vf = document.documentElement.classList.contains("v4");
    // avant la VF, le site public ne dit rien de la mer : Liliano (son aperçu) la demande au bot
    if (!m && vf && moi?.connecte && !merOccupe && !merDemande) { merDemande = Date.now(); agirMer("mer"); }
    section.hidden = !m || !vf;
    const ouvertes = (m?.salles || []).filter((s) => s.phase && s.phase !== "fermee");
    const pastille = $("pastille-mer");
    if (pastille) pastille.hidden = !ouvertes.some((s) => !s.essai);
    if (section.hidden) { if (partieMer) fermerPartieMer(); return; }
    // connecté : ce que le bot dit pour lui (ses mers d'essai, son panneau de capitaine, son compte du jour)
    if (moi?.connecte && !merOccupe && (!merDemande || Date.now() - merDemande > (merVue ? 60_000 : 900_000))) { merDemande = Date.now(); agirMer("mer"); }
    squeletteMer(z);
    const seconde = ouvertes.some((s) => s.phase === "embarquement") ? Math.floor(Date.now() / 1000) : 0;
    zoneMer("mer-salles", JSON.stringify([ouvertes, Boolean(moi?.connecte), merOccupe, partieMer?.salle || "", partieMer?.o?.role || "", m.adresse ? 1 : 0, seconde]), () => sallesMerHtml(m, ouvertes));
    zoneMer("mer-hote", JSON.stringify([m.hotes, merHote, (m.salles || []).map((s) => [s.id, s.phase, s.barques, s.essai]), merOccupe, m.apercu]), () => hoteMerHtml(m));
    zoneMer("mer-message", JSON.stringify(merMessage), () => (merMessage ? el("p", { class: merMessage.erreur ? "note erreur" : "jeu-bravo", role: "status", text: merMessage.texte }) : null));
    zoneMer("mer-regles", JSON.stringify([m.aujourdhui, m.parJour]), () => reglesMerHtml(m));
    zoneMer("mer-palmares", JSON.stringify([m.records, (m.historique || []).map((x) => x.le)]), () => palmaresMerHtml(m));
    // le compte à rebours de l'embarquement, à la seconde
    clearTimeout(minuteurMer);
    if (seconde && merVue) minuteurMer = setTimeout(rendreMer, 1000 - (Date.now() % 1000) + 20);
    suivreSallesMer();
  }
  async function agirMer(action, extra = {}) {
    if (merOccupe) return null;
    merOccupe = true;
    if (action !== "mer") { merMessage = null; rendreMer(); }
    let d = {};
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
      d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
    } catch { d = { erreur: "reseau", texte: "Impossible de joindre le bot. Vérifie ta connexion." }; }
    merOccupe = false;
    if (d.mer !== undefined) maMer = d.mer;
    if (d.erreur && action !== "mer") merMessage = { texte: d.texte || "Ça n'a pas marché, réessaie.", erreur: true };
    else if (["mer-lancer", "mer-depart", "mer-arreter"].includes(action) && d.texte) merMessage = { texte: d.texte };
    rendreMer();
    return d;
  }
  // la liste des mers à jour : une connexion qui attend, seulement quand la partie est à l'écran (et avec la VF)
  function suivreSallesMer() {
    const m = infosMer();
    const veut = merVue && !document.hidden && Boolean(m?.adresse) && v4Officielle() && !partieMer;
    if (!veut) {
      if (salonMer) { const s = salonMer; salonMer = null; try { s.close(1000); } catch {} }
      return;
    }
    if (salonMer) return;
    let ws;
    try { ws = new WebSocket(m.adresse); } catch { return; }
    salonMer = ws;
    ws.addEventListener("open", () => ws.send(JSON.stringify({ k: "bonjour", v: 1, salle: "*" })));
    ws.addEventListener("message", (e) => {
      if (typeof e.data !== "string") return;
      try { const x = JSON.parse(e.data); if (x.k === "salles" && Array.isArray(x.salles)) { sallesMer = x.salles; rendreMer(); } } catch {}
    });
    ws.addEventListener("close", () => { if (salonMer === ws) { salonMer = null; setTimeout(suivreSallesMer, 15_000); } });
  }
  async function embarquerMer(salle) {
    if (!moi?.connecte) { location.href = "/api/auth/login"; return; }
    const d = await agirMer("mer-embarquer", { salle });
    if (d?.ticket) ouvrirPartieMer({ type: "reseau", salle: d.salle, adresse: d.adresse, ticket: d.ticket, role: "joueur" });
  }
  async function regarderMer(salle) {
    const m = infosMer();
    const s = (m?.salles || []).find((x) => x.id === salle);
    // une mer d'essai : seulement avec un billet (toi, ou le capitaine)
    if (s?.essai || !v4Officielle()) {
      const d = await agirMer("mer-regarder", { salle });
      if (d?.ticket) ouvrirPartieMer({ type: "reseau", salle: d.salle, adresse: d.adresse, ticket: d.ticket, role: "spectateur" });
      return;
    }
    if (m?.adresse) ouvrirPartieMer({ type: "reseau", salle, adresse: m.adresse, role: "spectateur" });
  }

  // ---------- la course à l'écran ----------
  async function chargerModulesMer() {
    if (modulesMer) return modulesMer;
    const [jeu, d2] = await Promise.all([import("/js/mer-jeu.js"), import("/js/mer-2d.js")]);
    modulesMer = { jeu, d2, d3: null };
    return modulesMer;
  }
  function fermerPartieMer(rendre = true) {
    const P = partieMer;
    partieMer = null;
    if (P) {
      P.ferme = true;
      cancelAnimationFrame(P.raf);
      clearInterval(P.battement);
      clearTimeout(P.reprise);
      P.clavier?.();
      P.observateur?.disconnect();
      try { P.source?.fermer(); } catch {}
      try { P.rendu?.detruire(); } catch {}
      window.removeEventListener("resize", P.surTaille);
      document.removeEventListener("fullscreenchange", P.surTaille);
      document.documentElement.classList.remove("mer-plein");
    }
    const scene = $("mer-scene");
    if (scene) { scene.hidden = true; vider(scene); scene.classList.remove("plein", "jouer"); }
    if (rendre) rendreMer();
  }
  async function ouvrirPartieMer(o) {
    fermerPartieMer(false);
    const jeton = {};
    partieMer = { jeton, o, salle: o.type === "entrainement" ? "entrainement" : o.salle, ferme: false };
    rendreMer();
    let mods;
    try { mods = await chargerModulesMer(); } catch { partieMer = null; merMessage = { texte: "La mer n'a pas pu se charger. Recharge la page.", erreur: true }; rendreMer(); return; }
    if (partieMer?.jeton !== jeton) return;
    prechargerSons(SONS_MER);
    const scene = $("mer-scene");
    const toile = el("div", { class: "mer-toile" });
    const etiquettes = el("div", { class: "mer-etiquettes", "aria-hidden": "true" });
    const hud = {
      place: el("p", { class: "mer-place" }), bouee: el("p", { class: "mer-bouee" }), chrono: el("p", { class: "mer-chrono" }),
      classement: el("ol", { class: "mer-classement", "aria-label": "Le classement" }), fil: el("ul", { class: "mer-fil", "aria-live": "polite" }),
      compte: el("p", { class: "mer-compte", "aria-live": "assertive" }), jauge: el("div", { class: "mer-jauge" }, el("i")), attente: el("p", { class: "mer-attente" }),
      fin: el("div", { class: "mer-fin", hidden: true }),
    };
    const touche = (cle, texte, classe) => el("button", {
      class: `mer-touche ${classe}`, type: "button", "aria-label": texte, text: { g: "◀", d: "▶", r: "RAME !" }[cle],
      onpointerdown: (e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); P.touches[cle] = true; envoyerEntreeMer(P); },
      onpointerup: () => { P.touches[cle] = false; envoyerEntreeMer(P); },
      onpointercancel: () => { P.touches[cle] = false; envoyerEntreeMer(P); },
      onlostpointercapture: () => { P.touches[cle] = false; envoyerEntreeMer(P); },
      oncontextmenu: (e) => e.preventDefault(),
    });
    const bouton = (texte, titre, f, classe = "") => el("button", { class: `mer-bouton ${classe}`, type: "button", title: titre, "aria-label": titre, onclick: f, text: texte });
    const P = Object.assign(partieMer, {
      mods, suivi: mods.jeu.creerSuivi(), joueurs: new Map(), commus: paletteMer(), p: null, phase: "", fin: 0, numero: 0, decalage: 0, moi: 0,
      source: null, rendu: null, rendu3D: false, toile, etiquettes, hud, touches: { g: false, d: false, r: false }, clavierEntree: { t: 0, b: 0 }, envoyee: "",
      arrivees: [], classement: [], fil: [], resultats: null, essais: 0, compteVu: -1, prochaineVue: 0, chocVu: 0, finie: false,
    });
    vider(scene,
      toile, etiquettes,
      el("div", { class: "mer-hud" },
        el("div", { class: "mer-hud-gauche" }, hud.place, hud.bouee),
        hud.chrono,
        el("div", { class: "mer-hud-boutons" },
          bouton("⛶", "Plein écran", () => basculerPleinEcranMer(P)),
          bouton("🎥", "Changer de vue : ta barque, le premier, toute la mer", () => changerVueMer(P)),
          bouton("2D", "Passer en 2D ou en 3D", () => { merVeut2D = !P.rendu3D ? false : true; choisirRenduMer(P, true); }, "mer-bouton-texte"),
          bouton("✕", "Quitter la mer", () => fermerPartieMer()))),
      hud.classement, hud.fil, hud.compte, hud.attente, hud.fin,
      el("div", { class: "mer-bas" }, hud.jauge),
      el("div", { class: "mer-commandes" }, touche("g", "Tourner à gauche", "gauche"), touche("r", "Ramer fort", "rame"), touche("d", "Tourner à droite", "droite")));
    scene.hidden = false;
    scene.classList.add("jouer");
    scene.classList.toggle("spectateur", o.role === "spectateur");
    await choisirRenduMer(P);
    if (partieMer !== P) return;
    const surMessage = (m) => { if (partieMer === P) messageMer(P, m); };
    P.source = o.type === "entrainement"
      ? mods.jeu.entrainement({ nom: moi?.nom || "Toi", commu: maFlotte?.equipage || "barhaw", commus: P.commus, surMessage })
      : mods.jeu.connecter({ adresse: o.adresse, salle: o.salle, ticket: o.ticket, surMessage, surEtat: (e, code) => { if (partieMer === P) etatMer(P, e, code); } });
    // le clavier ne pilote que quand la mer est à l'écran (ailleurs, les flèches et l'espace font défiler la page)
    P.vue = true;
    if ("IntersectionObserver" in window) { P.observateur = new IntersectionObserver((e) => { P.vue = e.some((x) => x.isIntersecting && x.intersectionRatio > 0.35); }, { threshold: [0, 0.35, 1] }); P.observateur.observe(scene); }
    P.clavier = mods.jeu.lireClavier(window, (e) => { P.clavierEntree = e; envoyerEntreeMer(P); }, () => P.vue && !P.hud.fin.contains(document.activeElement));
    P.battement = setInterval(() => P.source?.renvoyer?.(), 1000);
    P.surTaille = () => P.rendu?.taille();
    window.addEventListener("resize", P.surTaille);
    document.addEventListener("fullscreenchange", P.surTaille);
    boucleMer(P);
    scene.scrollIntoView({ block: "center", behavior: reduit.matches ? "auto" : "smooth" });
    rendreMer();
  }
  // la 3D si l'appareil suit (ou si on l'a demandée), sinon la 2D ; une nouvelle toile à chaque changement
  async function choisirRenduMer(P, change = false) {
    const voulu3D = merVeut2D === null ? (navigator.deviceMemory || 8) > 2 && troisDPossible() : !merVeut2D;
    if (change && P.rendu && P.rendu3D === voulu3D) return;
    try { P.rendu?.detruire(); } catch {}
    P.rendu = null;
    vider(P.etiquettes);
    const canvas = el("canvas", { class: "mer-canvas", role: "img", "aria-label": "La mer en direct : les barques, les bouées et la ligne" });
    vider(P.toile, canvas);
    if (voulu3D) {
      try {
        if (!P.mods.d3) P.mods.d3 = await import("/js/mer-3d.js");
        if (partieMer !== P) return;
        P.rendu = P.mods.d3.creerMer3D(canvas, { etiquettes: P.etiquettes, commus: P.commus, leger: appareilLeger(), reduit: reduit.matches });
        P.rendu3D = true;
      } catch { P.rendu = null; }
    }
    if (!P.rendu) {
      const c2 = el("canvas", { class: "mer-canvas", role: "img", "aria-label": "La mer en direct vue de haut : les barques, les bouées et la ligne" });
      vider(P.toile, c2);
      P.rendu = P.mods.d2.creerMer2D(c2, { commus: P.commus, suivre: P.o.role !== "spectateur" });
      P.rendu3D = false;
    }
    if (P.p) P.rendu.parcours(P.p);
    if (P.rendu3D) P.rendu.camera = P.moi ? "suivre" : "tout";
    P.verifie = false;
    P.depuis = performance.now();
    requestAnimationFrame(() => P.rendu?.taille());
    const b = P.hud && $("mer-scene")?.querySelector(".mer-bouton-texte");
    if (b) b.textContent = P.rendu3D ? "2D" : "3D";
  }
  function changerVueMer(P) {
    if (P.rendu3D) {
      const ordre = P.moi ? ["suivre", "premier", "tout"] : ["tout", "premier"];
      P.rendu.camera = ordre[(ordre.indexOf(P.rendu.camera) + 1) % ordre.length];
      ajouterFilMer(P, P.rendu.camera === "suivre" ? "🎥 Vue : ta barque" : P.rendu.camera === "premier" ? "🎥 Vue : le premier" : "🎥 Vue : toute la mer");
    } else {
      P.rendu.suivre = !P.rendu.suivre;
      ajouterFilMer(P, P.rendu.suivre ? "🎥 Vue : ta barque" : "🎥 Vue : toute la mer");
    }
  }
  function basculerPleinEcranMer(P) {
    const scene = $("mer-scene");
    if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
    if (scene.classList.contains("plein")) { scene.classList.remove("plein"); document.documentElement.classList.remove("mer-plein"); P.rendu?.taille(); return; }
    // le vrai plein écran si le navigateur le permet ; sinon (iPhone) la mer prend toute la fenêtre
    const r = scene.requestFullscreen?.();
    if (r?.catch) r.catch(() => { scene.classList.add("plein"); document.documentElement.classList.add("mer-plein"); P.rendu?.taille(); });
    else if (!r) { scene.classList.add("plein"); document.documentElement.classList.add("mer-plein"); P.rendu?.taille(); }
  }
  function envoyerEntreeMer(P) {
    const k = P.clavierEntree;
    const t = Math.max(-1, Math.min(1, (P.touches.d ? 1 : 0) - (P.touches.g ? 1 : 0) + k.t));
    const e = { t, b: P.touches.r || k.b ? 1 : 0 };
    const cle = `${e.t}|${e.b}`;
    P.suivi.entree(e);
    if (cle === P.envoyee) return;
    P.envoyee = cle;
    if (P.moi) P.source?.envoyer(e);
  }
  function ajouterFilMer(P, texte) {
    P.fil.unshift({ texte, t: Date.now() });
    P.fil.length = Math.min(P.fil.length, 4);
    vider(P.hud.fil, P.fil.map((x) => el("li", { text: x.texte })));
  }
  function etatMer(P, e, code) {
    if (e === "ouvert") { P.essais = 0; P.hud.attente.textContent = ""; return; }
    if (e !== "ferme" || P.finie) return;
    // la version a changé, une autre page a pris la barque, la mer est fermée ou privée : on ne réessaie pas
    if ([4001, 4002, 4003].includes(code)) return;
    P.essais += 1;
    if (P.essais > 5) { P.hud.attente.textContent = "⚠️ La connexion est perdue. Ferme la mer et remonte à bord."; return; }
    P.hud.attente.textContent = "📡 Connexion perdue… je reviens.";
    P.reprise = setTimeout(async () => {
      if (partieMer !== P) return;
      let ticket = "";
      if (P.o.role === "joueur" || P.o.ticket) {
        const d = await agirMer(P.o.role === "joueur" ? "mer-embarquer" : "mer-regarder", { salle: P.o.salle });
        if (partieMer !== P) return;
        if (!d?.ticket) { P.hud.attente.textContent = d?.texte || "⚠️ La mer est fermée."; return; }
        ticket = d.ticket;
      }
      P.suivi.vider();
      P.source = P.mods.jeu.connecter({ adresse: P.o.adresse, salle: P.o.salle, ticket, surMessage: (m) => { if (partieMer === P) messageMer(P, m); }, surEtat: (x, c) => { if (partieMer === P) etatMer(P, x, c); } });
    }, Math.min(8000, 1200 * P.essais));
  }
  function nouveauParcoursMer(P, x) {
    if (!x?.id) return;
    if (P.p && P.p.id === x.id && P.p.miroir === x.miroir) return;
    P.p = P.mods.jeu.parcours(x.id, x.miroir);
    P.suivi.parcours = P.p;
    P.rendu?.parcours(P.p);
  }
  function messageMer(P, m) {
    const nom = (n) => P.joueurs.get(n)?.nom || "Une barque";
    switch (m.k) {
      case "s":
        P.suivi.rtt = P.source?.rtt || 120;
        P.suivi.recevoir(m);
        return;
      case "salut":
        P.moi = m.moi || 0;
        P.suivi.moi = P.moi;
        P.joueurs = new Map((m.joueurs || []).map(([n, nm, commu, faux]) => [n, { nom: nm, commu, faux: Boolean(faux) }]));
        P.commus = { ...paletteMer(Object.keys(m.commus || {})), ...Object.fromEntries(Object.entries(m.commus || {}).map(([id, c]) => [id, { nom: c.nom, c1: c.c1, c2: c.c2, embleme: c.embleme }])) };
        if (P.rendu) P.rendu.commus = P.commus;
        P.decalage = (m.s || Date.now()) - Date.now();
        Object.assign(P, { phase: m.phase, fin: m.fin, numero: m.numero, arrivees: [], resultats: m.resultats || null });
        P.p = null;
        nouveauParcoursMer(P, m.parcours);
        if (P.rendu3D) P.rendu.camera = P.moi ? "suivre" : "tout";
        else if (P.rendu) P.rendu.suivre = Boolean(P.moi);
        $("mer-scene")?.classList.toggle("spectateur", !P.moi);
        ajouterFilMer(P, P.o.type === "entrainement" ? "🏝️ Entraînement : 7 barques d'essai, rien ne compte" : `⛵ Bienvenue sur la mer ${deCommu(m.salle?.nom || "")}${m.salle?.essai ? " (essai)" : ""}`);
        if (m.resultats) finMer(P, m.resultats);
        return;
      case "arrive":
        P.joueurs.set(m.j[0], { nom: m.j[1], commu: m.j[2], faux: Boolean(m.j[3]) });
        if (m.j[0] !== P.moi && !m.j[3]) ajouterFilMer(P, `⛵ ${m.j[1]} monte à bord`);
        return;
      case "parti":
        P.joueurs.delete(m.n);
        return;
      case "phase": {
        const avant = P.phase;
        Object.assign(P, { phase: m.phase, fin: m.fin, numero: m.numero });
        if (m.s) P.decalage = m.s - Date.now();
        nouveauParcoursMer(P, m.parcours);
        if (m.phase === "embarquement") { P.hud.fin.hidden = true; P.resultats = null; ajouterFilMer(P, `⛵ Course ${m.numero} : ${m.parcours?.nom || ""}`); }
        if (m.phase === "depart") { P.arrivees = []; P.hud.fin.hidden = true; P.resultats = null; P.compteVu = -1; P.prochaineVue = 0; }
        if (m.phase === "course" && avant !== "course") jouerSon("br-cymbale", { volume: 0.7 });
        if (m.phase === "libre") { setTimeout(() => { if (partieMer === P && P.phase === "libre") P.hud.fin.hidden = true; }, 6000); }
        if (P.o.type !== "entrainement") rendreMer();
        return;
      }
      case "arrivee":
        if (!P.arrivees.includes(m.n)) P.arrivees.push(m.n);
        if (m.n === P.moi) { jouerSon("victoire", { volume: 0.8 }); ajouterFilMer(P, `🏁 Tu passes la ligne : ${rangMer(m.place)} en ${tempsMer(m.temps)} !`); }
        else if (m.place <= 3) ajouterFilMer(P, `🏁 ${nom(m.n)} passe la ligne : ${rangMer(m.place)} en ${tempsMer(m.temps)}`);
        return;
      case "resultats":
        P.resultats = m;
        finMer(P, m);
        return;
      case "coffre":
        jouerSon("br-paillettes", { volume: 0.6 });
        ajouterFilMer(P, "🪙 Un coffre est apparu sur la mer ! Le premier qui l'atteint l'ouvre.");
        return;
      case "coffre-pris":
        ajouterFilMer(P, m.n === P.moi ? `🪙 Tu ouvres le coffre !${m.berrys ? ` +${nombre(m.berrys)} berrys` : ""}${m.milles ? `, +${nombre(m.milles)} milles` : ""}` : `🪙 ${m.nom} ouvre le coffre !`);
        if (m.n === P.moi) jouerSon("br-fanfare", { volume: 0.6 });
        return;
      case "coffre-perdu":
        ajouterFilMer(P, "🌊 Le coffre a coulé…");
        return;
      case "ferme":
        P.finie = true;
        ajouterFilMer(P, `⚓ ${m.texte || "La mer ferme."}`);
        P.hud.attente.textContent = m.texte || "La mer ferme.";
        setTimeout(() => { if (partieMer === P) fermerPartieMer(); }, 4500);
        return;
      case "erreur":
        if (m.code === "pleine") P.hud.attente.textContent = m.texte;
        else { P.hud.attente.textContent = `⚠️ ${m.texte || "La mer a refusé."}`; if (["version", "fermee", "privee", "billet", "ailleurs"].includes(m.code)) P.finie = true; }
        return;
      default:
    }
  }
  // l'écran de fin : le podium, sa place, ce qu'il a gagné, le record
  function finMer(P, r) {
    const ligne = (n, place, temps) => el("li", { class: n === P.moi ? "moi" : "" }, el("b", { text: rangMer(place) }), el("span", { text: P.joueurs.get(n)?.nom || "Une barque" }), el("small", { text: temps === null ? "pas arrivé" : tempsMer(temps) }));
    const moiL = r.classement.find(([n]) => n === P.moi);
    const gains = (r.gains || []).find(([n]) => n === P.moi);
    if (moiL && moiL[1] <= 3 && moiL[2] !== null) jouerSon("br-fanfare", { volume: 0.7 });
    vider(P.hud.fin,
      el("p", { class: "mer-fin-titre", text: `🏁 ${r.parcours || "La course"}` }),
      el("ol", { class: "mer-podium" }, r.classement.slice(0, 3).map(([n, place, temps]) => ligne(n, place, temps))),
      moiL && moiL[1] > 3 ? el("p", { class: "mer-fin-moi", text: `Toi : ${rangMer(moiL[1])}${moiL[2] === null ? " (pas arrivé)" : ` en ${tempsMer(moiL[2])}`}` }) : null,
      gains ? el("p", { class: "mer-fin-gains", text: gains[3] ? "Tu as fait tes 10 courses qui rapportent aujourd'hui." : `+${nombre(gains[1])} berrys${gains[2] ? ` · +${nombre(gains[2])} milles pour ton navire` : ""}` }) : null,
      !r.rapporte && P.o.type !== "entrainement" ? el("p", { class: "note", text: "Cette course ne rapportait rien (une mer d'essai, hors live, ou moins de 3 barques)." }) : null,
      r.record ? el("p", { class: "mer-fin-record", text: `🏆 Nouveau record du parcours : ${tempsMer(r.record.temps)} par ${r.record.nom} !` }) : null,
      P.o.type === "entrainement"
        ? el("div", { class: "rangee" }, el("button", { class: "btn btn-plein btn-petit", type: "button", onclick: () => { P.hud.fin.hidden = true; P.source?.relancer?.(); }, text: "🔁 Une autre course" }), el("button", { class: "btn btn-contour btn-petit", type: "button", onclick: () => fermerPartieMer(), text: "Quitter" }))
        : el("p", { class: "note", text: "Un coffre va apparaître sur la mer…" }));
    P.hud.fin.hidden = false;
  }
  // le haut de l'écran : sa place, la bouée suivante, le chrono, le classement, le compte à rebours, la rame
  function hudMer(P, vue, mien) {
    const h = P.hud;
    const maintenant = Date.now() + P.decalage;
    const reste = P.fin ? Math.max(0, (P.fin - maintenant) / 1000) : 0;
    // le classement pendant la course
    if (P.phase === "course" || P.phase === "resultats") {
      const pos = new Map(P.arrivees.map((n, k) => [n, k]));
      const cible = (b) => (b.prochaine < P.p.bouees.length ? P.p.bouees[b.prochaine] : P.p.centre);
      const dist = (b) => { const c = cible(b); return Math.hypot(c.x - b.x, c.z - b.z); };
      P.classement = [...vue.barques].sort((a, b) => {
        const fa = pos.has(a.id), fb = pos.has(b.id);
        if (fa !== fb) return fa ? -1 : 1;
        if (fa) return pos.get(a.id) - pos.get(b.id);
        if (a.absent !== b.absent) return a.absent ? 1 : -1;
        return b.prochaine - a.prochaine || dist(a) - dist(b);
      }).map((b) => b.id);
    } else P.classement = [];
    const place = P.classement.indexOf(P.moi) + 1;
    h.place.textContent = P.moi && place && P.phase === "course" ? `${rangMer(place)} / ${P.classement.length}` : P.moi ? "" : "👀 Tu regardes";
    if (P.moi && mien && P.phase === "course") h.bouee.textContent = mien.fini ? "🏁 Arrivé !" : mien.prochaine < 4 ? `🎯 Bouée ${mien.prochaine + 1} / 4` : "🏁 La ligne !";
    else h.bouee.textContent = P.moi && !mien && (P.phase === "depart" || P.phase === "course") ? "⏳ À bord pour la course suivante" : "";
    // le chrono, ou le temps qui reste
    if (P.phase === "embarquement") h.chrono.textContent = `Départ dans ${Math.floor(reste / 60)}:${String(Math.floor(reste % 60)).padStart(2, "0")}`;
    else if (P.phase === "course") h.chrono.textContent = tempsMer(Math.max(0, (vue.tick - (P.debutTick ??= vue.tick)) * 0.05)).replace(" s", "");
    else if (P.phase === "libre") h.chrono.textContent = vue.coffre ? "🪙 Le coffre !" : "Entre deux courses";
    else if (P.phase === "resultats") h.chrono.textContent = "Résultats";
    else h.chrono.textContent = "";
    if (P.phase !== "course") P.debutTick = undefined;
    // le compte à rebours, en grand
    let compte = "";
    if (P.phase === "depart") compte = reste > 3 ? "Prêts ?" : String(Math.max(1, Math.ceil(reste)));
    else if (P.phase === "course" && vue.tick - (P.debutTick ?? vue.tick) < 16) compte = "PARTEZ !";
    if (compte !== h.compte.textContent) {
      h.compte.textContent = compte;
      h.compte.classList.remove("bat");
      void h.compte.offsetWidth;
      if (compte) h.compte.classList.add("bat");
      if (/^\d$/.test(compte)) jouerSon("br-tic", { volume: 0.6 });
    }
    // le top 5 (et soi, s'il n'y est pas)
    const top = P.classement.slice(0, 5);
    if (P.moi && place > 5) top.push(P.moi);
    const cle = top.join(",") + P.phase;
    if (h.classement.dataset.cle !== cle) {
      h.classement.dataset.cle = cle;
      vider(h.classement, top.map((n) => el("li", { class: n === P.moi ? "moi" : "" }, el("b", { text: String(P.classement.indexOf(n) + 1) }), el("span", { text: P.joueurs.get(n)?.nom || "?" }))));
    }
    h.classement.hidden = !top.length;
    // la rame
    if (mien) {
      h.jauge.firstChild.style.transform = `scaleX(${Math.max(0, Math.min(1, mien.e || 0)).toFixed(3)})`;
      h.jauge.classList.toggle("vide", (mien.e || 0) < 0.15);
      h.jauge.classList.toggle("rame", Boolean(mien.rame));
    }
    h.jauge.hidden = !mien;
    // les petits sons : sa bouée, son choc
    if (mien && P.phase === "course") {
      if (mien.prochaine > P.prochaineVue) { jouerSon("pop", { volume: 0.7 }); if (mien.prochaine <= 4) ajouterFilMer(P, mien.prochaine < 4 ? `🎯 Bouée ${mien.prochaine} ! Cap sur la ${mien.prochaine + 1}` : "🎯 Bouée 4 ! Cap sur la ligne"); }
      P.prochaineVue = mien.prochaine;
      if (mien.choc && performance.now() - P.chocVu > 700) { P.chocVu = performance.now(); jouerSon("impact", { volume: 0.5 }); }
    }
    // une 3D trop lente passe en 2D (une fois)
    if (P.rendu3D && !P.verifie && performance.now() - P.depuis > 5000 && P.rendu.tropLent?.()) {
      P.verifie = true;
      merVeut2D = merVeut2D ?? true;
      ajouterFilMer(P, "🗺️ Ton appareil peine en 3D : je passe la mer en 2D.");
      choisirRenduMer(P, true);
    }
  }
  function boucleMer(P) {
    let avant = performance.now();
    let dernierHud = 0;
    const image = (t) => {
      if (partieMer !== P || P.ferme) return;
      P.raf = requestAnimationFrame(image);
      const dt = t - avant;
      avant = t;
      if (document.hidden || !P.rendu) return;
      P.suivi.pas(dt);
      const vue = P.suivi.vue(t);
      if (!vue || !P.p) return;
      const mien = vue.barques.find((b) => b.moi) || null;
      P.rendu.maj(vue, { moi: P.moi, joueurs: P.joueurs, prochaine: mien?.prochaine ?? 0, tete: new Set(P.classement.slice(0, 3)), premier: P.classement[0] || 0 });
      P.rendu.rendre();
      if (t - dernierHud > 150) { dernierHud = t; hudMer(P, vue, mien); }
    };
    P.raf = requestAnimationFrame(image);
  }
  function suivreMer() {
    const section = $("mer");
    if (!section) return;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((e) => {
        merVue = e.some((x) => x.isIntersecting);
        if (merVue) rendreMer();
        suivreSallesMer();
      }, { rootMargin: "200px 0px" }).observe(section);
    } else merVue = true;
    document.addEventListener("visibilitychange", suivreSallesMer);
    // un lien direct : #mer ou #mer-barhaw (la mer d'une commu)
    window.addEventListener("hashchange", () => { if (/^#mer(-|$)/.test(location.hash)) rendreMer(); });
  }

  async function demanderFideles(action) {
    try {
      const r = await fetch("/api/chopper", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) { moi = { connecte: false }; rendreCompte(); }
      return { status: r.status, d };
    } catch {
      return { status: 0, d: { erreur: "Impossible de joindre le bot. Vérifie ta connexion." } };
    }
  }
  async function agirFideles(action) {
    if (fidelesOccupe) return;
    fidelesOccupe = true;
    fidelesMessage = null;
    const attendait = Boolean(mesFideles && !mesFideles.lie && mesFideles.code); // un code était en attente
    const { d } = await demanderFideles(action);
    fidelesOccupe = false;
    if (d.fideles) mesFideles = d.fideles;
    if (d.erreur && d.erreur !== "deja") fidelesMessage = { texte: d.erreur === "pas-membre" ? "Rejoins le Discord Barhaw pour être compté." : d.texte || d.erreur, erreur: true };
    if (action === "fideles-retirer" && d.ok) fidelesMessage = { texte: "C'est retiré : ton Twitch n'est plus relié et ton temps est effacé." };
    if (attendait && mesFideles?.lie) { fidelesMessage = { texte: "✅ Ton Twitch est relié : ton temps sur le live compte !" }; confettisFid(); }
    rendreFideles();
    // un code en attente : on regarde toutes les 8 s si c'est relié (15 min au plus)
    clearInterval(guetteFideles);
    if (mesFideles && !mesFideles.lie && mesFideles.code) {
      const fin = mesFideles.expire || Date.now() + 15 * 60_000;
      guetteFideles = setInterval(() => {
        if (Date.now() > fin || document.hidden) { if (Date.now() > fin) { clearInterval(guetteFideles); chargerMesFideles(); } return; }
        agirFideles("fideles");
      }, 8_000);
    }
  }
  function confettisFid() {
    if (reduit.matches) return;
    const z = $("fideles");
    if (!z) return;
    const pluie = el("span", { class: "gl-confettis", "aria-hidden": "true" }, Array.from({ length: 22 }, (_, k) => el("i", { style: `--x:${Math.round((Math.random() - 0.5) * 300)}px;--y:${Math.round(-60 - Math.random() * 140)}px;--r:${Math.round(Math.random() * 720 - 360)}deg;--c:${["#9146ff", "#ff4f9a", "#ffd36b", "#5fd0d8", "#fff"][k % 5]};animation-delay:${(Math.random() * 0.12).toFixed(2)}s` })));
    z.append(pluie);
    setTimeout(() => pluie.remove(), 1600);
  }
  async function chargerMesFideles() {
    if (!moi?.connecte) { mesFideles = null; rendreFideles(); return; }
    await agirFideles("fideles");
  }

  async function chargerMoi() {
    try {
      moi = await (await fetch("/api/moi")).json();
    } catch {
      moi = { connecte: false };
    }
    rendreCompte();
    rendreActions();
    rendreClassementJeu();
    rendreBahriot();
    rendreGuerre();
    merDemande = 0;
    rendreMer();
    if (moi?.connecte) agir("etat");
    chargerMesCartes();
    chargerMesJeux();
    chargerMaChasse();
    chargerMaFaille();
    chargerMonNavire();
    chargerMaFlotte();
    chargerMesFideles();
  }

  function demarrer() {
    ciel();
    anciennesTailles();
    animationsHorsVue();
    entete();
    apparitionsFixes();
    kanjis();
    musique();
    boutonSons();
    autocollants();
    if (!$("accueil")) return; // la page des mentions : juste le décor

    const u = new URL(location.href);
    if (u.searchParams.get("connexion") === "erreur") {
      erreurConnexion = true;
      u.searchParams.delete("connexion");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
    if (!("IntersectionObserver" in window)) { chaineProche = true; tournoiProche = true; }
    suiviSections();
    facadesFixes();
    window.matchMedia("(min-width: 901px)").addEventListener?.("change", () => rendreChaine());
    rendreMaintenant();
    rendreEvenements();
    rendreTournoi();
    rendreCompte();
    gouter();
    rendreClassementJeu();
    charger();
    chargerMoi();
    setInterval(charger, 60_000);
    suivreChasse();
    brDemarrer();
    suivreFaille();
    suivreGrandLine();
    suivreMer();
    suivreTrailerShow();
    // la V4 : la classe v4 dès le départ (selon la date), puis à l'heure pile ; les liens directs vers un navire
    document.documentElement.classList.toggle("v4", v4Ouverte());
    const avantV4 = V4_OUVERTURE - Date.now();
    if (avantV4 > 0 && avantV4 < 2 ** 31 - 1) setTimeout(charger, avantV4 + 1500);
    lienDirectFlotte();
    window.addEventListener("hashchange", lienDirectFlotte);
    let dernierRetour = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden || Date.now() - dernierRetour < 15_000) return;
      dernierRetour = Date.now();
      charger();
    });
    setInterval(bulleAccueil, 6500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
