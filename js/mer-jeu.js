// LA MER EN DIRECT, côté site : la connexion au bot, la mer d'entraînement (sans réseau, contre des barques d'essai),
// et le suivi de la mer à l'écran. Les autres barques sont montrées un peu en retard (0,12 s) pour être fluides ;
// la sienne bouge tout de suite (le même moteur que le bot : js/mer-moteur.js), puis se recale doucement sur le bot.
// Le site comme OBS s'en servent ; ce fichier ne touche pas à la page.
import { MER, parcours, nouvelleBarque, placer, piloter, chocs, avancer, classement, pilote, decoder, placeCoffre, angle, PARCOURS } from "./mer-moteur.js";

export { MER, parcours, classement, PARCOURS };
const DELAI = 120; // ms de retard pour les autres barques
const PAS = MER.pas * 1000;

// ---------- la connexion au bot (WebSocket) ----------
// surMessage reçoit les messages du bot ; les instantanés arrivent décodés : { k: "s", tick, phase, coffre, barques, recu }
export function connecter({ adresse, salle, ticket = "", surMessage = () => {}, surEtat = () => {} }) {
  let ws = null;
  let ferme = false;
  let ping = null;
  const source = { etat: "connexion", rtt: 150 };
  try { ws = new WebSocket(adresse); } catch { setTimeout(() => surEtat("ferme", 0), 0); return { ...source, envoyer() {}, fermer() {} }; }
  ws.binaryType = "arraybuffer";
  ws.addEventListener("open", () => {
    source.etat = "ouvert";
    ws.send(JSON.stringify({ k: "bonjour", v: MER.version, salle, ...(ticket ? { ticket } : {}) }));
    ping = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ k: "p", c: performance.now() })); }, 2000);
    surEtat("ouvert");
  });
  ws.addEventListener("message", (e) => {
    if (typeof e.data === "string") {
      let m = null;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m?.k === "p") { const x = performance.now() - Number(m.c); if (x > 0 && x < 5000) source.rtt = source.rtt * 0.7 + x * 0.3; return; }
      if (m) surMessage(m);
      return;
    }
    const s = decoder(new DataView(e.data));
    if (s) surMessage({ k: "s", ...s, recu: performance.now() });
  });
  ws.addEventListener("close", (e) => {
    clearInterval(ping);
    source.etat = "ferme";
    if (!ferme) surEtat("ferme", e.code);
  });
  ws.addEventListener("error", () => {});
  let derniere = "";
  return Object.assign(source, {
    envoyer(entree) {
      if (ws.readyState !== 1) return;
      const t = Math.round((Number(entree?.t) || 0) * 100) / 100;
      const texte = JSON.stringify({ k: "e", t, b: entree?.b ? 1 : 0 });
      ws.send(texte);
      derniere = texte;
    },
    renvoyer() { if (derniere && ws.readyState === 1) ws.send(derniere); },
    fermer() { ferme = true; clearInterval(ping); try { ws.close(1000); } catch {} },
  });
}

