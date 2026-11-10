// Retour de Discord : récupère le compte (pseudo et image seulement), ouvre la session, revient sur l'onglet Chopper.
// Pour Valorant des potes (cookie barhaw_flux = valorant, voir login.js) : lit en plus les comptes connectés du membre,
// prend son compte Riot Games VÉRIFIÉ par Discord, l'envoie au bot (signé avec BOT_CLE), rend l'accès à Discord tout
// de suite (rien n'est gardé), et revient sur /valorant avec le résultat (?liaison=ok, pas-riot, pris…).
import { API_DISCORD, env, lireCookies, cookie, creerSession, COOKIE_SESSION } from "../../lib/session.js";
import { demanderBot } from "../../lib/bot.js";

function retour(suffixe = "", ancre = "#chopper") {
  const h = new Headers({ Location: env("SITE_URL") + "/" + suffixe + ancre, "Cache-Control": "no-store" });
  h.append("Set-Cookie", cookie("barhaw_state", "", 0));
  h.append("Set-Cookie", cookie("barhaw_flux", "", 0));
  h.append("Set-Cookie", cookie("barhaw_retour", "", 0));
  return h;
}
// le résultat de la liaison ; pour « pas-riot », le pseudo du compte Discord utilisé et les sortes de connexions que Discord
// a montrées (jamais leurs noms) : le membre voit tout de suite si c'est le bon compte et ce qui manque
function retourValorant(code, { compte = "", vus = null } = {}) {
  const q = new URLSearchParams({ liaison: /^[a-z-]{2,20}$/.test(code) ? code : "erreur" });
  if (compte) q.set("compte", compte.replace(/[\u0000-\u001f]/g, "").slice(0, 40));
  if (vus) q.set("vus", vus.filter((t) => /^[a-z0-9-]{2,24}$/.test(t)).slice(0, 30).join(",") || "aucune");
  return retour(`valorant?${q}`, "#va-moi");
}

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
  const { access_token: acces, scope = "" } = await jeton.json();

  const compte = await fetch(API_DISCORD + "/users/@me", { headers: { Authorization: "Bearer " + acces } }).catch(() => null);
  if (!compte?.ok) return rate();
  const c = await compte.json();

  const s = await creerSession({ id: String(c.id), nom: c.global_name || c.username, avatar: c.avatar || "" });
  let h;
  if (valorant) {
    const r = await lierValorant(String(c.id), acces, String(scope), c.username || "");
    h = retourValorant(r.code, r.code === "pas-riot" ? { compte: c.global_name || c.username || "", vus: r.vus } : {});
  }
  else h = cookies.barhaw_retour === "valorant" ? retour("valorant", "#va-moi") : retour();
  h.append("Set-Cookie", cookie(COOKIE_SESSION, s.valeur, s.maxAge));
  return new Response(null, { status: 302, headers: h });
}

// le compte Riot connecté au Discord du membre → le bot ; l'accès Discord est rendu juste après, quoi qu'il arrive
// La connexion « Riot Games » ne s'ajoute dans Discord qu'en se connectant chez Riot : elle prouve le compte, même quand
// Discord ne la marque pas « verified ». Les anciennes connexions « League of Legends » sont prises si elles ont un Riot ID.
function choisirRiot(liste) {
  const ok = (x) => x && typeof x === "object" && x.revoked !== true && typeof x.name === "string" && x.name.trim();
  const riot = liste.filter((x) => ok(x) && x.type === "riotgames");
  const lol = liste.filter((x) => ok(x) && x.type === "leagueoflegends" && x.name.includes("#"));
  return [...riot.filter((x) => x.verified === true), ...riot, ...lol][0] || null;
}
// Une ligne de journal Vercel par liaison, pour comprendre un échec. Jamais de jeton : seulement le pseudo Discord du
// compte qui a autorisé, les droits que Discord a donnés (scope), le code HTTP, et pour chaque connexion sa sorte et son
// état (visible sur le profil ou non, vérifiée, révoquée, liée dans les deux sens). Jamais le nom ni l'identifiant d'une
// connexion. Vercel garde ces lignes une heure.
function journal({ pseudo, scope, http, liste, resultat }) {
  const etat = (x) => `${String(x?.type || "?")}[${x?.visibility === 1 ? "visible" : x?.visibility === 0 ? "cachée" : "visibilité ?"}${x?.verified === true ? ",vérifiée" : x?.verified === false ? ",non vérifiée" : ""}${x?.revoked ? ",révoquée" : ""}${x?.two_way_link ? ",liée" : ""}]`;
  const l = http === "–" ? "connexions non demandées" : Array.isArray(liste) ? (liste.length ? `${liste.length} connexion${liste.length > 1 ? "s" : ""} : ${liste.map(etat).join(", ")}` : "aucune connexion") : "liste illisible";
  console.log(`[valorant] liaison · compte Discord « ${pseudo} » · scope « ${scope} » · HTTP ${http} · ${l} · résultat ${resultat}`);
}
async function lierValorant(id, acces, scope, pseudo) {
  let resultat = "erreur";
  let http = "–";
  let liste = null;
  try {
    // Discord n'a pas donné l'accès aux comptes connectés (autorisation refusée ou incomplète)
    if (!scope.split(" ").includes("connections")) return { code: (resultat = "pas-acces") };
    const r = await fetch(API_DISCORD + "/users/@me/connections", { headers: { Authorization: "Bearer " + acces }, cache: "no-store" }).catch(() => null);
    http = r ? String(r.status) : "pas de réponse";
    const brut = r?.ok ? await r.json().catch(() => undefined) : undefined;
    liste = brut === null ? [] : brut; // Discord répond « null » quand il n'y a aucune connexion
    if (!Array.isArray(liste)) return { code: (resultat = "erreur") };
    const riot = choisirRiot(liste);
    // Discord n'a pas montré de compte Riot : on le dit clairement, avec ce qu'il a montré
    if (!riot) return { code: (resultat = "pas-riot"), vus: liste.map((x) => String(x?.type || "")) };
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
    return { code: resultat };
  } finally {
    journal({ pseudo, scope, http, liste, resultat });
    // rien n'est gardé côté Discord : l'accès (pseudo + comptes connectés) est rendu tout de suite
    await fetch(API_DISCORD + "/oauth2/token/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: acces, token_type_hint: "access_token", client_id: env("DISCORD_CLIENT_ID"), client_secret: env("DISCORD_CLIENT_SECRET") }),
    }).catch(() => null);
  }
}
