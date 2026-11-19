// Barhaw : le programme en coulisse de l'appli (le « service worker » de la PWA).
// Il ne fait qu'une chose pour l'instant : si le téléphone n'a plus de réseau quand on ouvre une page du site,
// il montre la page « Pas de connexion » (hors-ligne.html) au lieu de l'erreur du navigateur.
//
// Ce qu'il ne touche jamais (tout passe tout droit, comme sans lui) :
//  - /api/… : la connexion Discord, les données du bot, Chopper, les jeux, la Faille… ;
//  - /obs : la page posée dans OBS (une page « Pas de connexion » ne doit jamais apparaître dans un live) ;
//  - les images, les scripts, les sons, les vidéos et les autres sites (Twitch, YouTube, les polices) ;
//    il ne garde aucune copie du site : chaque visite reçoit la dernière version.
// Il garde seulement, dans le téléphone, la page « Pas de connexion » et son petit script.

const VERSION = "barhaw-appli-1"; // à changer quand la page « Pas de connexion » change
const HORS_LIGNE = "/hors-ligne";
const A_GARDER = [HORS_LIGNE, "/appli/hors-ligne.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(A_GARDER.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("barhaw-appli-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function passeToutDroit(url) {
  return url.origin !== self.location.origin
    || url.pathname.startsWith("/api/")
    || url.pathname === "/obs" || url.pathname.startsWith("/obs.") || url.pathname.startsWith("/obs/");
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (passeToutDroit(url)) return;

  // le petit script de la page « Pas de connexion » : la copie gardée d'abord (elle ne sert que hors connexion)
  if (url.pathname === "/appli/hors-ligne.js") {
    e.respondWith(caches.match(url.pathname).then((r) => r || fetch(req)));
    return;
  }

  // une page du site : le réseau, comme d'habitude ; s'il ne répond pas, la page « Pas de connexion »
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match(HORS_LIGNE).then((r) => r || Response.error())),
    );
  }
  // tout le reste : rien (le navigateur s'en occupe, comme sans l'appli)
});
