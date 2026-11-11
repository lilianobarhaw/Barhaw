// Le récit de GRAND LINE : les pages que l'équipage du membre a débloquées (texte et voix), les autres scellées.
//   GET /api/recit?p=page.preuve,page.preuve
//     → { ferme: true }                                   avant l'ouverture de la VF (le bot ne donne pas encore la flotte)
//     → { connecte, equipage, nom, pages: [ … ] }         une page ouverte : { n, id, genre, titre, texte, son, duree, parole, preuve }
//                                                         une page scellée : { n, genre, ouverte: false }
// Sans connexion ou sans équipage : seulement le départ (Port Barhaw). Le bot dit pour quel navire le membre rame ;
// le serveur compare avec la route de CE navire. Les textes et le nom des fichiers de voix ne quittent le serveur
// que pour les pages ouvertes. « p » : les preuves gardées par le navigateur (pages déjà débloquées lors d'un voyage passé).
import { json, lireSession, env } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";
import { PAGES, debloquees, preuve, preuveValable, lirePreuves, pagePourSite } from "../lib/recit.js";

export async function GET(req) {
  let pub;
  try {
    const r = await demanderBot("/public", { delai: 4000 });
    if (!r.ok) throw new Error(`le bot a répondu ${r.status}`);
    pub = await r.json();
  } catch {
    return json({ erreur: "escale", texte: "⚓ Le navire fait escale au port : le récit revient dans un moment." }, 503);
  }
  const commus = Array.isArray(pub?.flotte?.commus) ? pub.flotte.commus : null;
  if (!commus) return json({ ferme: true });

  const session = await lireSession(req);
  let equipage = null;
  if (session) {
    try {
      const r = await demanderBot("/chopper", { methode: "POST", corps: { id: String(session.id), action: "flotte" }, delai: 8000 });
      const d = await r.json();
      if (typeof d?.flotte?.equipage === "string") equipage = d.flotte.equipage;
    } catch {
      return json({ erreur: "escale", texte: "⚓ Le navire fait escale au port : le récit revient dans un moment." }, 503);
    }
  }
  const commu = equipage ? commus.find((c) => c?.id === equipage) : null;
  const ouvertes = commu ? debloquees(commu.navire, pub.bosslive) : new Set(["port"]);

  // les pages déjà débloquées par ce membre lors d'un voyage passé restent ouvertes
  let secret = "";
  let preuves = new Map();
  if (session && commu) {
    try { secret = env("SESSION_SECRET"); } catch {}
    preuves = lirePreuves(new URL(req.url).searchParams.get("p"));
  }
  const pages = PAGES.map((p) => {
    const ouverte = ouvertes.has(p.id) || (Boolean(secret) && preuves.has(p.id) && preuveValable(secret, session.id, p.id, preuves.get(p.id)));
    return pagePourSite(p, ouverte, ouverte && secret && p.id !== "port" ? preuve(secret, session.id, p.id) : "");
  });
  return json({ connecte: Boolean(session), equipage: commu ? commu.id : null, nom: commu ? String(commu.nom || "") : "", pages });
}
