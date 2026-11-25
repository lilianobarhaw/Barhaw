// Le site secret de la VF 1.0, « La Rature » (le contenu est dans lib/rature.js, jamais dans le code du site) :
//   GET  /api/rature?marque=1|2|3|4
//        → { marque, chiffre, symbole, note }       une des 4 marques semées dans GRAND LINE
//        → { erreur: "pas-maintenant", texte }       la marque du navire noir ne se montre que la nuit, la IV qu'à 3 h
//   POST /api/rature  { code: [4 symboles] }
//        → { ok: false }                             (après une petite attente : le cadenas résiste)
//        → { ok: true, journal, ratures, murmures, mots }   le journal du Dernier Mot et ce que Rature fait au site
//        → { erreur: "trop", texte }                 trop de mauvais codes d'un coup
// Avant l'ouverture de la VF, tout répond { ferme: true } (le bot peut avancer ou reculer l'ouverture : /public → v4.ouvert ;
// s'il ne répond pas, c'est la date qui compte).
import { json, lireSession, memeSite } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";
import { OUVERTURE, lireCode, bonCode, marquePourSite, contenuOuvert } from "../lib/rature.js";

async function vfOuverte() {
  try {
    const r = await demanderBot("/public", { delai: 3500 });
    if (r.ok) {
      const o = (await r.json())?.v4?.ouvert;
      if (o === true || o === false) return o;
    }
  } catch {}
  return Date.now() >= OUVERTURE;
}

// un garde-fou contre ceux qui essaient tous les codes : 20 mauvais codes par adresse et par 10 minutes (par instance) ;
// le bon code ne compte pas (le site le renvoie à chaque visite tant que Rature est là)
const RATES = new Map();
const adresse = (req) => String(req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "?").split(",")[0].trim().slice(0, 64);
const recents = (ip, t) => (RATES.get(ip) || []).filter((x) => t - x < 10 * 60_000);
function bloque(req, t = Date.now()) { return recents(adresse(req), t).length >= 20; }
function rate(req, t = Date.now()) {
  const ip = adresse(req);
  if (RATES.size > 5000) RATES.clear();
  RATES.set(ip, [...recents(ip, t), t]);
}

export async function GET(req) {
  const n = Number.parseInt(new URL(req.url).searchParams.get("marque") || "", 10);
  if (!(n >= 1 && n <= 4)) return json({ erreur: "marque", texte: "Rien ici." }, 400);
  if (!(await vfOuverte())) return json({ ferme: true });
  return json(marquePourSite(n));
}

export async function POST(req) {
  if (!memeSite(req)) return json({ erreur: "Demande refusée." }, 403);
  let d = {};
  try { d = await req.json(); } catch {}
  const code = lireCode(d?.code);
  if (!code) return json({ erreur: "code", texte: "Il faut quatre symboles." }, 400);
  if (!(await vfOuverte())) return json({ ferme: true });
  if (bloque(req)) return json({ erreur: "trop", texte: "Doucement. Le cadenas est rouillé : reviens dans un moment." }, 429);
  if (!bonCode(code)) {
    rate(req);
    await new Promise((r) => setTimeout(r, 700));
    return json({ ok: false });
  }
  const session = await lireSession(req);
  return json({ ok: true, ...contenuOuvert(session?.nom || "") });
}
