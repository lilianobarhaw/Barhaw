// BOSS LIVE : MORGHAST en 3D (modèle Blender modeles/boss/boss.glb) et ses effets : aura qui monte, halo qui tourne,
// éclats en orbite, éclairs, cercle de runes au sol, onde de choc et flash à chaque coup, rage (rouge), mort, fuite.
// creerBoss3D(canvas) → { etat("dort"|"combat"|"rage"|"mort"|"fuite"), frappe(force), pause(oui), redimensionner(), arreter() }
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller } from "./grandline-3d.js";

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
const runes = () => texture((g, s) => {
  const c = s / 2;
  g.strokeStyle = "rgba(255,120,200,0.95)";
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

export function creerBoss3D(canvas, { modele = "/modeles/boss/boss.glb" } = {}) {
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
  const contre = new THREE.PointLight(0xff3d8e, 28, 40, 1.6);
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
  const texLueur = halo("rgba(180,70,255,1)");
  const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLueur, color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  lueur.scale.set(30, 30, 1);
  lueur.position.set(0, 7, -3);
  scene.add(lueur);
  const texOeil = halo("rgba(255,60,40,1)");
  const yeux = [-0.5, 0.5].map((x) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOeil, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(1.6, 1.0, 1);
    s.position.set(x, 10.2, 1.8);
    return s;
  });
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo("rgba(255,255,255,1)"), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  flash.scale.set(13, 13, 1);
  flash.position.set(0, 7, 4);
  scene.add(flash);

  // le cercle de runes au sol
  const sol = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ map: runes(), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.y = -2.2;
  scene.add(sol);
  const solLueur = new THREE.Mesh(new THREE.CircleGeometry(11, 48), new THREE.MeshBasicMaterial({ map: halo("rgba(255,60,160,0.9)"), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  solLueur.rotation.x = -Math.PI / 2;
  solLueur.position.y = -2.25;
  scene.add(solLueur);

  // les particules de l'aura (elles montent en tournant autour de lui)
  const N = petit() ? 170 : 380;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const graines = [];
  const teintes = [new THREE.Color(0xb46bff), new THREE.Color(0xff4f9a), new THREE.Color(0xff8a3d), new THREE.Color(0xffd36b)];
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
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32 + (k % 3) * 0.12), new THREE.MeshBasicMaterial({ color: k % 2 ? 0xff4f9a : 0xffd36b }));
    m.userData = { r: 7 + (k % 3), y: 5 + (k % 5) * 1.4, v: 0.35 + (k % 4) * 0.12, a: (k / 10) * Math.PI * 2 };
    scene.add(m);
    eclats.push(m);
  }

  // les éclairs et les ondes de choc
  const eclairs = [];
  const matEclair = new THREE.LineBasicMaterial({ color: 0xe6c8ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
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
      const n = o.name || "";
      if (n === "boss_tete") { parties.tete = o; for (const y of yeux) { y.position.sub(o.position); o.add(y); } }
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
  let tEtat = 0;
  let secousse = 0;
  let coup = 0;
  let prochainEclair = 2;
  let enPause = false;
  let t = 0;
  let avant = performance.now();
  let raf = 0;

  function redimensionner() {
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 400;
    rendu.setSize(w, h, false);
    camera.aspect = w / h;
    const recul = 37 / Math.min(1, camera.aspect * 1.2);
    camera.position.set(0, 8.2, recul);
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
    if (etat === "mort") { y -= Math.min(14, tEtat * tEtat * 3); echelle *= Math.max(0.2, 1 - tEtat * 0.25); }
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
      if (g.y > 17) { g.y = -2; g.r = 2.5 + Math.random() * 5.5; }
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
      if (prochainEclair <= 0) { eclair(); prochainEclair = rage ? 0.6 + Math.random() * 1.2 : 2 + Math.random() * 3.5; }
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
    camera.lookAt(cible);
    rendu.render(scene, camera);
  }
  raf = requestAnimationFrame(image);

  return {
    pret: () => pret,
    etat(e) {
      if (e === etat) return;
      etat = e;
      tEtat = 0;
      if (e === "rage") { eclair(); eclair(); onde(0xff3030); }
      if (e === "mort") { for (let k = 0; k < 4; k++) setTimeout(() => onde(k % 2 ? 0xffd36b : 0xff4f9a), k * 140); }
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
