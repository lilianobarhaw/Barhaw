// LA MER EN DIRECT, en 3D : la mer de GRAND LINE sur sa feuille de parchemin (le même shader « cinéma »), les bouées
// numérotées, la ligne de départ entre ses deux mâts, les rochers et les îlots (les îles de GRAND LINE, en léger), le
// coffre et sa colonne de lumière, et les barques : coque à la couleur de la commu, petite voile, rames qui battent,
// sillage, contour à l'encre. La caméra suit sa barque (ou le premier), ou montre toute la mer. Tout est inventé.
// Ce module ne fait que dessiner ce que la page lui donne (js/mer-jeu.js) ; les pseudos sont en HTML, dans etiquettes.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller, animateurs, toile, pastille, materiauMer, roseDesVents, temps5, eclairage5 } from "./grandline-3d.js";
import { MER } from "./mer-moteur.js";

const W = 236; // la feuille (la même que GRAND LINE et la Guerre des commus)
const H = 146;
const ENCRE = 0x12050d;
const OR = 0xffd36b;
const hexa = (c, d) => (/^#[0-9a-f]{6}$/i.test(String(c || "")) ? String(c).toLowerCase() : d);
const houle = (x, z, s) => Math.sin(x * 0.33 + s * 0.9) * 0.09 + Math.sin(z * 0.41 - s * 1.1) * 0.07;
// les îlots du parcours : des îles de GRAND LINE (inventées), en version légère
const ILOTS = ["archipel", "recif", "lucioles", "cristal"];

// les dégradés « manga » : 3 tons, pas de transition douce
let rampe = null;
function rampeToon() {
  if (rampe) return rampe;
  rampe = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  rampe.minFilter = rampe.magFilter = THREE.NearestFilter;
  rampe.needsUpdate = true;
  return rampe;
}
const matToon = (c) => new THREE.MeshToonMaterial({ color: new THREE.Color(c), gradientMap: rampeToon() });
const matEncre = new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide });

