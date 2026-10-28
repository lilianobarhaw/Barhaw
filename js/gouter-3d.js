// Le goûter de Chopper, en 3D.
// Ce fichier ne fait que dessiner : le jeu (ce qui tombe, où est Chopper, les points) reste celui de site.js,
// en pixels de l'écran. Chaque objet est posé exactement à sa place de jeu, sur un plan face à nous ;
// derrière, une nappe de pique-nique s'enfonce jusqu'à l'horizon, sous un ciel de nuit.
// Rendu « manga » : aplats, ombres en trame de points, contours à l'encre. Chopper reste sa photo, en médaillon.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";

THREE.ColorManagement.enabled = false;

const ENCRE = 0x12050d;

function toile(l, h, dessin) {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  dessin(c.getContext("2d"), l, h);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}
const hasard = (graine) => () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };

export function creerGouter3D(canvas, { photo }) {
  const ratio = Math.min(1.5, window.devicePixelRatio || 1);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  const scene = new THREE.Scene();
  // la caméra regarde droit devant ; l'horizon est placé au tiers haut de l'image (objectif décentré),
  // si bien que le plan du jeu (z = 0) correspond pixel pour pixel à l'écran du jeu
  const camera = new THREE.PerspectiveCamera(30, 16 / 10, 1, 20000);
  const HORIZON = 0.36; // l'horizon, en fraction de la hauteur depuis le haut
  let L = 640;
  let H = 400;
  let D = 640;

  // ---------- l'encre : aplats, ombre en trame de points, contour ----------
  const lumiereMonde = new THREE.Vector3(-0.5, 0.75, 0.6).normalize();
  const uLumiere = { value: new THREE.Vector3() };
  const uTrame = { value: 5 * ratio };
  const BLANC = new THREE.Texture();
  // carte : une image qui assombrit (mode 1) ou des motifs blancs posés dessus, selon leur transparence (mode 2)
  function encre(couleur, ombre, carte = null, mode = 1) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uCouleur: { value: new THREE.Color(couleur) }, uOmbre: { value: new THREE.Color(ombre) }, uLumiere, uTrame,
        uCarte: { value: carte || BLANC }, uAvecCarte: { value: carte ? mode : 0 },
      },
      vertexShader: `
        varying vec3 vN; varying vec2 vUv;
        void main() { vN = normalize(normalMatrix * normal); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uCouleur; uniform vec3 uOmbre; uniform vec3 uLumiere; uniform float uTrame; uniform sampler2D uCarte; uniform float uAvecCarte;
        varying vec3 vN; varying vec2 vUv;
        void main() {
          float l = dot(normalize(vN), uLumiere);
          vec3 c = uCouleur;
          if (l < 0.05) {
            vec2 p = mod(gl_FragCoord.xy, uTrame) - 0.5 * uTrame;
            float point = 1.0 - smoothstep(uTrame * 0.22, uTrame * 0.3, length(p));
            c = mix(uOmbre, uOmbre * 0.62, point);
          } else if (l < 0.5) {
            c = mix(uOmbre, uCouleur, 0.6);
          } else if (l > 0.9) {
            c = mix(c, vec3(1.0), 0.28);
          }
          if (uAvecCarte > 1.5) c = mix(c, vec3(1.0, 0.97, 0.99), texture2D(uCarte, vUv).a * 0.85);
          else if (uAvecCarte > 0.5) c *= texture2D(uCarte, vUv).rgb;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
  }
  const matContour = new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide });
  // le contour : la même forme un peu plus grande, retournée et noire (e : l'épaisseur, en fraction de la taille)
  function avecContour(mesh, e = 0.09) {
    const c = new THREE.Mesh(mesh.geometry, matContour);
    c.scale.setScalar(1 + e);
    mesh.add(c);
    return mesh;
  }

  // ---------- le ciel, la lune, les étoiles ----------
  scene.background = toile(4, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#110b1c"); g.addColorStop(0.3, "#2a1240"); g.addColorStop(0.36, "#4a1f5c"); g.addColorStop(0.37, "#1d1030"); g.addColorStop(1, "#1d1030");
    x.fillStyle = g; x.fillRect(0, 0, l, h);
  });
  const lune = new THREE.Sprite(new THREE.SpriteMaterial({
    map: toile(128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
      g.addColorStop(0, "#ffe4f1"); g.addColorStop(0.45, "#ffb3d9"); g.addColorStop(0.62, "rgba(255, 150, 210, 0.25)"); g.addColorStop(1, "rgba(255, 150, 210, 0)");
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      x.fillStyle = "rgba(200, 110, 170, 0.35)";
      for (const [cx, cy, r] of [[52, 50, 7], [74, 70, 5], [60, 78, 4]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    }),
    depthWrite: false,
  }));
  scene.add(lune);
  const texEtoile = toile(32, 32, (x) => {
    x.fillStyle = "#fff0f7";
    x.beginPath(); x.moveTo(16, 0); x.quadraticCurveTo(16, 16, 32, 16); x.quadraticCurveTo(16, 16, 16, 32); x.quadraticCurveTo(16, 16, 0, 16); x.quadraticCurveTo(16, 16, 16, 0); x.fill();
  });
  const alea = hasard(5);
  const etoiles = Array.from({ length: 22 }, () => {
    const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEtoile, transparent: true, depthWrite: false, opacity: 0.6 }));
    e.userData = { fx: alea(), fy: alea() * 0.9, t: 6 + alea() * 10, phase: alea() * 6.28, vitesse: 0.6 + alea() * 1.4 };
    scene.add(e);
    return e;
  });

  // ---------- la nappe de pique-nique, qui s'enfonce jusqu'à l'horizon ----------
  const texNappe = toile(256, 256, (x, l, h) => {
    const c = l / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      x.fillStyle = (i + j) % 2 ? "#3a1646" : "#24102f";
      x.fillRect(i * c, j * c, c, c);
    }
    // les bandes de la trame qui se croisent, comme un vrai tissu vichy
    x.fillStyle = "rgba(255, 122, 176, 0.2)";
    for (let i = 0; i < 4; i += 2) { x.fillRect(i * c, 0, c, h); x.fillRect(0, i * c, l, c); }
    x.strokeStyle = "rgba(255, 150, 210, 0.12)"; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * c, 0); x.lineTo(i * c, h); x.moveTo(0, i * c); x.lineTo(l, i * c); x.stroke(); }
  });
  texNappe.wrapS = texNappe.wrapT = THREE.RepeatWrapping;
  const matNappe = new THREE.MeshBasicMaterial({ map: texNappe });
  const nappe = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), matNappe);
  scene.add(nappe);
  // un voile sombre qui monte vers l'horizon : la nappe se perd dans la nuit
  const matBrume = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCouleur: { value: new THREE.Color(0x1d1030) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uCouleur; varying vec2 vUv; void main() { gl_FragColor = vec4(uCouleur, smoothstep(0.0, 0.5, vUv.y) * 0.95); }`,
  });
  const brume = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), matBrume);
  scene.add(brume);

  // ---------- les lignes de concentration, derrière le jeu, qui partent de Chopper ----------
  const matLignes = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uCentre: { value: new THREE.Vector2() }, uFort: { value: 0 }, uTemps: { value: 0 } },
    vertexShader: `varying vec3 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform vec2 uCentre; uniform float uFort; uniform float uTemps; varying vec3 vP;
      void main() {
        vec2 d = vP.xy - uCentre;
        float a = atan(d.y, d.x) / 6.28318 * 48.0 + floor(uTemps * 8.0) * 0.07;
        float trait = 1.0 - smoothstep(0.0, 0.08, abs(fract(a) - 0.5) - 0.42);
        float loin = smoothstep(60.0, 160.0, length(d));
        gl_FragColor = vec4(mix(vec3(0.75, 0.6, 1.0), vec3(1.0, 0.7, 0.86), uFort), trait * loin * (0.07 + 0.08 * uFort));
      }`,
  });
  const lignes = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matLignes);
  scene.add(lignes);

  // ---------- Chopper : sa photo en médaillon, la tranche violette ----------
  const chopper = new THREE.Group();
  const texPhoto = new THREE.Texture(photo);
  if (photo.complete && photo.naturalWidth) texPhoto.needsUpdate = true;
  else photo.addEventListener("load", () => { texPhoto.needsUpdate = true; }, { once: true });
  const matPhoto = new THREE.MeshBasicMaterial({ map: texPhoto });
  const texAnneau = toile(128, 128, (x) => {
    const g = x.createLinearGradient(0, 0, 128, 128);
    g.addColorStop(0, "#c7a6ff"); g.addColorStop(0.5, "#9b5cff"); g.addColorStop(1, "#e3447f");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
  const piece = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 48).rotateX(Math.PI / 2), [encre(0x9b5cff, 0x4a1f8c), new THREE.MeshBasicMaterial({ map: texAnneau }), encre(0x9b5cff, 0x4a1f8c)]);
  const face = new THREE.Mesh(new THREE.CircleGeometry(1, 48), matPhoto);
  face.position.z = 0.16;
  const contourPiece = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, 0.22, 48).rotateX(Math.PI / 2), matContour);
  const medaillon = new THREE.Group();
  medaillon.add(contourPiece, piece, face);
  chopper.add(medaillon);
  scene.add(chopper);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: toile(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(8, 2, 10, 0.9)"); g.addColorStop(1, "rgba(8, 2, 10, 0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
    transparent: true, depthWrite: false,
  }));
  scene.add(ombre);

  // ---------- ce qui tombe : des modèles de taille 1, mis à l'échelle de chaque objet ----------
  // les rayures blanches des bonbons, en biais
  const texRayures = toile(128, 64, (x, l, h) => {
    x.fillStyle = "#fff";
    for (let k = -2; k < 8; k++) { x.beginPath(); x.moveTo(k * 22, 0); x.lineTo(k * 22 + 10, 0); x.lineTo(k * 22 + 10 + 30, h); x.lineTo(k * 22 + 30, h); x.fill(); }
  });
  texRayures.wrapS = THREE.RepeatWrapping;
  // une teinte par couleur de bonbon (les mêmes que la 2D)
  const COULEURS = { "#ff7ab0": 0xc23a76, "#bf9bff": 0x6f4fb8, "#ffd166": 0xc48a1f, "#7ee0f5": 0x2f8fa6, "#ff9a6b": 0xc4532a };
  const matsBonbon = {};
  const matBonbon = (c) => (matsBonbon[c] ||= encre(c, COULEURS[c] || 0x6f4fb8, texRayures, 2));
  const matPapillote = (c) => (matsBonbon[c + "p"] ||= encre(c, COULEURS[c] || 0x6f4fb8));
  const geoCorps = new THREE.SphereGeometry(0.62, 20, 14).scale(1, 0.78, 0.78);
  const geoPapillote = new THREE.ConeGeometry(0.42, 0.55, 12);
  const texChoco = toile(128, 96, (x, l, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, l, h);
    x.strokeStyle = "rgba(40, 14, 6, 0.75)"; x.lineWidth = 6;
    x.beginPath(); x.moveTo(l / 2, 0); x.lineTo(l / 2, h); x.moveTo(0, h / 2); x.lineTo(l, h / 2); x.stroke();
    x.fillStyle = "rgba(255, 210, 170, 0.35)"; for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) x.fillRect(i * l / 2 + 8, j * h / 2 + 7, l / 2 - 26, 5);
  });
  const matChoco = encre(0x7a432b, 0x3a1b10, texChoco);
  const matAlu = encre(0xe8e4f0, 0x9a94ad);
  const matBarbe = encre(0xffb3d9, 0xd96aa5);
  const matBaton = encre(0xfff8fb, 0xc9b8d6);
  const matBombe = encre(0x2a2238, 0x0b0712);
  const matCapsule = encre(0x8f86a3, 0x3a3348);
  const matMeche = encre(0xd9c49a, 0x7d6a45);
  const texLueur = toile(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(255, 190, 225, 0.9)"); g.addColorStop(1, "rgba(255, 150, 210, 0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const texEtincelle = toile(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 30); g.addColorStop(0, "#fff7d6"); g.addColorStop(0.35, "#ffd166"); g.addColorStop(0.7, "rgba(255, 122, 61, 0.6)"); g.addColorStop(1, "rgba(255, 122, 61, 0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  });
  const FABRIQUES = {
    bonbon(o) {
      const g = new THREE.Group();
      const corps = avecContour(new THREE.Mesh(geoCorps, matBonbon(o.couleur)), 0.12);
      g.add(corps);
      for (const s of [-1, 1]) {
        const p = avecContour(new THREE.Mesh(geoPapillote, matPapillote(o.couleur)), 0.14);
        p.rotation.z = s * Math.PI / 2;
        p.position.x = s * 0.82;
        g.add(p);
      }
      return g;
    },
    chocolat() {
      const g = new THREE.Group();
      g.add(avecContour(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.34), matChoco), 0.08));
      const alu = avecContour(new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.16, 0.4), matAlu), 0.08);
      alu.position.x = 0.48;
      g.add(alu);
      return g;
    },
    barbe() {
      const g = new THREE.Group();
      const lueur = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLueur, transparent: true, depthWrite: false, opacity: 0.55 }));
      lueur.scale.set(3, 3, 1);
      lueur.position.z = -0.5;
      g.add(lueur);
      const baton = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8), matBaton), 0.3);
      baton.position.y = -0.75;
      g.add(baton);
      for (const [x, y, r] of [[0, -0.25, 0.6], [-0.45, 0, 0.45], [0.45, 0, 0.45], [-0.2, 0.25, 0.4], [0.2, 0.25, 0.4]]) {
        const b = avecContour(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), matBarbe), 0.1);
        b.position.set(x, -y, 0);
        g.add(b);
      }
      return g;
    },
    bombe() {
      const g = new THREE.Group();
      g.add(avecContour(new THREE.Mesh(new THREE.SphereGeometry(0.7, 22, 16), matBombe), 0.08));
      const cap = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 12), matCapsule), 0.15);
      cap.position.set(0.32, 0.6, 0);
      cap.rotation.z = -0.5;
      g.add(cap);
      const courbe = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.38, 0.68, 0), new THREE.Vector3(0.6, 1.05, 0), new THREE.Vector3(0.95, 0.95, 0));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 10, 0.05, 6), matMeche));
      const etincelle = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEtincelle, transparent: true, depthWrite: false }));
      etincelle.position.set(0.95, 0.95, 0.05);
      g.add(etincelle);
      g.userData.etincelle = etincelle;
      return g;
    },
  };
  const reserve = {};
  const enPlace = new Map();
  function prendre(o) {
    let g = enPlace.get(o);
    if (g) return g;
    const cle = o.type === "bonbon" ? `bonbon${o.couleur}` : o.type;
    g = reserve[cle]?.pop() || FABRIQUES[o.type](o);
    g.userData.cle = cle;
    if (!g.parent) scene.add(g);
    g.visible = true;
    enPlace.set(o, g);
    return g;
  }

  // ---------- les miettes : quand Chopper attrape quelque chose ----------
  const geoMiette = new THREE.BoxGeometry(1, 1, 1);
  const miettes = Array.from({ length: 30 }, () => {
    const m = new THREE.Mesh(geoMiette, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
    m.visible = false;
    m.userData = { vie: 0 };
    scene.add(m);
    return m;
  });
  function attrape(x, y, type, couleur) {
    const c = type === "bombe" ? [0xff9a6b, 0x2a2238, 0xffd166] : type === "chocolat" ? [0x7a432b, 0xe8e4f0] : type === "barbe" ? [0xffb3d9, 0xffffff] : [new THREE.Color(couleur || "#ff7ab0").getHex(), 0xffffff];
    let n = type === "bombe" ? 12 : 7;
    for (const m of miettes) {
      if (m.userData.vie > 0) continue;
      const a = Math.random() * Math.PI * 2;
      const v = (type === "bombe" ? 260 : 150) * (0.5 + Math.random());
      m.userData = { vie: 0.6, max: 0.6, vx: Math.cos(a) * v, vy: Math.abs(Math.sin(a)) * v + 80, va: (Math.random() - 0.5) * 14, taille: 3 + Math.random() * 4 };
      m.material.color.setHex(c[Math.floor(Math.random() * c.length)]);
      m.position.set(x - L / 2, HORIZON * H - y, 10);
      m.visible = true;
      if (--n <= 0) break;
    }
  }

  // ---------- la taille de l'image ----------
  function taille(l, h) {
    L = Math.max(100, l);
    H = Math.max(100, h);
    renderer.setSize(Math.round(L), Math.round(H), false);
    D = 1.6 * H; // la distance de la caméra au plan du jeu
    camera.position.set(0, 0, D);
    camera.near = 10;
    camera.far = 40 * D;
    // un cadre décentré : au plan z = 0, on voit x ∈ [−L/2, L/2] et y ∈ [−(1 − HORIZON)·H, HORIZON·H]
    const n = camera.near;
    camera.projectionMatrix.makePerspective(-L / 2 * n / D, L / 2 * n / D, HORIZON * H * n / D, -(1 - HORIZON) * H * n / D, n, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.updateMatrixWorld();
    uLumiere.value.copy(lumiereMonde).transformDirection(camera.matrixWorldInverse);
    // la nappe : du bas de l'écran (au sol de Chopper) jusqu'au loin
    const sol = HORIZON * H - (H - 8);
    const profond = 30 * D;
    nappe.scale.set(60 * L, 1, profond);
    nappe.position.set(0, sol, D * 0.4 - profond / 2);
    texNappe.repeat.set((60 * L) / 120, profond / 120);
    brume.scale.set(60 * L, 1, profond);
    brume.position.set(0, sol + 0.5, D * 0.4 - profond / 2);
    // les lignes : un grand plan juste derrière le jeu
    lignes.scale.set(L * 1.4, H * 1.4, 1);
    lignes.position.set(0, (HORIZON - 0.5) * H, -4);
    // la lune et les étoiles, très loin : on les place pour qu'elles tombent au bon endroit de l'écran
    const loin = -20 * D;
    const k = (D - loin) / D; // à cette distance, un pixel de l'écran vaut k unités
    lune.position.set(0.3 * L * k, (HORIZON * H - 0.16 * H) * k, loin);
    lune.scale.set(0.22 * H * k, 0.22 * H * k, 1);
    for (const e of etoiles) {
      const u = e.userData;
      e.position.set((u.fx - 0.5) * L * k, (HORIZON * H - u.fy * HORIZON * H * 0.95) * k, loin);
      e.userData.k = k;
    }
  }

  // ---------- l'image ----------
  let dernierT = null;
  const q = new THREE.Quaternion();
  const e3 = new THREE.Euler();
  function dessiner(s, { temps = performance.now() / 1000, rayon = 40, secousse = 0 } = {}) {
    const t = temps;
    const dt = dernierT === null ? 0 : Math.max(0, Math.min(0.05, t - dernierT));
    dernierT = t;
    const Y = (py) => HORIZON * H - py; // les pixels du jeu (y vers le bas) → le monde (y vers le haut)
    const X = (px) => px - L / 2;
    // la secousse de la bombe : la caméra tremble
    camera.position.set((Math.random() - 0.5) * 12 * secousse, (Math.random() - 0.5) * 12 * secousse, D);
    camera.updateMatrixWorld();

    // les étoiles scintillent
    for (const e of etoiles) {
      const u = e.userData;
      const l = 0.5 + 0.5 * Math.sin(t * u.vitesse + u.phase);
      e.material.opacity = 0.15 + 0.6 * l;
      e.scale.setScalar(u.t * (0.6 + 0.6 * l) * u.k);
    }

    // Chopper : posé sur la nappe, il croque (il s'écrase un instant) et se balance
    const R = rayon;
    const cx = s.x || L / 2;
    const cy = H - R - 16 + Math.sin(t * 4) * 2;
    const croque = 1 + 0.12 * (s.mord || 0);
    chopper.position.set(X(cx), Y(cy), 0);
    chopper.scale.set(R * croque, R / croque, R);
    medaillon.rotation.set(-0.08, Math.sin(t * 1.3) * 0.12 + (cibleX(s, cx) * 0.25), Math.sin(t * 2) * 0.03);
    ombre.position.set(X(cx), HORIZON * H - (H - 8) + 0.6, -R * 0.2);
    ombre.scale.set(R * 1.2, 1, R * 0.5);

    // les lignes de concentration partent de Chopper, plus vives pendant un combo
    matLignes.uniforms.uCentre.value.set(X(cx), Y(cy));
    matLignes.uniforms.uFort.value = s.etat === "jeu" && s.combo >= 10 ? 1 : 0;
    matLignes.uniforms.uTemps.value = t;

    // ce qui tombe
    const vus = new Set();
    for (const o of s.objets || []) {
      const g = prendre(o);
      vus.add(o);
      g.position.set(X(o.x), Y(o.y), 0);
      g.scale.setScalar(o.t);
      if (o.type === "chocolat") g.rotation.set(o.a * 0.5, o.a * 0.8, o.a * 0.3);
      else if (o.type === "barbe") g.rotation.set(0, o.a * 0.9, Math.sin(o.a) * 0.25);
      else if (o.type === "bombe") {
        g.rotation.set(0, o.a * 0.6, Math.sin(o.a * 0.7) * 0.4);
        const e = g.userData.etincelle;
        e.scale.setScalar(0.45 + Math.random() * 0.35);
        e.material.rotation = Math.random() * 6.28;
      } else g.rotation.set(o.a * 0.7, o.a * 0.35, o.a);
    }
    for (const [o, g] of enPlace) {
      if (vus.has(o)) continue;
      g.visible = false;
      (reserve[g.userData.cle] ||= []).push(g);
      enPlace.delete(o);
    }

    // les miettes
    for (const m of miettes) {
      const u = m.userData;
      if (u.vie <= 0) { m.visible = false; continue; }
      u.vie -= dt;
      u.vy -= 520 * dt;
      m.position.x += u.vx * dt;
      m.position.y += u.vy * dt;
      m.rotation.x += u.va * dt; m.rotation.y += u.va * 0.7 * dt;
      m.scale.setScalar(u.taille);
      m.material.opacity = Math.min(1, (u.vie / u.max) * 1.6);
    }

    renderer.render(scene, camera);
  }
  // Chopper tourne un peu la tête vers où il va
  let xAvant = null;
  let tourne = 0;
  function cibleX(s, cx) {
    if (xAvant !== null) tourne += (Math.max(-1, Math.min(1, (cx - xAvant) / 6)) - tourne) * 0.15;
    xAvant = cx;
    return tourne;
  }

  function tropLent() {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const nom = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(nom)) return true;
    taille(640, 400);
    const essai = { etat: "accueil", objets: [], x: 320 };
    dessiner(essai);
    gl.finish();
    const t0 = performance.now();
    for (let k = 0; k < 3; k++) dessiner(essai, { temps: k / 60 });
    gl.finish();
    return (performance.now() - t0) / 3 > 22;
  }
  function detruire() {
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    renderer.dispose();
    renderer.forceContextLoss();
  }
  return { dessiner, taille, attrape, tropLent, detruire };
}
