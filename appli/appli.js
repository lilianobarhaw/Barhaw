// L'appli Barhaw (la PWA) : tout ce que l'appli ajoute au site, rangé à part de site.js.
//  1. le programme en coulisse (sw.js) : la page « Pas de connexion » quand une page ne peut pas s'ouvrir ;
//  2. l'invitation à installer : la vraie fenêtre d'installation sur Android et sur PC, un guide en 2 gestes sur iPhone ;
//     jamais dans l'appli elle-même, et une fois fermée elle ne revient pas (le bouton du bas de page reste) ;
//  3. dans l'appli, avant la VF 1.0 : une barre en bas de l'écran (Accueil, Live, GRAND LINE, Jeux, Menu) ;
//     dès que la VF 1.0 s'ouvre, elle laisse la place à la barre de la VF (site.js) ;
//  4. le réseau coupé pendant la visite : un bandeau « Pas de réseau » à la place de « Escale au port », qui ferait
//     croire que le bot est en panne.
// Rien ici ne touche à la connexion Discord, aux comptes reliés ni aux données du bot. Aucun texte venu de l'extérieur
// n'est inséré comme du HTML (les seuls morceaux de HTML sont les petits dessins écrits plus bas).
(() => {
  "use strict";
  const d = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const enAppli = d.classList.contains("appli"); // posée par appli/appli-tot.js (ouverte depuis l'écran d'accueil, ou ?appli=oui)
  const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
  const ecrire = (cle, valeur) => { try { localStorage.setItem(cle, valeur); } catch { /* navigation privée : tant pis */ } };
  const ua = navigator.userAgent || "";
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const navigateurIntegre = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|BytedanceWebview|TikTok|Snapchat|LinkedInApp|Line\/|; wv\)/.test(ua);
  const telephone = matchMedia("(max-width: 900px)");
  const doigt = matchMedia("(pointer: coarse)");
  const reduit = matchMedia("(prefers-reduced-motion: reduce)");

  function el(nom, attributs = {}, ...enfants) {
    const e = document.createElement(nom);
    for (const [k, v] of Object.entries(attributs)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === "text") e.textContent = v;
      else if (k === "dessin") e.innerHTML = v; // seulement les dessins écrits ici (DESSINS)
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const x of enfants) if (x !== null && x !== undefined && x !== false) e.append(x);
    return e;
  }
  const svg = (contenu, classe = "appli-picto") =>
    `<svg class="${classe}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contenu}</svg>`;
  // les petits dessins de l'appli (inventés ; les mêmes que les raccourcis de l'icône, outils/appli/fabriquer_icones.py)
  const DESSINS = {
    accueil: svg('<path d="M3.5 10.8 12 4l8.5 6.8"/><path d="M5.8 9.4V20h12.4V9.4"/><path d="M10 20v-5h4v5"/>'),
    live: svg('<rect x="3" y="5" width="18" height="12.5" rx="3"/><path d="M8.5 21h7M12 17.5V21"/><path d="M10.2 8.6v5.4l4.6-2.7z" fill="currentColor"/>'),
    grandline: svg('<circle cx="12" cy="12" r="8.6"/><path d="M15.6 8.4 13.1 13.1 8.4 15.6 10.9 10.9z" fill="currentColor"/>'),
    jeux: svg('<path d="M7.2 7.5h9.6a4.6 4.6 0 0 1 4.4 3.3l1 3.7a3 3 0 0 1-5.1 2.9l-1.7-1.8H8.6l-1.7 1.8a3 3 0 0 1-5.1-2.9l1-3.7a4.6 4.6 0 0 1 4.4-3.3z"/><path d="M7.5 10.2v3.2M5.9 11.8h3.2"/><circle cx="16.4" cy="10.6" r="1.1" fill="currentColor" stroke="none"/><circle cx="18.1" cy="12.9" r="1.1" fill="currentColor" stroke="none"/>'),
    menu: svg('<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>'),
    fermer: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
    partager: svg('<path d="M12 3.5v11"/><path d="M8 7.3 12 3.5l4 3.8"/><path d="M8.5 10.5H6.8A1.8 1.8 0 0 0 5 12.3v6.4a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8v-6.4a1.8 1.8 0 0 0-1.8-1.8h-1.7"/>', "appli-picto appli-picto-texte"),
    ajouter: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>', "appli-picto appli-picto-texte"),
    reseau: svg('<path d="M2.5 9.2a14 14 0 0 1 19 0"/><path d="M5.8 12.6a9.2 9.2 0 0 1 12.4 0"/><path d="M9.2 16a4.4 4.4 0 0 1 5.6 0"/><circle cx="12" cy="19.2" r="1.2" fill="currentColor" stroke="none"/><path d="M4 3.5l16 17" stroke-width="2.4"/>'),
  };

  // une petite bulle qui s'en va toute seule (« Le réseau est revenu ! »…)
  function bulle(texte) {
    const b = el("div", { class: "appli-bulle", role: "status", text: texte });
    document.body.append(b);
    setTimeout(() => b.remove(), 3400);
  }

  // ---------- 1. le programme en coulisse (sw.js) ----------
  // Il ne garde que la page « Pas de connexion » ; il laisse passer /api (connexion Discord comprise) et /obs.
  if ("serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
    const inscrire = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    if (document.readyState === "complete") inscrire();
    else addEventListener("load", inscrire, { once: true });
  }

  // ---------- 2. l'invitation à installer l'appli ----------
  const CLE_INVITATION = "barhaw-appli-invitation"; // "fermee" : on l'a fermée, elle ne revient plus
  const CLE_VUES = "barhaw-appli-invitation-vues"; // combien de fois elle est partie toute seule (3 au plus)
  let invite = null; // la fenêtre d'installation d'Android et des PC (Chrome, Edge…), gardée pour le bouton
  let carte = null;
  let boutonPied = null;
  const dejaInstallee = () => lire("barhaw-appli-installee") === "1";
  const peutInstaller = () => !enAppli && !dejaInstallee() && Boolean(invite || iOS);

  function majBoutonPied() {
    if (!boutonPied) {
      const pied = document.querySelector(".pied .pied-liens");
      if (!pied) return;
      boutonPied = el("button", { type: "button", class: "appli-pied", hidden: true, onclick: () => ouvrirInvitation(true) },
        el("img", { src: "/img/appli/icone-192.png", alt: "", width: 20, height: 20, loading: "lazy", decoding: "async" }),
        el("span", { text: "Installer l'appli" }));
      pied.append(boutonPied);
    }
    boutonPied.hidden = !peutInstaller();
  }

  function fermerInvitation(pourDeBon) {
    if (pourDeBon) ecrire(CLE_INVITATION, "fermee");
    if (!carte) return;
    const c = carte;
    carte = null;
    c.classList.add("part");
    setTimeout(() => c.remove(), reduit.matches ? 0 : 260);
  }

  async function installer() {
    if (!invite) return;
    const e = invite;
    invite = null;
    try {
      await e.prompt();
      const choix = await e.userChoice;
      fermerInvitation(true);
      if (choix?.outcome !== "accepted") majBoutonPied();
    } catch {
      fermerInvitation(false);
    }
    majBoutonPied();
  }

  function contenuGuide() {
    if (navigateurIntegre) {
      return el("p", { class: "appli-invite-guide", text: "Pour l'installer, ouvre ce lien dans Safari (iPhone) ou Chrome (Android) : depuis cette appli, ce n'est pas possible." });
    }
    if (iOS) {
      return el("ol", { class: "appli-etapes" },
        el("li", {}, "Touche ", el("span", { dessin: DESSINS.partager }), " ", el("b", { text: "Partager" }), " (en bas de Safari, ou en haut sur iPad)"),
        el("li", {}, "Puis ", el("b", { text: "Sur l'écran d'accueil" }), " ", el("span", { dessin: DESSINS.ajouter })),
        el("li", { class: "appli-etape-note", text: "Dans l'appli Discord ou Instagram ? Ouvre d'abord le lien dans Safari." }));
    }
    return null;
  }

  // demandee : le visiteur a touché « Installer l'appli » (bas de page) ; sinon, c'est l'invitation qui arrive toute seule
  function ouvrirInvitation(demandee = false) {
    if (enAppli || carte) return;
    if (!demandee && (lire(CLE_INVITATION) === "fermee" || !peutInstaller())) return;
    if (demandee && invite && !iOS) { installer(); return; }
    const guide = contenuGuide();
    carte = el("div", { class: "appli-invite", role: "dialog", "aria-modal": "false", "aria-labelledby": "appli-invite-titre" },
      el("img", { class: "appli-invite-icone", src: "/img/appli/icone-192.png", alt: "", width: 56, height: 56, decoding: "async" }),
      el("div", { class: "appli-invite-texte" },
        el("p", { class: "appli-invite-titre", id: "appli-invite-titre", text: "L'appli Barhaw" }),
        el("p", { text: "Barhaw sur ton écran d'accueil, en plein écran comme une vraie appli." }),
        guide),
      invite && !iOS ? el("button", { type: "button", class: "appli-installer", onclick: installer, text: "Installer" }) : null,
      el("button", { type: "button", class: "appli-invite-fermer", "aria-label": "Fermer : l'invitation ne reviendra pas", title: "Fermer", onclick: () => fermerInvitation(true), dessin: DESSINS.fermer }));
    document.body.append(carte);
    if (demandee) carte.querySelector(".appli-installer, .appli-invite-fermer")?.focus({ preventScroll: true });
    if (!demandee) {
      // ignorée, elle repart toute seule au bout de 25 s ; elle reviendra lors d'une prochaine visite (3 fois au plus)
      const c = carte;
      setTimeout(() => {
        if (carte !== c || c.matches(":hover, :focus-within")) return;
        ecrire(CLE_VUES, String((Number(lire(CLE_VUES)) || 0) + 1));
        fermerInvitation(false);
      }, 25_000);
    }
  }

  // quelque chose d'autre est déjà à l'écran (un live qui commence, une cinématique, le menu ouvert…) : on attend
  function ecranOccupe() {
    if (document.hidden || d.classList.contains("rubrique-ouverte") || $("nav")?.classList.contains("ouvert")) return true;
    if ($("pote-live") && !$("pote-live").hidden) return true;
    if ($("case-live") && !$("case-live").hidden) return true;
    return Boolean(document.querySelector(".cine, .choc-live, .bl-intro, .gl-salle, .tv-salle, .recit-voile, .caritatif-intro, .jeu-panneau.en-jeu"));
  }

  let invitationPrevue = false;
  function prevoirInvitation() {
    if (invitationPrevue || enAppli || !doigt.matches || !telephone.matches) return;
    if (lire(CLE_INVITATION) === "fermee" || (Number(lire(CLE_VUES)) || 0) >= 3 || !peutInstaller()) return;
    invitationPrevue = true;
    let essais = 0;
    let partie = false; // une seule fois par visite
    let minuteur = 0;
    const defile = () => {
      if (window.scrollY < innerHeight * 1.5) return;
      removeEventListener("scroll", defile);
      clearTimeout(minuteur);
      setTimeout(tenter, 1200);
    };
    function tenter() {
      if (partie || !peutInstaller() || carte) return;
      if (ecranOccupe() && essais++ < 12) { setTimeout(tenter, 10_000); return; }
      partie = true;
      removeEventListener("scroll", defile);
      clearTimeout(minuteur);
      ouvrirInvitation(false);
    }
    // au bout de 20 s sur le site, ou dès qu'on a bien descendu dans la page
    minuteur = setTimeout(tenter, 20_000);
    addEventListener("scroll", defile, { passive: true });
  }

  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // pas la petite barre automatique de Chrome : notre invitation et le bouton du bas de page
    invite = e;
    majBoutonPied();
    prevoirInvitation();
  });
  addEventListener("appinstalled", () => {
    invite = null;
    ecrire("barhaw-appli-installee", "1");
    fermerInvitation(true);
    majBoutonPied();
    bulle("Barhaw est sur ton écran d'accueil !");
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && carte) fermerInvitation(true); });

  // ---------- 3. dans l'appli, avant la VF 1.0 : la barre du bas ----------
  // Les mêmes liens que le menu, à portée de pouce ; « Menu » ouvre le menu complet (le même que le burger).
  // La rubrique en cours s'allume (site.js la suit déjà dans le menu), un point rose dit ce qui est en direct.
  const LIENS_BARRE = [
    { id: "accueil", nom: "Accueil", ancre: "accueil", groupe: ["accueil"] },
    { id: "live", nom: "Live", ancre: "chaine", groupe: ["chaine", "boss-live", "tournoi", "evenements"], points: ["pastille-live", "pastille-tournoi", "pastille-boss"] },
    { id: "grandline", nom: "GRAND LINE", ancre: "grandline", groupe: ["grandline"] },
    { id: "jeux", nom: "Jeux", ancre: "jeux", groupe: ["jeux", "cartes", "faille"], points: ["compteur-faille"] },
  ];
  const POINTS_MENU = ["compteur-potes"];
  let barre = null;
  let boutonMenu = null;
  const visible = (id) => { const x = $(id); return Boolean(x && !x.hidden); };

  function creerBarre() {
    const nav = $("nav");
    barre = el("nav", { class: "appli-barre", id: "appli-barre", "aria-label": "Raccourcis de l'appli" });
    for (const l of LIENS_BARRE) {
      barre.append(el("a", { href: `#${l.ancre}`, "data-groupe": l.groupe.join(" "), onclick: fermerMenu },
        el("span", { class: "appli-barre-dessin", dessin: DESSINS[l.id] }),
        el("span", { class: "appli-barre-nom", text: l.nom }),
        l.points ? el("i", { class: "appli-point", "data-points": l.points.join(" "), hidden: true }) : null));
    }
    boutonMenu = el("button", { type: "button", "aria-controls": "nav", "aria-expanded": "false", onclick: () => $("burger")?.click() },
      el("span", { class: "appli-barre-dessin", dessin: DESSINS.menu }),
      el("span", { class: "appli-barre-nom", text: "Menu" }),
      el("i", { class: "appli-point", "data-points": POINTS_MENU.join(" "), hidden: true }));
    barre.append(boutonMenu);
    document.body.append(barre);
    d.classList.add("appli-avec-barre");
    if (nav) suivreMenu.observe(nav, { subtree: true, attributes: true, attributeFilter: ["aria-current", "hidden", "class"] });
    majEtatBarre();
  }
  function retirerBarre() {
    suivreMenu.disconnect();
    barre?.remove();
    barre = null;
    boutonMenu = null;
    d.classList.remove("appli-avec-barre");
  }
  function fermerMenu() {
    if ($("nav")?.classList.contains("ouvert")) $("burger")?.click();
  }
  function majEtatBarre() {
    if (!barre) return;
    const actuel = $("nav")?.querySelector('a[data-lien][aria-current="true"]')?.dataset.lien || "";
    for (const a of barre.querySelectorAll("a[data-groupe]")) {
      if (a.dataset.groupe.split(" ").includes(actuel)) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
    for (const p of barre.querySelectorAll(".appli-point")) p.hidden = !p.dataset.points.split(" ").some(visible);
    const ouvert = Boolean($("nav")?.classList.contains("ouvert"));
    if (boutonMenu && boutonMenu.getAttribute("aria-expanded") !== String(ouvert)) {
      boutonMenu.setAttribute("aria-expanded", String(ouvert));
      boutonMenu.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
      boutonMenu.querySelector(".appli-barre-dessin").innerHTML = ouvert ? DESSINS.fermer : DESSINS.menu;
      boutonMenu.querySelector(".appli-barre-nom").textContent = ouvert ? "Fermer" : "Menu";
    }
  }
  let attenteBarre = false;
  const suivreMenu = new MutationObserver(() => {
    if (attenteBarre) return;
    attenteBarre = true;
    requestAnimationFrame(() => { attenteBarre = false; majEtatBarre(); });
  });
  function majBarre() {
    const voulue = enAppli && Boolean($("nav") && $("burger")) && telephone.matches && !d.classList.contains("v4");
    if (voulue && !barre) creerBarre();
    else if (!voulue && barre) retirerBarre();
  }

  // ---------- 4. le réseau coupé pendant la visite ----------
  // Sans réseau, les données du bot n'arrivent plus et site.js passe en « escale » (« le bot est en maintenance »).
  // Si c'est le téléphone qui n'a plus de réseau, on le dit, et l'escale reste cachée ; au retour, tout se recharge
  // tout seul (site.js redemande au bot toutes les 20 s pendant une escale).
  let sansReseau = false;
  let bandeau = null;
  let minuteurSonde = null;
  const sonder = () => fetch("/manifest.webmanifest", { method: "HEAD", cache: "no-store" }).then((r) => r.ok, () => false);

  function passerSansReseau() {
    if (sansReseau) return;
    sansReseau = true;
    d.classList.add("sans-reseau");
    d.classList.remove("reseau-revenu");
    const appareil = telephone.matches ? "Ton téléphone" : "Ton appareil";
    bandeau = el("div", { class: "appli-reseau", role: "status" },
      el("span", { class: "appli-reseau-dessin", dessin: DESSINS.reseau }),
      el("p", {}, el("strong", { text: "Pas de réseau." }), ` ${appareil} n'a plus de connexion : la page se remet à jour dès qu'elle revient.`),
      el("button", { type: "button", class: "appli-reseau-fermer", "aria-label": "Replier", title: "Replier", onclick: () => { bandeau?.remove(); bandeau = null; }, dessin: DESSINS.fermer }));
    document.body.append(bandeau);
    clearInterval(minuteurSonde);
    minuteurSonde = setInterval(() => { if (!document.hidden) sonder().then((ok) => { if (ok) revenirEnLigne(); }); }, 10_000);
  }
  function revenirEnLigne() {
    if (!sansReseau) return;
    sansReseau = false;
    clearInterval(minuteurSonde);
    bandeau?.remove();
    bandeau = null;
    d.classList.remove("sans-reseau");
    d.classList.add("reseau-revenu"); // le temps que site.js recharge tout (au plus 20 s) : pas de « Le navire est reparti ! »
    setTimeout(() => d.classList.remove("reseau-revenu"), 25_000);
    bulle("Le réseau est revenu !");
  }
  addEventListener("offline", passerSansReseau);
  addEventListener("online", () => setTimeout(() => sonder().then((ok) => { if (ok) revenirEnLigne(); }), 400));
  if (navigator.onLine === false) passerSansReseau();

  // ---------- ce qui suit les changements de la page (la VF qui s'ouvre, l'escale qui arrive) ----------
  let escaleAvant = false;
  new MutationObserver(() => {
    majBarre();
    const escale = d.classList.contains("en-escale");
    // l'escale vient d'arriver : est-ce le bot, ou le réseau ? (si le site lui-même ne répond plus, c'est le réseau)
    if (escale && !escaleAvant && !sansReseau) sonder().then((ok) => { if (!ok) passerSansReseau(); });
    escaleAvant = escale;
  }).observe(d, { attributes: true, attributeFilter: ["class"] });
  telephone.addEventListener?.("change", majBarre);

  const demarrer = () => { majBoutonPied(); majBarre(); if (iOS) prevoirInvitation(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer, { once: true });
  else demarrer();
})();
