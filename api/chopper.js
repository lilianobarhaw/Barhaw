// Chopper sur le site.
//   GET  /api/chopper?image=carte                 → sa carte (PNG)
//   GET  /api/chopper?image=anim&type=nourrir     → une de ses animations (GIF) ; aussi jouer, niveau, grandit, defi, deprime, gueri
//   GET  /api/chopper?image=wanted&cle=…          → l'affiche WANTED d'un chasseur (PNG), par la clé publique de son avis de recherche
//   POST /api/chopper  { action: "etat" | "nourrir" | "jouer" | "parler" | "jeu-debut" | "jeu-fin", message, partie, score }
//        → au nom du membre connecté avec Discord ; le bot vérifie qu'il est sur le serveur Barhaw
//          et applique les mêmes règles que sur Discord (une fois par jour pour nourrir et jouer).
//          Le goûter de Chopper : jeu-debut ouvre une partie chez le bot, jeu-fin rend le score (vérifié par le bot).
//   POST /api/chopper  { action: "cartes" | "carte-tirer" } → l'album du membre, ou sa carte du jour (tirée par le bot)
//   POST /api/chopper  { action: "jeux" | "jeu-ouvrir" | "rumble-fin" | "quiz-repondre" | "docteur-fin" | "memory-fin" | "course-fin", jeu, niveau, partie, … }
//        → les jeux du site (la Rumble Ball, le quiz One Piece, Docteur Chopper, le Memory, la course), vérifiés et corrigés par le bot
//   POST /api/chopper  { action: "chasse" | "prime-activer" | "prime-retirer" | "boss-attaquer" }
//        → la chasse : son avis de recherche WANTED (créer, retirer) et l'attaque du jour contre le boss de la semaine
//   POST /api/chopper  { action: "faille" | "faille-lier" | "faille-verifier" | "faille-retirer", riotId }
//        → La Faille des potes : relier son compte LoL (Riot ID puis icône de profil), le retirer, voir ses games notées
//   POST /api/chopper  { action: "grandline" | "grandline-voter" | "grandline-bouteille", choix }
//        → GRAND LINE : ce que le membre a ramé, son vote au carrefour (choix : l'île), ouvrir la bouteille à la mer
//   POST /api/chopper  { action: "fideles" | "fideles-code" | "fideles-retirer" }
//        → les fidèles du stream : son temps sur le live, un code pour relier son Twitch (« !lier CODE » dans le chat), tout retirer
import { json, lireSession, memeSite } from "../lib/session.js";
import { demanderBot } from "../lib/bot.js";

const ANIMATIONS = new Set(["nourrir", "jouer", "niveau", "grandit", "defi", "deprime", "gueri"]);
const ACTIONS = new Set(["etat", "nourrir", "jouer", "parler", "jeu-debut", "jeu-fin", "cartes", "carte-tirer", "jeux", "jeu-ouvrir", "rumble-fin", "quiz-repondre", "docteur-fin", "memory-fin", "course-fin", "chasse", "prime-activer", "prime-retirer", "boss-attaquer", "faille", "faille-lier", "faille-verifier", "faille-retirer", "grandline", "grandline-voter", "grandline-bouteille", "fideles", "fideles-code", "fideles-retirer", "boss-live", "boss-live-frapper"]);
const JEUX = new Set(["rumble", "quiz", "docteur", "memory", "course"]);
const NIVEAUX = new Set(["facile", "moyen", "difficile"]);
const entier = (v, min, max) => (Number.isInteger(v) && v >= min && v <= max ? v : -1);

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
  const cle = String(u.searchParams.get("cle") || "");
  if (image === "wanted" && /^[0-9a-f]{12}$/.test(cle)) chemin = "/wanted?cle=" + cle;
  if (!chemin) return json({ erreur: "Image inconnue." }, 404);
  try {
    const r = await demanderBot(chemin, { delai: 20000 });
    if (!r.ok) return json({ erreur: "Image indisponible pour l'instant." }, 404, { "Cache-Control": "public, s-maxage=30" });
    return new Response(await r.arrayBuffer(), {
      headers: {
        "Content-Type": image === "anim" ? "image/gif" : "image/png",
        "Cache-Control": image === "carte" ? "public, max-age=0, s-maxage=30, stale-while-revalidate=300"
          : image === "wanted" ? "public, max-age=60, s-maxage=120"
          : "public, max-age=86400, s-maxage=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ erreur: "escale", texte: "⚓ Le navire fait escale au port pour prendre des provisions (le bot fait une pause). Il revient vite !" }, 503);
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
  if (action === "jeu-fin") {
    corps.partie = /^[0-9a-f]{24}$/.test(String(d.partie || "")) ? String(d.partie) : "";
    corps.score = Number.isInteger(d.score) ? d.score : -1;
  }
  if (action === "jeu-ouvrir") {
    corps.jeu = JEUX.has(d.jeu) ? d.jeu : "rumble";
    if (corps.jeu === "quiz") corps.niveau = NIVEAUX.has(d.niveau) ? d.niveau : "moyen";
  }
  if (["rumble-fin", "quiz-repondre", "docteur-fin", "memory-fin", "course-fin"].includes(action)) corps.partie = /^[0-9a-f]{24}$/.test(String(d.partie || "")) ? String(d.partie) : "";
  if (action === "docteur-fin") {
    corps.soignes = entier(d.soignes, 0, 500);
    corps.score = entier(d.score, 0, 10000);
  }
  if (action === "memory-fin") corps.coups = entier(d.coups, 0, 500);
  if (action === "course-fin") corps.distance = entier(d.distance, 0, 1_000_000);
  if (action === "rumble-fin") {
    corps.transformations = entier(d.transformations, 0, 7);
    corps.score = entier(d.score, 0, 1000);
  }
  if (action === "grandline-voter") corps.choix = /^[a-z]{2,20}$/.test(String(d.choix || "")) ? String(d.choix) : "";
  if (action === "faille-lier") corps.riotId = String(d.riotId || "").replace(/[\u0000-\u001f]/g, "").slice(0, 40);
  if (action === "quiz-repondre") corps.choix = d.choix === null ? null : entier(d.choix, 0, 3);
  try {
    const r = await demanderBot("/chopper", { methode: "POST", corps, delai: 25000 });
    const reponse = await r.json().catch(() => ({ erreur: "Réponse du bot illisible." }));
    return json(reponse, r.status);
  } catch {
    // le bot est en pause (maintenance, redémarrage) : la page passe en « escale »
    return json({ erreur: "escale", texte: "⚓ Le navire fait escale au port pour prendre des provisions (le bot fait une pause). Il revient vite : réessaie dans quelques minutes !" }, 503);
  }
}
