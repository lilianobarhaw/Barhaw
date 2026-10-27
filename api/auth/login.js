// Connexion avec Discord : envoie le visiteur sur la page d'autorisation de Discord (seulement son pseudo et son image).
// ?sortir=1 : se déconnecter (l'adresse /api/auth/logout renvoie ici).
import { env, cookie, COOKIE_SESSION } from "../../lib/session.js";

export function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.has("sortir")) {
    const h = new Headers({ Location: env("SITE_URL") + "/#chopper" });
    h.append("Set-Cookie", cookie(COOKIE_SESSION, "", 0));
    return new Response(null, { status: 302, headers: h });
  }
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env("DISCORD_CLIENT_ID"),
    response_type: "code",
    redirect_uri: env("SITE_URL") + "/api/auth/callback",
    scope: "identify",
    state,
    prompt: "none",
  });
  const h = new Headers({ Location: "https://discord.com/oauth2/authorize?" + params });
  h.append("Set-Cookie", cookie("barhaw_state", state, 600));
  return new Response(null, { status: 302, headers: h });
}
