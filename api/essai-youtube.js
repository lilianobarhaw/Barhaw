// ESSAI TEMPORAIRE (branche jetable, jamais fusionnée) : vérifie que les serveurs de Vercel lisent bien les listes YouTube.
import { json } from "../lib/session.js";
import { completerYoutube } from "../lib/youtube.js";

export async function GET() {
  const t = Date.now();
  const y = await completerYoutube({ lien: "https://www.youtube.com/channel/UCJuIlseoBE7j4lCKkBoeFMg", videos: [], shorts: [] });
  return json({ ms: Date.now() - t, videos: y.videos.map((v) => v.titre), shorts: y.shorts.map((v) => v.titre) });
}
