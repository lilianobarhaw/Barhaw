// Outils partagés : variables d'environnement, réponses JSON, cookies et session signée (connexion Discord).
// La session tient dans un cookie HttpOnly signé avec SESSION_SECRET : { id, nom, avatar, exp }, valable 30 jours.

export const API_DISCORD = "https://discord.com/api/v10";
export const COOKIE_SESSION = "barhaw_session";
const DUREE_SESSION = 30 * 86400; // secondes

export function env(nom) {
  // trim() : un espace copié-collé avant ou après la valeur casse tout
  const v = (process.env[nom] || "").trim();
  if (!v) throw new Error("Variable d'environnement manquante : " + nom);
  return v;
}

export function json(corps, statut = 200, entetes) {
  const h = new Headers(entetes);
  h.set("Content-Type", "application/json; charset=utf-8");
  if (!h.has("Cache-Control")) h.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(corps), { status: statut, headers: h });
}

export function lireCookies(req) {
  const out = {};
  (req.headers.get("cookie") || "").split(";").forEach((morceau) => {
    const i = morceau.indexOf("=");
    if (i > 0) {
      try { out[morceau.slice(0, i).trim()] = decodeURIComponent(morceau.slice(i + 1).trim()); } catch {}
    }
  });
  return out;
}

export function cookie(nom, valeur, maxAge) {
  return `${nom}=${encodeURIComponent(valeur)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

const enc = new TextEncoder();
async function signer(donnees) {
  const cle = await crypto.subtle.importKey("raw", enc.encode(env("SESSION_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return Buffer.from(await crypto.subtle.sign("HMAC", cle, enc.encode(donnees))).toString("base64url");
}
function egal(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function creerSession(compte) {
  const charge = Buffer.from(JSON.stringify({ ...compte, exp: Date.now() + DUREE_SESSION * 1000 })).toString("base64url");
  return { valeur: charge + "." + (await signer(charge)), maxAge: DUREE_SESSION };
}

export async function lireSession(req) {
  const brut = lireCookies(req)[COOKIE_SESSION];
  if (!brut) return null;
  const [charge, sig] = brut.split(".");
  if (!charge || !sig) return null;
  try {
    if (!egal(await signer(charge), sig)) return null;
    const c = JSON.parse(Buffer.from(charge, "base64url").toString());
    return c.exp > Date.now() && /^\d{5,25}$/.test(String(c.id)) ? c : null;
  } catch {
    return null;
  }
}

// l'image de profil Discord (ou l'image par défaut de Discord)
export function avatarDiscord(id, avatar) {
  if (avatar && /^(a_)?[0-9a-f]{32}$/.test(avatar)) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=64`;
  try { return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id) >> 22n) % 6n)}.png`; } catch { return "https://cdn.discordapp.com/embed/avatars/0.png"; }
}

// une demande POST qui vient bien de ce site (et pas d'une autre page qui essaierait d'agir à ta place)
export function memeSite(req) {
  const origine = req.headers.get("origin");
  if (!origine) return true; // les navigateurs l'envoient toujours en POST ; SameSite=Lax protège déjà le cookie
  try { return origine === new URL(env("SITE_URL")).origin; } catch { return false; }
}
