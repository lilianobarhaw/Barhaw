// Chopper sur le site.
//   GET  /api/chopper?image=carte                 → sa carte (PNG)
//   GET  /api/chopper?image=anim&type=nourrir     → une de ses animations (GIF) ; aussi jouer, niveau, grandit, defi, deprime, gueri
//   POST /api/chopper  { action: "etat" | "nourrir" | "jouer" | "parler", message }
//        → au nom du membre connecté avec Discord ; le bot vérifie qu'il est sur le serveur Barhaw
//          et applique les mêmes règles que sur Discord (une fois par jour pour nourrir et jouer).
import { json, lireSession, memeSite } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";

const ANIMATIONS = new Set(["nourrir", "jouer", "niveau", "grandit", "defi", "deprime", "gueri"]);
const ACTIONS = new Set(["etat", "nourrir", "jouer", "parler"]);

export async function GET(req) {
  const u = new URL(req.url);
  const image = u.searchParams.get("image");
  let chemin = "";
  if (image === "carte") chemin = "/chopper/carte";
  if (image === "anim" && ANIMATIONS.has(u.searchParams.get("type"))) {
    const q = new URLSearchParams({ type: u.searchParams.get("type") });
    const niveau = Number(u.searchParams.get("niveau"));
    if (Number.isInteger(niveau) && niveau > 0 && niveau < 1000) q.set("niveau", String(niveau));
    const stade = String(u.searchParams.get("stade") || "");
    if (/^[\p{L} ]{1,20}$/u.test(stade)) q.set("stade", stade);
    chemin = "/chopper/anim?" + q;
  }
  if (!chemin) return json({ erreur: "Image inconnue." }, 404);
  try {
    const r = await demanderBot(chemin, { delai: 20000 });
    if (!r.ok) return json({ erreur: "Image indisponible pour l'instant." }, 404, { "Cache-Control": "public, s-maxage=30" });
    return new Response(await r.arrayBuffer(), {
      headers: {
        "Content-Type": image === "carte" ? "image/png" : "image/gif",
        "Cache-Control": image === "carte" ? "public, max-age=0, s-maxage=30, stale-while-revalidate=300" : "public, max-age=86400, s-maxage=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ erreur: "Le bot ne répond pas pour l'instant." }, 503);
  }
}

export async function POST(req) {
  if (!memeSite(req)) return json({ erreur: "Demande refusée." }, 403);
  const session = await lireSession(req);
  if (!session) return json({ erreur: "connexion", texte: "Connecte-toi avec Discord pour jouer avec Chopper." }, 401);
  let d = {};
  try { d = await req.json(); } catch {}
  const action = ACTIONS.has(d?.action) ? d.action : "etat";
  const corps = { id: String(session.id), action };
  if (action === "parler") corps.message = String(d.message || "").slice(0, 300);
  try {
    const r = await demanderBot("/chopper", { methode: "POST", corps, delai: 25000 });
    const reponse = await r.json().catch(() => ({ erreur: "Réponse du bot illisible." }));
    return json(reponse, r.status);
  } catch {
    return json({ erreur: "Chopper dort : le bot ne répond pas pour l'instant. Réessaie dans un moment." }, 503);
  }
}
