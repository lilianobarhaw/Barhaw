// Retour de Discord : récupère le compte (pseudo et image seulement), ouvre la session, revient sur l'onglet Chopper.
import { API_DISCORD, env, lireCookies, cookie, creerSession, COOKIE_SESSION } from "../../lib/session.js";

function retour(suffixe = "") {
  const h = new Headers({ Location: env("SITE_URL") + "/" + suffixe + "#chopper" });
  h.append("Set-Cookie", cookie("barhaw_state", "", 0));
  return h;
}

export async function GET(req) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const rate = () => new Response(null, { status: 302, headers: retour("?connexion=erreur") });
  if (!code || !state || lireCookies(req).barhaw_state !== state) return rate();

  const jeton = await fetch(API_DISCORD + "/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("DISCORD_CLIENT_ID"),
      client_secret: env("DISCORD_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: env("SITE_URL") + "/api/auth/callback",
    }),
  }).catch(() => null);
  if (!jeton?.ok) return rate();
  const { access_token: acces } = await jeton.json();

  const compte = await fetch(API_DISCORD + "/users/@me", { headers: { Authorization: "Bearer " + acces } }).catch(() => null);
  if (!compte?.ok) return rate();
  const c = await compte.json();

  const s = await creerSession({ id: String(c.id), nom: c.global_name || c.username, avatar: c.avatar || "" });
  const h = retour();
  h.append("Set-Cookie", cookie(COOKIE_SESSION, s.valeur, s.maxAge));
  return new Response(null, { status: 302, headers: h });
}
