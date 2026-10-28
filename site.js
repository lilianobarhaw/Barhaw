// Barhaw · le site de la commu, sur une seule page qui se dévoile au défilement.
// Les données viennent du bot (via /api/public) : ta chaîne, la rediff, les potes, YouTube, le Discord, les événements, Chopper.
// Tout le texte venu de l'extérieur est écrit avec textContent, jamais comme du HTML.
"use strict";

(() => {
  document.documentElement.classList.remove("sans-js");

  const MA_CHAINE = "lilianobarhaw";
  const TYPES = { osiris: "Osiris", tournoi: "Tournoi", live: "Live", video: "Vidéo", autre: "Event" };
  const HOTE = location.hostname || "localhost";
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");

  // si le bot ne répond pas : les événements déjà prévus (les mêmes que dans le bot)
  const SECOURS = [
    { id: "live12h", type: "live", titre: "Live 12 h · Chained Together", debut: "2026-12-26T00:00:00+01:00", heure: false, description: "12 heures de live sur Chained Together, duo contre duo : le duo le plus haut au bout des 12 h gagne. Le soir, ouverture officielle d'Osiris.", lien: "https://www.twitch.tv/lilianobarhaw" },
    { id: "osiris-ouverture", type: "osiris", titre: "Osiris · ouverture du site et du Discord", debut: "2026-12-26T21:00:00+01:00", heure: true, description: "Le site et le Discord d'Osiris ouvrent enfin, avec le premier teaser « On vous regarde ».", lien: "https://osiriswl.vercel.app" },
    { id: "tournoi", type: "tournoi", titre: "TOURNOI BARHAW", debut: "2027-02-04T00:00:00+01:00", heure: false, fin: "2027-02-20T00:00:00+01:00", description: "6 équipes de 3 sur Valorant, 1 000 € de cashprize sur le tournoi, tous les matchs en BO3 et en direct. Finale le samedi 20 février.", lien: "https://www.twitch.tv/lilianobarhaw" },
    { id: "osiris-casting", type: "osiris", titre: "Osiris · ouverture du casting", debut: "2027-02-20T23:30:00+01:00", heure: true, fin: "2027-03-20T23:59:00+01:00", finHeure: true, description: "Le casting du Programme 01 s'ouvre en direct à la finale du TOURNOI BARHAW. Candidatures jusqu'au 20 mars, 17 ans minimum et un bon micro.", lien: "https://osiriswl.vercel.app/casting" },
    { id: "osiris-selection", type: "osiris", titre: "Osiris · la Sélection", debut: "2027-04-24T21:00:00+02:00", heure: true, description: "Les 35 candidats retenus pour le Programme 01 sont annoncés en direct.", lien: "https://osiriswl.vercel.app" },
    { id: "osiris-programme01", type: "osiris", titre: "Osiris · Programme 01, L'Hiver de Ludendorff", debut: "2027-05-15T20:30:00+02:00", heure: true, fin: "2027-06-26T00:00:00+02:00", description: "35 candidats, 18 soirées, un hiver dont tout le monde ne sortira pas. Les mercredis, vendredis et samedis, de 20 h 30 à 1 h.", lien: "https://osiriswl.vercel.app" },
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
  const SFX_TYPES = { osiris: ["ゴゴゴ", "violet tremble"], tournoi: ["ドドド", "tremble"], live: ["ワクワク", ""], video: ["キラッ", ""], autre: ["キラッ", ""] };
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
  // filet de sécurité : un défilement très rapide peut sauter un bloc sans qu'il soit « vu » ; on le montre quand même
  let verification = 0;
  window.addEventListener("scroll", () => {
    if (verification || !enAttente.size) return;
    verification = setTimeout(() => {
      verification = 0;
      for (const e of enAttente) {
        if (!e.isConnected) { enAttente.delete(e); continue; }
        if (e.getBoundingClientRect().top < window.innerHeight) montrer(e);
      }
    }, 250);
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
      l = window.innerWidth;
      h = window.innerHeight;
      c.width = Math.round(l * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    function image(t) {
      boucle = 0;
      if (document.hidden || defile) return;
      // les étincelles scintillent lentement : 12 images par seconde leur suffisent ; 30 quand un trait de vitesse passe
      if (t - dernier > (traits.length ? 33 : 80) && !document.body.classList.contains("vision-ouverte")) { const dt = dernier ? Math.min(90, t - dernier) : 16; dernier = t; dessiner(t, dt); }
      if (!reduit.matches) boucle = requestAnimationFrame(image);
    }
    const relancer = () => {
      if (boucle) cancelAnimationFrame(boucle);
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
      clearTimeout(defile);
      defile = setTimeout(() => { defile = 0; if (!document.hidden) relancer(); }, 160);
    }, { passive: true });
  }

  // ---------- les animations des parties qu'on ne voit pas sont mises en pause ----------
  function animationsHorsVue() {
    if (!("IntersectionObserver" in window)) return;
    const parties = document.querySelectorAll("[data-section], footer");
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) e.target.classList.toggle("hors-vue", !e.isIntersecting);
    }, { rootMargin: "300px 0px" });
    for (const p of parties) io.observe(p);
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

  // le grand kanji de chaque partie glisse un peu moins vite que la page
  function kanjis() {
    const liste = [...document.querySelectorAll(".kanji")];
    if (!liste.length || reduit.matches) return;
    let attente = false;
    const maj = () => {
      attente = false;
      for (const k of liste) {
        const r = k.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        k.style.setProperty("--glisse", `${Math.round(Math.max(-120, Math.min(40, -r.top * 0.14)))}px`);
      }
    };
    maj();
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
    audio.addEventListener("error", () => { afficher(false); zone.hidden = true; });
    document.addEventListener("play", (e) => {
      if (e.target instanceof HTMLVideoElement && !audio.paused) { audio.pause(); audio.currentTime = 0; afficher(false); }
    }, true);
    fetch(MUSIQUE, { method: "HEAD" }).then((r) => { if (!r.ok) zone.hidden = true; }).catch(() => {});
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

    function placer() {
      const etroit = window.innerWidth <= 900;
      for (const s of collants) {
        const { b, m, place } = s;
        const ratio = m.h / m.l;
        b.className = `autocollant${b.classList.contains("revele") ? " revele" : ""}${b.classList.contains("vu") ? " vu" : ""}`;
        b.removeAttribute("style");
        b.style.setProperty("--r", `${s.r}deg`);
        if (place.type === "pied") { b.classList.add("au-pied"); b.style.width = `${ratio > 1.15 ? 130 : ratio > 0.8 ? 160 : 220}px`; continue; }
        if (place.type === "hero") {
          b.classList.add("au-hero");
          b.style.width = `${etroit ? (ratio > 1.15 ? 78 : ratio > 0.8 ? 96 : 130) : (ratio > 1.15 ? 120 : ratio > 0.8 ? 150 : 200)}px`;
          continue;
        }
        // dans l'en-tête d'une partie : à droite du titre, là où il y a de la place
        const boite = place.parent.getBoundingClientRect();
        const textes = [...place.parent.querySelectorAll(".titre-section, .sous, .surtitre")];
        const droite = Math.max(0, ...textes.map((e) => bordTexte(e) - boite.left));
        let w = ratio > 1.15 ? 150 : ratio > 0.8 ? 180 : 250;
        const libre = boite.width - droite - 40;
        if (etroit || libre < 120) {
          b.classList.add("flottant");
          b.style.width = `${ratio > 1.15 ? 86 : ratio > 0.8 ? 104 : 150}px`;
          continue;
        }
        w = Math.min(w, libre);
        const haut = w * ratio + 12;
        b.style.width = `${Math.round(w)}px`;
        b.style.left = `${Math.round(droite + 28 + s.rx * Math.max(0, libre - w))}px`;
        b.style.top = `${Math.round(-12 + s.ry * Math.max(0, boite.height - haut * 0.75))}px`;
      }
    }
    placer();
    apparaitre(collants.map((s) => s.b));
    let attente = 0;
    window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(placer, 200); });
    // les polices arrivent après : les titres changent de largeur, on replace
    document.fonts?.ready?.then(placer);
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
    z.classList.toggle("impact", vientDeCommencer);
    z.hidden = false;
  }

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
        lien && !passe ? el("a", { class: "lien", href: lien, ...externe, text: lienEvenement(lien) }) : null,
        VIDEOS[e.id] ? el("button", { class: "lien lien-video", type: "button", onclick: (ev) => visionner(VIDEOS[e.id], ev.currentTarget), text: passe ? "Revoir le teaser" : "Voir le teaser" }) : null,
      ),
    );
  }

  let minuteur = null;
  let cleProchain = "";
  function rendreProchain(e) {
    const z = $("prochain");
    const cle = JSON.stringify(e ? [e.id, e.titre, e.debut, e.enCours, e.description, e.lien, e.type] : null);
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
        lien ? el("div", { class: "boutons" }, el("a", { class: "btn btn-plein btn-petit", href: lien, ...externe, text: `${lienEvenement(lien)} →` })) : null,
      ),
      e.enCours ? null : rebours,
      VIDEOS[e.id] ? el("div", { class: "prochain-video" },
        el("div", { class: "video-cadre" }, lecteurVideo(VIDEOS[e.id])),
        el("p", { class: "legende", text: VIDEOS[e.id].titre }),
      ) : null,
    );
    if (!e.enCours) { tic(); minuteur = setInterval(tic, 1000); }
  }

  function rendreEvenements() {
    const ev = donnees?.evenements || evenementsSecours();
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
    const prochain = (donnees?.evenements || evenementsSecours()).aVenir?.[0];
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
    if (!y?.videos?.length) {
      vider(z, el("p", { class: "vide carte", text: donnees?.horsLigne ? "Les vidéos reviennent dans un instant." : "Les vidéos arrivent bientôt." }));
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
    const carteVideo = (v, court = false) => el("a", { class: `carte video${court ? " short" : ""}`, href: lienSur(v.lien) || "#", ...externe },
      el("div", { class: "image" }, el("img", { src: lienSur(v.vignette), alt: "", loading: "lazy" })),
      el("span", { text: v.titre }),
      v.publie ? el("small", { text: fmtCourt.format(new Date(v.publie)) }) : null,
    );
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
        ) : el("p", { class: "sous", text: "Le serveur de la commu : lives, jeux, Chopper et le tournoi." }),
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
      rendreCompte();
      rendreActions();
      return;
    }
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

    function taille() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      L = Math.max(200, r.width);
      H = Math.max(200, r.height);
      canvas.width = Math.round(L * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.x = s.x ? Math.min(Math.max(s.x, 0), L) : L / 2;
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
    }

    async function finir() {
      s.etat = "fin";
      $("gouter-hud").hidden = true;
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
      if (!s.partie) return;
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

      // les effets : +1, onomatopées
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
      ctx.restore();
      if (s.flash) { ctx.fillStyle = `rgba(255,255,255,${0.35 * s.flash})`; ctx.fillRect(0, 0, L, H); }
    }

    function image(t) {
      boucle = 0;
      const dt = dernier ? Math.min(50, t - dernier) : 16;
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
    window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(taille, 150); });
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
    taille();
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
  const EN_RELIEF = ".case-album:not(.vide) > .cc, .tirage-scene.retourne .tirage-face > .cc";
  let carteRelief = null, pointeur = null, imageRelief = 0;
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
      c.classList.add("relief", "lumiere");
    }
    const r = c.parentElement.getBoundingClientRect();
    c.style.setProperty("--px", borne(((pointeur.x - r.left) / r.width) * 2 - 1).toFixed(3));
    c.style.setProperty("--py", borne(((pointeur.y - r.top) / r.height) * 2 - 1).toFixed(3));
  }
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || reduit.matches) return;
    pointeur = { x: e.clientX, y: e.clientY, cible: e.target };
    if (!imageRelief) imageRelief = requestAnimationFrame(majRelief);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", lacherRelief);

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
    return el("div", { class: "jeu-classement" },
      titre ? el("p", { class: "jeu-classement-titre", text: titre }) : null,
      el("p", { class: "jeu-record" }, el("span", { text: "Record" }), s?.record ? `${texte(s.record)} · ${s.record.nom}` : "à prendre !"),
      s?.semaine?.length
        ? el("ol", {}, s.semaine.map((x) => el("li", {}, el("span", { text: x.nom }), el("small", { text: texte(x) }))))
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

  // --- la Rumble Ball ---
  const rb = { etat: "accueil", manche: 0, score: 0, angle: 0, vitesse: 0, zone: 0, largeur: 0, t0: 0, boucle: 0, partie: "", fin: null, dernier: null };
  function rumbleScene() {
    const svg = `<svg viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="84" class="rb-piste"/><path class="rb-zone" d=""/><g class="rb-aiguille"><line x1="100" y1="100" x2="100" y2="22"/><circle cx="100" cy="22" r="6"/></g></svg>`;
    const cadran = el("div", { class: "rb-cadran" });
    cadran.innerHTML = svg;
    cadran.append(
      el("div", { class: `rb-chopper forme-${rb.etat === "fin" && rb.fin ? (rb.fin.transformations === 7 ? 8 : rb.fin.transformations) : 0}`, id: "rb-chopper" }, el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 480, height: 480 })),
      el("span", { class: "sfx rb-sfx", id: "rb-sfx", "aria-hidden": "true" }),
    );
    cadran.addEventListener("pointerdown", (e) => { if (rb.etat === "jeu") { e.preventDefault(); appuyerRumble(); } });
    return el("div", { class: "rb-scene" }, el("span", { class: "concentration", "aria-hidden": "true" }), cadran);
  }
  function rendreRumble() {
    const z = $("rumble");
    if (!z || rb.etat === "jeu") return;
    const s = infosJeux()?.rumble;
    const moiR = mesJeux?.rumble;
    let ecran;
    if (rb.etat === "fin" && rb.fin) {
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
      el("div", { class: "jeu-tete" }, el("h3", { text: "La Rumble Ball" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "💊" })),
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
    vider(z,
      el("div", { class: "jeu-tete" }, el("h3", { text: "La Rumble Ball" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "💊" })),
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
    if (message) { const sfx = $("rb-sfx"); sfx.textContent = "ガーン"; sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat"); }
    let fin = { transformations, score, message };
    const attente = new Promise((ok) => setTimeout(ok, delai));
    if (rb.partie) {
      const { d } = await demanderJeux("rumble-fin", { partie: rb.partie, transformations, score });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin };
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
    return el("div", { class: "jeu-tete" }, el("h3", { text: "Le quiz One Piece" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🏴‍☠️" }));
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
      el("div", { class: "qz-affiche", "aria-hidden": "true" }, el("span", { class: "qz-wanted", text: "WANTED" }), el("img", { src: "/img/chopper-visage.jpg", alt: "", width: 480, height: 480 }), el("span", { class: "qz-prime", text: "50 ฿" })),
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
    poserQuestion(d.question);
  }
  // un nouveau palier : une case manga avant la question
  function poserQuestion(q) {
    const z = $("quiz");
    if (q.palier && q.palier !== qz.palier) {
      qz.palier = q.palier;
      qz.etat = "palier";
      vider(z, teteQuiz(), el("div", { class: `qz-banniere palier-${q.palier}` },
        el("span", { class: "concentration", "aria-hidden": "true" }),
        el("span", { class: "qz-banniere-num", text: `Palier ${q.palier}` }),
        el("b", { text: PALIERS[q.palier - 1] || "" }),
        el("span", { class: "sfx eclat qz-banniere-sfx", "aria-hidden": "true", text: q.palier === 3 ? "ゴゴゴ" : q.palier === 2 ? "ドン！" : "スタート！" }),
      ));
      setTimeout(() => poserQuestion(q), reduit.matches ? 300 : 1100);
      return;
    }
    qz.etat = "question";
    qz.question = q;
    const barre = el("i", {});
    const boutons = q.choix.map((c, k) => el("button", { class: "qz-choix", type: "button", onclick: () => repondreQuiz(k), text: c }));
    vider(z, teteQuiz(),
      el("div", { class: "qz-haut" }, el("span", { text: `${nomNiveau(qz.niveau)} · Question ${q.numero}/10` }), el("b", { text: `${qz.points} pts` })),
      el("div", { class: "qz-infos" },
        el("span", { class: `qz-pastille palier-${q.palier || 1}`, text: `Palier ${q.palier || 1} · ${PALIERS[(q.palier || 1) - 1]}` }),
        el("span", { class: `qz-pastille dif-${q.difficulte || "moyen"}`, text: `+${q.valeur || 1} pt${(q.valeur || 1) > 1 ? "s" : ""}` }),
      ),
      el("div", { class: "qz-temps", "aria-hidden": "true" }, barre),
      el("p", { class: "qz-question", text: q.q }),
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
    if (k !== null) boutons[k]?.classList.add("choisi");
    z.querySelector(".qz-temps i")?.classList.add("arret");
    const { d } = await demanderJeux("quiz-repondre", { partie: qz.partie, choix: k });
    qz.verrou = false;
    if (!d.ok) { qz.etat = "accueil"; qz.erreur = d.erreur || "Le quiz s'est arrêté, relance-le."; rendreQuiz(); return; }
    boutons[d.bonne]?.classList.add("bonne");
    if (k !== null && !d.juste) boutons[k]?.classList.add("fausse");
    qz.bonnes = d.bonnes;
    qz.points = d.points ?? qz.points;
    const pts = z.querySelector(".qz-haut b");
    if (pts) pts.textContent = `${qz.points} pts`;
    z.append(el("p", { class: `qz-verdict ${d.juste ? "juste" : "faux"}`, text: d.juste ? `Bonne réponse ! +${qz.question?.valeur || 1}` : d.tropTard || k === null ? "Trop tard !" : "Raté !" }));
    setTimeout(() => {
      if (d.fin) {
        qz.etat = "fin";
        qz.fin = { bonnes: d.bonnes, points: d.points, temps: d.temps, niveau: d.niveau || qz.niveau, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin };
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
  const teteDocteur = () => el("div", { class: "jeu-tete" }, el("h3", { text: "Docteur Chopper" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🩺" }));
  const texteDocteur = (x) => `${x.soignes ?? "?"} patient${x.soignes > 1 ? "s" : ""} · ${nombre(x.score)} pts`;
  function rendreDocteur() {
    const z = $("docteur");
    if (!z || dc.etat === "jeu" || dc.etat === "envoi") return;
    const moiD = mesJeux?.docteur;
    const ecran = dc.etat === "fin" && dc.fin
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
    const barre = el("i", {});
    vider(z, teteDocteur(),
      el("div", { class: "dc-hud" }, el("span", { id: "dc-temps", text: "45 s" }), el("span", { id: "dc-combo", text: "" }), el("b", { id: "dc-score", text: "0 pts" })),
      el("div", { class: "qz-temps dc-chrono", "aria-hidden": "true" }, barre),
      el("div", { class: "dc-scene" },
        el("div", { class: "dc-patient", id: "dc-patient" }),
        el("span", { class: "sfx dc-sfx", id: "dc-sfx", "aria-hidden": "true" }),
      ),
      el("div", { class: "dc-remedes", id: "dc-remedes" }, REMEDES.map((x, k) => el("button", { class: "dc-remede", type: "button", "data-remede": x.id, onclick: () => soigner(x.id), title: `Touche ${k + 1}` }, el("span", { class: "dc-emoji", "aria-hidden": "true", text: x.e }), el("span", { text: x.nom })))),
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
      scene.classList.remove("rate");
      nouveauPatient();
    } else {
      dc.combo = 0;
      dc.bloque = performance.now() + 1200;
      sfx.textContent = "ガーン";
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
    let fin = { soignes: dc.soignes, score: dc.score, message: "" };
    if (dc.partie) {
      const { d } = await demanderJeux("docteur-fin", { partie: dc.partie, soignes: dc.soignes, score: dc.score });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ton score compte.";
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
  const teteMemory = () => el("div", { class: "jeu-tete" }, el("h3", { text: "Le Memory des mèmes" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🧠" }));
  const texteMemory = (x) => `${nombre(x.score)} pts · ${x.coups ?? "?"} coups`;
  const scoreMemoryLocal = (coups, ms) => Math.max(50, Math.round(1000 - 25 * (coups - 8) - (4 * ms) / 1000));
  function rendreMemory() {
    const z = $("memory");
    if (!z || mm.etat === "jeu" || mm.etat === "envoi") return;
    const moiM = mesJeux?.memory;
    const ecran = mm.etat === "fin" && mm.fin
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
      el("div", { class: "mm-apercu", "aria-hidden": "true" }, [0, 1, 2, 3].map(() => dosCarte())),
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
    vider(z, teteMemory(),
      el("div", { class: "dc-hud" }, el("span", { id: "mm-coups", text: "0 coup" }), el("span", { id: "mm-paires", text: "0/8 paires" }), el("b", { id: "mm-temps", text: "0 s" })),
      el("div", { class: "mm-grille" }, mm.cartes.map((id, k) => {
        const img = imageCarte(id);
        const b = el("button", { class: "mm-carte", type: "button", "aria-label": `Carte ${k + 1}`, onclick: () => retournerMemory(k, b) },
          el("span", { class: "mm-interieur" },
            dosCarte(),
            el("span", { class: "mm-face" }, img ? el("img", { src: img.src, alt: "", loading: "eager", decoding: "async" }) : null),
          ),
        );
        return b;
      })),
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
    mm.retournees.push(k);
    if (mm.retournees.length < 2) return;
    mm.coups++;
    $("mm-coups").textContent = `${mm.coups} coup${mm.coups > 1 ? "s" : ""}`;
    const [a, c] = mm.retournees;
    const boutons = $("memory").querySelectorAll(".mm-carte");
    if (mm.cartes[a] === mm.cartes[c]) {
      mm.trouvees.add(a); mm.trouvees.add(c);
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
    const temps = performance.now() - mm.t0;
    let fin = { coups: mm.coups, temps, score: scoreMemoryLocal(mm.coups, temps), message: "" };
    const attente = new Promise((ok) => setTimeout(ok, 900));
    if (mm.partie) {
      const { d } = await demanderJeux("memory-fin", { partie: mm.partie, coups: mm.coups });
      if (d.ok) fin = { ...fin, score: d.score, temps: d.temps, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ton score compte.";
    await attente;
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
  const teteCourse = () => el("div", { class: "jeu-tete" }, el("h3", { text: "La course de Chopper" }), el("span", { class: "jeu-emoji", "aria-hidden": "true", text: "🏃" }));
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
    const ecran = co.etat === "fin" && co.fin
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
    preparerCanvasCourse();
    dessinerCourse(co.moteur?.m || null);
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
  window.addEventListener("resize", () => { if (co.etat !== "jeu") { preparerCanvasCourse(); dessinerCourse(co.moteur?.m || null); } else preparerCanvasCourse(); });

  // ---------- le dessin ----------
  const DECOR = { iles: Array.from({ length: 6 }, (_, k) => ({ x: k * 160 + Math.random() * 60, l: 90 + Math.random() * 120, h: 18 + Math.random() * 30 })), nuages: Array.from({ length: 4 }, (_, k) => ({ x: k * 190 + Math.random() * 80, y: 30 + Math.random() * 60, l: 60 + Math.random() * 50 })) };
  let gradientsCourse = null;
  function dessinerCourse(m) {
    const ctx = ctxCourse;
    if (!ctx) return;
    const e = echelleCourse;
    ctx.setTransform(e, 0, 0, e, 0, 0);
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
    // les traits de vitesse quand ça va très vite
    if (m && m.v > 14.5) {
      ctx.strokeStyle = `rgba(255, 240, 250, ${Math.min(0.35, (m.v - 14.5) * 0.08)})`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) { const y = 20 + ((k * 37 + Math.floor(m.t * 20) * 13) % 190); const x = (k * 97 + m.dist * 1.6) % (CO.L + 120) ; ctx.moveTo(CO.L - x, y); ctx.lineTo(CO.L - x + 60 + k * 6, y); }
      ctx.stroke();
    }
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
    // les compteurs
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
      if (ob.x > CO.L - 10) {
        // il arrive : un « ! » au bord pour prévenir
        ctx.fillStyle = "#ff2d55"; ctx.beginPath(); ctx.arc(CO.L - 18, cy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "800 15px 'M PLUS Rounded 1c', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", CO.L - 18, cy + 1);
        return;
      }
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
    const z = $("course");
    vider(z, teteCourse(),
      el("div", { class: "co-scene en-jeu", id: "co-scene" },
        el("canvas", { class: "co-canvas", id: "co-canvas", role: "img", "aria-label": "La course de Chopper en cours" }),
        el("span", { class: "sfx co-sfx", id: "co-sfx", "aria-hidden": "true" }),
        el("span", { class: "co-depart", id: "co-depart", "aria-hidden": "true", text: "3" }),
      ),
      el("p", { class: "note co-aide", text: "Clic, toucher ou Espace pour sauter · reste appuyé pour sauter plus haut" }),
    );
    preparerCanvasCourse();
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
      await new Promise((ok) => setTimeout(ok, reduit.matches ? 250 : 520));
    }
    depart.textContent = "";
    if (ouverture) { const { d } = await ouverture; if (d.partie) co.partie = d.partie; }
    co.etat = "jeu";
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
    co.dernier = t;
    const m = co.moteur.m;
    const etaitAuSol = m.sol;
    const ev = co.moteur.avancer(dt);
    // la poussière : quand il court, et un petit nuage quand il retombe
    if (m.sol && Math.random() < dt * 9) co.particules.push({ x: CO.X - 14, y: CO.SOL - 3, r: 2 + Math.random() * 2, a: 0.5, vx: -60 - Math.random() * 40, vy: -20 - Math.random() * 20 });
    if (m.sol && !etaitAuSol) for (let k = 0; k < 6; k++) co.particules.push({ x: CO.X + (k - 3) * 5, y: CO.SOL - 2, r: 2 + Math.random() * 3, a: 0.6, vx: (k - 3) * 30, vy: -30 - Math.random() * 30 });
    for (const p of co.particules) { p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 1.4; }
    co.particules = co.particules.filter((p) => p.a > 0).slice(-40);
    if (ev === "palier") {
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
    sfx.classList.remove("eclat"); void sfx.offsetWidth; sfx.classList.add("eclat");
    $("co-scene")?.classList.add("choc");
    if (distance > co.record) { co.record = distance; try { localStorage.setItem("barhaw-course", String(distance)); } catch {} }
    let fin = { distance, cause: m.choc.type, message: "" };
    const attente = new Promise((ok) => setTimeout(ok, reduit.matches ? 300 : 1100));
    if (co.partie) {
      co.etat = "envoi";
      const { d } = await demanderJeux("course-fin", { partie: co.partie, distance });
      if (d.ok) fin = { ...fin, record: d.record, perso: d.perso, eclat: d.eclat, eclatPlafond: d.eclatPlafond, butin: d.butin };
      else if (d.erreur) fin.message = d.erreur;
    } else if (!moi?.connecte) fin.message = "Connecte-toi avec Discord pour que ta distance compte.";
    await attente;
    co.etat = "fin";
    co.fin = fin;
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

  function rendreJeux() {
    if (rb.etat !== "jeu" && rb.etat !== "pause" && rb.etat !== "envoi") rendreRumble();
    rendreQuiz();
    rendreDocteur();
    rendreMemory();
    rendreCourse();
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
  const SOURCES_PRIME = { depart: "Création de l'avis", messages: "Messages sur le Discord", lives: "Présence aux lives", cartes: "Cartes", jeux: "Jeux", chopper: "Chopper", boss: "Coups au boss" };
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
    if (!moi?.connecte) {
      contenu = [
        affiche({ nom: "Toi ?", inconnu: true }),
        el("div", { class: "wanted-infos" },
          el("h3", { text: "Ton avis de recherche" }),
          el("p", { text: "Ta photo de profil sur une affiche WANTED, avec une prime en berrys qui monte avec tout ce que tu fais sur le Discord et sur le site." }),
          el("a", { class: "btn btn-plein", href: "/api/auth/login", text: "Se connecter avec Discord" }),
        ),
      ];
    } else if (chassePasMembre) {
      contenu = [affiche({ nom: moi.nom, inconnu: true }), el("div", { class: "wanted-infos" }, el("h3", { text: "Ton avis de recherche" }), el("p", { text: "Rejoins le Discord Barhaw pour entrer dans la chasse." }), el("a", { class: "btn btn-plein", href: "#discord", text: "Rejoindre le Discord" }))];
    } else if (!p) {
      contenu = [affiche({ nom: moi.nom, inconnu: true }), el("div", { class: "wanted-infos" }, el("h3", { text: "Ton avis de recherche" }), el("p", { class: "note", text: "Ta prime arrive…" }))];
    } else if (!p.actif) {
      contenu = [
        el("div", { class: "wanted-apercu" }, affiche({ nom: moi.nom, avatar: moi.avatar, prime: infosChasse()?.primes?.gains?.depart || 50000 })),
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
      contenu = [
        el("div", { class: `wanted-apercu${nouveau ? " placarde" : ""}` }, affiche({ nom: p.nom, avatar: p.avatar || moi.avatar, prime: p.prime })),
        el("div", { class: "wanted-infos" },
          el("p", { class: "wanted-titre-pirate", text: p.titre }),
          el("p", { class: "wanted-grosse-prime" }, el("b", { class: "degrade", text: berrys(p.prime) })),
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

  // ---------- chargement ----------
  function rendreTout() {
    rendreEntete();
    rendreMaintenant();
    rendreEvenements();
    bulleAccueil();
    rendreChaine();
    rendrePotes();
    rendreYoutube();
    rendreDiscord();
    rendreChopper();
    rendreTournoi();
    rendreClassementJeu();
    if (!tirageEnCours) { rendreAlbum(); rendreCollectionneurs(); if (!$("tirage")?.querySelector(".retourne")) rendreTirage(); }
    rendreJeux();
    rendreChasse();
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

  async function chargerMoi() {
    try {
      moi = await (await fetch("/api/moi")).json();
    } catch {
      moi = { connecte: false };
    }
    rendreCompte();
    rendreActions();
    rendreClassementJeu();
    if (moi?.connecte) agir("etat");
    chargerMesCartes();
    chargerMesJeux();
    chargerMaChasse();
  }

  function demarrer() {
    ciel();
    animationsHorsVue();
    entete();
    apparitionsFixes();
    kanjis();
    musique();
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
