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
  // la musique du site : le lecteur Spotify officiel, chargé seulement quand on appuie sur le bouton
  const MUSIQUE = { id: "1mvzvLW9nFujgS2VNKnToJ", titre: "Charger" };

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

  // ---------- le ciel étoilé ----------
  function ciel() {
    const c = $("ciel");
    if (!c || !c.getContext) return;
    const ctx = c.getContext("2d");
    const teintes = ["#f5f0fb", "#f5f0fb", "#cdb6ff", "#ff9cc1"];
    let etoiles = [];
    let l = 0;
    let h = 0;
    let boucle = 0;
    let dernier = 0;

    function taille() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      l = window.innerWidth;
      h = window.innerHeight;
      c.width = Math.round(l * dpr);
      c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(160, Math.round((l * h) / 9000));
      etoiles = Array.from({ length: n }, () => ({
        x: Math.random() * l,
        y: Math.random() * h,
        r: Math.random() < 0.08 ? 1.3 + Math.random() * 0.8 : 0.3 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        vitesse: 0.35 + Math.random() * 1.3,
        profondeur: 0.15 + Math.random() * 0.85,
        teinte: teintes[Math.floor(Math.random() * teintes.length)],
      }));
    }

    function dessiner(t) {
      ctx.clearRect(0, 0, l, h);
      const defile = window.scrollY || 0;
      for (const e of etoiles) {
        const lueur = reduit.matches ? 0.65 : 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t / 1000) * e.vitesse + e.phase));
        let y = (e.y - defile * e.profondeur * 0.06) % h;
        if (y < 0) y += h;
        ctx.globalAlpha = lueur;
        ctx.fillStyle = e.teinte;
        ctx.beginPath();
        ctx.arc(e.x, y, e.r, 0, Math.PI * 2);
        ctx.fill();
        if (e.r > 1.3) {
          ctx.globalAlpha = lueur * 0.18;
          ctx.beginPath();
          ctx.arc(e.x, y, e.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          if (lueur > 0.8) { // l'étincelle en croix, au plus fort
            const l = e.r * 9 * (lueur - 0.8) * 5;
            ctx.globalAlpha = (lueur - 0.8) * 4;
            ctx.fillRect(e.x - l, y - 0.5, l * 2, 1);
            ctx.fillRect(e.x - 0.5, y - l, 1, l * 2);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function image(t) {
      boucle = 0;
      if (document.hidden) return;
      if (t - dernier > 33) { dernier = t; dessiner(t); } // ~30 images par seconde suffisent
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
    if (reduit.matches) window.addEventListener("scroll", () => requestAnimationFrame(dessiner), { passive: true });
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
    window.matchMedia("(min-width: 901px)").addEventListener?.("change", (m) => { if (m.matches) menu(false); });
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

  // ---------- la musique ----------
  function musique() {
    const bouton = $("musique");
    if (!bouton) return;
    const panneau = $("musique-lecteur");
    const note = $("musique-note");
    let actif = false;
    let controleur = null;
    let chargement = null;
    let fin = false;
    let essaiLecture = 0;

    const afficher = (joue) => {
      bouton.classList.toggle("joue", joue);
      bouton.setAttribute("aria-pressed", String(actif));
      $("musique-texte").textContent = actif ? MUSIQUE.titre : "Musique";
      if (joue) { note.hidden = true; clearTimeout(essaiLecture); }
    };

    // l'API officielle du lecteur Spotify (open.spotify.com), chargée au premier clic seulement
    function chargerSpotify() {
      if (chargement) return chargement;
      chargement = new Promise((ok, ko) => {
        const delai = setTimeout(() => ko(new Error("Spotify ne répond pas")), 9000);
        window.onSpotifyIframeApiReady = (api) => {
          api.createController($("spotify"), { uri: `spotify:track:${MUSIQUE.id}`, width: "100%", height: 80 }, (c) => {
            controleur = c;
            c.addListener("playback_update", (ev) => {
              const d = ev?.data || {};
              afficher(actif && !d.isPaused && !d.isBuffering);
              // à la fin du morceau, il repart du début
              if (d.duration && d.position >= d.duration - 900) { if (!fin && actif) { fin = true; c.restart(); } }
              else if (d.duration && d.position < d.duration - 3000) fin = false;
            });
            let pret = false;
            const go = () => { if (!pret) { pret = true; clearTimeout(delai); ok(c); } };
            c.addListener("ready", go);
            setTimeout(go, 1500);
          });
        };
        const s = document.createElement("script");
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        s.onerror = () => { clearTimeout(delai); ko(new Error("Spotify bloqué")); };
        document.head.append(s);
      });
      return chargement;
    }

    // si l'API ne répond pas : le lecteur Spotify simple, on appuie sur ▶ dedans
    function lecteurSimple() {
      if ($("spotify-zone").querySelector("iframe")) return;
      vider($("spotify-zone"), el("iframe", {
        src: `https://open.spotify.com/embed/track/${MUSIQUE.id}?utm_source=generator&theme=0`,
        title: `Lecteur Spotify : ${MUSIQUE.titre}`,
        allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        loading: "lazy",
      }));
    }
    const dire = (texte) => { note.textContent = texte; note.hidden = false; };

    bouton.addEventListener("click", async () => {
      actif = !actif;
      panneau.hidden = !actif;
      afficher(false);
      if (!actif) { try { controleur?.pause(); } catch {} return; }
      try {
        const c = await chargerSpotify();
        if (!actif) return;
        c.resume();
        // certains navigateurs (Safari) refusent de lancer le son tout seuls : on le dit
        clearTimeout(essaiLecture);
        essaiLecture = setTimeout(() => { if (actif && !bouton.classList.contains("joue")) dire("Appuie sur ▶ dans le lecteur pour lancer la musique."); }, 2500);
      } catch {
        lecteurSimple();
        dire("Appuie sur ▶ dans le lecteur pour lancer la musique.");
      }
    });
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
                el("div", { class: "portrait" }, el("img", { src: "/img/chopper-visage.jpg", alt: "" })),
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
        el("div", {},
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
        el("div", {},
          el("h3", { text: "Pas de live : la rediff tourne" }),
          el("p", { text: `Sur la chaîne ${r.login}, les anciens lives de Liliano passent en boucle, 24 h/24.` }),
          r.titre ? el("div", { class: "details" }, el("span", { class: "chip", text: r.titre }), r.jeu ? el("span", { class: "chip", text: r.jeu }) : null) : null,
        ),
        suivre,
      );
    } else {
      vider($("infos-live"),
        el("div", {},
          el("h3", { text: "Pas de live pour l'instant" }),
          el("p", { text: "Suis la chaîne pour être prévenu, ou rejoins le Discord : une annonce part dès que Liliano lance un live." }),
        ),
        suivre,
      );
    }
  }

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
    if (moi?.connecte) agir("etat");
  }

  function demarrer() {
    ciel();
    entete();
    apparitionsFixes();
    kanjis();
    musique();
    if (!$("accueil")) return; // la page des mentions : juste le décor

    const u = new URL(location.href);
    if (u.searchParams.get("connexion") === "erreur") {
      erreurConnexion = true;
      u.searchParams.delete("connexion");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
    if (!("IntersectionObserver" in window)) chaineProche = true;
    suiviSections();
    window.matchMedia("(min-width: 901px)").addEventListener?.("change", () => rendreChaine());
    rendreMaintenant();
    rendreEvenements();
    rendreCompte();
    charger();
    chargerMoi();
    setInterval(charger, 60_000);
    setInterval(bulleAccueil, 6500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();
})();