// ---------- la mer d'entraînement : la même course, jouée dans la page, contre des barques d'essai ----------
// Elle parle comme le bot (les mêmes messages) : la page ne voit pas la différence. Rien n'est envoyé ni gardé.
export const NOMS_ESSAI = ["Mousse Corail", "Vieux Hareng", "Capitaine Brume", "Écume-Vive", "La Sardine", "Matelot Plume", "Rame-Molle", "Grand Mât", "Pied-Marin", "Bosco Tempête", "Œil-de-Phare", "Coquille", "Marée Haute", "Bras-de-Fer", "Petite Ancre", "Vent-Debout"];
export function entrainement({ nom = "Toi", commu = "barhaw", commus = {}, faux = 7, hasard = Math.random, surMessage = () => {}, sansMoi = false, rythme = 1, demarrer = true } = {}) {
  const ids = Object.keys(commus).length ? Object.keys(commus) : ["barhaw"];
  let p = parcours(PARCOURS[Math.floor(hasard() * PARCOURS.length) % PARCOURS.length].id, Math.floor(hasard() * 4) & 3);
  const joueurs = [];
  if (!sansMoi) joueurs.push({ num: 1, nom, commu, faux: false, niveau: 0 });
  for (let k = 0; k < faux; k++) joueurs.push({ num: joueurs.length + 1, nom: NOMS_ESSAI[k % NOMS_ESSAI.length], commu: ids[(k + 1) % ids.length], faux: true, niveau: 0.32 + ((k * 41) % 55) / 100 });
  const barques = joueurs.map((j, k) => nouvelleBarque(j.num, p.grille[k]));
  const entrees = new Map();
  let tick = 0, phase = "depart", fin = 0, numero = 1, debut = 0, premier = 0, coffre = null, minuteur = null;
  const arrivees = [];
  const maintenant = () => Date.now();
  const envoyerPhase = () => surMessage({ k: "phase", phase, fin, numero, parcours: { id: p.id, miroir: p.miroir, nom: p.nom }, s: maintenant() });
  function partir() {
    phase = "depart";
    fin = maintenant() + 4000 / rythme;
    arrivees.length = 0;
    premier = 0;
    coffre = null;
    const ordre = [...barques];
    for (let k = ordre.length - 1; k > 0; k--) { const i = Math.floor(hasard() * (k + 1)); [ordre[k], ordre[i]] = [ordre[i], ordre[k]]; }
    ordre.forEach((b, k) => { placer(b, p.grille[k]); b.fige = true; });
    entrees.clear();
    envoyerPhase();
  }
  function changer(x) {
    phase = x;
    const t = maintenant();
    if (x === "course") { for (const b of barques) b.fige = false; debut = tick; fin = t + 150_000 / rythme; }
    if (x === "resultats") {
      fin = t + 7000 / rythme;
      const ordre = classement(barques, p);
      const temps = new Map(arrivees.map((a) => [a.id, a.temps]));
      surMessage({ k: "resultats", classement: ordre.map((b, k) => [b.id, k + 1, temps.has(b.id) ? Math.round(temps.get(b.id) * 100) / 100 : null]), gains: [], record: null, rapporte: false, parcours: p.nom });
    }
    if (x === "libre") { fin = 0; for (const b of barques) Object.assign(b, { fini: false, prochaine: 0 }); coffre = { apparait: t + 3000 / rythme }; }
    envoyerPhase();
  }
  function pas() {
    tick++;
    for (const j of joueurs) {
      const b = barques[j.num - 1];
      if (!j.faux || b.fige) continue;
      if (phase === "course") entrees.set(j.num, pilote(b, p, { hasard, niveau: j.niveau }));
      else {
        const c = coffre?.x !== undefined && !coffre.pris ? coffre : (j.balade && Math.hypot(j.balade.x - b.x, j.balade.z - b.z) > 8 ? j.balade : (j.balade = placeCoffre(p, hasard)));
        entrees.set(j.num, pilote({ ...b, prochaine: 0, fini: false }, { ...p, bouees: [c] }, { hasard, niveau: j.niveau }));
      }
    }
    const evts = avancer(barques, entrees, p, { course: phase === "course", tick }).sort((a, b) => (a.temps || 0) - (b.temps || 0));
    for (const e of evts) {
      if (e.type !== "arrivee") continue;
      const temps = (e.temps - debut) * MER.pas;
      arrivees.push({ id: e.id, temps });
      if (!premier) premier = maintenant();
      surMessage({ k: "arrivee", n: e.id, place: arrivees.length, temps: Math.round(temps * 100) / 100 });
    }
    const t = maintenant();
    if (phase === "depart" && t >= fin) changer("course");
    else if (phase === "course" && (barques.every((b) => b.fini) || t >= fin || (premier && t - premier > 25_000 / rythme) || (!sansMoi && barques[0].fini && t - premier > 8000 / rythme))) changer("resultats");
    else if (phase === "resultats" && t >= fin) changer("libre");
    if (phase === "libre" && coffre && !coffre.pris) {
      if (coffre.x === undefined && t >= coffre.apparait) { Object.assign(coffre, placeCoffre(p, hasard)); surMessage({ k: "coffre", x: coffre.x, z: coffre.z }); }
      else if (coffre.x !== undefined) {
        const b = barques.find((x) => Math.hypot(x.x - coffre.x, x.z - coffre.z) <= MER.coffre + MER.rayon);
        if (b) { coffre.pris = true; surMessage({ k: "coffre-pris", n: b.id, nom: joueurs[b.id - 1].nom, berrys: 0, milles: 0 }); }
      }
    }
    if (tick % MER.envoi === 0) {
      surMessage({ k: "s", tick, phase, coffre: coffre?.x !== undefined && !coffre.pris ? { x: coffre.x, z: coffre.z } : null, barques: barques.map((b) => ({ ...b, choc: b.choc > 0 ? 1 : 0 })), recu: performance.now() });
    }
  }
  const source = {
    etat: "ouvert", rtt: 0, locale: true,
    envoyer(e) { if (!sansMoi) entrees.set(1, { t: Number(e?.t) || 0, b: e?.b ? 1 : 0 }); },
    renvoyer() {},
    fermer() { clearInterval(minuteur); minuteur = null; },
    // une nouvelle course (un autre parcours)
    relancer() {
      const avant = p.id;
      const autres = PARCOURS.filter((x) => x.id !== avant);
      p = parcours(autres[Math.floor(hasard() * autres.length)].id, Math.floor(hasard() * 4) & 3);
      numero++;
      partir();
    },
    demarrer() {
      if (minuteur) return;
      surMessage({
        k: "salut", moi: sansMoi ? 0 : 1, s: maintenant(), tick, pas: PAS, salle: { id: "entrainement", nom: "Entraînement", essai: true },
        phase, fin, numero, parcours: { id: p.id, miroir: p.miroir, nom: p.nom }, joueurs: joueurs.map((j) => [j.num, j.nom, j.commu, j.faux ? 1 : 0]), commus, records: null, coffre: null,
      });
      minuteur = setInterval(pas, PAS / rythme);
    },
  };
  partir();
  if (demarrer) setTimeout(() => source.demarrer(), 0);
  return source;
}

