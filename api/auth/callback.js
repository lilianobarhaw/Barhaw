// Retour de Discord : récupère le compte (pseudo et image seulement), ouvre la session, revient sur l'onglet Chopper.
// Pour Valorant des potes (cookie barhaw_flux = valorant, voir login.js) : lit en plus les comptes connectés du membre,
// prend son compte Riot Games VÉRIFIÉ par Discord, l'envoie au bot (signé avec BOT_CLE), rend l'accès à Discord tout
// de suite (rien n'est gardé), et revient sur /valorant avec le résultat (?liaison=ok, pas-riot, pris…).
import { API_DISCORD, env, lireCookies, cookie, creerSession, COOKIE_SESSION } from "../../lib/session.js";
import { demanderBot } from "../../lib/bot.js";

function retour(suffixe = "", ancre = "#chopper") {
  const h = new Headers({ Location: env("SITE_URL") + "/" + suffixe + ancre });
  h.append("Set-Cookie", cookie("barhaw_state", "", 0));
  h.append("Set-Cookie", cookie("barhaw_flux", "", 0));
  return h;
}
const retourValorant = (code) => retour(`valorant?liaison=${/^[a-z-]{2,20}$/.test(code) ? code : "erreur"}`, "#va-moi");

export async function GET(req) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const cookies = lireCookies(req);
  const valorant = cookies.barhaw_flux === "valorant";
  const rate = () => new Response(null, { status: 302, headers: valorant ? retourValorant(code ? "erreur" : "annule") : retour("?connexion=erreur") });
  if (!code || !state || cookies.barhaw_state !== state) return rate();

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
  let h;
  if (valorant) h = retourValorant(await lierValorant(String(c.id), acces));
  else h = retour();
  h.append("Set-Cookie", cookie(COOKIE_SESSION, s.valeur, s.maxAge));
  return new Response(null, { status: 302, headers: h });
}

// le compte Riot connecté au Discord du membre → le bot ; l'accès Discord est rendu juste après, quoi qu'il arrive
async function lierValorant(id, acces) {
  let resultat = "erreur";
  try {
    const r = await fetch(API_DISCORD + "/users/@me/connections", { headers: { Authorization: "Bearer " + acces } }).catch(() => null);
    const liste = r?.ok ? await r.json().catch(() => null) : null;
    if (!Array.isArray(liste)) return "erreur";
    const riot = liste.find((x) => x?.type === "riotgames" && x.verified === true && x.revoked !== true);
    if (!riot) return "pas-riot";
    try {
      const b = await demanderBot("/chopper", {
        methode: "POST",
        corps: {
          id, action: "valorant-lier",
          riotId: String(riot.name || "").replace(/[\u0000-\u001f]/g, "").slice(0, 40),
          puuid: /^[0-9a-f-]{36}$/i.test(String(riot.id || "")) ? String(riot.id) : "",
        },
        delai: 20000,
      });
      const d = await b.json().catch(() => ({}));
      resultat = d.ok ? "ok" : String(d.erreur || "erreur");
    } catch {
      resultat = "escale"; // le bot fait une pause
    }
    return resultat;
  } finally {
    // rien n'est gardé côté Discord : l'accès (pseudo + comptes connectés) est rendu tout de suite
    await fetch(API_DISCORD + "/oauth2/token/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: acces, token_type_hint: "access_token", client_id: env("DISCORD_CLIENT_ID"), client_secret: env("DISCORD_CLIENT_SECRET") }),
    }).catch(() => null);
  }
}
