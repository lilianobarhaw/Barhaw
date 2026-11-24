// LA MER EN DIRECT, vue de haut (2D) : pour OBS, pour les appareils qui ne suivent pas la 3D, et pour ceux qui le
// préfèrent. La mer sur sa feuille de parchemin, les 4 bouées numérotées, la ligne de départ en damier, les rochers et
// les îlots, le coffre, et les barques aux couleurs de leur commu avec leur pseudo. Tout est dessiné ici (inventé).
// Ce module ne fait que dessiner ce qu'on lui donne (js/mer-jeu.js fait le reste).
import { MER } from "./mer-moteur.js";

const ENCRE = "#12050d";
const OR = "#ffd36b";
const hexa = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c) : d);

export function creerMer2D(canvas, { commus = {}, suivre = true, transparent = false } = {}) {
  const ctx = canvas.getContext("2d");
  let p = null;
  let vue = null;
  let options = { moi: 0, joueurs: new Map(), prochaine: 0 };
  let largeur = 0, hauteur = 0, ratio = 1;
  let camera = { x: 0, z: 0, e: 1 }; // le centre et l'échelle (pixels par unité)
  let detruit = false;
  let traces = new Map(); // num → les derniers points (le sillage)

  function taille() {
    const r = canvas.getBoundingClientRect();
    ratio = Math.min(2, window.devicePixelRatio || 1);
    largeur = Math.max(1, Math.round(r.width));
    hauteur = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(largeur * ratio);
    canvas.height = Math.round(hauteur * ratio);
  }
  // tout le parcours à l'écran (OBS, les spectateurs) ou la caméra qui suit sa barque (de près)
  function cadrer(dt = 1) {
    const toute = { x: 0, z: 0, e: Math.min(largeur / (MER.bord.x * 2 + 16), hauteur / (MER.bord.z * 2 + 16)) };
    let vise = toute;
    const b = suivre && options.moi ? vue?.barques.find((x) => x.id === options.moi) : null;
    if (b) {
      const e = Math.max(toute.e, Math.min(largeur, hauteur) / 58);
      // on regarde un peu devant la barque, sans trop sortir de la feuille
      const mx = Math.max(0, MER.bord.x + 10 - largeur / 2 / e);
      const mz = Math.max(0, MER.bord.z + 10 - hauteur / 2 / e);
      vise = { x: Math.max(-mx, Math.min(mx, b.x + Math.cos(b.a) * 8)), z: Math.max(-mz, Math.min(mz, b.z + Math.sin(b.a) * 8)), e };
    }
    const k = Math.min(1, dt * 4);
    camera = { x: camera.x + (vise.x - camera.x) * k, z: camera.z + (vise.z - camera.z) * k, e: camera.e + (vise.e - camera.e) * k };
  }
  const ecran = (x, z) => [(x - camera.x) * camera.e + largeur / 2, (z - camera.z) * camera.e + hauteur / 2];
  const couleurs = (commu) => { const c = commus[commu] || {}; return { c1: hexa(c.c1, "#ff5aae"), c2: hexa(c.c2, "#55ccff") }; };

  // la mer : le parchemin, l'eau à l'aquarelle, des petites vagues à l'encre
  function dessinerMer() {
    const W = MER.bord.x + 8, H = MER.bord.z + 8;
    const [x0, y0] = ecran(-W, -H);
    const [x1, y1] = ecran(W, H);
    if (!transparent) {
      ctx.fillStyle = "#e9dcc0";
      ctx.fillRect(0, 0, largeur, hauteur);
    }
    const g = ctx.createRadialGradient((x0 + x1) / 2, (y0 + y1) / 2, 10, (x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.6);
    g.addColorStop(0, "#5fc4d8");
    g.addColorStop(0.65, "#3a9fc0");
    g.addColorStop(1, "#2c7ea4");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 18 * camera.e / 4);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(18,5,13,.55)";
    ctx.stroke();
    // les vaguelettes (fixes : elles ne bougent pas, la mer « respire » par les barques)
    ctx.strokeStyle = "rgba(255,255,255,.28)";
    ctx.lineWidth = Math.max(1, camera.e * 0.25);
    for (let i = 0; i < 90; i++) {
      const x = ((i * 73) % 196) - 98, z = ((i * 41) % 104) - 52;
      const [a, b] = ecran(x, z);
      ctx.beginPath();
      ctx.arc(a, b, camera.e * 2.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  function dessinerRochers() {
    for (const r of p.rochers) {
      const [x, y] = ecran(r.x, r.z);
      const R = r.r * camera.e;
      if (r.r >= 8) {
        // un îlot : du sable, de l'herbe, l'écume autour
        ctx.fillStyle = "rgba(255,255,255,.35)";
        ctx.beginPath(); ctx.arc(x, y, R * 1.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e8d3a0";
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#6fae5a";
        ctx.beginPath(); ctx.arc(x - R * 0.12, y - R * 0.1, R * 0.68, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#4f8a46";
        ctx.beginPath(); ctx.arc(x + R * 0.18, y + R * 0.05, R * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(1.5, camera.e * 0.4);
        ctx.strokeStyle = ENCRE;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,255,255,.4)";
        ctx.beginPath(); ctx.arc(x, y, R * 1.25, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#8a7a72";
        ctx.beginPath();
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI * 2;
          const d = R * (0.82 + ((k * 37) % 10) / 40);
          ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
        }
        ctx.closePath(); ctx.fill();
        ctx.lineWidth = Math.max(1.2, camera.e * 0.35);
        ctx.strokeStyle = ENCRE; ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,.35)";
        ctx.beginPath(); ctx.arc(x - R * 0.3, y - R * 0.3, R * 0.25, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function dessinerPorte() {
    const [a, b] = p.porte;
    const [x0, y0] = ecran(a.x, a.z);
    const [x1, y1] = ecran(b.x, b.z);
    const n = 14;
    ctx.lineWidth = Math.max(3, camera.e * 1.1);
    for (let k = 0; k < n; k++) {
      ctx.strokeStyle = k % 2 ? "#ffffff" : ENCRE;
      ctx.beginPath();
      ctx.moveTo(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n);
      ctx.lineTo(x0 + ((x1 - x0) * (k + 1)) / n, y0 + ((y1 - y0) * (k + 1)) / n);
      ctx.stroke();
    }
    for (const [x, y] of [[x0, y0], [x1, y1]]) {
      ctx.fillStyle = "#ff4f9a";
      ctx.beginPath(); ctx.arc(x, y, Math.max(4, camera.e * 1.6), 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = ENCRE; ctx.stroke();
    }
    // la flèche du sens de la course
    const [cx, cy] = ecran(p.centre.x + p.sens.x * 5, p.centre.z + p.sens.z * 5);
    fleche(cx, cy, Math.atan2(p.sens.z, p.sens.x), Math.max(8, camera.e * 3), "rgba(255,255,255,.85)");
  }
  function fleche(x, y, a, t, couleur) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = couleur;
    ctx.beginPath(); ctx.moveTo(t, 0); ctx.lineTo(-t * 0.6, t * 0.6); ctx.lineTo(-t * 0.25, 0); ctx.lineTo(-t * 0.6, -t * 0.6); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.restore();
  }
  function dessinerBouees(t) {
    p.bouees.forEach((c, k) => {
      const [x, y] = ecran(c.x, c.z);
      const suivante = options.moi && k === options.prochaine;
      const passee = options.moi && k < options.prochaine;
      // la zone à toucher
      ctx.setLineDash([camera.e * 1.6, camera.e * 1.2]);
      ctx.lineWidth = Math.max(1.5, camera.e * (suivante ? 0.6 : 0.35));
      ctx.strokeStyle = suivante ? `rgba(255,211,107,${0.65 + Math.sin(t * 5) * 0.3})` : passee ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.6)";
      ctx.beginPath(); ctx.arc(x, y, MER.bouee * camera.e, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      const R = Math.max(7, camera.e * 2.1);
      ctx.fillStyle = passee ? "#9aa5a8" : k % 2 ? "#ffd36b" : "#ff4f9a";
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = ENCRE; ctx.stroke();
      ctx.fillStyle = ENCRE;
      ctx.font = `900 ${Math.round(R * 1.15)}px 'Dela Gothic One', 'Arial Black', sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(k + 1), x, y + R * 0.06);
    });
  }
  function dessinerCoffre(t) {
    const c = vue?.coffre;
    if (!c) return;
    const [x, y] = ecran(c.x, c.z);
    const R = Math.max(8, camera.e * 2.4);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, R * 3);
    halo.addColorStop(0, `rgba(255,211,107,${0.55 + Math.sin(t * 4) * 0.2})`);
    halo.addColorStop(1, "rgba(255,211,107,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, R * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a4b1e";
    ctx.fillRect(x - R, y - R * 0.6, R * 2, R * 1.3);
    ctx.fillStyle = OR;
    ctx.fillRect(x - R, y - R * 0.15, R * 2, R * 0.28);
    ctx.fillRect(x - R * 0.18, y - R * 0.6, R * 0.36, R * 1.3);
    ctx.lineWidth = 2; ctx.strokeStyle = ENCRE;
    ctx.strokeRect(x - R, y - R * 0.6, R * 2, R * 1.3);
  }
  // une barque vue de haut : la coque, le banc, la petite voile aux couleurs de la commu
  function barque(b, t) {
    const j = options.joueurs.get(b.id);
    const { c1, c2 } = couleurs(j?.commu);
    const [x, y] = ecran(b.x, b.z);
    const L = Math.max(10, camera.e * 3.4);
    // le sillage
    const tr = traces.get(b.id) || [];
    if (!b.absent && b.v > 1) {
      ctx.strokeStyle = b.rame ? "rgba(255,255,255,.75)" : "rgba(255,255,255,.45)";
      ctx.lineWidth = Math.max(1, L * 0.18);
      ctx.beginPath();
      tr.forEach(([tx, tz], k) => { const [sx, sy] = ecran(tx, tz); if (k) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.a);
    ctx.globalAlpha = b.absent ? 0.4 : 1;
    if (b.moi) {
      ctx.fillStyle = `rgba(255,211,107,${0.35 + Math.sin(t * 6) * 0.15})`;
      ctx.beginPath(); ctx.ellipse(0, 0, L * 0.95, L * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = c1;
    ctx.beginPath();
    ctx.moveTo(L * 0.62, 0);
    ctx.quadraticCurveTo(L * 0.2, L * 0.36, -L * 0.48, L * 0.26);
    ctx.lineTo(-L * 0.48, -L * 0.26);
    ctx.quadraticCurveTo(L * 0.2, -L * 0.36, L * 0.62, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = Math.max(1.4, L * 0.09);
    ctx.strokeStyle = ENCRE;
    ctx.stroke();
    ctx.fillStyle = "#7a4a26";
    ctx.fillRect(-L * 0.1, -L * 0.2, L * 0.12, L * 0.4);
    // la voile (de haut : une bande de sa deuxième couleur)
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.moveTo(L * 0.18, -L * 0.3); ctx.lineTo(L * 0.3, 0); ctx.lineTo(L * 0.18, L * 0.3); ctx.closePath(); ctx.fill();
    ctx.stroke();
    // les rames qui battent (plus vite quand on rame fort)
    const r = Math.sin(t * (b.rame ? 18 : 9) + b.id) * 0.5;
    ctx.strokeStyle = "#5a3a22";
    ctx.lineWidth = Math.max(1, L * 0.07);
    for (const s of [1, -1]) {
      ctx.beginPath(); ctx.moveTo(-L * 0.05, s * L * 0.22); ctx.lineTo(-L * 0.05 - Math.sin(r) * L * 0.35, s * L * 0.62); ctx.stroke();
    }
    ctx.restore();
    if (b.choc) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.arc(x + Math.cos(b.a) * L * 0.6, y + Math.sin(b.a) * L * 0.6, L * 0.35, 0, Math.PI * 2); ctx.fill(); }
    return { x, y, L, j };
  }
  // un pseudo au-dessus de sa barque ; pas s'il en cache un autre déjà posé (sauf le sien, toujours là)
  function etiquette(x, y, L, texte, moi, poses) {
    ctx.font = `800 ${Math.max(10, Math.min(14, L * 0.7))}px 'M PLUS Rounded 1c', Arial, sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    const l = ctx.measureText(texte).width + 10;
    const h = Math.max(14, Math.min(19, L * 0.95));
    const r = [x - l / 2, y - L * 0.8 - h, l, h];
    if (!moi && poses.some((q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3])) return;
    poses.push(r);
    ctx.fillStyle = moi ? "rgba(255,211,107,.95)" : "rgba(18,5,13,.72)";
    ctx.beginPath(); ctx.roundRect(x - l / 2, y - L * 0.8 - h, l, h, 6); ctx.fill();
    ctx.fillStyle = moi ? ENCRE : "#fff";
    ctx.fillText(texte, x, y - L * 0.8 - 2);
  }
  // la flèche au bord de l'écran vers la bouée suivante (quand elle est hors de vue)
  function versLaSuivante(t) {
    if (!options.moi || !p) return;
    const b = vue?.barques.find((x) => x.id === options.moi);
    if (!b || b.fini) return;
    const c = options.prochaine < p.bouees.length ? p.bouees[options.prochaine] : p.centre;
    const [x, y] = ecran(c.x, c.z);
    if (x > 20 && x < largeur - 20 && y > 20 && y < hauteur - 20) return;
    const [bx, by] = ecran(b.x, b.z);
    const a = Math.atan2(y - by, x - bx);
    const m = 26;
    const k = Math.min((largeur / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (hauteur / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
    fleche(largeur / 2 + Math.cos(a) * k, hauteur / 2 + Math.sin(a) * k, a, 13 + Math.sin(t * 6) * 2, OR);
  }

  let avantRendu = performance.now();
  function rendre() {
    if (detruit || !p) return;
    const t = performance.now();
    const dt = (t - avantRendu) / 1000;
    avantRendu = t;
    if (!largeur) taille();
    cadrer(dt);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, largeur, hauteur);
    const s = t / 1000;
    dessinerMer();
    dessinerPorte();
    dessinerRochers();
    dessinerBouees(s);
    dessinerCoffre(s);
    const vues = [];
    // les barques : les autres d'abord, la sienne par-dessus
    const liste = [...(vue?.barques || [])].sort((a, b) => (a.moi ? 1 : 0) - (b.moi ? 1 : 0));
    for (const b of liste) {
      // le sillage : un point toutes les 0,15 s environ
      const tr = traces.get(b.id) || [];
      const der = tr[tr.length - 1];
      if (!der || Math.hypot(der[0] - b.x, der[1] - b.z) > 1.4) { tr.push([b.x, b.z]); if (tr.length > 9) tr.shift(); traces.set(b.id, tr); }
      vues.push([b, barque(b, s)]);
    }
    // les pseudos : le sien d'abord, puis la tête de course ; de près, les autres s'il y a la place
    const deLoin = !(suivre && options.moi);
    const poses = [];
    const ordre = [...vues].sort(([a], [b]) => (b.moi ? 1 : 0) - (a.moi ? 1 : 0) || (options.tete?.has(b.id) ? 1 : 0) - (options.tete?.has(a.id) ? 1 : 0));
    for (const [b, { x, y, L, j }] of ordre) {
      if (!j?.nom) continue;
      if (deLoin && vues.length > 8 && !b.moi && !options.tete?.has(b.id)) continue;
      etiquette(x, y, L, j.nom, b.moi, poses);
    }
    versLaSuivante(s);
  }

  return {
    parcours(x) { p = x; traces = new Map(); },
    maj(v, o = {}) { vue = v; options = { ...options, ...o }; },
    rendre,
    taille,
    set suivre(x) { suivre = Boolean(x); },
    get suivre() { return suivre; },
    set commus(c) { commus = c || {}; },
    detruire() { detruit = true; },
    projeter: (x, z) => { const [a, b] = ecran(x, z); return { x: a, y: b }; },
  };
}
