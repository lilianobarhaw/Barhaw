// La page « Pas de connexion » de l'appli (hors-ligne.html) : elle se recharge toute seule dès que le réseau revient.
// Pour savoir s'il est revenu, on demande un tout petit fichier du site (la fiche de l'appli), sans passer par les copies.
(function () {
  "use strict";
  var fait = false;
  var bouton = document.getElementById("reessayer");

  // sur un ordinateur (souris, grand écran), on ne parle pas de téléphone
  if (window.matchMedia && matchMedia("(pointer: fine) and (min-width: 901px)").matches) {
    var appareil = document.getElementById("appareil");
    var astuce = document.getElementById("astuce");
    if (appareil) appareil.textContent = "ordi";
    if (astuce) astuce.textContent = "Vérifie le Wi-Fi ou le câble réseau.";
  }

  function recharger() {
    if (fait) return;
    fait = true;
    location.reload();
  }
  function sonder() {
    return fetch("/manifest.webmanifest", { cache: "no-store" }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }
  function essayer() {
    sonder().then(function (ok) { if (ok) recharger(); });
  }

  addEventListener("online", function () { setTimeout(essayer, 300); });
  setInterval(function () { if (!document.hidden) essayer(); }, 8000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) essayer(); });

  if (bouton) {
    bouton.addEventListener("click", function (e) {
      e.preventDefault();
      if (bouton.classList.contains("cherche")) return;
      bouton.classList.add("cherche");
      bouton.textContent = "On cherche le réseau…";
      sonder().then(function (ok) {
        if (ok) { recharger(); return; }
        bouton.textContent = "Toujours pas de réseau";
        setTimeout(function () { bouton.textContent = "Réessayer"; bouton.classList.remove("cherche"); }, 1800);
      });
    });
  }
})();
