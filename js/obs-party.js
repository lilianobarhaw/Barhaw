// LA FÊTE DANS OBS (!party) : la page /obs?party, une source navigateur grande comme l'écran, transparente, au-dessus de la
// cam (obs.js la charge et s'arrête là). Quand Liliano (ou un modo) tape « !party » dans son chat Twitch, c'est la fête pendant
// 2 minutes, par-dessus la cam (il danse derrière) : des confettis (deux canons au début, puis une pluie), des faisceaux de
// boîte de nuit qui balayent, une boule à facettes qui descend et envoie des reflets, les bords de l'écran qui battent en
// rythme (doux : pas de flash) et une enseigne néon « PARTY ». « !party off » arrête tout de suite, « !party 5 » dure 5 min
// (10 au plus). Au début, un son (fabriqué pour Barhaw : canons à confettis, corne de boîte de nuit, paillettes).
// La page lit le chat comme un spectateur sans compte (le bot n'y est pour rien) ; elle ne regarde que « !party » du streamer
// et de ses modos, et ne garde rien.
// Réglages dans l'adresse : ?party=<chaîne> (sans rien : lilianobarhaw) · ?duree=<secondes> (120 par défaut) ·
// ?son=non (pas de son) · ?boule=non (pas de boule à facettes) · ?essai=party (une fête de 9 s toutes les 14 s, sans le chat).

const CAPTURE = Boolean(window.__capture);
const COULEURS = ["#ff4f9a", "#9b4dff", "#2de2e6", "#ffcf5c", "#ff8fcb", "#5dff9f"];
const BPM = 124;
const TEMPS = 60_000 / BPM;

