// Le bouton d'arrêt de l'appli Barhaw, au cas où le programme en coulisse poserait un jour problème.
// Pour l'utiliser : copier ce fichier à la place de sw.js (à la racine du dépôt), puis mettre en ligne.
// À la visite suivante, chaque navigateur le reçoit, se désinscrit, efface la copie de la page « Pas de connexion »
// et recharge ses pages ouvertes : tout redevient comme avant l'appli (l'icône reste, mais ouvre simplement le site).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const cles = await caches.keys();
    await Promise.all(cles.filter((k) => k.startsWith("barhaw-appli-")).map((k) => caches.delete(k)));
    await self.registration.unregister();
    const pages = await self.clients.matchAll({ type: "window" });
    for (const p of pages) p.navigate(p.url);
  })());
});
