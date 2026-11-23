// La Guerre des commus (VF 1.0), en 3D : la table de guerre. La mer de GRAND LINE sur sa feuille de parchemin, les îles
// de GRAND LINE (les mêmes modèles « niveau 5 », en version légère : on les voit de loin), un drapeau aux couleurs de la
// commu qui tient chaque île, un anneau de sa couleur sur l'eau, et le navire de chaque commu devant son port.
// Ce module ne fait que dessiner ce que site.js lui donne (les données du bot) : il dit quand on survole ou qu'on clique
// une île, et où sont les îles à l'écran (les étiquettes sont en HTML, dans site.js). Tout est inventé.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller, animateurs, themeNavire, toile, pastille, materiauMer, roseDesVents, temps5, eclairage5 } from "./grandline-3d.js";

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
    g.userData = { tissu, h, haut: tissu.position.y };
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
  // une île passe à une commu (c : { id, c1, c2, embleme, drapeau }), ou redevient libre (null)
  function poserCommu(i, c) {
    const cle = c ? `${c.id}|${c.c1}|${c.c2}|${c.embleme}|${c.drapeau || ""}` : "libre";
    if (cle === i.cle) return false;
    i.cle = cle;
    if (c) couleursCommus.set(c.id, c);
    {
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
    demander();
    return true;
  }
  const couleursCommus = new Map();
  function deboutDrapeau(i) {
    if (!i.drapeau) return;
    i.drapeau.scale.set(1, 1, 1);
    i.drapeau.userData.tissu.position.y = i.drapeau.userData.haut;
  }
  function maj(d = {}) {
    for (const x of bataille ? [] : d.iles || []) {
      const i = parIle.get(x.id);
      if (!i) continue;
      poserCommu(i, x.commu ? { id: x.commu, c1: x.c1, c2: x.c2, embleme: x.embleme, drapeau: x.drapeau } : null);
      deboutDrapeau(i);
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
  let distance = 220, couche = false, zoomCam = 1;
  const viseRepos = new THREE.Vector3(0, 0, 3);
  function cadrer() {
    camera.aspect = L / Hc;
    camera.updateProjectionMatrix();
    couche = L / Hc < 1; // en hauteur (un téléphone) : la mer tourne d'un quart de tour
    // on recule jusqu'à voir les quatre coins de la mer
    const coins = [[-MER_X + 6, -MER_Z + 4], [MER_X - 6, -MER_Z + 4], [-MER_X + 6, MER_Z - 4], [MER_X - 6, MER_Z - 4]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const garde = vise.clone();
    vise.set(0, 0, 3);
    let a = 60, b = 900;
    for (let k = 0; k < 22; k++) {
      const m = (a + b) / 2;
      placerCamera(m, 0, 0);
      camera.updateMatrixWorld();
      const dedans = coins.every((c) => { const p = c.clone().project(camera); return Math.abs(p.x) <= 0.99 && Math.abs(p.y) <= 0.97; });
      if (dedans) b = m; else a = m;
    }
    distance = b;
    vise.copy(garde);
    placerCamera(distance * zoomCam, 0, 0);
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

  // ---------- la bataille de 21 h, rejouée sur la carte ----------
  // Les flottes partent des ports (trois navires de la commu), la route se dessine sur l'eau ; puis, île par île (la
  // caméra s'en approche), les canons tonnent : prise, l'ancien drapeau descend le long du mât et le nouveau monte ;
  // tenue, un bouclier de lumière ; renforcée, des étincelles d'or. b : une bataille du journal du bot ;
  // couleurs : commu → { c1, c2, embleme, drapeau } ; surCombat(île, k) quand les canons tonnent sur une île,
  // surEtape(île, k) quand son sort est joué ; fin() : c'est fini (aussi quand on passe).
  const effets = []; // des fonctions (dt) → false quand l'effet est fini
  let bataille = null, agite = false, agiteT = 0;
  const VOYAGE = 3, PAS = 2.6, BOUM = 1; // 3 s de mer, puis une île toutes les 2,6 s (son sort après 1 s de canons)
  function eclat(x, y, z, { couleur = 0xffb347, taille = 4, vie = 0.35, monte = 0, ajout = true, retard = 0 } = {}) {
    let t = -retard;
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: couleur, transparent: true, depthWrite: false, opacity: 0, blending: ajout ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.position.set(x, y, z);
    m.scale.setScalar(taille * 0.3);
    m.visible = false;
    scene.add(m);
    effets.push((dt) => {
      t += dt;
      if (t < 0) return true;
      const f = Math.min(1, t / vie);
      m.visible = true;
      m.position.y = y + monte * f;
      m.scale.setScalar(taille * (0.3 + 0.9 * Math.sqrt(f)));
      m.material.opacity = (1 - f) * (ajout ? 1 : 0.7);
      if (f >= 1) { scene.remove(m); m.material.dispose(); return false; }
      return true;
    });
  }
  // une onde sur l'eau autour d'une île (la couleur de la commu qui la prend ; blanche : elle a tenu ; or : renforcée)
  function onde(i, couleur, retard = 0) {
    const r = (i.obj?.userData.rMer ?? i.r) + 1;
    const m = new THREE.Mesh(new THREE.RingGeometry(1, 1.07, 72), new THREE.MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(i.x, 0.3, i.z);
    m.renderOrder = 4;
    scene.add(m);
    let t = -retard;
    effets.push((dt) => {
      t += dt;
      if (t < 0) return true;
      const f = Math.min(1, t / 0.9);
      m.scale.setScalar(r * (1 + f * 0.8));
      m.material.opacity = 0.95 * (1 - f);
      if (f >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      return true;
    });
  }
  // l'île a tenu : un dôme de lumière s'allume puis s'éteint
  function bouclier(i) {
    const r = (i.obj?.userData.rMer ?? i.r) + 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.position.set(i.x, 0, i.z);
    m.scale.set(r, r * 0.75, r);
    scene.add(m);
    let t = 0;
    effets.push((dt) => {
      t += dt;
      const f = Math.min(1, t / 1.2);
      m.material.opacity = 0.42 * (f < 0.18 ? f / 0.18 : 1 - (f - 0.18) / 0.82);
      if (f >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
      return true;
    });
  }
  // des étincelles qui montent (aux couleurs de la commu qui prend l'île, ou d'or quand elle la renforce)
  function etincelles(i, couleurs, n = 14) {
    const r = (i.obj?.userData.rMer ?? i.r) * 0.7;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, d = r * Math.random();
      eclat(i.x + Math.cos(a) * d, i.haut * 0.6, i.z + Math.sin(a) * d, { couleur: couleurs[k % couleurs.length], taille: 2.4, vie: 1.1 + Math.random() * 0.4, monte: 9 + Math.random() * 7, retard: Math.random() * 0.35 });
    }
  }
  // le drapeau change de main : la toile descend le long du mât, la nouvelle monte ; sur une île libre, le mât sort de terre
  function changerDrapeau(i, c) {
    const avait = Boolean(i.drapeau?.visible);
    let t = 0, pose = false;
    effets.push((dt) => {
      t += dt;
      if (!pose && (!avait || t >= 0.35)) {
        pose = true;
        poserCommu(i, c);
        if (i.drapeau && !avait) i.drapeau.scale.set(1, 0.02, 1);
      }
      const g = i.drapeau;
      if (!g) return t < 1.2;
      const u = g.userData, bas = u.h * 0.22;
      if (!pose) u.tissu.position.y = u.haut + (bas - u.haut) * Math.min(1, t / 0.35);
      else if (!avait) {
        g.scale.y = Math.min(1, 0.02 + t / 0.3);
        u.tissu.position.y = bas + (u.haut - bas) * Math.max(0, Math.min(1, (t - 0.3) / 0.45));
      } else u.tissu.position.y = bas + (u.haut - bas) * Math.min(1, (t - 0.35) / 0.45);
      const fini = pose && g.scale.y >= 1 && u.tissu.position.y >= u.haut - 1e-3;
      if (fini) deboutDrapeau(i);
      return !fini;
    });
  }
  // une petite flotte : trois navires de la commu (le même modèle que devant son port, en plus petit), en V
  function creerFlottille(commu, depart, cible, k, ile) {
    const f = flotte.get(commu);
    const couleur = new THREE.Color(couleursCommus.get(commu)?.c1 || "#ffffff");
    const g = new THREE.Group();
    scene.add(g);
    const dir = new THREE.Vector2(cible.x - depart.x, cible.z - depart.z);
    const long = dir.length() || 1;
    dir.divideScalar(long);
    const rd = (depart.obj?.userData.rMer ?? depart.r) + 3, rc = (cible.obj?.userData.rMer ?? cible.r) + 5;
    const a = new THREE.Vector3(depart.x + dir.x * rd, 0, depart.z + dir.y * rd);
    const b = new THREE.Vector3(cible.x - dir.x * rc, 0, cible.z - dir.y * rc);
    const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(-dir.y, 0, dir.x).multiplyScalar(long * 0.16 * (k % 2 ? 1 : -1)));
    const courbe = new THREE.QuadraticBezierCurve3(a, m, b);
    const navires = [];
    const modele = f?.porteur.children[0];
    for (let n = 0; n < 3; n++) {
      let o;
      if (modele) { o = modele.clone(); o.scale.multiplyScalar(0.6); }
      else { o = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 6), new THREE.MeshLambertMaterial({ color: couleur })); o.rotation.z = -Math.PI / 2; o.userData.aJeter = true; }
      const porteur = new THREE.Group();
      porteur.add(o);
      g.add(porteur);
      navires.push({ porteur, decal: (n - 1) * 2.6, retard: n * 0.07 });
    }
    // la route, en pointillés de sa couleur, qui se dessine derrière eux
    const ligne = new THREE.Line(new THREE.BufferGeometry().setFromPoints(courbe.getPoints(60).map((p) => p.setY(0.35))), new THREE.LineDashedMaterial({ color: couleur, dashSize: 1.6, gapSize: 1.1, transparent: true, opacity: 0.9 }));
    ligne.computeLineDistances();
    ligne.geometry.setDrawRange(0, 0);
    g.add(ligne);
    return { g, courbe, navires, ligne, sillage: 0, ile, part: 0 };
  }
  const tangente = new THREE.Vector3(), cote = new THREE.Vector3();
  function majFlottille(F, u, temps, dt) {
    F.ligne.geometry.setDrawRange(0, Math.floor(61 * Math.min(1, u * 1.02)));
    // l'île est jouée : la flotte s'efface (elle a pris l'île, ou elle a sombré)
    if (F.part) {
      F.part = Math.min(1, F.part + dt / 0.6);
      for (const n of F.navires) n.porteur.scale.setScalar(Math.max(0.001, 1 - F.part));
      F.ligne.material.opacity = 0.9 * (1 - F.part);
      F.g.visible = F.part < 1;
    }
    for (const n of F.navires) {
      const v = Math.max(0, Math.min(1, (u - n.retard) / (1 - n.retard)));
      const e = v * v * (3 - 2 * v);
      const p = F.courbe.getPoint(e);
      F.courbe.getTangent(Math.min(0.999, e), tangente);
      cote.set(-tangente.z, 0, tangente.x).multiplyScalar(n.decal);
      n.porteur.position.set(p.x + cote.x - tangente.x * Math.abs(n.decal) * 0.8, houle(p.x, p.z, temps) * 3, p.z + cote.z - tangente.z * Math.abs(n.decal) * 0.8);
      n.porteur.rotation.y = Math.atan2(-tangente.z, tangente.x);
      n.porteur.rotation.z = Math.sin(temps * 2 + n.decal) * 0.05;
    }
    // le sillage : un peu d'écume derrière chaque navire (moins sur un petit appareil)
    F.sillage += dt;
    if (u < 1 && F.sillage > (leger ? 0.2 : 0.12)) {
      F.sillage = 0;
      for (const n of F.navires) eclat(n.porteur.position.x, 0.3, n.porteur.position.z, { couleur: 0xffffff, taille: 2.2, vie: 0.8, ajout: false });
    }
  }
  function jouerBataille(b, { couleurs = {}, surCombat = () => {}, surEtape = () => {}, fin = () => {} } = {}) {
    arreterBataille(false);
    for (const [c, x] of Object.entries(couleurs)) couleursCommus.set(c, { id: c, ...x });
    const evts = (b?.iles || []).filter((y) => parIle.has(y.ile) && (y.attaques?.length || y.renfort));
    const commuDe = (id) => (id ? { id, ...(couleursCommus.get(id) || {}) } : null);
    // la carte d'avant la bataille, pour les îles qui vont se battre
    for (const y of evts) { const i = parIle.get(y.ile); poserCommu(i, commuDe(y.avant?.commu)); deboutDrapeau(i); }
    const flottilles = [];
    evts.forEach((y) => {
      const venues = [...(y.attaques || []).map((a) => a.commu), ...(y.renfort && y.avant?.commu ? [y.avant.commu] : [])];
      for (const c of venues) {
        const port = [...parIle.values()].find((i) => i.port === c);
        if (port) flottilles.push(creerFlottille(c, port, parIle.get(y.ile), flottilles.length, y.ile));
      }
    });
    bataille = { t: 0, evts, flottilles, k: -1, prochain: VOYAGE, fini: false, finT: 0, surCombat, surEtape, fin, commuDe };
    demarrerSiBesoin();
    return () => arreterBataille(true);
  }
  function etapeBataille(B, y, k) {
    const i = parIle.get(y.ile);
    const r = (i.obj?.userData.rMer ?? i.r);
    B.surCombat(y, k);
    // les canons : des éclairs et de la fumée tout autour de l'île (et un peu sur l'île, quand on la défend)
    const coups = y.attaques?.length ? (leger ? 8 : 12) : 0;
    for (let n = 0; n < coups; n++) {
      const a = Math.random() * Math.PI * 2, d = r * (0.55 + Math.random() * 0.75), x = i.x + Math.cos(a) * d, z = i.z + Math.sin(a) * d;
      const retard = (n / coups) * 0.85;
      eclat(x, 2 + Math.random() * 3, z, { couleur: 0xffc46b, taille: 5 + Math.random() * 3, vie: 0.28, retard });
      eclat(x, 2.5, z, { couleur: 0x8a8a96, taille: 5.5, vie: 1.5, monte: 6, ajout: false, retard: retard + 0.05 });
    }
    let t = 0;
    effets.push((dt) => {
      t += dt;
      if (t < BOUM) return true;
      const apres = B.commuDe(y.apres?.commu);
      for (const F of B.flottilles) if (F.ile === y.ile && !F.part) F.part = 0.001;
      if (y.prise) {
        changerDrapeau(i, apres);
        onde(i, new THREE.Color(apres?.c1 || "#ffd36b"));
        onde(i, new THREE.Color(apres?.c2 || "#ffffff"), 0.18);
        etincelles(i, [new THREE.Color(apres?.c1 || "#ffd36b"), new THREE.Color(apres?.c2 || "#ffffff")], leger ? 10 : 16);
      } else if (y.attaques?.length) { bouclier(i); onde(i, 0xffffff); }
      else { onde(i, OR); etincelles(i, [new THREE.Color(OR)], leger ? 8 : 12); }
      if (bataille === B) B.surEtape(y, k);
      return false;
    });
  }
  function majBataille(dt, temps) {
    const B = bataille;
    if (!B) {
      // la caméra revient sur toute la mer
      viseRepos.set(0, 0, 3);
      vise.lerp(viseRepos, Math.min(1, dt * 2));
      zoomCam += (1 - zoomCam) * Math.min(1, dt * 2);
      return;
    }
    B.t += dt;
    for (const F of B.flottilles) majFlottille(F, Math.min(1, B.t / VOYAGE), temps, dt);
    while (!B.fini && B.t >= B.prochain) {
      B.k++;
      if (B.k < B.evts.length) { etapeBataille(B, B.evts[B.k], B.k); B.prochain += PAS; }
      else { B.fini = true; B.finT = B.t; }
    }
    if (B.fini && B.t >= B.finT + 0.4) { const f = B.fin; arreterBataille(false); f(); return; }
    // la caméra s'approche de l'île qui se bat (et reste sur toute la mer pendant que les flottes voguent)
    // (sans sortir de la mer : le bord de la feuille et le ciel restent hors du cadre)
    const i = !B.fini && B.k >= 0 ? parIle.get(B.evts[B.k].ile) : null;
    viseRepos.set(i ? Math.max(-40, Math.min(40, i.x * 0.8)) : 0, 0, i ? Math.max(-19, Math.min(21, i.z * 0.8)) : 3);
    vise.lerp(viseRepos, Math.min(1, dt * 2.2));
    zoomCam += ((i ? 0.66 : 0.96) - zoomCam) * Math.min(1, dt * 2.2);
  }
  function arreterBataille(sauter) {
    const B = bataille;
    if (!B) return;
    bataille = null;
    for (const F of B.flottilles) {
      scene.remove(F.g);
      F.ligne.geometry.dispose();
      F.ligne.material.dispose();
      F.g.traverse((o) => { if (o.userData.aJeter) { o.geometry.dispose(); o.material.dispose(); } });
    }
    // les effets en cours se finissent d'un coup (un drapeau à moitié levé ne reste pas en l'air)
    for (let n = 0; n < 4 && effets.length; n++) for (let k = effets.length - 1; k >= 0; k--) if (effets[k](10) === false) effets.splice(k, 1);
    if (sauter) {
      // on passe : chaque île prend son sort
      for (const y of B.evts) { const i = parIle.get(y.ile); poserCommu(i, B.commuDe(y.apres?.commu)); deboutDrapeau(i); }
      B.fin();
    }
    demander();
  }
  // pendant la bataille, l'image se dessine sans arrêt
  function demarrerSiBesoin() { if (!enMarche) demarrer(); }
  // « la bataille fait rage » (le bot n'a pas encore donné les résultats) : des coups de canon au loin, sur les îles
  function agiter(oui) {
    agite = Boolean(oui) && !reduit;
    demander();
  }
  function majAgitation(dt) {
    if (!agite || bataille) return;
    agiteT -= dt;
    if (agiteT > 0) return;
    agiteT = 0.25 + Math.random() * 0.45;
    const l = [...parIle.values()].filter((i) => !i.port);
    const i = l[Math.floor(Math.random() * l.length)];
    if (!i) return;
    const r = (i.obj?.userData.rMer ?? i.r), a = Math.random() * Math.PI * 2, x = i.x + Math.cos(a) * r, z = i.z + Math.sin(a) * r;
    eclat(x, 2.5, z, { couleur: 0xffc46b, taille: 4.5, vie: 0.25 });
    eclat(x, 2.5, z, { couleur: 0x8a8a96, taille: 4.5, vie: 1.3, monte: 5, ajout: false, retard: 0.05 });
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
    majBataille(dt, temps);
    majAgitation(dt);
    for (let k = effets.length - 1; k >= 0; k--) if (effets[k](dt) === false) effets.splice(k, 1);
    if (!reduit) {
      sourisLisse.lerp(souris, Math.min(1, dt * 2.5));
      placerCamera(distance * zoomCam, couche ? -sourisLisse.y * 5 : sourisLisse.x * 6, couche ? sourisLisse.x * 4 : sourisLisse.y * 4);
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
    if (reduit && !aDessiner && !bataille && !effets.length) return;
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
    maj, taille, demarrer, arreter, detruire, bataille: jouerBataille, finirBataille: () => arreterBataille(false), enBataille: () => Boolean(bataille), agiter,
    // toutes les îles sont là (ou l'une n'a pas pu se charger : on n'attend plus)
    pret: () => erreurs.length > 0 || [...parIle.values()].every((i) => i.obj),
    // l'appareil peine : moins de ~20 images par seconde après les premières
    tropLent: () => nbImages > 40 && lenteur > 0.05,
    etat: () => ({ iles: [...parIle.values()].map((i) => ({ id: i.id, modele: Boolean(i.obj), drapeau: i.cle })), navires: [...flotte.values()].map((f) => ({ commu: f.commu, modele: f.anims !== undefined && f.porteur.children.length > 0 })), erreurs: [...erreurs], choix, vote, regne, couche, distance: Math.round(distance), bataille: bataille ? { t: Math.round(bataille.t * 10) / 10, k: bataille.k, evts: bataille.evts.length, flottilles: bataille.flottilles.length } : null, effets: effets.length }),
  };
}
