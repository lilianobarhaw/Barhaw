// La Traversée (V4, GRAND LINE) en 3D : le navire de sa commu, la mer sans fin, ce qu'on croise.
// Ce module ne fait que dessiner : le moteur du jeu (la vitesse, les collisions, le score) est dans site.js.
// La mer est un plan qui suit le navire (ses vagues et ses motifs sont calculés en coordonnées du monde), le ciel une
// sphère qui suit la caméra. Les pièces (rochers, bras du monstre, tourbillon, tonneaux, bouteille, esprit du vent)
// viennent de Blender (modeles/grandline/traversee-v4.glb) ; en attendant (ou sans elles), des formes simples.
// Le monde : X vers l'avant (la distance, en mètres), Z sur le côté (la droite de l'écran), Y vers le haut.
import * as THREE from "./three-r170.module.min.js";
import { lireGLB, sceneGLB, habiller, animateurs, themeNavire, creerTrainee, pastille, toile } from "./grandline-3d.js";

const BRUME = new THREE.Color(0xffa9bf); // l'horizon rose du soir
const SOLEIL = new THREE.Vector3(0.92, 0.075, -0.38).normalize(); // devant, un peu à gauche, bas sur l'horizon
const BRUIT = `
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float bruit(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int k = 0; k < 4; k++) { s += a * bruit(p); p *= 2.03; a *= 0.5; } return s; }`;

function materiauMer(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `
      uniform float uT; uniform float uHoule;
      varying vec3 vP; varying float vH;
      float houle(vec2 p) {
        return (sin(p.x * 0.23 + uT * 1.5) * 0.24 + sin(p.y * 0.31 + p.x * 0.11 - uT * 1.1) * 0.17 + sin((p.x + p.y) * 0.62 + uT * 2.3) * 0.06) * uHoule;
      }
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        float h = houle(w.xz);
        w.y += h;
        vP = w.xyz; vH = h;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uT; uniform vec3 uCam; uniform vec4 uTrous[4]; uniform vec3 uSoleil; uniform vec3 uBrume; uniform vec2 uBrumeD;
      varying vec3 vP; varying float vH;
      ${BRUIT}
      void main() {
        for (int i = 0; i < 4; i++) { vec4 t = uTrous[i]; if (t.w > 0.5 && length(vP.xz - t.xy) < t.z) discard; }
        vec2 p = vP.xz;
        float n = fbm(p * 0.045 + vec2(uT * 0.03, 0.0));
        // trois tons, comme un dessin : le creux, la mer, le haut des vagues
        float h = vH * 1.7 + (n - 0.5) * 0.9;
        vec3 c = mix(vec3(0.17, 0.26, 0.6), vec3(0.25, 0.46, 0.8), smoothstep(-0.36, -0.2, h));
        c = mix(c, vec3(0.36, 0.66, 0.88), smoothstep(0.24, 0.36, h) * 0.38);
        // de grandes ombres douces (les fonds), des rides
        c = mix(c, c * 0.9, smoothstep(0.45, 0.8, fbm(p * 0.015 + 9.0)));
        float ride = smoothstep(0.93, 1.0, sin(p.x * 0.9 + sin(p.y * 0.5 + uT * 0.3) * 2.4 - uT * 1.4)) * smoothstep(0.45, 0.75, bruit(p * 0.15 + uT * 0.05));
        c = mix(c, vec3(0.96, 0.98, 1.0), ride * 0.55);
        // les moutons
        float mouton = smoothstep(0.8, 0.87, bruit(p * 0.32 + vec2(-uT * 0.5, uT * 0.12))) * smoothstep(0.4, 0.65, fbm(p * 0.05));
        c = mix(c, vec3(1.0), mouton * 0.55);
        // le chemin de lumière du soleil couchant : des paillettes roses et dorées
        vec3 v = normalize(vP - uCam);
        float chemin = pow(max(dot(normalize(vec2(v.x, v.z)), normalize(vec2(uSoleil.x, uSoleil.z))), 0.0), 40.0);
        vec2 cel = floor(p * vec2(1.3, 2.6));
        float paillette = step(0.93, h21(cel + floor(uT * 2.5) * 3.7)) * (1.0 - smoothstep(0.1, 0.35, length(fract(p * vec2(1.3, 2.6)) - 0.5)));
        c = mix(c, vec3(1.0, 0.86, 0.93), chemin * (0.18 + paillette * 0.85));
        // le reflet rose du ciel, au loin
        float rasant = pow(1.0 - abs(v.y), 5.0);
        c = mix(c, vec3(0.96, 0.6, 0.78), rasant * 0.5);
        c -= h21(floor(p * 7.0)) * 0.025;
        float d = length(vP - uCam);
        c = mix(c, uBrume, smoothstep(uBrumeD.x, uBrumeD.y, d));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
function materiauCiel(u) {
  return new THREE.ShaderMaterial({
    uniforms: u,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vD; void main() { vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uSoleil; uniform vec3 uBrume; uniform float uT;
      varying vec3 vD;
      ${BRUIT}
      void main() {
        vec3 d = normalize(vD);
        float y = d.y;
        vec3 c = mix(uBrume, vec3(0.86, 0.36, 0.62), smoothstep(0.0, 0.16, y));
        c = mix(c, vec3(0.42, 0.16, 0.48), smoothstep(0.12, 0.42, y));
        c = mix(c, vec3(0.14, 0.06, 0.24), smoothstep(0.4, 0.9, y));
        float s = dot(d, uSoleil);
        c = mix(c, vec3(1.0, 0.82, 0.62), pow(max(s, 0.0), 10.0) * 0.45);
        c = mix(c, vec3(1.0, 0.96, 0.84), smoothstep(0.9972, 0.9982, s));
        // le soleil coupé de bandes (comme une affiche)
        float bande = step(0.5, fract(y * 90.0)) * step(0.9972, s) * step(y, uSoleil.y - 0.004);
        c = mix(c, vec3(1.0, 0.55, 0.62), bande * 0.7);
        // des nuages en longues bandes près de l'horizon, et des étoiles tout en haut
        float az = atan(d.z, d.x);
        float nu = smoothstep(0.55, 0.62, fbm(vec2(az * 2.2 + uT * 0.004, y * 9.0))) * smoothstep(0.03, 0.08, y) * (1.0 - smoothstep(0.18, 0.3, y));
        c = mix(c, vec3(1.0, 0.78, 0.86), nu * 0.65);
        float bord = smoothstep(0.55, 0.62, fbm(vec2(az * 2.2 + uT * 0.004, y * 9.0) + 0.04)) - nu;
        c = mix(c, vec3(0.55, 0.22, 0.45), clamp(bord, 0.0, 1.0) * 0.35 * smoothstep(0.03, 0.08, y));
        vec2 e = vec2(az * 60.0, y * 60.0);
        float etoile = step(0.992, h21(floor(e))) * smoothstep(0.35, 0.7, y) * (0.6 + 0.4 * sin(uT * 3.0 + h21(floor(e)) * 40.0));
        c += vec3(etoile * 0.8);
        if (y < 0.0) c = uBrume;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
// le bouclier du vent : une bulle qui brille sur les bords
function materiauBulle() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uForce: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; void main() { vec4 m = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-m.xyz); vP = position; gl_Position = projectionMatrix * m; }`,
    fragmentShader: `
      uniform float uT; uniform float uForce;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
        float r = 0.5 + 0.5 * sin(vP.y * 3.0 - uT * 4.0 + atan(vP.z, vP.x) * 3.0);
        vec3 c = mix(vec3(0.3, 0.95, 0.9), vec3(1.0, 0.45, 0.75), r);
        gl_FragColor = vec4(c * (f * 1.1 + 0.04), 1.0) * uForce;
      }`,
  });
}

