// Ce que la page affiche : ta chaîne, la rediff, tes potes, YouTube, le Discord, les événements et Chopper.
// Le bot le calcule (lib/site.js du bot) ; Vercel garde la réponse 20 s pour que le bot ne soit pas interrogé à chaque visite.
// Si le bot ne répond pas, la page affiche les événements prévus et dit que le reste revient bientôt.
import { json } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";

export async function GET() {
  try {
    const r = await demanderBot("/public", { delai: 3000 }); // au bout de 3 s sans réponse : le site passe en escale
    if (!r.ok) throw new Error(`le bot a répondu ${r.status}`);
    const d = await r.json();
    return json(d, 200, { "Cache-Control": "public, max-age=0, s-maxage=20, stale-while-revalidate=600" });
  } catch {
    return json({ horsLigne: true }, 200, { "Cache-Control": "public, max-age=0, s-maxage=10" });
  }
}
