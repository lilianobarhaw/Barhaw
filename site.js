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
    { src: "/img/memes/meme-01.jpg", l: 135, h: 185 },
    { src: "/img/memes/meme-02.jpg", l: 439, h: 272 },
    { src: "/img/memes/meme-03.jpg", l: 272, h: 246 },
    { src: "/img/memes/meme-04.jpg", l: 560, h: 447 },
    { src: "/img/memes/meme-05.jpg", l: 560, h: 483 },
    { src: "/img/memes/meme-06.jpg", l: 560, h: 550 },
    { src: "/img/memes/meme-07.jpg", l: 560, h: 154 },
    { src: "/img/memes/meme-08.jpg", l: 560, h: 317 },
    { src: "/img/memes/meme-09.jpg", l: 560, h: 386 },
    { src: "/img/memes/meme-10.jpg", l: 393, h: 433 },
    { src: "/img/memes/meme-11.jpg", l: 342, h: 460 },
    { src: "/img/memes/meme-12.jpg", l: 340, h: 460 },
    { src: "/img/memes/meme-13.jpg", l: 427, h: 460 },
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
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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

    function image(t) {
      boucle = 0;
      if (document.hidden) return;
      if (t - dernier > 33) { const dt = dernier ? Math.min(60, t - dernier) : 16; dernier = t; dessiner(t, dt); } // ~30 images par seconde suffisent
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
    window.matchMedia("(min-width: 1181px)").addEventListener?.("change", (m) => { if (m.matches) menu(false); });
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

  // l'écran sombre qui montre un mème ou une vidéo en grand ; un clic à côté, ✕ ou Échap le ferme
  function visionneuse(contenu, etiquette, depuis) {
    const fermer = () => {
      contenu.pause?.();
      v.remove();
      window.removeEventListener("keydown", touche);
      depuis?.focus({ preventScroll: true });
    };
    const touche = (e) => { if (e.key === "Escape") fermer(); };
    const v = el("div", { class: "visionneuse", role: "dialog", "aria-modal": "true", "aria-label": etiquette },
      contenu,
      el("button", { class: "visionneuse-fermer", type: "button", "aria-label": "Fermer", text: "✕" }),
    );
    v.addEventListener("click", (e) => { if (e.target !== contenu || contenu.tagName === "IMG") fermer(); });
    window.addEventListener("keydown", touche);
    document.body.append(v);
    v.querySelector("button").focus();
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
    if (donnees?.chaine?.enLive) phrases.push("Liliano est en live là, fonce !");
    const prochain = (donnees?.evenements || evenementsSecours()).aVenir?.[0];
    if (prochain) phrases.push(prochain.enCours ? `${prochain.titre} : c'est maintenant !` : `Prochain event : ${prochain.titre}, ${dansCombien(prochain.debut)} !`);
    const ch = donnees?.chopper;
    if (ch?.actif && ch.faim < 40) phrases.push("J'ai faim… Viens me nourrir, plus bas !");
    if (ch?.actif && ch.deprime) phrases.push("Le serveur est tout calme… Venez me voir…");
    phrases.push("Yo ! Moi c'est Chopper, la mascotte de Barhaw.", "Connecte-toi avec Discord pour jouer avec moi !");
    const b = $("bulle-hero");
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
      montrerResultat({ anim: d.anim, texte: `${d.texte} (${d.bonus})` });
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
          resultat.textContent = [
            d.record ? "Nouveau record du goûter, bravo !" : d.perso ? "Nouveau record perso cette semaine !" : `Ton meilleur cette semaine : ${d.meilleur} points.`,
            d.recompense ? `Chopper est content : ${d.recompense}.` : d.restant > 0 ? "Attrape au moins un bonbon pour que la partie rapporte." : "Tes 3 parties qui rapportent sont faites pour aujourd'hui.",
          ].join(" ");
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
  }

  async function charger() {
    try {
      const r = await fetch("/api/public", { headers: { Accept: "application/json" } });
      donnees = await r.json();
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
  }

  function demarrer() {
    ciel();
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
    setInterval(bulleAccueil, 6500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
