// BOSS LIVE : les boss en 3D (modèles Blender modeles/boss/<id>.glb : morghast, voraxia, krakor) et leurs effets : aura qui monte,
// halo qui tourne, éclats en orbite, éclairs, cercle de runes au sol, onde de choc et flash à chaque coup, apparition (il sort
// du cercle), rage (rouge), mort (il explose), fuite (il s'en va dans le ciel), caméra qui tourne et tremble.
// creerBoss3D(canvas, { boss }) → { boss, etat("dort"|"combat"|"rage"|"mort"|"fuite"), apparition(), frappe(force), pause(oui), redimensionner(), arreter() }
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller } from "./grandline-3d.js";

// les couleurs et les effets de chaque boss (les yeux : par rapport à la tête, en coordonnées du site)
const BOSS_3D = {
  morghast: { aura: [0xb46bff, 0xff4f9a, 0xff8a3d, 0xffd36b], lueur: "rgba(180,70,255,1)", oeil: "rgba(255,60,40,1)", yeux: [[-0.5, 1.6, 1.8], [0.5, 1.6, 1.8]], eclair: 0xe6c8ff, eclairs: 1, contre: 0xff3d8e, sol: "rgba(255,120,200,0.95)", solLueur: "rgba(255,60,160,0.9)" },
  voraxia: { aura: [0x5ff0e6, 0xffffff, 0x8a7dff, 0x9be7ff], lueur: "rgba(70,200,255,1)", oeil: "rgba(255,120,40,1)", yeux: [[0, 1.05, 5.0]], eclair: 0xbff6ff, eclairs: 2.6, contre: 0x3fd0ff, sol: "rgba(120,240,255,0.95)", solLueur: "rgba(60,160,255,0.9)" },
  krakor: { aura: [0xff6a1a, 0xff2e1a, 0xffd36b, 0xff9a1f], lueur: "rgba(255,100,20,1)", oeil: "rgba(255,190,40,1)", yeux: [[-0.45, 1.15, 1.45], [0.45, 1.15, 1.45]], eclair: 0xffb36b, eclairs: 0.6, contre: 0xff5a1a, sol: "rgba(255,150,60,0.95)", solLueur: "rgba(255,80,20,0.9)" },
};
const petit = () => Math.min(window.innerWidth, window.innerHeight) < 700;

function texture(dessin, taille = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = taille;
  dessin(c.getContext("2d"), taille);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const halo = (couleur) => texture((g, s) => {
  const d = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  d.addColorStop(0, couleur);
  d.addColorStop(0.35, couleur.replace(/[\d.]+\)$/, "0.45)"));
  d.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = d;
  g.fillRect(0, 0, s, s);
});
const runes = (couleur) => texture((g, s) => {
  const c = s / 2;
  g.strokeStyle = couleur;
  g.lineWidth = s / 120;
  for (const r of [0.47, 0.42, 0.3]) { g.beginPath(); g.arc(c, c, s * r, 0, Math.PI * 2); g.stroke(); }
  g.font = `${Math.round(s / 18)}px serif`;
  g.fillStyle = "rgba(255,190,120,0.95)";
  g.textAlign = "center";
  g.textBaseline = "middle";
  const signes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    g.save();
    g.translate(c + Math.cos(a) * s * 0.445, c + Math.sin(a) * s * 0.445);
    g.rotate(a + Math.PI / 2);
    g.fillText(signes[k], 0, 0);
    g.restore();
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const b = ((k + 2) / 6) * Math.PI * 2;
    g.beginPath();
    g.moveTo(c + Math.cos(a) * s * 0.3, c + Math.sin(a) * s * 0.3);
    g.lineTo(c + Math.cos(b) * s * 0.3, c + Math.sin(b) * s * 0.3);
    g.stroke();
  }
}, 512);