// la forme d'une barque vue de haut (la proue vers +x)
function formeBarque(k = 1) {
  const s = new THREE.Shape();
  s.moveTo(1.75 * k, 0);
  s.quadraticCurveTo(1.0 * k, 0.72 * k, -0.6 * k, 0.7 * k);
  s.quadraticCurveTo(-1.55 * k, 0.62 * k, -1.6 * k, 0);
  s.quadraticCurveTo(-1.55 * k, -0.62 * k, -0.6 * k, -0.7 * k);
  s.quadraticCurveTo(1.0 * k, -0.72 * k, 1.75 * k, 0);
  return s;
}
let geos = null;
function geometries() {
  if (geos) return geos;
  const coque = new THREE.ExtrudeGeometry(formeBarque(1), { depth: 0.62, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2, curveSegments: 10 });
  coque.rotateX(-Math.PI / 2); // la forme à plat, l'épaisseur vers le haut
  coque.translate(0, -0.18, 0);
  const fond = new THREE.ShapeGeometry(formeBarque(0.8), 8);
  fond.rotateX(-Math.PI / 2);
  fond.translate(0, 0.47, 0);
  const banc = new THREE.BoxGeometry(0.22, 0.08, 1.15);
  const mat = new THREE.CylinderGeometry(0.06, 0.08, 2.5, 6);
  mat.translate(0, 1.7, 0);
  const voile = new THREE.BufferGeometry();
  voile.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.75, 0, 0, 2.85, 0, -1.25, 0.85, 0], 3));
  voile.setAttribute("uv", new THREE.Float32BufferAttribute([1, 0, 1, 1, 0, 0], 2));
  voile.computeVertexNormals();
  const rame = new THREE.BoxGeometry(0.08, 0.06, 1.9);
  rame.translate(0, 0, 0.95);
  const pale = new THREE.BoxGeometry(0.3, 0.04, 0.5);
  pale.translate(0, 0, 1.85);
  const sillage = new THREE.PlaneGeometry(1, 1);
  sillage.rotateX(-Math.PI / 2);
  sillage.translate(-0.5, 0, 0);
  geos = { coque, fond, banc, mat, voile, rame, pale, sillage };
  return geos;
}
let texSillage = null;
const toileSillage = () => (texSillage ||= toile(128, 64, (x, l, h) => {
  const g = x.createLinearGradient(0, 0, l, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.75, "rgba(255,255,255,.55)");
  g.addColorStop(1, "rgba(255,255,255,.9)");
  x.fillStyle = g;
  // un V d'écume : large derrière, étroit à la poupe
  x.beginPath(); x.moveTo(l, h * 0.42); x.lineTo(0, 0); x.lineTo(0, h); x.lineTo(l, h * 0.58); x.closePath(); x.fill();
}));
// la voile : sa couleur, une bande et l'emblème de la commu
const toilesVoile = new Map();
function toileVoile(c1, c2, embleme) {
  const cle = `${c1}|${c2}|${embleme}`;
  if (toilesVoile.has(cle)) return toilesVoile.get(cle);
  const t = toile(128, 128, (x, l, h) => {
    x.fillStyle = c2; x.fillRect(0, 0, l, h);
    x.fillStyle = c1; x.fillRect(0, h * 0.72, l, h * 0.12);
    x.font = `900 ${embleme.length > 1 ? 34 : 48}px 'Dela Gothic One', 'Arial Black', sans-serif`;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.lineWidth = 6; x.strokeStyle = "#12050d"; x.strokeText(embleme, l * 0.62, h * 0.42);
    x.fillStyle = "#fff"; x.fillText(embleme, l * 0.62, h * 0.42);
  });
  toilesVoile.set(cle, t);
  return t;
}
// un chiffre sur un fanion (les bouées), toujours face à la caméra
function sprite(texte, fondCouleur) {
  const t = toile(128, 128, (x, l, h) => {
    x.beginPath(); x.arc(l / 2, h / 2, l * 0.42, 0, Math.PI * 2);
    x.fillStyle = fondCouleur; x.fill();
    x.lineWidth = 9; x.strokeStyle = "#12050d"; x.stroke();
    x.fillStyle = "#12050d"; x.font = "900 70px 'Dela Gothic One', 'Arial Black', sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texte, l / 2, h / 2 + 4);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  return s;
}
const damier = (n = 8, m = 2) => {
  const t = toile(64 * n, 64 * m, (x, l, h) => {
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { x.fillStyle = (i + j) % 2 ? "#ffffff" : "#12050d"; x.fillRect(i * 64, j * 64, 64, 64); }
  });
  t.magFilter = THREE.NearestFilter;
  return t;
};

export function creerMer3D(canvas, { etiquettes = null, commus = {}, leger = false, reduit = false, modeles = "/modeles/grandline/" } = {}) {
  const ratio = Math.min(leger ? 1.25 : 1.6, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, alpha: true, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.5, 1200);
  const soleil = new THREE.DirectionalLight(0xffffff, 1.35);
  soleil.position.set(-50, 110, 40);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a4a6a, 1.2), soleil);
  let detruit = false;
  const erreurs = [];
  const uT = { value: 0 };
  let L = 16, Hc = 9;

  // ---------- la feuille et la mer ----------
  const uMer = {
    uT, uSombre: { value: 0 }, uNuit: { value: 0 }, uOr: { value: 0 }, uReflet: { value: 0 }, uVie: { value: 1 }, uCine: { value: 1 },
    uRive: { value: Array.from({ length: 24 }, () => 2) }, uIles: { value: Array.from({ length: 24 }, () => new THREE.Vector3(0, 0, 0)) },
  };
  const merGeo = new THREE.PlaneGeometry(W, H, leger ? 110 : 170, leger ? 68 : 104);
  merGeo.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(merGeo, materiauMer(uMer)), roseDesVents());

  // ---------- le parcours ----------
  let p = null;
  const decor = new THREE.Group();
  scene.add(decor);
  const bouees = [];
  const matAnneau = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const lireLeger = (nom) => lireGLB(`${modeles}${nom}-leger.glb`).catch(() => lireGLB(`${modeles}${nom}.glb`));
  function viderDecor() {
    for (const o of [...decor.children]) { decor.remove(o); o.traverse((x) => { if (x.geometry && x.geometry !== geometries().coque) x.geometry.dispose?.(); }); }
    bouees.length = 0;
    for (const v of uMer.uIles.value) v.set(0, 0, 0);
  }
  function construire(x) {
    viderDecor();
    p = x;
    // la ligne : un damier sur l'eau, deux mâts rayés et la banderole
    const [a, b] = p.porte;
    const lg = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = Math.atan2(b.z - a.z, b.x - a.x);
    const ligne = new THREE.Mesh(new THREE.PlaneGeometry(lg, 1.3), new THREE.MeshBasicMaterial({ map: damier(Math.round(lg / 1.3), 2), transparent: true, opacity: 0.85, depthWrite: false }));
    ligne.rotation.set(-Math.PI / 2, 0, -ang);
    ligne.position.set(p.centre.x, 0.22, p.centre.z);
    ligne.renderOrder = 2;
    decor.add(ligne);
    const rayures = toile(64, 256, (c, l, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? "#ffffff" : "#ff4f9a"; c.fillRect(0, (k * h) / 8, l, h / 8); } });
    for (const q of [a, b]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 13, 10), new THREE.MeshLambertMaterial({ map: rayures }));
      m.position.set(q.x, 6.5, q.z);
      const boule = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshLambertMaterial({ color: OR }));
      boule.position.set(q.x, 13.3, q.z);
      decor.add(m, boule);
    }
    const banderole = new THREE.Mesh(new THREE.PlaneGeometry(lg, 2.2), new THREE.MeshLambertMaterial({
      side: THREE.DoubleSide,
      map: toile(1024, 88, (c, l, h) => {
        c.fillStyle = "#12050d"; c.fillRect(0, 0, l, h);
        for (let k = 0; k < 32; k++) { c.fillStyle = k % 2 ? "#fff" : "#ff4f9a"; c.fillRect((k * l) / 32, 0, l / 32, 10); c.fillRect((k * l) / 32, h - 10, l / 32, 10); }
        c.fillStyle = "#ffd36b"; c.font = "900 46px 'Dela Gothic One', 'Arial Black', sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("DÉPART  ·  LA MER EN DIRECT  ·  ARRIVÉE", l / 2, h / 2 + 3);
      }),
    }));
    banderole.position.set(p.centre.x, 11.6, p.centre.z);
    banderole.rotation.y = -ang;
    decor.add(banderole);
    // les bouées : rayées, numérotées, avec la zone à toucher sur l'eau
    const rayBouee = toile(64, 64, (c, l, h) => { for (let k = 0; k < 4; k++) { c.fillStyle = k % 2 ? "#ffffff" : "#ff4f9a"; c.fillRect(0, (k * h) / 4, l, h / 4); } });
    p.bouees.forEach((c, k) => {
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 1.7, 14), new THREE.MeshLambertMaterial({ map: rayBouee }));
      corps.position.y = 0.6;
      const tete = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1, 14), new THREE.MeshLambertMaterial({ color: k % 2 ? OR : 0xff4f9a }));
      tete.position.y = 1.95;
      const contour = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.12, 1.8, 14), matEncre);
      contour.position.y = 0.6;
      const fanion = sprite(String(k + 1), k % 2 ? "#ffd36b" : "#ff4f9a");
      fanion.scale.setScalar(3.2);
      fanion.position.y = 4.4;
      const anneau = new THREE.Mesh(new THREE.RingGeometry(MER.bouee - 0.45, MER.bouee, 64), matAnneau(0xffffff, 0.55));
      anneau.rotation.x = -Math.PI / 2;
      anneau.position.y = 0.2;
      anneau.renderOrder = 3;
      g.add(corps, tete, contour, fanion, anneau);
      decor.add(g);
      bouees.push({ g, anneau, fanion, k });
    });
    // les rochers et les îlots
    p.rochers.forEach((r, k) => {
      if (k < 24) uMer.uIles.value[k].set(r.x, r.z, r.r * 0.96);
      const g = new THREE.Group();
      g.position.set(r.x, 0, r.z);
      decor.add(g);
      if (r.r >= 8) {
        const attente = new THREE.Group();
        const sable = new THREE.Mesh(new THREE.CylinderGeometry(r.r * 0.92, r.r, 1.2, 28), matToon("#e8d3a0"));
        sable.position.y = 0.2;
        const colline = new THREE.Mesh(new THREE.SphereGeometry(r.r * 0.62, 20, 12), matToon("#6fae5a"));
        colline.scale.y = 0.42;
        colline.position.y = 0.6;
        attente.add(sable, colline);
        g.add(attente);
        if (!leger || r.r >= 12) {
          lireLeger(`ile-${ILOTS[k % ILOTS.length]}-v5`).then((glb) => {
            if (detruit || !decor.children.includes(g)) return;
            const modele = sceneGLB(glb);
            const { bouge, reperes } = habiller(modele, { relief: () => null, cuit: glb.cuit, ile: true });
            const boite = new THREE.Box3().setFromObject(modele);
            const mer5 = reperes.find((x) => x.userData.anim === "mer")?.userData;
            const rayon = mer5?.rayon ?? Math.max(boite.max.x - boite.min.x, boite.max.z - boite.min.z) * 0.47;
            const e = (r.r * 1.02) / Math.max(0.1, rayon);
            modele.scale.setScalar(e);
            g.remove(attente);
            g.add(modele);
            g.userData.anims = animateurs(bouge);
          }).catch((e) => erreurs.push(`îlot : ${e.message}`));
        }
      } else {
        const geo = new THREE.DodecahedronGeometry(r.r, 0);
        geo.scale(1, 0.55, 1);
        const roc = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x8a7a72, gradientMap: rampeToon(), flatShading: true }));
        roc.rotation.y = k * 1.7;
        roc.position.y = r.r * 0.18;
        const bord = new THREE.Mesh(geo, matEncre);
        bord.scale.setScalar(1.05);
        bord.rotation.y = roc.rotation.y;
        bord.position.y = roc.position.y;
        g.add(roc, bord);
      }
    });
  }

  // ---------- le coffre ----------
  const coffre = new THREE.Group();
  {
    const bois = matToon("#8a4b1e");
    const or = new THREE.MeshLambertMaterial({ color: OR, emissive: 0x5a3a00 });
    const caisse = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.5), bois);
    caisse.position.y = 0.65;
    const couvercle = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 12, 1, false, 0, Math.PI), bois);
    couvercle.rotation.z = Math.PI / 2;
    couvercle.position.y = 1.3;
    const bande = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.35, 1.56), or);
    bande.position.y = 0.66;
    const serrure = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.1), or);
    serrure.position.set(0, 1.05, 0.8);
    const contour = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 1.6), matEncre);
    contour.position.y = 0.65;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: pastille(), color: OR, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.scale.setScalar(9);
    halo.position.y = 1.2;
    const colonne = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 40, 16, 1, true), new THREE.MeshBasicMaterial({
      map: toile(4, 128, (c, l, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,211,107,0)"); g.addColorStop(1, "rgba(255,211,107,.55)"); c.fillStyle = g; c.fillRect(0, 0, l, h); }),
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    colonne.position.y = 20;
    coffre.add(caisse, couvercle, bande, serrure, contour, halo, colonne);
    coffre.visible = false;
    scene.add(coffre);
  }

  // ---------- les barques ----------
  const barques = new Map(); // num → { g, coque, voile, rames, sillage, commu }
  const matsCoque = new Map();
  function materiauxDe(commu) {
    if (matsCoque.has(commu)) return matsCoque.get(commu);
    const c = commus[commu] || {};
    const c1 = hexa(c.c1, "#ff5aae"), c2 = hexa(c.c2, "#55ccff");
    const m = {
      coque: matToon(c1),
      voile: new THREE.MeshLambertMaterial({ map: toileVoile(c1, c2, String(c.embleme || "B").slice(0, 2).toUpperCase()), side: THREE.DoubleSide }),
    };
    matsCoque.set(commu, m);
    return m;
  }
  const matFond = matToon("#7a4a26");
  const matBois = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
  const matSillage = new THREE.MeshBasicMaterial({ map: toileSillage(), transparent: true, depthWrite: false, opacity: 0.8 });
  const matMoi = matAnneau(OR, 0.75);
  function creerBarque(b, commu) {
    const G = geometries();
    const m = materiauxDe(commu);
    const g = new THREE.Group();
    const corps = new THREE.Group(); // ce qui tangue
    const coque = new THREE.Mesh(G.coque, m.coque);
    const bord = leger ? null : new THREE.Mesh(G.coque, matEncre);
    if (bord) bord.scale.set(1.07, 1.12, 1.1);
    const fond = new THREE.Mesh(G.fond, matFond);
    const banc1 = new THREE.Mesh(G.banc, matBois); banc1.position.set(-0.5, 0.52, 0);
    const banc2 = new THREE.Mesh(G.banc, matBois); banc2.position.set(0.55, 0.52, 0);
    const mat = new THREE.Mesh(G.mat, matBois); mat.position.x = 0.45;
    const voile = new THREE.Mesh(G.voile, m.voile); voile.position.x = 0.45;
    const rames = [1, -1].map((s) => {
      const r = new THREE.Group();
      r.position.set(-0.2, 0.55, s * 0.55);
      const manche = new THREE.Mesh(G.rame, matBois);
      const pale = new THREE.Mesh(G.pale, matBois);
      if (s < 0) { manche.rotation.y = Math.PI; pale.rotation.y = Math.PI; }
      r.add(manche, pale);
      corps.add(r);
      return r;
    });
    corps.add(coque, fond, banc1, banc2, mat, voile);
    if (bord) corps.add(bord);
    const sillage = new THREE.Mesh(G.sillage, matSillage);
    sillage.position.set(-1.4, 0.12, 0);
    sillage.renderOrder = 2;
    g.add(corps, sillage);
    scene.add(g);
    const x = { g, corps, voile, rames, sillage, commu, moi: null, phase: b.id * 1.3 };
    barques.set(b.id, x);
    return x;
  }
  function retirerBarque(num) {
    const x = barques.get(num);
    if (!x) return;
    scene.remove(x.g);
    barques.delete(num);
    etiquettesDe.get(num)?.remove();
    etiquettesDe.delete(num);
  }

  // ---------- les éclaboussures (un choc) ----------
  const gerbes = [];
  const geoGerbe = new THREE.BufferGeometry();
  geoGerbe.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(3 * 18), 3));
  function eclabousser(x, z) {
    if (reduit) return;
    const pts = new THREE.Points(geoGerbe.clone(), new THREE.PointsMaterial({ map: pastille(), color: 0xffffff, size: 0.9, transparent: true, depthWrite: false }));
    const v = [];
    const pos = pts.geometry.attributes.position;
    for (let k = 0; k < 18; k++) { pos.setXYZ(k, x, 0.4, z); v.push([(Math.random() - 0.5) * 6, 3 + Math.random() * 4, (Math.random() - 0.5) * 6]); }
    scene.add(pts);
    gerbes.push({ pts, v, t: 0 });
  }

  // ---------- les pseudos (HTML) ----------
  const etiquettesDe = new Map();
  const v = new THREE.Vector3();
  function etiquette(num, nom, moi) {
    let e = etiquettesDe.get(num);
    if (!e && etiquettes) {
      e = document.createElement("span");
      e.className = `mer-etiquette${moi ? " moi" : ""}`;
      e.textContent = nom;
      etiquettes.append(e);
      etiquettesDe.set(num, e);
    }
    if (e && e.textContent !== nom) e.textContent = nom;
    return e;
  }

  // ---------- la caméra ----------
  let mode = "suivre"; // suivre (sa barque), premier (celui qui mène), tout (toute la mer)
  const cam = { p: new THREE.Vector3(0, 140, 110), vise: new THREE.Vector3(0, 0, 6) };
  let premierPlan = true;
  function viseCamera(dt, cible) {
    const aspect = L / Hc;
    let pos, regard;
    if (mode !== "tout" && cible) {
      const ca = Math.cos(cible.a), sa = Math.sin(cible.a);
      // derrière et au-dessus de la barque : on la voit au premier tiers de l'image, et la mer devant elle
      const recul = aspect < 1 ? 23 : 18;
      const haut = aspect < 1 ? 12.5 : 9.5;
      pos = new THREE.Vector3(cible.x - ca * recul, haut, cible.z - sa * recul);
      regard = new THREE.Vector3(cible.x + ca * 6, 0.6, cible.z + sa * 6);
    } else {
      // toute la mer dans le cadre (en largeur comme en hauteur)
      const demiH = THREE.MathUtils.degToRad(camera.fov / 2);
      const demiL = Math.atan(Math.tan(demiH) * aspect);
      const d = Math.max((MER.bord.x + 10) / Math.tan(demiL), (MER.bord.z + 14) / Math.tan(demiH) * 1.35);
      pos = new THREE.Vector3(0, d * 0.86, d * 0.52);
      regard = new THREE.Vector3(0, 0, 4);
    }
    const k = premierPlan ? 1 : Math.min(1, dt * (mode === "tout" ? 2 : 4.5));
    premierPlan = false;
    cam.p.lerp(pos, k);
    cam.vise.lerp(regard, k);
    camera.position.copy(cam.p);
    camera.lookAt(cam.vise);
  }

  // ---------- ce que la page donne ----------
  let vue = null;
  let opts = { moi: 0, joueurs: new Map(), prochaine: 0, tete: new Set() };
  function maj(x, o = {}) { vue = x; opts = { ...opts, ...o }; }

  function taille() {
    const r = canvas.getBoundingClientRect();
    L = Math.max(1, r.width);
    Hc = Math.max(1, r.height);
    renderer.setSize(Math.round(L), Math.round(Hc), false);
    camera.aspect = L / Hc;
    camera.updateProjectionMatrix();
    premierPlan = true;
  }

  // ---------- l'image ----------
  let debut = performance.now(), dernier = 0, nbImages = 0, lenteur = 0.016;
  function rendre() {
    if (detruit || !p) return;
    const maintenant = performance.now();
    const dt = Math.min(0.05, dernier ? (maintenant - dernier) / 1000 : 0.016);
    if (dernier && nbImages > 10) lenteur = lenteur * 0.95 + Math.min(0.2, (maintenant - dernier) / 1000) * 0.05;
    dernier = maintenant;
    nbImages++;
    const s = reduit ? 0 : (maintenant - debut) / 1000;
    uT.value = s;
    temps5.value = s;
    eclairage5.value = 1;
    for (const o of decor.children) for (const a of o.userData.anims || []) a(s, dt);
    // les bouées : la suivante bat en or
    for (const b of bouees) {
      b.g.position.y = houle(b.g.position.x, b.g.position.z, s) * 3;
      const suivante = opts.moi && b.k === opts.prochaine;
      const passee = opts.moi && b.k < opts.prochaine;
      b.anneau.material.color.set(suivante ? OR : 0xffffff);
      b.anneau.material.opacity = suivante ? 0.6 + Math.sin(s * 5) * 0.3 : passee ? 0.18 : 0.5;
      b.fanion.material.opacity = passee ? 0.45 : 1;
    }
    // le coffre
    const c = vue?.coffre;
    coffre.visible = Boolean(c);
    if (c) { coffre.position.set(c.x, houle(c.x, c.z, s) * 3 + Math.sin(s * 2) * 0.15, c.z); coffre.rotation.y = s * 0.5; }
    // les barques
    const vues = new Set();
    let cible = null;
    let premier = null;
    for (const b of vue?.barques || []) {
      vues.add(b.id);
      const j = opts.joueurs.get(b.id);
      let x = barques.get(b.id);
      if (x && x.commu !== (j?.commu || "barhaw")) { retirerBarque(b.id); x = null; }
      x ||= creerBarque(b, j?.commu || "barhaw");
      x.g.visible = true;
      x.g.position.set(b.x, houle(b.x, b.z, s) * 3, b.z);
      x.g.rotation.y = -b.a;
      x.corps.rotation.x = reduit ? 0 : Math.sin(s * 1.7 + x.phase) * 0.06 - (b.w || 0) * 0.06;
      x.corps.rotation.z = reduit ? 0 : Math.sin(s * 1.3 + x.phase) * 0.03 + Math.min(0.08, b.v * 0.004);
      // les rames : elles battent plus vite quand on rame fort ; immobiles à l'arrêt
      const vite = b.v > 0.5 ? (b.rame ? 13 : 7) : 0;
      const r = Math.sin(s * vite + x.phase) * (vite ? 0.55 : 0);
      x.rames[0].rotation.y = r;
      x.rames[1].rotation.y = -r;
      x.rames[0].rotation.x = Math.cos(s * vite + x.phase) * (vite ? 0.15 : 0);
      x.rames[1].rotation.x = -x.rames[0].rotation.x;
      x.sillage.scale.set(Math.max(0.01, b.v * (b.rame ? 0.62 : 0.42)), 1, 1 + b.v * 0.05);
      x.sillage.visible = b.v > 0.6;
      if (b.choc && !x.choc) eclabousser(b.x + Math.cos(b.a) * 1.6, b.z + Math.sin(b.a) * 1.6);
      x.choc = b.choc;
      if (b.moi) cible = b;
      if (b.id === opts.premier || !premier) premier = b;
      // son anneau d'or (sa barque)
      if (b.moi && !x.moi) { x.moi = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.55, 40), matMoi); x.moi.rotation.x = -Math.PI / 2; x.moi.position.y = 0.16; x.g.add(x.moi); }
      if (x.moi) x.moi.material.opacity = 0.55 + Math.sin(s * 6) * 0.25;
    }
    for (const num of [...barques.keys()]) if (!vues.has(num)) retirerBarque(num);
    for (let k = gerbes.length - 1; k >= 0; k--) {
      const g = gerbes[k];
      g.t += dt;
      const pos = g.pts.geometry.attributes.position;
      for (let i = 0; i < g.v.length; i++) { g.v[i][1] -= 14 * dt; pos.setXYZ(i, pos.getX(i) + g.v[i][0] * dt, Math.max(0.2, pos.getY(i) + g.v[i][1] * dt), pos.getZ(i) + g.v[i][2] * dt); }
      pos.needsUpdate = true;
      g.pts.material.opacity = Math.max(0, 1 - g.t / 0.9);
      if (g.t > 0.9) { scene.remove(g.pts); g.pts.geometry.dispose(); gerbes.splice(k, 1); }
    }
    viseCamera(dt, mode === "premier" ? premier : cible || (mode === "suivre" ? premier : null));
    renderer.render(scene, camera);
    // les pseudos : près de la caméra, ou dans la tête de course, ou la sienne
    if (etiquettes) {
      const proches = [];
      for (const b of vue?.barques || []) {
        const j = opts.joueurs.get(b.id);
        if (!j?.nom) continue;
        const d = camera.position.distanceTo(v.set(b.x, 0, b.z));
        proches.push([d, b, j]);
      }
      proches.sort((a, b) => a[0] - b[0]);
      const montrees = new Set();
      proches.forEach(([d, b, j], k) => {
        const garder = b.moi || opts.tete?.has(b.id) || k < (leger ? 8 : 14);
        if (!garder) return;
        v.set(b.x, 3.6, b.z).project(camera);
        if (v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) return;
        const e = etiquette(b.id, j.nom, b.moi);
        if (!e) return;
        montrees.add(b.id);
        e.hidden = false;
        e.style.transform = `translate(${((v.x * 0.5 + 0.5) * L).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * Hc).toFixed(1)}px) translate(-50%, -100%)`;
        e.style.opacity = b.absent ? "0.45" : d > 90 ? "0.75" : "1";
      });
      for (const [num, e] of etiquettesDe) if (!montrees.has(num)) e.hidden = true;
    }
  }

  return {
    parcours(x) { construire(x); premierPlan = true; },
    maj, rendre, taille,
    set camera(m) { if (["suivre", "premier", "tout"].includes(m)) { mode = m; } },
    get camera() { return mode; },
    set commus(c) { commus = c || {}; matsCoque.clear(); for (const n of [...barques.keys()]) retirerBarque(n); },
    projeter(x, z, y = 0) { v.set(x, y, z).project(camera); return { x: (v.x * 0.5 + 0.5) * L, y: (-v.y * 0.5 + 0.5) * Hc, visible: v.z < 1 }; },
    // l'appareil peine : moins de ~20 images par seconde après les premières
    tropLent: () => nbImages > 50 && lenteur > 0.05,
    etat: () => ({ barques: barques.size, bouees: bouees.length, decor: decor.children.length, erreurs: [...erreurs], camera: mode, images: nbImages }),
    detruire() {
      detruit = true;
      for (const e of etiquettesDe.values()) e.remove();
      etiquettesDe.clear();
      scene.traverse((o) => { if (o.geometry && !Object.values(geos || {}).includes(o.geometry)) o.geometry.dispose?.(); });
      renderer.dispose();
    },
  };
}