export function creerTraversee3D(canvas, { navire = {}, modeles = "/modeles/grandline/", reduit = false } = {}) {
  const leger = (() => { try { return matchMedia("(max-width: 760px), (pointer: coarse)").matches || (navigator.deviceMemory || 8) <= 4; } catch { return false; } })();
  const ratio = Math.min(leger ? 1.25 : 1.5, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(BRUME, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BRUME, 75, 230);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 900);
  const hemi = new THREE.HemisphereLight(0xfff0f6, 0x5a3a7a, 1.15);
  const lampe = new THREE.DirectionalLight(0xffe6d2, 1.35); // la lumière vient de derrière la caméra (on voit bien ce qui arrive)
  scene.add(hemi, lampe, lampe.target);
  let detruit = false;
  const erreurs = [];
  let L = 16, H = 9;
  let portrait = false;

  // ---------- le ciel et la mer ----------
  const uCiel = { uSoleil: { value: SOLEIL }, uBrume: { value: BRUME }, uT: { value: 0 } };
  const ciel = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), materiauCiel(uCiel));
  ciel.material.fog = false;
  ciel.renderOrder = -3;
  scene.add(ciel);
  const uMer = {
    uT: { value: 0 }, uHoule: { value: reduit ? 0.5 : 1 }, uCam: { value: new THREE.Vector3() }, uSoleil: { value: SOLEIL }, uBrume: { value: BRUME },
    uBrumeD: { value: new THREE.Vector2(75, 230) }, uTrous: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
  };
  const merGeo = new THREE.PlaneGeometry(420, 220, leger ? 120 : 190, leger ? 60 : 90);
  merGeo.rotateX(-Math.PI / 2);
  const mer = new THREE.Mesh(merGeo, materiauMer(uMer));
  mer.renderOrder = -2;
  mer.frustumCulled = false;
  scene.add(mer);
  // la houle à un point (la même que dans la mer) : pour poser ce qui flotte
  const houle = (x, z, t) => (Math.sin(x * 0.23 + t * 1.5) * 0.24 + Math.sin(z * 0.31 + x * 0.11 - t * 1.1) * 0.17 + Math.sin((x + z) * 0.62 + t * 2.3) * 0.06) * uMer.uHoule.value;

  // ---------- le navire de la commu ----------
  const porteur = new THREE.Group();
  porteur.rotation.order = "YXZ";
  scene.add(porteur);
  const coque = new THREE.Group(); // ce qui penche et tangue
  porteur.add(coque);
  let modeleNavire = navireSimple(navire.couleurs);
  coque.add(modeleNavire);
  let animsNavire = [];
  let ventNavire = 1;
  const theme = themeNavire(navire.couleurs, navire.embleme, navire.drapeau, navire.modele);
  const lireV4 = (nom) => (leger ? lireGLB(`${modeles}${nom.replace(/\.glb$/, "-leger.glb")}`).catch(() => lireGLB(`${modeles}${nom}`)) : lireGLB(`${modeles}${nom}`));
  const pretNavire = (theme.modele === "navire.glb" ? lireGLB(`${modeles}navire.glb`) : lireV4(theme.modele).catch(() => lireGLB(`${modeles}navire.glb`))).then((glb) => {
    if (detruit) return;
    const m = sceneGLB(glb);
    const { bouge } = habiller(m, { relief: () => null, contour: 0.03, theme, cuit: glb.cuit });
    // à la bonne taille : 6 m de long
    const boite = new THREE.Box3().setFromObject(m);
    const long = Math.max(0.1, boite.max.x - boite.min.x);
    const g = new THREE.Group();
    g.add(m);
    g.scale.setScalar(6 / long);
    g.position.x = -((boite.max.x + boite.min.x) / 2) * (6 / long);
    coque.remove(modeleNavire);
    modeleNavire = g;
    coque.add(g);
    animsNavire = animateurs(bouge, () => ventNavire);
  }).catch((e) => { erreurs.push(`navire : ${e.message}`); });
  const trainee = navire.trainee ? creerTrainee(navire.trainee, scene, leger) : null;
  // le bouclier du vent
  const bulle = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 18), materiauBulle());
  bulle.scale.set(1.25, 0.85, 0.95);
  bulle.position.y = 1.4;
  bulle.visible = false;
  porteur.add(bulle);
  const ombreTex = toile(64, 64, (x, l) => {
    const d = x.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    d.addColorStop(0, "rgba(10,16,48,0.5)");
    d.addColorStop(1, "rgba(10,16,48,0)");
    x.fillStyle = d;
    x.fillRect(0, 0, l, l);
  });
  const ombreNavire = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: ombreTex, transparent: true, depthWrite: false }));
  ombreNavire.rotation.x = -Math.PI / 2;
  ombreNavire.scale.set(1.3, 0.55, 1);
  ombreNavire.position.y = 0.06;
  porteur.add(ombreNavire);

  // ---------- le sillage (des ronds d'écume qui s'écartent) et les éclats (bois, or, eau) ----------
  const ecumeTex = toile(64, 64, (x, l) => {
    const d = x.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    d.addColorStop(0, "rgba(255,255,255,0.95)");
    d.addColorStop(0.55, "rgba(255,255,255,0.85)");
    d.addColorStop(0.75, "rgba(255,255,255,0.35)");
    d.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = d;
    x.fillRect(0, 0, l, l);
  });
  const nbSillage = leger ? 90 : 150;
  const sillage = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ecumeTex, transparent: true, depthWrite: false, opacity: 0.85 }), nbSillage);
  sillage.frustumCulled = false;
  sillage.renderOrder = -1;
  scene.add(sillage);
  const bulles = Array.from({ length: nbSillage }, () => ({ x: 0, z: 0, vx: 0, vz: 0, age: 9, vie: 1, t0: 1 }));
  let prochaineBulle = 0;
  const nbEclats = leger ? 70 : 120;
  const eclats = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), nbEclats);
  eclats.frustumCulled = false;
  eclats.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(nbEclats * 3).fill(1), 3);
  scene.add(eclats);
  const parts = Array.from({ length: nbEclats }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), age: 9, vie: 1, t: 1 }));
  let prochainEclat = 0;
  const couleur = new THREE.Color();
  function jaillir(x, y, z, n, teinte, force = 6, taille = 1) {
    if (reduit) n = Math.ceil(n / 3);
    for (let k = 0; k < n; k++) {
      const i = prochainEclat++ % nbEclats;
      const q = parts[i];
      q.p.set(x, y, z);
      const a = Math.random() * Math.PI * 2;
      q.v.set(Math.cos(a) * force * (0.3 + Math.random() * 0.7), force * (0.6 + Math.random() * 0.8), Math.sin(a) * force * (0.3 + Math.random() * 0.7));
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.age = 0;
      q.vie = 0.7 + Math.random() * 0.6;
      q.t = taille * (0.6 + Math.random() * 0.8);
      eclats.setColorAt(i, couleur.set(Array.isArray(teinte) ? teinte[k % teinte.length] : teinte));
    }
    eclats.instanceColor.needsUpdate = true;
  }
  // un rond d'écume qui s'ouvre (un choc, un plouf)
  const ronds = Array.from({ length: 8 }, () => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    r.userData.age = 9;
    scene.add(r);
    return r;
  });
  let prochainRond = 0;
  const rond = (x, z, taille = 3, teinte = 0xffffff) => { const r = ronds[prochainRond++ % ronds.length]; r.position.set(x, 0.25, z); r.material.color.set(teinte); r.userData = { age: 0, taille }; };

  // ---------- les pièces de Blender ----------
  const sortes = new Map(); // préfixe du nom (aiguille, tentacule…) → les nœuds du modèle
  let glbPieces = null;
  const pretPieces = lireV4("traversee-v4.glb").then((glb) => {
    if (detruit) return;
    glbPieces = glb;
    const base = sceneGLB(glb);
    for (const o of base.children) { const k = String(o.name).split("_")[0]; if (!sortes.has(k)) sortes.set(k, []); sortes.get(k).push(o); }
  }).catch((e) => { erreurs.push(`pièces : ${e.message}`); });
  const halo = toile(64, 64, (x, l) => {
    const d = x.createRadialGradient(l / 2, l / 2, 0, l / 2, l / 2, l / 2);
    d.addColorStop(0, "rgba(255,226,140,0.95)");
    d.addColorStop(0.5, "rgba(255,190,90,0.45)");
    d.addColorStop(1, "rgba(255,170,80,0)");
    x.fillStyle = d;
    x.fillRect(0, 0, l, l);
  });
  const alerte = toile(128, 128, (x, l) => {
    x.fillStyle = "#ff2d55"; x.strokeStyle = "#12050d"; x.lineWidth = 9;
    x.beginPath(); x.arc(l / 2, l / 2, l / 2 - 8, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = "#fff"; x.font = "900 86px 'Dela Gothic One', Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("!", l / 2, l / 2 + 6);
  });
  function fabriquer(modele) {
    const g = new THREE.Group();
    g.rotation.order = "YXZ";
    const corps = new THREE.Group();
    g.add(corps);
    let anims = [];
    const noeuds = sortes.get(modele);
    if (noeuds?.length) {
      const m = new THREE.Group();
      for (const o of noeuds) m.add(o.clone(true));
      const { bouge } = habiller(m, { relief: () => null, contour: 0.035, cuit: glbPieces?.cuit });
      anims = animateurs(bouge);
      corps.add(m);
    } else corps.add(pieceSimple(modele));
    const extra = {};
    if (modele === "tonneau" || modele === "bouteille" || modele === "bourrasque") {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      h.scale.setScalar(modele === "bourrasque" ? 5 : 3.2);
      h.position.y = 0.2;
      g.add(h);
      extra.halo = h;
    }
    if (modele === "tentacule") {
      // avant qu'il sorte : l'eau bouillonne et un « ! » prévient
      const remous = new THREE.Group();
      for (let k = 0; k < 10; k++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.22 + (k % 3) * 0.1, 10, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        b.userData.a = k * 0.63;
        remous.add(b);
      }
      const panneau = new THREE.Sprite(new THREE.SpriteMaterial({ map: alerte, depthTest: false }));
      panneau.scale.setScalar(1.6);
      panneau.position.y = 3.2;
      remous.add(panneau);
      g.add(remous);
      extra.remous = remous;
      extra.panneau = panneau;
    }
    return { g, corps, anims, modele, ...extra };
  }
  const libres = new Map();
  const vus = new Map(); // id de l'objet du moteur → sa pièce
  function prendre(modele) {
    const l = libres.get(modele);
    const p = l?.length ? l.pop() : fabriquer(modele);
    scene.add(p.g);
    p.g.visible = true;
    return p;
  }
  function rendre(p) {
    scene.remove(p.g);
    if (!libres.has(p.modele)) libres.set(p.modele, []);
    if (p.simple) return; // une forme d'attente : on la jette (le vrai modèle est peut-être arrivé)
    libres.get(p.modele).push(p);
  }

  // ---------- la vie autour : les îles au loin, les dauphins, les mouettes ----------
  const decors = [];
  const ILES = ["phare", "marais", "cristal", "archipel", "cimetiere", "horloge", "geants", "forteresse"];
  const glbIles = new Map();
  let prochaineIle = 120;
  function ile(dist) {
    const id = ILES[Math.floor(Math.random() * ILES.length)];
    if (!glbIles.has(id)) glbIles.set(id, lireV4(`ile-${id}-v4.glb`).catch(() => null));
    const cote = Math.random() < 0.5 ? -1 : 1;
    const x = dist + 245;
    const z = cote * (62 + Math.random() * 30);
    glbIles.get(id).then((glb) => {
      if (detruit || !glb) return;
      const m = sceneGLB(glb);
      const { bouge } = habiller(m, { relief: reliefBrume, cuit: glb.cuit });
      const traits = [];
      m.traverse((o) => { if (o.isMesh && o.parent?.isMesh && o.geometry === o.parent.geometry) traits.push(o); });
      for (const o of traits) o.parent.remove(o);
      const g = new THREE.Group();
      g.add(m);
      g.scale.setScalar(3.4);
      g.rotation.y = Math.random() * Math.PI * 2;
      g.position.set(x, -0.4, z);
      scene.add(g);
      decors.push({ g, anims: animateurs(bouge), fin: x + 80, ile: true });
    });
  }
  const uRelief = { uLumiere: { value: new THREE.Vector3(-0.4, 0.8, 0.4).normalize() }, uCam: uMer.uCam, uBrume: uMer.uBrume, uBrumeD: uMer.uBrumeD };
  function reliefBrume() {
    return new THREE.ShaderMaterial({
      uniforms: uRelief,
      vertexColors: true,
      vertexShader: `varying vec3 vC; varying vec3 vN; varying vec3 vW; varying vec3 vPos;
        void main() { vC = color; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vPos = position; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uLumiere; uniform vec3 uCam; uniform vec3 uBrume; uniform vec2 uBrumeD;
        varying vec3 vC; varying vec3 vN; varying vec3 vW; varying vec3 vPos;
        void main() {
          float d = max(dot(normalize(vN), uLumiere), 0.0);
          vec3 c = vC * (0.6 + 0.55 * d);
          float n = fract(vPos.y / 0.55);
          c = mix(c, c * 0.62, (1.0 - smoothstep(0.0, 0.09, min(n, 1.0 - n))) * step(0.12, vPos.y));
          c = mix(c, uBrume, smoothstep(uBrumeD.x, uBrumeD.y, length(vW - uCam)));
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
  }
  // les dauphins : par trois, ils sautent à côté du navire
  let vieMer = null;
  let prochainsDauphins = 6;
  function dauphins(m) {
    if (!vieMer) return;
    const noeuds = vieMer.get("dauphin");
    if (!noeuds) return;
    const cote = Math.random() < 0.5 ? -1 : 1;
    const z0 = m.x + cote * (11 + Math.random() * 5);
    for (let k = 0; k < 3; k++) {
      const modele = new THREE.Group();
      for (const o of noeuds) modele.add(o.clone(true));
      const { bouge } = habiller(modele, { relief: () => null, contour: 0.03, cuit: true });
      const g = new THREE.Group();
      g.add(modele);
      g.scale.setScalar(1.1);
      g.rotation.order = "YXZ";
      scene.add(g);
      const anims = animateurs(bouge);
      const x0 = m.dist + 30 + k * 4, z = z0 + (k - 1) * 1.8, dec = k * 0.35;
      let age = -dec;
      decors.push({
        g, anims, fin: Infinity,
        maj(dt, mm) {
          age += dt;
          // ils nagent un peu moins vite que le navire, et sautent deux fois
          const u = age % 1.6;
          const x = x0 + age * (mm.v * 0.75);
          const y = age < 0 ? -3 : Math.sin((u / 1.6) * Math.PI) * 2.6 - 0.8;
          g.position.set(x, y, z);
          g.rotation.z = Math.cos((u / 1.6) * Math.PI) * 0.7;
          g.visible = age > 0 && y > -0.9;
          if (age > 0 && u < dt * 1.5) rond(x, z, 2);
          if (age > 3.2) this.fin = -Infinity;
        },
      });
    }
  }
  if (!reduit) lireV4("vie-mer.glb").then((glb) => {
    if (detruit) return;
    vieMer = new Map();
    for (const o of sceneGLB(glb).children) { const k = String(o.name).split("_")[0]; if (!vieMer.has(k)) vieMer.set(k, []); vieMer.get(k).push(o); }
  }).catch(() => {});
  // les mouettes qui suivent le navire
  const mouettes = [];
  if (!leger) lireGLB(`${modeles}mouette.glb`).then((glb) => {
    if (detruit) return;
    for (let k = 0; k < 2; k++) {
      const m = sceneGLB(glb);
      const { bouge } = habiller(m, { relief: () => null, contour: 0.02, cuit: glb.cuit });
      const g = new THREE.Group();
      g.add(m);
      g.scale.setScalar(0.035);
      g.rotation.order = "YXZ";
      scene.add(g);
      mouettes.push({ g, anims: animateurs(bouge), a: k * 3, h: 7 + k * 1.5 });
    }
  }).catch(() => {});

  // ---------- la taille, la caméra ----------
  function taille(l, h) {
    L = Math.max(1, l);
    H = Math.max(1, h);
    renderer.setSize(L, H, false);
    camera.aspect = L / H;
    portrait = L / H < 0.9;
    // assez large pour voir les deux bords du chenal, même sur un téléphone tenu droit
    const demi = THREE.MathUtils.degToRad(portrait ? 23 : 36);
    camera.fov = Math.min(portrait ? 78 : 58, Math.max(44, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(demi) / camera.aspect))));
    camera.updateProjectionMatrix();
  }
  const cible = new THREE.Vector3();
  const vue = new THREE.Vector3();
  let secousse = 0;

  // ---------- une image ----------
  let temps = 0;
  let images = 0;
  let moteur = null;
  let naufrage = 0;
  function dessiner(m, dt = 0.016) {
    if (detruit) return;
    if (m !== moteur) { for (const p of vus.values()) rendre(p); vus.clear(); moteur = m; }
    temps += dt;
    images++;
    const t = temps;
    uMer.uT.value = t;
    uCiel.uT.value = t;
    // le navire
    porteur.position.set(m.dist, 0, m.x);
    const vlat = m.vx || 0;
    porteur.rotation.y = -Math.atan2(vlat, Math.max(6, m.v)) * 0.9;
    const bas = reduit ? 0.4 : 1;
    coque.rotation.x = THREE.MathUtils.clamp(vlat * 0.022, -0.3, 0.3) + Math.sin(t * 1.7) * 0.025 * bas;
    coque.rotation.z = Math.sin(t * 1.3) * 0.035 * bas;
    coque.position.y = houle(m.dist, m.x, t) * 0.7 + Math.sin(t * 2.1) * 0.08 * bas;
    naufrage = m.fini ? naufrage + dt : 0;
    if (naufrage > 0) {
      const k = Math.min(1, naufrage / 1.6);
      coque.position.y -= k * k * 3.2;
      coque.rotation.x += k * 0.55;
      coque.rotation.z -= k * 0.25;
    }
    ombreNavire.position.y = houle(m.dist, m.x, t) + 0.14;
    ventNavire = m.vent > 0 ? 1.25 : 1;
    for (const a of animsNavire) a(t);
    // touché : il clignote (avec « réduire les animations », il pâlit seulement)
    modeleNavire.visible = !(m.invincible > 0 && !reduit && Math.floor(m.invincible * 12) % 2 === 0);
    bulle.visible = m.vent > 0;
    if (bulle.visible) { bulle.material.uniforms.uT.value = t; bulle.material.uniforms.uForce.value = m.vent < 1 ? (Math.floor(m.vent * 8) % 2 ? 1 : 0.3) : 1; bulle.rotation.y = t * 0.8; }
    trainee?.maj(dt, porteur);
    // le sillage : deux rangées de ronds d'écume, de plus en plus serrées avec la vitesse
    prochaineBulle -= m.fini ? 0 : dt;
    while (prochaineBulle <= 0) {
      prochaineBulle += Math.max(0.012, 0.42 / Math.max(8, m.v));
      for (const s of [-1, 1]) {
        const b = bulles.find((x) => x.age >= x.vie);
        if (!b) break;
        b.x = m.dist - 2.4 + Math.random() * 0.6;
        b.z = m.x + s * (0.9 + Math.random() * 0.3);
        b.vx = -m.v * 0.08;
        b.vz = s * (1.4 + Math.random() * 1.2) + vlat * 0.3;
        b.age = 0;
        b.vie = 1.6 + Math.random() * 0.8;
        b.t0 = (portrait ? 0.6 : 0.8) + Math.random() * 0.5;
      }
    }
    const o = new THREE.Object3D();
    bulles.forEach((b, k) => {
      let s = 0;
      if (b.age < b.vie) {
        b.age += dt;
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.vz *= 1 - dt * 0.6;
        const f = b.age / b.vie;
        s = b.t0 * (0.7 + f * 1.6) * (1 - f * f);
      }
      o.position.set(b.x, 0.12 + houle(b.x, b.z, t) * 0.8, b.z);
      o.scale.set(s * 1.4, 1, s);
      o.updateMatrix();
      sillage.setMatrixAt(k, o.matrix);
    });
    sillage.instanceMatrix.needsUpdate = true;
    parts.forEach((q, k) => {
      let s = 0;
      if (q.age < q.vie) {
        q.age += dt;
        q.v.y -= 16 * dt;
        q.p.addScaledVector(q.v, dt);
        q.r.x += dt * 7; q.r.y += dt * 5;
        s = q.t * Math.min(1, (q.vie - q.age) * 3);
        if (q.p.y < -0.5) q.age = q.vie;
      }
      o.position.copy(q.p);
      o.rotation.copy(q.r);
      o.scale.setScalar(s);
      o.updateMatrix();
      eclats.setMatrixAt(k, o.matrix);
    });
    o.rotation.set(0, 0, 0);
    eclats.instanceMatrix.needsUpdate = true;
    for (const r of ronds) {
      const u = r.userData;
      if (u.age >= 1.2) { r.visible = false; continue; }
      u.age += dt;
      r.visible = true;
      r.scale.setScalar(u.taille * (0.4 + u.age * 1.6));
      r.material.opacity = Math.max(0, 0.85 * (1 - u.age / 1.2));
    }
    // les pièces : chaque objet du moteur a la sienne
    const garder = new Set();
    let trous = 0;
    for (const v of uMer.uTrous.value) v.w = 0;
    for (const ob of m.objets) {
      if (ob.pris || ob.x < m.dist - 30 || ob.x > m.dist + 200) continue;
      garder.add(ob.id);
      let p = vus.get(ob.id);
      if (p && ((p.simple && sortes.has(p.modele)) || p.modele !== ob.modele)) { rendre(p); vus.delete(ob.id); p = null; } // le vrai modèle est arrivé
      if (!p) {
        p = prendre(ob.modele);
        if (!sortes.has(ob.modele)) p.simple = true;
        p.g.scale.setScalar(ob.ech || 1);
        p.g.rotation.set(0, ob.rot || 0, 0);
        vus.set(ob.id, p);
      }
      const flotte = houle(ob.x, ob.z, t);
      if (ob.type === "tonneau" || ob.type === "bouteille") {
        p.g.position.set(ob.x, 0.28 + flotte * 0.9, ob.z);
        p.corps.rotation.y = t * 0.6 + ob.phase;
        p.halo.material.opacity = 0.55 + Math.sin(t * 5 + ob.phase) * 0.3;
        p.halo.position.y = -0.16;
      } else if (ob.type === "bourrasque") {
        p.g.position.set(ob.x, 2.4 + Math.sin(t * 2 + ob.phase) * 0.35, ob.z);
        p.corps.rotation.y = Math.PI + Math.sin(t * 1.5) * 0.3;
        p.halo.position.y = -2.2;
      } else if (ob.type === "tentacule") {
        const mo = ob.montee || 0;
        p.corps.position.y = -7 * (1 - easeOut(mo));
        p.corps.visible = mo > 0.01;
        p.corps.rotation.z = Math.sin(t * 1.4 + ob.phase) * 0.08;
        p.g.position.set(ob.x, 0, ob.z);
        const attend = ob.etat === "attente" || (ob.etat === "monte" && mo < 0.4);
        p.remous.visible = attend || mo < 0.98;
        p.panneau.visible = attend && Math.floor(t * 6) % 2 === 0;
        p.remous.children.forEach((b, k) => {
          if (!b.isMesh) return;
          const a = b.userData.a + t * 2.2;
          const r = 1.3 + Math.sin(t * 7 + k) * 0.25;
          b.position.set(Math.cos(a) * r, 0.1 + Math.abs(Math.sin(t * 9 + k * 1.7)) * 0.35, Math.sin(a) * r);
        });
      } else if (ob.type === "tourbillon") {
        p.g.position.set(ob.x, 0, ob.z);
        if (trous < 4) { uMer.uTrous.value[trous++].set(ob.x, ob.z, 4.05 * (ob.ech || 1), 1); }
      } else {
        // les rochers : ils restent posés ; brisés par le bouclier du vent, ils s'enfoncent
        p.g.position.set(ob.x, ob.brise ? -Math.min(8, (t - ob.brise) * 9) : 0, ob.z);
        if (ob.brise && !p.vuBrise) { p.vuBrise = true; }
      }
      for (const a of p.anims) a(t + ob.phase);
    }
    for (const [id, p] of vus) if (!garder.has(id)) { rendre(p); vus.delete(id); }
    // les îles qui passent au loin, les dauphins, les mouettes
    if (m.dist > prochaineIle) { prochaineIle = m.dist + (leger ? 520 : 300) + Math.random() * 200; if (!reduit || decors.filter((d) => d.ile).length < 1) ile(m.dist); }
    prochainsDauphins -= dt;
    if (prochainsDauphins <= 0) { prochainsDauphins = 11 + Math.random() * 8; dauphins(m); }
    for (let k = decors.length - 1; k >= 0; k--) {
      const d = decors[k];
      d.maj?.(dt, m);
      for (const a of d.anims) a(t);
      if (d.fin < m.dist || (d.ile && d.g.position.x < m.dist - 60)) { scene.remove(d.g); decors.splice(k, 1); }
    }
    for (const mo of mouettes) {
      const a = t * 0.55 + mo.a;
      mo.g.position.set(m.dist + 2 + Math.cos(a) * 5, mo.h + Math.sin(t * 1.3 + mo.a) * 0.6, m.x + Math.sin(a) * 6);
      mo.g.rotation.y = -a - Math.PI / 2;
      mo.g.rotation.z = Math.sin(a) * 0.3;
      for (const an of mo.anims) an(t * 1.4);
    }
    // la caméra : derrière le navire, un peu au-dessus ; plus haute sur un téléphone tenu droit
    secousse = Math.max(0, secousse - dt * 2.5);
    const suit = portrait ? 1 : 0.62;
    const recul = portrait ? 15 : 13.5;
    const hauteur = portrait ? 12 : 9;
    vue.set(m.dist - recul, hauteur + (m.vent > 0 ? 0.4 : 0), m.x * suit);
    if (secousse > 0 && !reduit) vue.add(new THREE.Vector3((Math.random() - 0.5) * secousse, (Math.random() - 0.5) * secousse, (Math.random() - 0.5) * secousse));
    camera.position.lerp(vue, images < 3 || camera.position.distanceTo(vue) > 30 ? 1 : Math.min(1, dt * 8));
    cible.set(m.dist + (portrait ? 17 : 19), 0, m.x * (portrait ? 1 : 0.8));
    camera.lookAt(cible);
    camera.rotation.z += THREE.MathUtils.clamp(-vlat * 0.004, -0.05, 0.05) * (reduit ? 0 : 1);
    ciel.position.copy(camera.position);
    mer.position.set(Math.round(m.dist / 4) * 4 + 120, 0, Math.round(m.x / 4) * 4);
    uMer.uCam.value.copy(camera.position);
    lampe.position.set(m.dist - 40, 70, m.x + 35);
    lampe.target.position.set(m.dist + 20, 0, m.x);
    renderer.render(scene, camera);
  }
  const easeOut = (x) => 1 - (1 - x) ** 3;

  // ---------- ce qui arrive (le moteur prévient) ----------
  function evenement(e) {
    const ob = e.objet;
    if (e.type === "choc") {
      secousse = 1.2;
      jaillir(e.x, 1.2, e.z, 14, [0x7a3b2e, 0xd2a676, 0x9a6a40], 7, 1);
      jaillir(e.x, 0.4, e.z, 8, 0xffffff, 5, 0.8);
      rond(e.x, e.z, 3.5);
    } else if (e.type === "tonneau") {
      jaillir(ob.x, 0.8, ob.z, 10, [0xffd36b, 0xffb347, 0xffffff], 5, 0.7);
      rond(ob.x, ob.z, 2.2, 0xffe3a0);
    } else if (e.type === "coeur" || e.type === "bouteille") {
      jaillir(ob.x, 0.8, ob.z, 12, [0xff4f9a, 0xffb3d1, 0xffffff], 5, 0.7);
      rond(ob.x, ob.z, 2.6, 0xffb3d1);
    } else if (e.type === "vent") {
      jaillir(ob.x, 2.4, ob.z, 16, [0x3fd0c9, 0xffffff, 0xbfe6ff], 6, 0.8);
      rond(ob.x, ob.z, 5, 0x9ff5ee);
    } else if (e.type === "brise") {
      secousse = 0.6;
      jaillir(ob.x, 1.5, ob.z, 18, [0xa39a8c, 0x6b6258, 0xffffff], 9, 1.2);
      rond(ob.x, ob.z, 4);
    } else if (e.type === "naufrage") {
      secousse = 1.6;
      jaillir(e.x, 1.5, e.z, 22, [0x7a3b2e, 0xd2a676, 0xffffff, 0xff4f9a], 8, 1.1);
      rond(e.x, e.z, 6);
    }
  }
  // un point du monde, en coordonnées de l'écran (0 à 1) : pour placer les « +25 » au-dessus
  const pv = new THREE.Vector3();
  function versEcran(x, y, z) {
    pv.set(x, y, z).project(camera);
    return [(pv.x + 1) / 2, (1 - pv.y) / 2, pv.z < 1];
  }
  function tropLent() {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const nom = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(nom)) return true;
    const t0 = performance.now();
    for (let k = 0; k < 3; k++) renderer.render(scene, camera);
    gl.finish();
    return performance.now() - t0 > 300;
  }
  function detruire() {
    detruit = true;
    trainee?.detruire?.();
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    renderer.dispose();
    renderer.forceContextLoss?.();
  }
  return {
    taille, dessiner, evenement, versEcran, tropLent, detruire,
    pret: Promise.allSettled([pretNavire, pretPieces]),
    etat: () => ({ leger, portrait, fov: camera.fov, erreurs, images, pieces: [...sortes.keys()], vus: vus.size, navireBlender: modeleNavire.children.length > 0 && !modeleNavire.userData.simple, decors: decors.length, mouettes: mouettes.length }),
  };
}

// ---------- les formes d'attente (avant que les modèles arrivent, ou s'ils n'arrivent pas) ----------
const encre = new THREE.MeshBasicMaterial({ color: 0x2a160c, side: THREE.BackSide });
function avecTrait(mesh, ep = 1.08) {
  const c = new THREE.Mesh(mesh.geometry, encre);
  c.scale.setScalar(ep);
  mesh.add(c);
  return mesh;
}
const mat = (c) => new THREE.MeshPhongMaterial({ color: c, shininess: 30, specular: 0x222222 });
function navireSimple(couleurs = {}) {
  const g = new THREE.Group();
  g.userData.simple = true;
  const coque = avecTrait(new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 2), mat(0x7a3b2e)));
  coque.position.y = 0.5;
  const mat1 = avecTrait(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.4, 8), mat(0x4a2219)));
  mat1.position.set(0.3, 3, 0);
  const voile = avecTrait(new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.4, 2.6), mat(new THREE.Color(couleurs?.principale || "#ff4f9a").getHex())));
  voile.position.set(0.45, 3.1, 0);
  g.add(coque, mat1, voile);
  return g;
}
function pieceSimple(modele) {
  const g = new THREE.Group();
  if (modele === "aiguille" || modele === "jumeaux" || modele === "recif") {
    const r = modele === "recif" ? 1.6 : 1.5;
    const h = modele === "aiguille" ? 4.4 : modele === "recif" ? 0.9 : 2.6;
    const n = modele === "jumeaux" ? [[0, 1.05], [0, -1.0]] : modele === "recif" ? [[0, -1.6], [0, 0], [0, 1.6]] : [[0, 0]];
    for (const [x, z] of n) {
      const roc = avecTrait(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), mat(0x8f867a)));
      roc.scale.set(r * (modele === "jumeaux" ? 0.8 : 1), h / 2, r * (modele === "jumeaux" ? 0.8 : 1));
      roc.position.set(x, h / 3, z);
      g.add(roc);
    }
  } else if (modele === "tentacule") {
    const b = avecTrait(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.75, 5, 12), mat(0x5e2bb0)));
    b.position.y = 2.2;
    g.add(b);
  } else if (modele === "tourbillon") {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.6, 4.2, 40, 1, 0, Math.PI * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2a3f8f }));
    r.position.y = 0.05;
    g.add(r);
  } else if (modele === "tonneau") {
    const t = avecTrait(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 14), mat(0xd2a676)));
    t.rotation.x = Math.PI / 2;
    g.add(t);
  } else if (modele === "bouteille") {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 12), new THREE.MeshPhongMaterial({ color: 0x5fd39a, transparent: true, opacity: 0.6 }));
    b.rotation.z = Math.PI / 2;
    g.add(b);
  } else if (modele === "bourrasque") {
    const n = avecTrait(new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x777777 })));
    g.add(n);
  }
  return g;
}
