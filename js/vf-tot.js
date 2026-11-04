// La VF 1.0 (22 décembre 2026 à 21 h 30, heure de Paris), dès le tout premier affichage :
// sans ce petit fichier, la page montrerait l'ancien accueil une fraction de seconde, le temps que site.js arrive.
// Il lance aussi tout de suite le chargement de l'image de l'accueil (la carte postale de Port Barhaw).
// site.js reprend la main ensuite (il peut encore ouvrir ou fermer la VF selon le bot).
(function () {
  try {
    if (Date.now() < Date.parse("2026-12-22T20:30:00Z")) return;
    document.documentElement.classList.add("v4");
    var l = document.createElement("link");
    l.rel = "preload";
    l.as = "image";
    l.setAttribute("imagesrcset", "/img/accueil-vf-petit.webp 480w, /img/accueil-vf.webp 960w");
    l.setAttribute("imagesizes", "(max-width: 900px) 92vw, 46vw");
    l.setAttribute("fetchpriority", "high");
    document.head.appendChild(l);
  } catch (e) {}
})();