// ---------- le suivi : les autres un peu en retard (lissés), la sienne tout de suite (prédite) ----------
export function creerSuivi({ moi = 0 } = {}) {
  let p = null;
  const instantanes = [];
  let ecart = null; // l'écart entre l'heure de la page et l'heure des pas du bot (au plus juste)
  let local = null; // sa barque, prédite
  let avant = null; // sa barque au pas d'avant (pour adoucir entre deux pas)
  let entree = { t: 0, b: 0 };
  let reste = 0;
  let phase = "";
  let rtt = 150;
  const copie = (b) => ({ ...b });
  function recaler(serveur, s) {
    const fige = s.phase === "depart";
    if (!local || fige || serveur.fini !== local.fini || Math.abs(serveur.prochaine - local.prochaine) > 1) {
      local = { ...copie(serveur), fige };
      avant = copie(local);
      return;
    }
    // où est sa barque chez le bot « maintenant », avec ce qu'on appuie : puis on rapproche doucement la sienne
    const pred = copie(serveur);
    const k = Math.max(0, Math.min(12, Math.round((performance.now() - s.recu + rtt) / PAS)));
    for (let i = 0; i < k; i++) { piloter(pred, entree); if (p) chocs([pred], p); }
    const dx = pred.x - local.x, dz = pred.z - local.z;
    if (dx * dx + dz * dz > 36) { Object.assign(local, pred); avant = copie(local); return; }
    local.x += dx * 0.3; local.z += dz * 0.3;
    local.a = angle(local.a + angle(pred.a - local.a) * 0.3);
    local.v += (pred.v - local.v) * 0.3;
    local.w += (pred.w - local.w) * 0.3;
    local.e = pred.e;
    Object.assign(local, { prochaine: serveur.prochaine, fini: serveur.fini, absent: serveur.absent, fige: false });
  }
  return {
    get moi() { return moi; },
    set moi(n) { moi = n; local = null; },
    set parcours(x) { p = x; },
    set rtt(x) { if (x > 0) rtt = x; },
    get phase() { return phase; },
    recevoir(s) {
      const e = s.recu - s.tick * PAS;
      ecart = ecart === null ? e : Math.min(e, ecart + 0.3);
      instantanes.push(s);
      while (instantanes.length > 40) instantanes.shift();
      phase = s.phase;
      if (moi) {
        const mien = s.barques.find((b) => b.id === moi);
        if (mien) recaler(mien, s);
        else local = null;
      }
    },
    entree(e) { entree = { t: Number(e?.t) || 0, b: e?.b ? 1 : 0 }; },
    // la page avance sa barque à son rythme (par pas de 50 ms, comme le bot)
    pas(dt) {
      if (!local || local.fige || phase === "depart") return;
      reste += Math.min(dt, 250);
      while (reste >= PAS) {
        avant = copie(local);
        piloter(local, entree);
        if (p) chocs([local], p);
        reste -= PAS;
      }
    },
    // ce qu'on montre maintenant : toutes les barques (la sienne prédite), le coffre, la phase et le pas du bot
    vue(t = performance.now()) {
      if (!instantanes.length || ecart === null) return null;
      const vise = (t - ecart - DELAI) / PAS;
      let a = instantanes[0];
      let b = instantanes[instantanes.length - 1];
      for (let i = instantanes.length - 1; i > 0; i--) {
        if (instantanes[i - 1].tick <= vise) { a = instantanes[i - 1]; b = instantanes[i]; break; }
      }
      const f = b.tick > a.tick ? Math.max(0, Math.min(1.5, (vise - a.tick) / (b.tick - a.tick))) : 0;
      const parId = new Map(a.barques.map((x) => [x.id, x]));
      const barques = b.barques.map((y) => {
        const x = parId.get(y.id);
        if (y.id === moi && local) {
          const r = Math.min(1, reste / PAS);
          const de = avant || local;
          return { ...local, x: de.x + (local.x - de.x) * r, z: de.z + (local.z - de.z) * r, a: angle(de.a + angle(local.a - de.a) * r), rame: local.rame, choc: y.choc, moi: true };
        }
        if (!x || f > 1) {
          // au-delà du dernier instantané : on prolonge un peu son chemin
          const d = f > 1 ? (f - 1) * (b.tick - a.tick) * MER.pas : 0;
          return { ...y, x: y.x + Math.cos(y.a) * y.v * d, z: y.z + Math.sin(y.a) * y.v * d };
        }
        return { ...y, x: x.x + (y.x - x.x) * f, z: x.z + (y.z - x.z) * f, a: angle(x.a + angle(y.a - x.a) * f), v: x.v + (y.v - x.v) * f, e: x.e + (y.e - x.e) * f };
      });
      return { barques, coffre: b.coffre, phase: b.phase, tick: a.tick + (b.tick - a.tick) * Math.min(1, f) };
    },
    vider() { instantanes.length = 0; local = null; avant = null; ecart = null; },
  };
}

