// YouTube sur le site : la dernière vidéo longue en grand, les derniers Shorts en dessous.
//
// Le bot lit le flux de la chaîne, qui ne donne que les 15 derniers envois. Quand plusieurs Shorts sortent
// d'affilée, la dernière vidéo longue sort de ces 15 et la section YouTube n'avait plus rien à mettre en grand
// (elle affichait « Les vidéos arrivent bientôt »).
// YouTube tient deux listes automatiques par chaîne : une pour les vidéos longues (UULF…) et une pour les
// Shorts (UUSH…). On lit les deux séparément, donc la dernière vidéo longue reste en haut quoi qu'il arrive.
// Ce sont des flux publics : pas de clé, et seules les vidéos publiques y apparaissent (une vidéo programmée
// arrive sur le site à sa sortie).
// Si YouTube ne répond pas, on garde la dernière bonne réponse (10 min), sinon ce que le bot a donné.

const NB_VIDEOS = 5; // la dernière en grand + 4 en dessous
const NB_SHORTS = 6;
const GARDE = 5 * 60 * 1000; // on relit YouTube au plus toutes les 5 minutes
const SECOURS = 10 * 60 * 1000; // une réponse qui a moins de 10 min sert si YouTube ne répond pas
const DELAI = 2000; // au bout de 2 s sans réponse, on n'attend plus YouTube

let memoire = null; // { chaine, quand, videos, shorts }

function decoder(texte) {
  return texte
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

// lit un flux YouTube (Atom) et rend les vidéos dans la forme que le site connaît déjà
export function lireFlux(xml, court) {
  const sortie = [];
  for (const [, e] of String(xml).matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1]?.trim();
    if (!id || !/^[\w-]{6,20}$/.test(id)) continue;
    const titre = decoder((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
    const publie = (e.match(/<published>([^<]+)<\/published>/) || [])[1] || null;
    const video = {
      id,
      titre,
      lien: court ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
      vignette: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
    if (!court && publie && !Number.isNaN(Date.parse(publie))) video.publie = publie; // « Sortie le … » sous la grande
    sortie.push(video);
  }
  return sortie;
}

async function flux(liste) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${liste}`, {
    signal: AbortSignal.timeout(DELAI),
    headers: { Accept: "application/atom+xml, application/xml;q=0.9, */*;q=0.1" },
  });
  if (r.status === 404) return ""; // liste vide (par exemple aucun Short)
  if (!r.ok) throw new Error(`YouTube a répondu ${r.status}`);
  return r.text();
}

// complète la partie YouTube donnée par le bot ; ne lève jamais d'erreur
export async function completerYoutube(y) {
  try {
    const chaine = (String(y?.lien || "").match(/\/channel\/UC([\w-]{22})(?:[/?#]|$)/) || [])[1];
    if (!chaine) return y;
    const maintenant = Date.now();
    const recente = memoire && memoire.chaine === chaine ? memoire : null;
    if (recente && maintenant - recente.quand < GARDE) return { ...y, videos: recente.videos, shorts: recente.shorts };

    const [v, s] = await Promise.allSettled([flux(`UULF${chaine}`), flux(`UUSH${chaine}`)]);
    const secours = recente && maintenant - recente.quand < SECOURS ? recente : null;
    const videos = v.status === "fulfilled" ? lireFlux(v.value, false).slice(0, NB_VIDEOS) : secours?.videos ?? y.videos ?? [];
    const shorts = s.status === "fulfilled" ? lireFlux(s.value, true).slice(0, NB_SHORTS) : secours?.shorts ?? y.shorts ?? [];
    if (v.status === "fulfilled" && s.status === "fulfilled") memoire = { chaine, quand: maintenant, videos, shorts };
    return { ...y, videos, shorts };
  } catch {
    return y;
  }
}
