// Le récit de GRAND LINE : quelles pages un équipage a débloquées, et la preuve qu'un membre en garde.
//
// La règle : chacun n'entend que ce que SON navire a vécu. Une page d'île s'ouvre quand son équipage atteint l'île ;
// une page « en mer » quand il passe l'endroit de la route où elle se raconte ; une page d'événement quand
// l'événement lui arrive. Si un autre équipage découvre une île que le sien n'a pas vue, sa page reste scellée.
//
// Le navire repart de zéro à chaque voyage : pour qu'une page entendue ne se referme pas, le serveur signe une
// « preuve » (le membre + la page) que le navigateur garde et représente ensuite. Elle ne vaut que pour ce membre.

import { createHmac, timingSafeEqual } from "node:crypto";
import { PAGES } from "./recit-pages.js";

export { PAGES };

// les pages « en mer » : elles s'ouvrent une fois l'une de ces îles atteinte (l'endroit de la route où elles se racontent)
const EN_MER = {
  carrefour: ["moussaillons"],
  navire: ["braise", "givre"],
  miroute: ["engloutie", "vents", "cimetiere"],
};

// navire : ce que le bot publie pour un équipage (route, milles, étape, événement, journal) ; boss : l'état de BOSS LIVE
export function debloquees(navire, boss) {
  const ouvertes = new Set(["port"]);
  if (!navire || !Array.isArray(navire.route)) return ouvertes;
  const atteintes = new Set(navire.route.flat().filter((i) => i?.etat === "atteinte").map((i) => String(i.id)));
  for (const p of PAGES) if (p.genre === "ile" && atteintes.has(p.ile)) ouvertes.add(p.id);
  // le navire a quitté le port : il a ramé au moins un mille, ou il a déjà touché terre
  if (Number(navire.milles) > 0 || Number(navire.etape) > 0 || atteintes.size > 1) ouvertes.add("depart");
  for (const [id, iles] of Object.entries(EN_MER)) if (iles.some((i) => atteintes.has(i))) ouvertes.add(id);
  // le vaisseau fantôme : il suit le navire en ce moment, ou le journal de bord s'en souvient
  const journal = Array.isArray(navire.journal) ? navire.journal : [];
  if (navire.evenement?.type === "fantome" || journal.some((l) => /fant[oô]me/i.test(String(l?.texte || "")))) ouvertes.add("fantome");
  // un Fléau renvoyé : un BOSS LIVE gagné (le combat en cours, ou l'un des derniers)
  const combats = [boss?.combat, ...(Array.isArray(boss?.historique) ? boss.historique : [])].filter(Boolean);
  if (combats.some((c) => c.gagne === true)) ouvertes.add("fleau");
  return ouvertes;
}

// ---------- les preuves : « ce membre a déjà débloqué cette page » ----------
const signer = (secret, membre, page) => createHmac("sha256", secret).update(`recit.${membre}.${page}`).digest("base64url").slice(0, 22);

export function preuve(secret, membre, page) {
  return signer(secret, String(membre), String(page));
}

export function preuveValable(secret, membre, page, donnee) {
  const attendue = Buffer.from(signer(secret, String(membre), String(page)));
  const recue = Buffer.from(String(donnee || ""));
  return recue.length === attendue.length && timingSafeEqual(recue, attendue);
}

// les preuves envoyées par le navigateur : « page.preuve,page.preuve » (au plus une par page)
export function lirePreuves(texte) {
  const m = new Map();
  for (const morceau of String(texte || "").split(",").slice(0, PAGES.length)) {
    const [page, p] = morceau.split(".");
    if (/^[a-z]{2,20}$/.test(page || "") && /^[A-Za-z0-9_-]{22}$/.test(p || "")) m.set(page, p);
  }
  return m;
}

// ce qu'on envoie pour une page : tout si elle est ouverte, presque rien si elle est scellée (pas même son titre)
export function pagePourSite(p, ouverte, laPreuve) {
  if (!ouverte) return { n: p.n, genre: p.genre, ouverte: false };
  return {
    n: p.n, id: p.id, genre: p.genre, ouverte: true, titre: p.titre, texte: p.texte,
    ...(p.ile ? { ile: p.ile } : {}),
    ...(p.son ? { son: `/son/recit/${p.son}.mp3`, duree: p.duree, parole: p.parole } : {}),
    ...(laPreuve ? { preuve: laPreuve } : {}),
  };
}
