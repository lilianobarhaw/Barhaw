// L'appli Barhaw (la PWA), dès le tout premier affichage : quand le site est ouvert depuis son icône sur l'écran
// d'accueil, la page le sait avant de se dessiner (classe « appli » sur la page). Elle prend alors tout l'écran
// (encoche et barre du bas de l'iPhone comprises, appli/appli.css garde les marges) et la barre d'état devient sombre
// comme l'en-tête. Dans le navigateur, rien ne change.
// Pour voir l'allure de l'appli dans un navigateur ordinaire : ajouter ?appli=oui à l'adresse (?appli=non pour revenir).
(function () {
  try {
    var d = document.documentElement;
    var q = location.search;
    if (/[?&]appli=oui\b/.test(q)) sessionStorage.setItem("barhaw-appli-essai", "1");
    if (/[?&]appli=non\b/.test(q)) sessionStorage.removeItem("barhaw-appli-essai");
    var essai = sessionStorage.getItem("barhaw-appli-essai") === "1";
    var installee = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    if (!installee && !essai) return;
    d.classList.add("appli");
    if (essai && !installee) d.classList.add("appli-essai");
    if (installee) { try { localStorage.setItem("barhaw-appli-installee", "1"); } catch (e) {} }
    var v = document.querySelector('meta[name="viewport"]');
    if (v && v.content.indexOf("viewport-fit") < 0) v.content += ", viewport-fit=cover";
    var t = document.querySelector('meta[name="theme-color"]');
    if (t) t.content = "#12070f";
  } catch (e) {}
})();
