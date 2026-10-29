// BOSS LIVE : l'état du combat contre MORGHAST (PV, chrono, frappeurs). Pendant le combat, le site le redemande toutes les 2-3 s ;
// Vercel garde la réponse 2 s pour que le bot ne soit pas interrogé par chaque visiteur.
// Si le bot ne répond pas, le site affiche que le bateau fait une pause au port.
import { json } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";

export async function GET() {
  try {
    const r = await demanderBot("/bosslive", { delai: 3000 });
    if (!r.ok) throw new Error(`le bot a répondu ${r.status}`);
    const d = await r.json();
    return json(d, 200, { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=10" });
  } catch {
    return json({ horsLigne: true }, 200, { "Cache-Control": "public, max-age=0, s-maxage=5" });
  }
}
