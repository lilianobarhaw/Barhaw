// La Guerre des commus (VF 1.0), en 3D : la table de guerre. La mer de GRAND LINE sur sa feuille de parchemin, les îles
// de GRAND LINE (les mêmes modèles « niveau 5 », en version légère : on les voit de loin), un drapeau aux couleurs de la
// commu qui tient chaque île, un anneau de sa couleur sur l'eau, et le navire de chaque commu devant son port.
// Ce module ne fait que dessiner ce que site.js lui donne (les données du bot) : il dit quand on survole ou qu'on clique
// une île, et où sont les îles à l'écran (les étiquettes sont en HTML, dans site.js). Tout est inventé.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller, animateurs, themeNavire, toile, materiauMer, roseDesVents, temps5, eclairage5 } from "./grandline-3d.js";

const W = 236; // la feuille (la même que GRAND LINE)
const H = 146;
const MER_X = 104; // la mer : de −104 à 104 en x, de −58 à 58 en z
const MER_Z = 58;
const OR = 0xffd36b;
const hexa = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c).toLowerCase() : d);
// la houle, la même que dans le shader de la mer : ce qui flotte monte et descend avec elle
const houle = (x, z, s) => Math.sin(x * 0.33 + s * 0.9) * 0.09 + Math.sin(z * 0.41 - s * 1.1) * 0.07;

// le drapeau d'une commu, dessiné ici : ses deux couleurs, une étoile d'or et son emblème (ou son image, si elle en a une)
function toileDrapeau(c, image = null) {
  const c1 = hexa(c?.c1, "#9b4dff"), c2 = hexa(c?.c2, "#ff4f9a");
  const embleme = String(c?.embleme || "?").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
  return toile(256, 168, (x, l, h) => {
    x.fillStyle = c1; x.fillRect(0, 0, l, h);
    x.fillStyle = c2; x.beginPath(); x.moveTo(0, h); x.lineTo(l, h * 0.58); x.lineTo(l, h); x.closePath(); x.fill();
    if (image) {
      // son drapeau à elle (une image carrée) : au milieu, sur ses couleurs
      const t = h * 0.86;
      x.drawImage(image, (l - t) / 2, (h - t) / 2, t, t);
    } else {
      x.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const r = k % 2 ? 26 : 60; x.lineTo(l / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
      x.closePath(); x.fillStyle = "#ffd36b"; x.fill(); x.lineWidth = 5; x.strokeStyle = "#12050d"; x.stroke();
      x.font = `900 ${embleme.length > 1 ? 28 : 40}px 'Dela Gothic One', Arial Black, sans-serif`;
      x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#12050d"; x.fillText(embleme, l / 2, h / 2 + 5);
    }
    // l'usure : un peu de grain et des bords plus sombres
    const g = x.createLinearGradient(0, 0, l, 0);
    g.addColorStop(0, "rgba(0,0,0,.18)"); g.addColorStop(0.15, "rgba(0,0,0,0)"); g.addColorStop(0.9, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.22)");
    x.fillStyle = g; x.fillRect(0, 0, l, h);
  });
}
// une île libre : un fanion de toile écrue, sans rien dessus
let toileLibre = null;
const drapeauLibre = () => (toileLibre ||= toile(128, 84, (x, l, h) => {
  x.fillStyle = "#e9dcc0"; x.fillRect(0, 0, l, h);
  x.strokeStyle = "rgba(120,90,60,.45)"; x.lineWidth = 3; x.setLineDash([7, 6]); x.strokeRect(6, 6, l - 12, h - 12);
}));

// la toile qui flotte au vent : les plis avancent le long du drapeau, plus forts au bout
function materiauDrapeau(uT, map) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uT, uMap: { value: map } },
    vertexShader: `
      uniform float uT; varying vec2 vUv; varying float vPli;
      void main() {
        vUv = uv;
        vec3 p = position;
        float bout = uv.x;
        float pli = sin(uv.x * 6.5 - uT * 4.2 + uv.y * 0.8);
        p.z += pli * 0.42 * bout;
        p.y += sin(uv.x * 4.0 - uT * 2.6) * 0.1 * bout - bout * bout * 0.18;
        vPli = pli * bout;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap; varying vec2 vUv; varying float vPli;
      void main() { vec3 c = texture2D(uMap, vUv).rgb; gl_FragColor = vec4(c * (0.86 + 0.16 * vPli), 1.0); }`,
  });
}
// la couronne de la commu qui règne : un cercle d'or et ses pointes (tout est dessiné ici)
function couronne() {
  const or = new THREE.MeshStandardMaterial({ color: OR, metalness: 0.75, roughness: 0.28, emissive: 0x4a2c00, emissiveIntensity: 0.6 });
  const rubis = new THREE.MeshStandardMaterial({ color: 0xff2d55, metalness: 0.2, roughness: 0.2, emissive: 0x5a0010 });
  const g = new THREE.Group();
  const cercle = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, 0.9, 32, 1, true), or);
  cercle.material.side = THREE.DoubleSide;
  g.add(cercle);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 8), or);
    pointe.position.set(Math.cos(a) * 1.42, 0.95, Math.sin(a) * 1.42);
    const perle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), or);
    perle.position.set(Math.cos(a) * 1.42, 1.55, Math.sin(a) * 1.42);
    const pierre = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), rubis);
    pierre.position.set(Math.cos(a + Math.PI / 5) * 1.5, 0.05, Math.sin(a + Math.PI / 5) * 1.5);
    g.add(pointe, perle, pierre);
  }
  return g;
}

