// LA PLUIE D'EMOTES (la page des effets, js/obs-effets.js) : les emotes écrites par le viewer (Twitch, 7TV, BTTV ou FFZ de la
// chaîne, retrouvées par le bot : lib/emotes.js) tombent en pluie sur tout l'écran pendant quelques secondes, en se balançant
// et en tournant ; un petit bandeau dit qui l'a offerte. Les images ne viennent que des CDN des emotes (ou du site, pour les
// essais) : jamais d'autre adresse.

const CAPTURE = Boolean(window.__capture);
const SURES = /^https:\/\/(static-cdn\.jtvnw\.net|cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)\/[^\s"'<>]{1,240}$/;
// trois emotes d'essai, dessinées ici (?essai=emotes, ou le bouton de l'aide)
const ESSAI = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="#ffcf5c" stroke="#12050d" stroke-width="4"/><circle cx="22" cy="27" r="4.5" fill="#12050d"/><circle cx="42" cy="27" r="4.5" fill="#12050d"/><path d="M18 38 Q32 52 46 38" fill="#ff4f9a" stroke="#12050d" stroke-width="4" stroke-linejoin="round"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 56 C8 40 4 26 12 16 C20 7 30 11 32 19 C34 11 44 7 52 16 C60 26 56 40 32 56 Z" fill="#ff4f9a" stroke="#12050d" stroke-width="4" stroke-linejoin="round"/><ellipse cx="20" cy="22" rx="5" ry="3" fill="#fff" opacity=".8"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><polygon points="32,4 40,24 61,25 44,38 50,59 32,47 14,59 20,38 3,25 24,24" fill="#d1a6ff" stroke="#12050d" stroke-width="4" stroke-linejoin="round"/><circle cx="26" cy="30" r="3" fill="#12050d"/><circle cx="38" cy="30" r="3" fill="#12050d"/></svg>`,
].map((s, i) => ({ nom: ["Sourire", "Coeur", "Etoile"][i], url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}` }));

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
// un petit hasard qui se rejoue pareil (les vidéos d'aperçu)
function hasardDe(graine) {
  let s = graine >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

export const EMOTES_ESSAI = ESSAI;

// images : [{ nom, url }] ; renvoie une promesse tenue quand la pluie est finie
export function pleuvoir({ images = [], par = "", duree = 8500, pseudo = true, densite = 7, essai = false, graine = Date.now(), bandeau: avecBandeau = true } = {}) {
  const bonnes = (Array.isArray(images) ? images : []).filter((x) => x && typeof x.url === "string" && (SURES.test(x.url) || (essai && x.url.startsWith("data:image/svg+xml")))).slice(0, 3);
  if (!bonnes.length) return Promise.resolve(false);
  const hasard = hasardDe(graine);
  const couche = el("div", "fx pluie");
  document.body.append(couche);
  // le bandeau : « Pluie de LUL · par Fan_1 »
  const nom = String(par || "").replace(/[\u0000-\u001f\u007f<>`@]/g, "").trim().slice(0, 25);
  const bandeau = el("div", "fx-bandeau", el("b", "", `Pluie de ${bonnes.map((x) => String(x.nom || "").slice(0, 20)).join(", ")}`), pseudo && nom ? el("span", "", ` · par ${nom}`) : null);
  if (avecBandeau) couche.append(bandeau);
  if (avecBandeau) anime(bandeau, [
    { offset: 0, transform: "translate(-50%, -3rem)", opacity: 0 },
    { offset: 0.08, transform: "translate(-50%, 0)", opacity: 1 },
    { offset: 0.85, transform: "translate(-50%, 0)", opacity: 1 },
    { offset: 1, transform: "translate(-50%, -2rem)", opacity: 0 },
  ], { duration: Math.min(4200, duree), easing: "ease-out", fill: "forwards" });
  const tombe = Math.max(1500, duree - 3600); // le temps pendant lequel il en part de nouvelles
  const nb = Math.round((tombe / 1000) * densite);
  for (let i = 0; i < nb; i++) {
    const im = bonnes[i % bonnes.length];
    const img = el("img", "pluie-emote");
    img.alt = "";
    img.decoding = "async";
    img.src = im.url;
    const taille = 6.5 + hasard() * 7; // en rem
    img.style.height = `${taille}rem`;
    img.style.left = `${2 + hasard() * 94}%`;
    couche.append(img);
    const depart = (i / nb) * tombe + hasard() * 160;
    const chute = 2400 + hasard() * 1700;
    const balance = (hasard() - 0.5) * 16; // rem
    const tour = (hasard() - 0.5) * 540;
    const images = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      const y = -16 + u * u * 140; // la gravité : lentement puis vite (en vh, à peu près)
      images.push({ transform: `translate(${(Math.sin(u * Math.PI * 2.2) * balance).toFixed(2)}rem, ${y.toFixed(1)}vh) rotate(${(u * tour).toFixed(1)}deg)`, opacity: u > 0.86 ? (1 - u) / 0.14 : 1 });
    }
    anime(img, images, { duration: chute, delay: depart, easing: "linear", fill: "both" });
  }
  return new Promise((ok) => setTimeout(() => { couche.remove(); ok(true); }, duree + 700));
}
