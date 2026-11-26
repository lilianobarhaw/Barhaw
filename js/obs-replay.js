// LE REPLAY (« !replay », toi et tes modos) de la page des effets (js/obs-effets.js) : la régie (js/obs-regie.js) enregistre
// les dernières secondes avec le tampon de relecture d'OBS et les repasse au ralenti, dans une source cachée glissée juste
// sous la page ; la page pose par-dessus un cadre « REPLAY », et un son de cassette qu'on rembobine (son/effets/replay, fait
// pour Barhaw, libre de droits).
const CAPTURE = Boolean(window.__capture);
const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
function anime(n, images, options) {
  if (!n || typeof n.animate !== "function") return null;
  const a = n.animate(images, options);
  if (CAPTURE) { a.pause(); a.__t0 = performance.now(); }
  return a;
}

export function creerReplay({ regie, sonner = () => null } = {}) {
  async function jouer(secondes = 20) {
    if (!regie?.pret?.()) throw Object.assign(new Error("la régie n'est pas reliée à OBS"), { code: "obs" });
    let c = null;
    let fini = false;
    try {
      await regie.replay({
        secondes,
        vitesse: 65,
        surDebut: () => {
          if (fini) return;
          c = el("div", "fx replay");
          const point = el("i");
          c.append(el("div", "fx-replay-cadre"), el("div", "fx-replay-titre", point, "REPLAY"), el("div", "fx-replay-vitesse", "RALENTI ×0,65"));
          document.body.append(c);
          anime(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, fill: "both" });
          anime(point, [{ opacity: 1 }, { opacity: 0.15 }, { opacity: 1 }], { duration: 1000, iterations: 60 });
          sonner("effets/replay");
        },
      });
    } finally {
      fini = true;
      if (c) { const n = c; anime(n, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "both" }); setTimeout(() => n.remove(), 320); }
    }
  }
  return { jouer };
}
