// Connexion avec Discord : envoie le visiteur sur la page d'autorisation de Discord (seulement son pseudo et son image).
// ?sortir=1 : se déconnecter (l'adresse /api/auth/logout renvoie ici).
// ?valorant=1&accord=1 : relier son compte VALORANT (page /valorant), après avoir coché l'accord. Discord demande en plus
//   de voir les « comptes connectés » du membre, une seule fois : le serveur du site y lit le compte Riot vérifié,
//   l'envoie au bot, et oublie l'accès Discord tout de suite (voir callback.js). Le Riot ID ne passe jamais par la page.
import { env, cookie, COOKIE_SESSION } from "../../lib/session.js";

export function GET(req) {
  const u = new URL(req.url);
  if (u.searchParams.has("sortir")) {
    const h = new Headers({ Location: env("SITE_URL") + "/#chopper" });
    h.append("Set-Cookie", cookie(COOKIE_SESSION, "", 0));
    return new Response(null, { status: 302, headers: h });
  }
  const valorant = u.searchParams.get("valorant") === "1";
  // pas d'accord coché : on ne va pas plus loin
  if (valorant && u.searchParams.get("accord") !== "1") return new Response(null, { status: 302, headers: { Location: env("SITE_URL") + "/valorant?liaison=accord" } });
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env("DISCORD_CLIENT_ID"),
    response_type: "code",
    redirect_uri: env("SITE_URL") + "/api/auth/callback",
    scope: valorant ? "identify connections" : "identify",
    state,
    prompt: valorant ? "consent" : "none",
  });
  const h = new Headers({ Location: "https://discord.com/oauth2/authorize?" + params });
  h.append("Set-Cookie", cookie("barhaw_state", state, 600));
  h.append("Set-Cookie", cookie("barhaw_flux", valorant ? "valorant" : "", valorant ? 600 : 0));
  return new Response(null, { status: 302, headers: h });
}