const el = (balise, classe, ...enfants) => {
  const n = document.createElement(balise);
  if (classe) n.className = classe;
  for (const e of enfants) if (e !== null && e !== undefined && e !== false) n.append(e);
  return n;
};
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
};
const doux = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function demarrer({ P }) {
  const ESSAI = (P.get("essai") || "").toLowerCase() === "party";
  const brut = String(P.get("party") || "").trim().toLowerCase().replace(/^@/, "");
  const CHAINE = !brut || brut === "oui" ? "lilianobarhaw" : /^[a-z0-9_]{3,25}$/.test(brut) ? brut : null;
  const DUREE = /^\d{1,4}$/.test(P.get("duree") || "") ? Math.min(600, Math.max(10, Number(P.get("duree")))) * 1000 : 120_000;
  const SON = P.get("son") !== "non";
  const BOULE = P.get("boule") !== "non";
  const DANS_OBS = Boolean(window.obsstudio);

  try { document.fonts.load('80px "Dela Gothic One"'); } catch { /* elle viendra */ }
  const toile = el("canvas", "party-toile");
  toile.setAttribute("aria-hidden", "true");
  document.body.append(toile);
  const ctx = toile.getContext("2d");
  let L = 0;
  let H = 0;
  let echelle = 1;
  function taille() {
    const r = Math.min(2, window.devicePixelRatio || 1);
    L = window.innerWidth;
    H = window.innerHeight;
    echelle = Math.max(L, H) / 1920;
    toile.width = Math.round(L * r);
    toile.height = Math.round(H * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  taille();
  window.addEventListener("resize", taille);

  const son = new Audio(`/son/party/fete.${new Audio().canPlayType('audio/ogg; codecs="opus"') ? "ogg" : "mp3"}`);
  son.preload = "auto";

  // ---------- l'état de la fête ----------
  let debut = -1; // quand la fête a commencé (performance.now), -1 : pas de fête
  let fin = 0; // quand elle doit finir
  let sortie = -1; // quand elle a commencé à finir (les confettis tombent encore, le reste s'éteint)
  let boucle = 0;
  const confettis = [];
  let pluie = 0; // confettis à faire tomber (fractions)
  const reflets = Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * Math.PI * 2 + Math.random() * 0.3, r: 0.25 + Math.random() * 0.75, t: Math.random() * 6, v: 1.5 + Math.random() * 3, c: COULEURS[i % COULEURS.length] }));
  const faisceaux = [
    { x: 0.08, y: -0.04, base: 62, amp: 24, per: 3.6, ph: 0 },
    { x: 0.92, y: -0.04, base: 118, amp: 24, per: 4.2, ph: 1.7 },
    { x: 0.3, y: -0.06, base: 80, amp: 30, per: 5.1, ph: 3.1 },
    { x: 0.7, y: -0.06, base: 100, amp: 30, per: 4.7, ph: 0.6 },
    { x: -0.02, y: 1.04, base: -40, amp: 20, per: 6.3, ph: 2.2 },
    { x: 1.02, y: 1.04, base: -140, amp: 20, per: 5.7, ph: 4.4 },
  ];

  function canon(depuisGauche) {
    const x0 = depuisGauche ? -10 : L + 10;
    for (let i = 0; i < 110; i++) {
      const angle = (depuisGauche ? -62 : -118) + (Math.random() - 0.5) * 34;
      const v = (900 + Math.random() * 900) * echelle;
      confettis.push(confetti(x0, H + 10, Math.cos((angle * Math.PI) / 180) * v, Math.sin((angle * Math.PI) / 180) * v));
    }
  }
  function confetti(x, y, vx, vy) {
    const ruban = Math.random() < 0.18;
    return {
      x, y, vx, vy,
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 10,
      flip: Math.random() * Math.PI * 2, vflip: 5 + Math.random() * 9,
      w: (ruban ? 4 : 9 + Math.random() * 7) * echelle, h: (ruban ? 22 + Math.random() * 14 : 5 + Math.random() * 4) * echelle,
      rond: !ruban && Math.random() < 0.15,
      c: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      bal: Math.random() * Math.PI * 2, fbal: 1 + Math.random() * 2,
    };
  }

  function lancer(ms = DUREE) {
    const t = performance.now();
    const deja = debut >= 0 && sortie < 0;
    if (!deja) { debut = t; confettis.length = 0; }
    fin = t + ms;
    sortie = -1;
    canon(true);
    canon(false);
    if (SON && !deja) { try { son.currentTime = 0; const p = son.play(); if (p?.catch) p.catch(() => {}); } catch { /* pas encore chargé */ } }
    if (!boucle) boucle = requestAnimationFrame(image);
    majAide();
  }
  function arreter() {
    if (debut < 0 || sortie >= 0) return;
    sortie = performance.now();
    fin = sortie;
    majAide();
  }

  // ---------- une image ----------
  let avant = 0;
  function image() {
    boucle = 0;
    const t = performance.now();
    const dt = Math.min(0.05, avant ? (t - avant) / 1000 : 1 / 60);
    avant = t;
    if (debut < 0) { ctx.clearRect(0, 0, L, H); avant = 0; return; }
    if (sortie < 0 && t >= fin) sortie = t;
    const depuis = t - debut;
    const entree = doux(depuis / 700);
    const eteint = sortie >= 0 ? 1 - doux((t - sortie) / 1500) : 1;
    const force = entree * eteint; // les lumières
    ctx.clearRect(0, 0, L, H);

    // les bords qui battent en rythme (doux, pas de flash)
    const temps = depuis / TEMPS;
    const coup = Math.exp(-(temps % 1) * 4.5);
    const cb = COULEURS[Math.floor(temps) % COULEURS.length];
    const a = 0.32 * coup * force;
    if (a > 0.004) {
      const bord = Math.min(L, H) * 0.22;
      for (const [x0, y0, x1, y1, x, y, w, h] of [[0, 0, bord, 0, 0, 0, bord, H], [L, 0, L - bord, 0, L - bord, 0, bord, H], [0, 0, 0, bord * 0.7, 0, 0, L, bord * 0.7], [0, H, 0, H - bord * 0.7, 0, H - bord * 0.7, L, bord * 0.7]]) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, rgba(cb, a));
        g.addColorStop(1, rgba(cb, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
      }
    }

    // les faisceaux de boîte de nuit
    ctx.globalCompositeOperation = "lighter";
    const s = depuis / 1000;
    const long = Math.hypot(L, H) * 1.1;
    faisceaux.forEach((f, i) => {
      const angle = ((f.base + f.amp * Math.sin((2 * Math.PI * s) / f.per + f.ph)) * Math.PI) / 180;
      const ouv = (6.5 * Math.PI) / 180;
      const x = f.x * L;
      const y = f.y * H;
      const c = COULEURS[(i + Math.floor(temps / 4)) % COULEURS.length];
      for (const [o, al] of [[ouv, 0.2], [ouv * 0.35, 0.28]]) {
        const g = ctx.createLinearGradient(x, y, x + Math.cos(angle) * long, y + Math.sin(angle) * long);
        g.addColorStop(0, rgba(c, al * force));
        g.addColorStop(0.55, rgba(c, al * 0.35 * force));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle - o) * long, y + Math.sin(angle - o) * long);
        ctx.lineTo(x + Math.cos(angle + o) * long, y + Math.sin(angle + o) * long);
        ctx.closePath();
        ctx.fill();
      }
    });

    // la boule à facettes : elle descend au début, remonte à la fin, et envoie des reflets qui tournent
    const bx = L / 2;
    const r = 46 * echelle;
    const descente = doux(depuis / 900) - (sortie >= 0 ? doux((t - sortie) / 900) : 0);
    const by = -r * 2 + (r * 2 + 90 * echelle) * Math.max(0, descente) + Math.sin(s * 2.1) * 3 * echelle;
    const rot = s * 0.9;
    if (BOULE && descente > 0) {
      for (const p of reflets) {
        const ang = p.a + rot * 0.55;
        const px = bx + Math.cos(ang) * p.r * L * 0.62;
        const py = by + Math.abs(Math.sin(ang)) * p.r * H * 0.95 + 20 * echelle;
        const brille = Math.max(0, Math.sin(s * p.v + p.t)) * force;
        if (brille < 0.05) continue;
        const rr = (2.5 + 3.5 * brille) * echelle;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr * 3);
        g.addColorStop(0, `rgba(255, 255, 255, ${0.85 * brille})`);
        g.addColorStop(0.3, rgba(p.c, 0.5 * brille));
        g.addColorStop(1, rgba(p.c, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rr * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      // le fil, puis la boule (des facettes qui tournent)
      ctx.strokeStyle = "rgba(220, 220, 235, 0.8)";
      ctx.lineWidth = 2 * echelle;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, by - r);
      ctx.stroke();
      const fond = ctx.createRadialGradient(bx - r * 0.35, by - r * 0.35, r * 0.1, bx, by, r);
      fond.addColorStop(0, "#f4f4fa");
      fond.addColorStop(1, "#5b5670");
      ctx.fillStyle = fond;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.clip();
      for (let lat = -78; lat <= 78; lat += 13) {
        const la = (lat * Math.PI) / 180;
        const pas = 13 / Math.max(0.3, Math.cos(la));
        for (let lon = 0; lon < 360; lon += pas) {
          const lo = (lon * Math.PI) / 180 + rot * 2.2;
          const face = Math.cos(lo);
          if (face <= 0.05) continue;
          const fx = bx + r * Math.cos(la) * Math.sin(lo);
          const fy = by + r * Math.sin(la);
          const cote = r * 0.2 * Math.cos(la) * face + 1;
          const hf = r * 0.19;
          const lum = 0.35 + 0.65 * Math.max(0, Math.sin(lo * 3 + lat + s * 4)) ** 4;
          ctx.fillStyle = `rgba(${Math.round(150 + 105 * lum)}, ${Math.round(150 + 105 * lum)}, ${Math.round(170 + 85 * lum)}, 0.95)`;
          ctx.fillRect(fx - cote / 2, fy - hf / 2, cote * 0.92, hf);
        }
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(30, 20, 40, 0.6)";
      ctx.lineWidth = 1.5 * echelle;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";

    // les confettis
    if (sortie < 0) {
      pluie += dt * 38 * (L / 1920 + 0.4);
      while (pluie >= 1) {
        pluie -= 1;
        confettis.push(confetti(Math.random() * L, -20 * echelle, (Math.random() - 0.5) * 60 * echelle, (40 + Math.random() * 60) * echelle));
      }
    }
    const frein = Math.exp(-1.3 * dt);
    const reste = sortie >= 0 ? 1 - doux((t - sortie) / 2500) : 1; // « !party off » : les confettis s'effacent
    for (let i = confettis.length - 1; i >= 0; i--) {
      const p = confettis[i];
      p.vy += 520 * echelle * dt;
      p.vx *= frein;
      p.vy *= frein;
      const vmax = 210 * echelle;
      if (p.vy > vmax) p.vy = vmax;
      p.x += (p.vx + Math.sin(s * p.fbal * 3 + p.bal) * 40 * echelle) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.flip += p.vflip * dt;
      if (p.y > H + 40 || p.x < -80 || p.x > L + 80) { confettis.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.flip));
      ctx.fillStyle = p.c;
      ctx.globalAlpha = reste;
      if (p.rond) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (confettis.length > 900) confettis.splice(0, confettis.length - 900);

    // l'enseigne « PARTY » : grande au milieu au début, puis elle file dans le coin en haut à gauche
    const vie = depuis / 1000;
    const pop = vie < 0.35 ? doux(vie / 0.35) * 1.12 : vie < 0.5 ? 1.12 - 0.12 * doux((vie - 0.35) / 0.15) : 1;
    const vers = doux((vie - 1.2) / 0.55);
    const taillePolice = (230 - 150 * vers) * echelle * pop;
    const cx = L / 2 + (38 * echelle + (300 * echelle) / 2 * 0.95 - L / 2) * vers;
    const cy = H / 2 + (38 * echelle + 48 * echelle - H / 2) * vers;
    let neon = eteint;
    if (vie < 0.3) neon *= [1, 0.2, 1, 0.4, 1][Math.floor(vie / 0.06)] ?? 1;
    if (sortie >= 0) { const e = (t - sortie) / 1000; neon = e < 0.35 ? [1, 0.2, 0.9, 0.1, 0.6, 0][Math.floor(e / 0.06)] ?? 0 : 0; }
    if (neon > 0.01) {
      const cn = COULEURS[Math.floor(temps / 2) % 2 === 0 ? 0 : 1];
      ctx.save();
      ctx.font = `${Math.round(taillePolice)}px "Dela Gothic One", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = neon;
      ctx.shadowColor = cn;
      ctx.shadowBlur = 34 * echelle;
      ctx.fillStyle = rgba(cn, 0.9);
      ctx.fillText("PARTY", cx, cy);
      ctx.shadowBlur = 10 * echelle;
      ctx.shadowColor = "#ffffff";
      const g = ctx.createLinearGradient(cx - taillePolice * 1.6, cy, cx + taillePolice * 1.6, cy);
      g.addColorStop(0, "#ffd1e8");
      g.addColorStop(0.5, "#ff8fcb");
      g.addColorStop(1, "#c79bff");
      ctx.fillStyle = g;
      ctx.fillText("PARTY", cx, cy);
      ctx.restore();
    }

    // fini : plus de lumière et plus de confettis
    if (sortie >= 0 && t - sortie > 2600) {
      confettis.length = 0;
      debut = -1;
      sortie = -1;
      ctx.clearRect(0, 0, L, H);
      avant = 0;
      majAide();
      return;
    }
    boucle = requestAnimationFrame(image);
  }

  // ---------- le chat Twitch (comme un spectateur sans compte) : « !party » du streamer et de ses modos ----------
  let irc = null;
  let branche = false;
  let essais = 0;
  function surLigne(ligne) {
    if (ligne.startsWith("PING")) { try { irc.send("PONG :tmi.twitch.tv"); } catch { /* elle se ferme */ } return; }
    if (/ JOIN #/.test(ligne)) { branche = true; essais = 0; majAide(); return; }
    const m = /^(?:@(\S*) )?:\S+ PRIVMSG #\S+ :(.*)$/.exec(ligne);
    if (!m) return;
    const tags = {};
    for (const kv of (m[1] || "").split(";")) { const i = kv.indexOf("="); if (i > 0) tags[kv.slice(0, i)] = kv.slice(i + 1); }
    const chef = /(^|,)(broadcaster|moderator)\//.test(tags.badges || "") || tags.mod === "1";
    if (!chef) return;
    const c = /^!party(?:\s+(\S+))?\s*$/i.exec(m[2].trim());
    if (!c) return;
    const arg = (c[1] || "").toLowerCase();
    if (["off", "stop", "fin"].includes(arg)) arreter();
    else if (/^\d{1,2}$/.test(arg)) lancer(Math.min(10, Math.max(1, Number(arg))) * 60_000);
    else lancer();
  }
  function brancherChat() {
    if (!CHAINE) return;
    let s;
    try { s = new WebSocket("wss://irc-ws.chat.twitch.tv:443"); } catch { setTimeout(brancherChat, 10_000); return; }
    irc = s;
    s.onopen = () => {
      s.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      s.send("PASS SCHMOOPIIE");
      s.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`);
      s.send(`JOIN #${CHAINE}`);
    };
    s.onmessage = (e) => { for (const ligne of String(e.data).split("\r\n")) if (ligne) surLigne(ligne); };
    s.onclose = () => {
      if (irc !== s) return;
      irc = null;
      branche = false;
      essais += 1;
      majAide();
      setTimeout(brancherChat, Math.min(30_000, 1_500 * 2 ** Math.min(essais, 5)));
    };
  }

  // ---------- hors du live : un mot d'explication (et un bouton pour essayer) quand on bouge la souris ----------
  let aide = null;
  let aideLigne = null;
  let aideMinuteur = null;
  function majAide() {
    if (!aideLigne) return;
    const t = ESSAI ? "Essai : une fête de 9 s toutes les 14 s, sans le chat."
      : CHAINE === null ? "⛔ Le nom de chaîne dans l'adresse n'est pas bon : ?party=<le pseudo Twitch de la chaîne>."
      : branche ? `✅ J'écoute le chat de ${CHAINE} : « !party » (toi ou un modo) lance la fête.${debut >= 0 && sortie < 0 ? " 🎉 C'est la fête !" : ""}`
      : "⏳ Connexion au chat Twitch…";
    if (aideLigne.textContent !== t) aideLigne.textContent = t;
  }
  function montrerAide() {
    if (DANS_OBS || CAPTURE) return;
    if (!aide) {
      aideLigne = el("p", "aide-etat", "");
      const essai = el("button", "", "▶ Essayer");
      essai.type = "button";
      essai.addEventListener("click", () => lancer(15_000));
      const stop = el("button", "", "■ Arrêter");
      stop.type = "button";
      stop.addEventListener("click", arreter);
      aide = el("div", "aide",
        el("b", "", "La fête (!party)"),
        el("p", "", `« !party » dans ton chat (toi ou un modo) : ${Math.round(DUREE / 60_000 * 10) / 10} min de fête par-dessus ta cam (confettis, lumières de boîte de nuit, boule à facettes). « !party off » arrête, « !party 5 » dure 5 min.`),
        el("p", "", "Dans OBS : une source « Navigateur » avec cette adresse, de la taille de ton écran (1920 × 1080), au-dessus de ta cam ; « Contrôler l'audio via OBS » coché pour que le live entende le son du début."),
        aideLigne,
        el("div", "aide-sons", essai, stop));
      document.body.append(aide);
      majAide();
    }
    aide.hidden = false;
    clearTimeout(aideMinuteur);
    aideMinuteur = setTimeout(() => { if (aide) aide.hidden = true; }, 12_000);
  }
  for (const geste of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(geste, montrerAide, { passive: true });

  window.__obsParty = {
    etat: () => ({ essai: ESSAI, chaine: CHAINE, branche, fete: debut >= 0 && sortie < 0, fin: debut >= 0 ? Math.max(0, Math.round(fin - performance.now())) : 0, confettis: confettis.length }),
    lancer: (ms) => lancer(ms),
    arreter,
    ligne: (l) => surLigne(l),
  };

  if (ESSAI) {
    const tour = () => { lancer(9_000); setTimeout(tour, 14_000); };
    setTimeout(tour, 500);
  } else brancherChat();
}
