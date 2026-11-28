// La Battle Royale de GRAND LINE : l'île en direct (les pirates, le round, le duel), la prochaine battle, le dernier survivant.
//   GET /api/battle            → l'île (en direct pendant une battle)
//   GET /api/battle?rediff=1   → le film de la dernière battle, pour la rejouer sur l'île (aucun identifiant Discord)
// Pendant une battle, le site la redemande toutes les 3 s ; Vercel garde la réponse 2 s pour que le bot ne soit pas
// interrogé par chaque visiteur. Si le bot ne répond pas, le site le dit.
import { json } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";

export async function GET(req) {
  // la rediff : le film de la dernière battle (il ne change qu'à la battle suivante : gardé longtemps)
  if (new URL(req.url).searchParams.get("rediff")) {
    try {
      const r = await demanderBot("/battle/rediff", { delai: 6000 });
      if (!r.ok) throw new Error(`le bot a répondu ${r.status}`);
      return json(await r.json(), 200, { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=3600" });
    } catch {
      return json({ absent: true }, 200, { "Cache-Control": "public, max-age=0, s-maxage=20" });
    }
  }
  try {
    const r = await demanderBot("/battle", { delai: 3000 });
    if (!r.ok) throw new Error(`le bot a répondu ${r.status}`);
    const d = await r.json();
    const direct = Boolean(d?.direct);
    return json(d, 200, { "Cache-Control": direct ? "public, max-age=0, s-maxage=2, stale-while-revalidate=10" : "public, max-age=0, s-maxage=30, stale-while-revalidate=300" });
  } catch {
    return json({ horsLigne: true }, 200, { "Cache-Control": "public, max-age=0, s-maxage=5" });
  }
}