export function creerBoss3D(canvas, { boss: id = "morghast", modeles = "/modeles/boss/" } = {}) {
  if (!BOSS_3D[id]) id = "morghast";
  const C = BOSS_3D[id];
  const modele = `${modeles}${id}.glb`;
  const rendu = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: "high-performance" });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit() ? 1.25 : 1.75));
  rendu.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 300);
  const cible = new THREE.Vector3(0, 6.6, 0);
  scene.add(new THREE.HemisphereLight(0xc49cff, 0x1a0820, 0.95));
  const soleil = new THREE.DirectionalLight(0xffd6a0, 1.35);
  soleil.position.set(6, 14, 12);
  scene.add(soleil);
  const contre = new THREE.PointLight(C.contre, 28, 40, 1.6);
  contre.position.set(0, 9, -6);
  scene.add(contre);
  const lueurCoeur = new THREE.PointLight(0xff6a1a, 10, 12, 1.8);
  lueurCoeur.position.set(0, 7, 3);
  scene.add(lueurCoeur);

  const boss = new THREE.Group();
  scene.add(boss);
  const parties = { tete: null, halo: null, bras: [], tentacules: [], coeur: null };
  let pret = false;

  // l'aura : une grande lueur derrière, les yeux, le flash des coups
  const texLueur = halo(C.lueur);
  const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLueur, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  lueur.scale.set(30, 30, 1);
  lueur.position.set(0, 7, -3);
  scene.add(lueur);
  const texOeil = halo(C.oeil);
  const yeux = C.yeux.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOeil, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(C.yeux.length === 1 ? 2.8 : 1.6, C.yeux.length === 1 ? 2.2 : 1.0, 1);
    s.position.fromArray(p);
    return s;
  });
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo("rgba(255,255,255,1)"), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flash.scale.set(13, 13, 1);
  flash.position.set(0, 7, 4);
  scene.add(flash);

  // le cercle de runes au sol
  const sol = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: runes(C.sol), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = -2.2;
  scene.add(sol);
  const solLueur = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshBasicMaterial({ map: halo(C.solLueur), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  solLueur.rotation.x = -Math.PI / 2;
  solLueur.position.y = -2.25;
  scene.add(solLueur);

  // les particules de l'aura (elles montent en tournant autour de lui)
  const N = petit() ? 170 : 380;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const graines = [];
  const teintes = C.aura.map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    graines.push({ a: Math.random() * Math.PI * 2, r: 2.5 + Math.random() * 5.5, y: Math.random() * 16 - 2, v: 0.8 + Math.random() * 2.2, w: (Math.random() - 0.5) * 0.8 });
    const c = teintes[i % teintes.length];
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geoAura = new THREE.BufferGeometry();
  geoAura.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geoAura.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const matAura = new THREE.PointsMaterial({ size: petit() ? 0.55 : 0.45, map: halo("rgba(255,255,255,1)"), vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const aura = new THREE.Points(geoAura, matAura);
  scene.add(aura);

  // les éclats en orbite
  const eclats = [];
  for (let k = 0; k < 10; k++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 + (k % 3) * 0.12), new THREE.MeshBasicMaterial({ color: C.aura[k % 2 ? 1 : 3] }));
    m.userData = { r: 7 + (k % 3), y: 5 + (k % 5) * 1.4, v: 0.35 + (k % 4) * 0.12, a: (k / 10) * Math.PI * 2 };
    scene.add(m);
    eclats.push(m);
  }

  // les éclairs et les ondes de choc
  const eclairs = [];
  const matEclair = new THREE.LineBasicMaterial({ color: C.eclair, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  function eclair() {
    const pts = [];
    const x0 = (Math.random() - 0.5) * 18;
    let p = new THREE.Vector3(x0, 22, -2 + Math.random() * 2);
    const fin = new THREE.Vector3((Math.random() - 0.5) * 6, 9 + Math.random() * 4, 0);
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      pts.push(new THREE.Vector3().lerpVectors(p, fin, t).add(new THREE.Vector3((Math.random() - 0.5) * 2.2 * (1 - t * 0.6), 0, (Math.random() - 0.5) * 1.2)));
    }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matEclair.clone());
    l.userData.vie = 0.22;
    scene.add(l);
    eclairs.push(l);
    flash.material.opacity = Math.max(flash.material.opacity, 0.15);
  }
  const ondes = [];
  const geoOnde = new THREE.RingGeometry(0.85, 1, 48);
  function onde(couleur = 0xff4f9a) {
    const m = new THREE.Mesh(geoOnde, new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(0, 7, 2.5);
    m.userData.vie = 0;
    scene.add(m);
    ondes.push(m);
  }

  // le modèle
  lireGLB(modele).then((d) => {
    const racine = sceneGLB(d);
    habiller(racine, { relief: () => new THREE.MeshLambertMaterial({ color: 0x888888 }), contour: 0.05 });
    racine.traverse((o) => {
      const n = (o.name || "").replace(/\.\d+$/, ""); // Blender ajoute .001 quand plusieurs boss sont dans le même fichier
      if (n === "boss_tete") { parties.tete = o; for (const y of yeux) o.add(y); }
      else if (n === "boss_halo") parties.halo = o;
      else if (n === "boss_coeur") parties.coeur = o;
      else if (n.startsWith("boss_bras")) parties.bras.push(o);
      else if (n.startsWith("boss_tentacule")) parties.tentacules.push(o);
    });
    boss.add(racine);
    pret = true;
    canvas.dispatchEvent(new CustomEvent("boss-pret"));
  }).catch((e) => canvas.dispatchEvent(new CustomEvent("boss-erreur", { detail: e })));

  let etat = "dort";
  let tApp = 99; // l'apparition : il sort du cercle de runes
  let tEtat = 0;
  let secousse = 0;
  let coup = 0;
  let prochainEclair = 2;
  let enPause = false;
  let t = 0;
  let avant = performance.now();
  let raf = 0;

  const base = new THREE.Vector3(0, 8.2, 37);
  function redimensionner() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    rendu.setSize(w, h, false);
    camera.aspect = w / h;
    const recul = 37 / Math.min(1, camera.aspect * 1.2);
    base.set(0, 8.2, recul);
    camera.position.copy(base);
    camera.updateProjectionMatrix();
  }
  redimensionner();
  const obs = new ResizeObserver(redimensionner);
  obs.observe(canvas);

  function image(now) {
    raf = enPause ? 0 : requestAnimationFrame(image);
    const dt = Math.min(0.05, (now - avant) / 1000);
    avant = now;
    t += dt;
    tEtat += dt;
    const rage = etat === "rage";
    const eveille = etat === "combat" || rage;
    const vitesse = rage ? 1.8 : eveille ? 1 : 0.35;

    // le boss : il flotte, respire, regarde autour, lève les bras ; il tombe ou s'enfuit à la fin
    let y = Math.sin(t * 0.9) * 0.45 + (eveille ? 0 : -0.6);
    let echelle = 1 + Math.sin(t * 1.6) * 0.012;
    if (tApp < 3) {
      const avantApp = tApp;
      tApp += dt;
      const k = Math.min(1, tApp / 2.2);
      y += -22 * Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 1.2;
      echelle *= 0.55 + 0.45 * k;
      secousse = Math.max(secousse, tApp < 2.3 ? 0.9 : 0);
      for (const seuil of [0.25, 0.8, 1.4, 2.0, 2.25]) if (avantApp < seuil && tApp >= seuil) { onde(seuil > 2 ? 0xffffff : C.aura[1]); eclair(); }
      if (avantApp < 2.2 && tApp >= 2.2) { flash.material.opacity = 0.8; coup = 1.4; }
    }
    if (etat === "mort") {
      // il se charge, puis explose : il gonfle, l'aura part dans tous les sens, et il disparaît
      echelle *= tEtat < 0.5 ? 1 + tEtat * 0.4 : Math.max(0.001, 1.2 - (tEtat - 0.5) * 1.6);
      secousse = Math.max(secousse, tEtat < 1.2 ? 1.4 : 0);
      y -= Math.max(0, tEtat - 1.2) * 4;
    }
    if (etat === "fuite") { y += Math.min(12, tEtat * 3); boss.position.z = -Math.min(30, tEtat * 8); } else boss.position.z = 0;
    coup = Math.max(0, coup - dt * 4);
    secousse = Math.max(0, secousse - dt * 2.5);
    boss.position.x = (Math.random() - 0.5) * secousse * 0.8;
    boss.position.y = y + (Math.random() - 0.5) * secousse * 0.4;
    boss.scale.set(echelle * (1 + coup * 0.05), echelle * (1 - coup * 0.06), echelle);
    boss.rotation.y = Math.sin(t * 0.35) * 0.18;
    if (parties.tete) { parties.tete.rotation.y = Math.sin(t * 0.7 * vitesse) * 0.25; parties.tete.rotation.x = Math.sin(t * 0.5) * 0.06 - coup * 0.15; }
    if (parties.halo) parties.halo.rotation.z += dt * 0.5 * vitesse;
    parties.bras.forEach((b, k) => { const s = b.position.x < 0 ? -1 : 1; b.rotation.z = s * (Math.sin(t * 1.3 * vitesse + k) * 0.1 + (eveille ? 0.05 : -0.25)); b.rotation.x = Math.sin(t * 0.9 + k) * 0.06; });
    parties.tentacules.forEach((p, k) => { const ph = p.userData.phase || k; p.rotation.x = Math.sin(t * 1.4 * vitesse + ph) * 0.16; p.rotation.z = Math.cos(t * 1.1 * vitesse + ph) * 0.16; });
    if (parties.coeur) { const b = 1 + Math.max(0, Math.sin(t * (rage ? 9 : 5))) * 0.18 + coup * 0.4; parties.coeur.scale.setScalar(b); }
    for (const o of yeux) o.material.opacity = eveille ? 0.75 + Math.sin(t * 7) * 0.2 + (rage ? 0.2 : 0) : 0.12;
    lueurCoeur.intensity = (eveille ? 9 : 3) + Math.sin(t * 5) * 3 + coup * 14;

    // l'aura
    const p = geoAura.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const g = graines[i];
      g.y += dt * g.v * vitesse * (eveille ? 1.6 : 0.6);
      g.a += dt * (0.4 + g.w) * vitesse;
      if (etat === "mort" && tEtat > 0.5) { g.r += dt * (10 + g.v * 6); g.y += dt * g.w * 10; } // l'explosion
      else if (g.y > 17 || g.r > 9) { g.y = -2; g.r = 2.5 + Math.random() * 5.5; }
      const r = g.r * (1 - Math.max(0, g.y - 10) * 0.04);
      p[i * 3] = Math.cos(g.a) * r;
      p[i * 3 + 1] = g.y + boss.position.y;
      p[i * 3 + 2] = Math.sin(g.a) * r * 0.7 + boss.position.z;
    }
    geoAura.attributes.position.needsUpdate = true;
    matAura.opacity = etat === "mort" || etat === "fuite" ? Math.max(0, 0.9 - tEtat * 0.4) : eveille ? 0.95 : 0.35;
    lueur.material.color.setHex(rage ? 0xff3030 : 0xffffff);
    lueur.material.opacity = (eveille ? 0.5 : 0.2) + Math.sin(t * 2) * 0.06 + coup * 0.15;
    lueur.position.y = 7 + boss.position.y;
    sol.rotation.z += dt * 0.25 * vitesse;
    sol.material.opacity = eveille ? 0.85 : 0.3;
    solLueur.material.opacity = (eveille ? 0.5 : 0.18) + Math.sin(t * 3) * 0.08;
    for (const e of eclats) {
      const u = e.userData;
      u.a += dt * u.v * vitesse;
      e.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t + u.a) * 0.8 + boss.position.y, Math.sin(u.a) * u.r * 0.6 + boss.position.z);
      e.rotation.x += dt * 2;
      e.rotation.y += dt * 1.4;
      e.visible = etat !== "mort";
    }
    // éclairs et ondes
    if (eveille) {
      prochainEclair -= dt;
      if (prochainEclair <= 0) { eclair(); prochainEclair = (rage ? 0.6 + Math.random() * 1.2 : 2 + Math.random() * 3.5) / C.eclairs; }
    }
    for (let k = eclairs.length - 1; k >= 0; k--) {
      const l = eclairs[k];
      l.userData.vie -= dt;
      l.material.opacity = Math.max(0, l.userData.vie / 0.22);
      if (l.userData.vie <= 0) { scene.remove(l); l.geometry.dispose(); l.material.dispose(); eclairs.splice(k, 1); }
    }
    for (let k = ondes.length - 1; k >= 0; k--) {
      const o = ondes[k];
      o.userData.vie += dt;
      const s = 1 + o.userData.vie * 22;
      o.scale.set(s, s, s);
      o.material.opacity = Math.max(0, 0.9 - o.userData.vie * 1.6);
      o.lookAt(camera.position);
      if (o.userData.vie > 0.6) { scene.remove(o); o.material.dispose(); ondes.splice(k, 1); }
    }
    flash.material.opacity = Math.max(0, flash.material.opacity - dt * 3);
    if (etat === "mort" && tEtat < 0.3) flash.material.opacity = 1;
    // la caméra tourne doucement autour de lui, et tremble avec lui
    camera.position.x = base.x + Math.sin(t * 0.13) * 5 + (Math.random() - 0.5) * secousse * 0.5;
    camera.position.y = base.y + Math.sin(t * 0.21) * 0.8 + (Math.random() - 0.5) * secousse * 0.4;
    camera.position.z = base.z - coup * 1.2;
    camera.lookAt(cible);
    rendu.render(scene, camera);
  }
  raf = requestAnimationFrame(image);

  return {
    boss: id,
    pret: () => pret,
    apparition() { tApp = 0; },
    etat(e) {
      if (e === etat) return;
      etat = e;
      tEtat = 0;
      if (e === "rage") { eclair(); eclair(); onde(0xff3030); }
      if (e === "mort") { for (let k = 0; k < 7; k++) setTimeout(() => { onde(C.aura[k % 4]); if (k % 2) eclair(); }, 400 + k * 120); setTimeout(() => { flash.material.opacity = 1; }, 500); }
      if (e === "fuite") { eclair(); onde(C.aura[0]); }
      if (e === "combat" || e === "dort") { boss.position.z = 0; }
    },
    frappe(force = 1) {
      coup = Math.min(1.5, coup + 0.6 * force);
      secousse = Math.min(1.6, secousse + 0.5 * force);
      flash.material.opacity = Math.min(0.4, flash.material.opacity + 0.12 * force);
      if (ondes.length < 6) onde(force > 1.5 ? 0xffd36b : 0xff4f9a);
    },
    pause(oui) {
      if (oui === enPause) return;
      enPause = oui;
      if (!oui) { avant = performance.now(); raf = requestAnimationFrame(image); }
    },
    redimensionner,
    arreter() { cancelAnimationFrame(raf); enPause = true; obs.disconnect(); rendu.dispose(); },
  };
}