export function creerGuerre3D(canvas, { iles = [], navires = [], surIle = () => {}, surSurvol = () => {}, placer = () => {}, reduit = false, leger = false, echelle = 1.35, modeles = "/modeles/grandline/" } = {}) {
  const ratio = Math.min(leger ? 1.25 : 1.5, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 1, 2000);
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4);
  soleil.position.set(-60, 120, 40);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a4a6a, 1.15), soleil);
  let detruit = false;
  const erreurs = [];
  const uT = { value: 0 };

  // ---------- la feuille et la mer (celle de GRAND LINE, en mode « cinéma ») ----------
  const uMer = {
    uT, uSombre: { value: 0 }, uNuit: { value: 0 }, uOr: { value: 0 }, uReflet: { value: 0 }, uVie: { value: 1 }, uCine: { value: 1 },
    uRive: { value: Array.from({ length: 24 }, () => 2) }, uIles: { value: Array.from({ length: 24 }, () => new THREE.Vector3(0, 0, 0)) },
  };
  const merGeo = new THREE.PlaneGeometry(W, H, leger ? 120 : 180, leger ? 74 : 110);
  merGeo.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(merGeo, materiauMer(uMer)), roseDesVents());

  // ---------- les îles ----------
  const lireLeger = (nom) => lireGLB(`${modeles}${nom}-leger.glb`).catch(() => lireGLB(`${modeles}${nom}.glb`));
  const matRelief = new THREE.MeshBasicMaterial({ color: 0xd8c08a });
  const touche = new THREE.MeshBasicMaterial({ visible: false });
  const zones = []; // les cylindres invisibles qu'on vise à la souris
  const parIle = new Map();
  iles.forEach((d, k) => {
    const r = (Number(d.r) || 8) * echelle;
    const groupe = new THREE.Group();
    groupe.position.set(d.x, 0, d.z);
    scene.add(groupe);
    // les îles un peu plus grandes que sur GRAND LINE : on les voit toutes de loin
    const socle = new THREE.Group();
    socle.scale.setScalar(echelle);
    groupe.add(socle);
    // en attendant le modèle : un banc de sable
    const attente = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62 / echelle, r * 0.78 / echelle, 1.2, 28), new THREE.MeshLambertMaterial({ color: 0xe8d3a0 }));
    attente.position.y = 0.1;
    socle.add(attente);
    const zone = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.2, r + 1.2, 14, 16), touche);
    zone.position.y = 5;
    zone.userData.ile = d.id;
    groupe.add(zone);
    zones.push(zone);
    if (k < 24) uMer.uIles.value[k].set(d.x, d.z, r * 0.92);
    const i = { ...d, r, k, groupe, attente, haut: 6, anims: [], drapeau: null, anneau: null, cle: "" };
    parIle.set(d.id, i);
    lireLeger(d.modele).then((glb) => {
      if (detruit) return;
      const modele = sceneGLB(glb);
      const { bouge, reperes } = habiller(modele, { relief: () => matRelief, cuit: glb.cuit, ile: true });
      const boite = new THREE.Box3().setFromObject(modele);
      // une île « niveau 5 » a sa vraie côte : la mer connaît sa taille et sa nature (un port, une île naturelle)
      const mer5 = reperes.find((x) => x.userData.anim === "mer")?.userData;
      const rMer = (mer5?.rayon ?? Math.max(boite.max.x - boite.min.x, boite.max.z - boite.min.z) * 0.47) * echelle;
      modele.userData.rMer = rMer;
      if (k < 24) { uMer.uIles.value[k].z = rMer; uMer.uRive.value[k] = mer5?.genre ?? 2; }
      socle.remove(attente);
      attente.geometry.dispose();
      socle.add(modele);
      i.anims = animateurs(bouge);
      i.haut = Math.max(6, boite.max.y * echelle + 1);
      i.obj = modele;
      if (i.drapeau) placerDrapeau(i);
      demander();
    }).catch((e) => { erreurs.push(`${d.id} : ${e.message}`); });
  });

  // ---------- les drapeaux, les anneaux sur l'eau ----------
  const toiles = new Map(); // cle d'une commu → sa toile
  const images = new Map();
  function toileCommu(c) {
    const cle = `${c.id}|${c.c1}|${c.c2}|${c.embleme}|${c.drapeau || ""}`;
    if (toiles.has(cle)) return toiles.get(cle);
    const t = toileDrapeau(c);
    toiles.set(cle, t);
    // son image à elle, si elle en a une : on redessine la toile quand elle arrive
    if (c.drapeau && !images.has(c.drapeau)) {
      const img = new Image();
      images.set(c.drapeau, img);
      img.decoding = "async";
      img.onload = () => {
        const neuve = toileDrapeau(c, img);
        t.image = neuve.image;
        t.needsUpdate = true;
        demander();
      };
      img.src = c.drapeau;
    }
    return t;
  }
  const geoToile = new THREE.PlaneGeometry(1, 0.66, 14, 6).translate(0.5, 0, 0);
  const matMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
  function creerDrapeau(i, grand) {
    const g = new THREE.Group();
    const h = grand ? 14 : 11.5;
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, h, 8), matMat);
    mat.position.y = h / 2;
    const tissu = new THREE.Mesh(geoToile, materiauDrapeau(uT, drapeauLibre()));
    tissu.scale.setScalar(grand ? 9 : 7.2);
    tissu.position.y = h - (grand ? 3.1 : 2.5);
    const boule = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), new THREE.MeshLambertMaterial({ color: OR }));
    boule.position.y = h + 0.35;
    g.add(mat, tissu, boule);
    g.userData = { tissu, h };
    return g;
  }
  // le drapeau se plante au bord de l'île, du côté qui regarde la caméra (jamais au milieu des maisons)
  function placerDrapeau(i) {
    const r = (i.obj?.userData.rMer ?? i.r) * 0.82;
    i.drapeau.position.set(Math.cos(i.angleDrapeau ?? 0.9) * r, 0.2, Math.sin(i.angleDrapeau ?? 0.9) * r);
  }
  const matAnneaux = new Map();
  function matAnneau(c, opacite) {
    const cle = `${c}|${opacite}`;
    if (!matAnneaux.has(cle)) matAnneaux.set(cle, new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: opacite, depthWrite: false }));
    return matAnneaux.get(cle);
  }
  // un anneau de rayon 1 (on le met à la taille de l'île) ; e : son épaisseur, en part du rayon
  const anneau = (e, couleur, opacite) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(1, 1 + e, 72), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: opacite, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    return m;
  };
  // le survol (blanc), l'île choisie (blanc, plus fort) et l'île de son vote (or, qui bat)
  const survolAnneau = anneau(0.06, 0xffffff, 0.45);
  const choixAnneau = anneau(0.09, 0xffffff, 0.85);
  const voteAnneau = anneau(0.12, OR, 0.9);
  for (const a of [survolAnneau, choixAnneau, voteAnneau]) { a.visible = false; scene.add(a); }
  const poserAnneau = (a, id, marge) => {
    const i = parIle.get(id);
    a.visible = Boolean(i);
    if (!i) return;
    const r = (i.obj?.userData.rMer ?? i.r) + marge;
    a.position.set(i.x, 0.24, i.z);
    a.scale.setScalar(r);
  };

  // ---------- les navires des commus, devant leur port ----------
  const flotte = new Map();
  for (const n of navires) {
    const porteur = new THREE.Group();
    porteur.position.set(n.x, 0, n.z);
    porteur.rotation.y = Number(n.cap) || 0;
    scene.add(porteur);
    const f = { ...n, porteur, anims: [], phase: flotte.size * 1.7 };
    flotte.set(n.commu, f);
    const theme = themeNavire(n.couleurs || {}, n.embleme, n.drapeau, n.modele);
    const nom = String(theme.modele).replace(/\.glb$/, "");
    lireLeger(nom).then((glb) => {
      if (detruit) return;
      const m = sceneGLB(glb);
      const { bouge } = habiller(m, { relief: () => null, contour: 0.03, theme, cuit: glb.cuit });
      const boite = new THREE.Box3().setFromObject(m);
      const long = Math.max(0.1, boite.max.x - boite.min.x);
      const g = new THREE.Group();
      g.add(m);
      g.scale.setScalar(9 / long);
      g.position.x = -((boite.max.x + boite.min.x) / 2) * (9 / long);
      porteur.add(g);
      f.anims = animateurs(bouge);
      f.haut = boite.max.y * (9 / long);
      demander();
    }).catch((e) => { erreurs.push(`navire ${n.commu} : ${e.message}`); });
  }
  const laCouronne = couronne();
  laCouronne.scale.setScalar(2.2);
  laCouronne.visible = false;
  scene.add(laCouronne);
  let regne = "";

  // ---------- ce que dit le bot : qui tient quoi ----------
  let choix = "", vote = "", survol = "";
  function maj(d = {}) {
    for (const x of d.iles || []) {
      const i = parIle.get(x.id);
      if (!i) continue;
      const c = x.commu ? { id: x.commu, c1: x.c1, c2: x.c2, embleme: x.embleme, drapeau: x.drapeau } : null;
      const cle = c ? `${c.id}|${c.c1}|${c.c2}|${c.embleme}|${c.drapeau || ""}` : "libre";
      if (cle === i.cle) continue;
      i.cle = cle;
      if (!i.drapeau) {
        i.drapeau = creerDrapeau(i, Boolean(i.port));
        i.angleDrapeau = Math.atan2(camera.position.z - i.z, camera.position.x - i.x) + 0.55;
        placerDrapeau(i);
        i.groupe.add(i.drapeau);
      }
      // une île libre n'a pas de drapeau : il se plante quand une commu la prend
      i.drapeau.visible = Boolean(c);
      i.drapeau.userData.tissu.material.uniforms.uMap.value = c ? toileCommu(c) : drapeauLibre();
      // l'anneau de sa commu, sur l'eau
      if (i.anneau) { i.groupe.remove(i.anneau); i.anneau.geometry.dispose(); i.anneau = null; }
      if (c) {
        const r = (i.obj?.userData.rMer ?? i.r) + 1.3;
        i.anneau = new THREE.Mesh(new THREE.RingGeometry(r, r + (i.port ? 1.1 : 0.75), 72), matAnneau(hexa(c.c1, "#9b4dff"), i.port ? 0.75 : 0.6));
        i.anneau.rotation.x = -Math.PI / 2;
        i.anneau.position.y = 0.2;
        i.anneau.renderOrder = 2;
        i.groupe.add(i.anneau);
      }
    }
    if ("choix" in d) choix = d.choix || "";
    if ("vote" in d) vote = d.vote || "";
    if ("regne" in d) regne = d.regne || "";
    poserAnneau(choixAnneau, choix, 2.6);
    poserAnneau(voteAnneau, vote, 3.9);
    laCouronne.visible = Boolean(regne && flotte.has(regne));
    demander();
  }

  // ---------- la caméra : toute la mer, un peu de biais ; elle suit un peu la souris ----------
  let L = 16, Hc = 9;
  const vise = new THREE.Vector3(0, 0, 3);
  const souris = new THREE.Vector2(0, 0), sourisLisse = new THREE.Vector2(0, 0);
  let distance = 220, couche = false;
  function cadrer() {
    camera.aspect = L / Hc;
    camera.updateProjectionMatrix();
    couche = L / Hc < 1; // en hauteur (un téléphone) : la mer tourne d'un quart de tour
    // on recule jusqu'à voir les quatre coins de la mer
    const coins = [[-MER_X + 6, -MER_Z + 4], [MER_X - 6, -MER_Z + 4], [-MER_X + 6, MER_Z - 4], [MER_X - 6, MER_Z - 4]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    let a = 60, b = 900;
    for (let k = 0; k < 22; k++) {
      const m = (a + b) / 2;
      placerCamera(m, 0, 0);
      camera.updateMatrixWorld();
      const dedans = coins.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 0.99 && Math.abs(p.y) <= 0.97; });
      if (dedans) b = m; else a = m;
    }
    distance = b;
    placerCamera(distance, 0, 0);
  }
  function placerCamera(d, dx, dz) {
    const pente = 0.93; // l'angle avec l'horizon (≈ 53°)
    const cible = vise.clone().add(new THREE.Vector3(dx, 0, dz));
    if (couche) camera.position.set(cible.x + Math.cos(pente) * d, cible.y + Math.sin(pente) * d, cible.z);
    else camera.position.set(cible.x, cible.y + Math.sin(pente) * d, cible.z + Math.cos(pente) * d);
    camera.up.set(0, 1, 0);
    camera.lookAt(cible);
  }
  function taille(l, h) {
    L = Math.max(1, l);
    Hc = Math.max(1, h);
    renderer.setSize(Math.round(L), Math.round(Hc), false);
    cadrer();
    demander();
  }

  // ---------- la souris : survol et clic ----------
  const rayon = new THREE.Raycaster();
  const viseur = new THREE.Vector2();
  function ileSous(e) {
    const b = canvas.getBoundingClientRect();
    viseur.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    rayon.setFromCamera(viseur, camera);
    return rayon.intersectObjects(zones, false)[0]?.object.userData.ile || "";
  }
  const auMouvement = (e) => {
    const b = canvas.getBoundingClientRect();
    souris.set(((e.clientX - b.left) / b.width) * 2 - 1, ((e.clientY - b.top) / b.height) * 2 - 1);
    const id = ileSous(e);
    if (id !== survol) {
      survol = id;
      canvas.style.cursor = id ? "pointer" : "";
      poserAnneau(survolAnneau, survol, 1.4);
      surSurvol(id);
      demander();
    }
  };
  const auClic = (e) => { const id = ileSous(e); if (id) surIle(id); };
  const auDepart = () => { souris.set(0, 0); if (survol) { survol = ""; canvas.style.cursor = ""; survolAnneau.visible = false; surSurvol(""); demander(); } };
  canvas.addEventListener("pointermove", auMouvement);
  canvas.addEventListener("click", auClic);
  canvas.addEventListener("pointerleave", auDepart);

  // ---------- l'image ----------
  let enMarche = false, raf = 0, aDessiner = true, debut = performance.now(), dernier = 0;
  let images60 = 0, lenteur = 0.016, nbImages = 0;
  const v = new THREE.Vector3();
  function dessiner(maintenant) {
    const s = (maintenant - debut) / 1000;
    const dt = Math.min(0.05, dernier ? (maintenant - dernier) / 1000 : 0.016);
    if (dernier && nbImages > 10) lenteur = lenteur * 0.95 + Math.min(0.2, (maintenant - dernier) / 1000) * 0.05;
    dernier = maintenant;
    nbImages++;
    const temps = reduit ? 0 : s;
    uT.value = temps;
    temps5.value = temps;
    eclairage5.value = 1;
    for (const i of parIle.values()) for (const a of i.anims) a(temps, dt);
    for (const f of flotte.values()) {
      f.porteur.position.y = reduit ? 0 : houle(f.x, f.z, temps) * 3;
      f.porteur.rotation.z = reduit ? 0 : Math.sin(temps * 0.9 + f.phase) * 0.035;
      f.porteur.rotation.x = reduit ? 0 : Math.sin(temps * 0.7 + f.phase) * 0.025;
      for (const a of f.anims) a(temps, dt);
    }
    if (laCouronne.visible) {
      const f = flotte.get(regne);
      laCouronne.position.set(f.x, (f.haut || 7) + 4 + (reduit ? 0 : Math.sin(temps * 1.6) * 0.5), f.z);
      laCouronne.rotation.y = reduit ? 0.4 : temps * 0.6;
    }
    // l'île de son vote bat doucement ; l'île choisie aussi, un peu
    if (voteAnneau.visible) voteAnneau.material.opacity = reduit ? 0.9 : 0.6 + 0.35 * (0.5 + 0.5 * Math.sin(temps * 3.2));
    // la caméra suit un peu la souris
    if (!reduit) {
      sourisLisse.lerp(souris, Math.min(1, dt * 2.5));
      placerCamera(distance, couche ? -sourisLisse.y * 5 : sourisLisse.x * 6, couche ? sourisLisse.x * 4 : sourisLisse.y * 4);
    }
    renderer.render(scene, camera);
    // où sont les îles à l'écran (pour les étiquettes)
    const liste = [];
    for (const i of parIle.values()) {
      v.set(i.x, i.haut + (i.drapeau?.visible ? i.drapeau.userData.h * 0.45 : 0) + 2, i.z).project(camera);
      liste.push({ id: i.id, x: (v.x * 0.5 + 0.5) * L, y: (-v.y * 0.5 + 0.5) * Hc, visible: v.z < 1 });
    }
    placer(liste);
    aDessiner = false;
  }
  function boucle(t) {
    if (!enMarche || detruit) return;
    raf = requestAnimationFrame(boucle);
    if (reduit && !aDessiner) return;
    dessiner(t);
  }
  function demander() {
    aDessiner = true;
    if (!enMarche && !detruit) requestAnimationFrame((t) => { if (!enMarche && aDessiner && !detruit) dessiner(t); });
  }
  function demarrer() {
    if (enMarche || detruit) return;
    enMarche = true;
    dernier = 0;
    raf = requestAnimationFrame(boucle);
  }
  function arreter() { enMarche = false; cancelAnimationFrame(raf); }
  function detruire() {
    arreter();
    detruit = true;
    canvas.removeEventListener("pointermove", auMouvement);
    canvas.removeEventListener("click", auClic);
    canvas.removeEventListener("pointerleave", auDepart);
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    renderer.dispose();
  }

  cadrer();
  return {
    maj, taille, demarrer, arreter, detruire,
    // l'appareil peine : moins de ~20 images par seconde après les premières
    tropLent: () => nbImages > 40 && lenteur > 0.05,
    etat: () => ({ iles: [...parIle.values()].map((i) => ({ id: i.id, modele: Boolean(i.obj), drapeau: i.cle })), navires: [...flotte.values()].map((f) => ({ commu: f.commu, modele: f.anims !== undefined && f.porteur.children.length > 0 })), erreurs: [...erreurs], choix, vote, regne, couche, distance: Math.round(distance) }),
  };
}