// ---------- les touches : clavier (flèches, Q/D, A/D ; espace, Z, W, ↑ pour ramer fort) ----------
export function lireClavier(cible, surChange, actif = () => true) {
  const bas = new Set();
  const calc = () => {
    const g = bas.has("ArrowLeft") || bas.has("KeyQ") || bas.has("KeyA");
    const d = bas.has("ArrowRight") || bas.has("KeyD");
    return { t: (d ? 1 : 0) - (g ? 1 : 0), b: bas.has("Space") || bas.has("ArrowUp") || bas.has("KeyW") || bas.has("KeyZ") ? 1 : 0 };
  };
  const TOUCHES = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyQ", "KeyA", "KeyD", "KeyW", "KeyZ", "Space"]);
  const enBas = (e) => {
    if (!TOUCHES.has(e.code) || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (!actif()) return;
    e.preventDefault();
    if (bas.has(e.code)) return;
    bas.add(e.code);
    surChange(calc());
  };
  const enHaut = (e) => { if (bas.delete(e.code)) surChange(calc()); };
  const perdu = () => { if (bas.size) { bas.clear(); surChange(calc()); } };
  cible.addEventListener("keydown", enBas);
  cible.addEventListener("keyup", enHaut);
  window.addEventListener("blur", perdu);
  return () => { cible.removeEventListener("keydown", enBas); cible.removeEventListener("keyup", enHaut); window.removeEventListener("blur", perdu); };
}
