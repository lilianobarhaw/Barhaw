// Qui est connecté : { connecte: false } ou { connecte: true, nom, avatar }.
import { json, lireSession, avatarDiscord } from "../lib/session.js";

export async function GET(req) {
  const s = await lireSession(req);
  if (!s) return json({ connecte: false });
  return json({ connecte: true, nom: s.nom, avatar: avatarDiscord(s.id, s.avatar) });
}
