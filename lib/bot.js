// Les demandes au bot Barhaw (sur le VPS, adresse BOT_URL). Les demandes qui agissent (jouer avec Chopper) sont signées
// avec BOT_CLE (la même clé que SITE_CLE dans reglages.env du bot) et l'heure : la clé elle-même ne circule jamais.

import { createHmac } from "node:crypto";
import { env } from "./session.js";

export function signature(cle, date, methode, chemin, corps) {
  return createHmac("sha256", cle).update(`${date}.${methode}.${chemin}.${corps}`).digest("hex");
}

export async function demanderBot(chemin, { methode = "GET", corps = null, delai = 8000 } = {}) {
  const base = env("BOT_URL").replace(/\/+$/, "");
  const entetes = {};
  let body;
  if (corps !== null) {
    body = JSON.stringify(corps);
    const date = Date.now();
    entetes["Content-Type"] = "application/json";
    entetes["X-Barhaw-Date"] = String(date);
    // le bot signe le chemin sans les paramètres (?…)
    entetes["X-Barhaw-Signature"] = signature(env("BOT_CLE"), date, methode, chemin.split("?")[0], body);
  }
  return fetch(base + chemin, { method: methode, headers: entetes, body, signal: AbortSignal.timeout(delai) });
}
