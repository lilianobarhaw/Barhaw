// La course de Chopper, en 3D.
// Ce fichier ne fait que dessiner : le jeu (vitesse, sauts, obstacles, chocs) reste le moteur de site.js,
// le même qu'en 2D, et le bot vérifie les distances exactement comme avant.
// Rendu « manga » : couleurs en aplats, ombres en trame de points, contours à l'encre.
// three.js r170 (licence MIT, © three.js authors) est rangé à côté : la page n'accepte que ses propres scripts.
import * as THREE from "./three-r170.module.min.js";

THREE.ColorManagement.enabled = false; // les couleurs du site telles quelles, sans conversion

const ENCRE = 0x12050d;
const ROSE = 0xff4f9a;

// ---------- petites fabriques ----------
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

export function creerCourse3D(canvas, { CO, photo }) {
  const M = CO.M; // unités du jeu par mètre
  const ratio = Math.min(1.5, window.devicePixelRatio || 1);
  // l'anticrénelage seulement sur les écrans à petite densité (sur les écrans fins, les pixels sont déjà petits)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: ratio < 1.5, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(ratio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, CO.L / CO.H, 0.5, 900);
  const CAMERA = { x: 8.6, y: 2.9, z: 14, visee: new THREE.Vector3(10.4, 1.5, 0) };

  // ---------- l'encre : aplats, ombre en trame de points, contour ----------
  const lumiereMonde = new THREE.Vector3(-0.45, 0.8, 0.55).normalize();
  const uLumiere = { value: new THREE.Vector3() };
  const uTrame = { value: 5 * ratio };
  const VERTEX = `
    varying vec3 vN; varying vec2 vUv;
    void main() {
      vec4 p = vec4(position, 1.0);
      vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        n = mat3(instanceMatrix) * n;
      #endif
      vN = normalize(normalMatrix * n); vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * p;
    }`;
  const FRAGMENT = `
    uniform vec3 uCouleur; uniform vec3 uOmbre; uniform vec3 uLumiere; uniform float uTrame;
    uniform sampler2D uCarte; uniform float uAvecCarte; uniform vec3 uTeinte;
    varying vec3 vN; varying vec2 vUv;
    void main() {
      float l = dot(normalize(vN), uLumiere);
      vec3 c = uCouleur;
      if (l < 0.05) {
        // le côté à l'ombre : la couleur d'ombre, avec une trame de points comme dans un manga imprimé
        vec2 p = mod(gl_FragCoord.xy, uTrame) - 0.5 * uTrame;
        float point = 1.0 - smoothstep(uTrame * 0.22, uTrame * 0.3, length(p));
        c = mix(uOmbre, uOmbre * 0.62, point);
      } else if (l < 0.5) {
        c = mix(uOmbre, uCouleur, 0.6);
      } else if (l > 0.93) {
        c = mix(c, vec3(1.0), 0.18);
      }
      if (uAvecCarte > 0.5) c *= texture2D(uCarte, vUv).rgb;
      gl_FragColor = vec4(c * uTeinte, 1.0);
    }`;
  const BLANC = new THREE.Texture();
  function encre(couleur, ombre, carte = null) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uCouleur: { value: new THREE.Color(couleur) }, uOmbre: { value: new THREE.Color(ombre) }, uLumiere, uTrame,
        uCarte: { value: carte || BLANC }, uAvecCarte: { value: carte ? 1 : 0 }, uTeinte: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: VERTEX, fragmentShader: FRAGMENT,
    });
  }
  const matContour = new THREE.MeshBasicMaterial({ color: ENCRE, side: THREE.BackSide });
  // le contour : la même forme, un peu plus grande, retournée et noire (l'épaisseur est en mètres)
  function avecContour(mesh, e = 0.035) {
    const g = mesh.geometry;
    g.computeBoundingBox();
    const t = g.boundingBox.getSize(new THREE.Vector3());
    const c = new THREE.Mesh(g, matContour);
    c.scale.set(1 + (2 * e) / Math.max(t.x, 0.01), 1 + (2 * e) / Math.max(t.y, 0.01), 1 + (2 * e) / Math.max(t.z, 0.01));
    mesh.add(c);
    return mesh;
  }

  // ---------- le ciel, le soleil, les nuages, les îles ----------
  scene.background = toile(4, 256, (x, l, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1c0a26"); g.addColorStop(0.42, "#5a1d55"); g.addColorStop(0.62, "#ff8fb3"); g.addColorStop(1, "#ff8fb3");
    x.fillStyle = g; x.fillRect(0, 0, l, h);
  });
  const soleil = new THREE.Sprite(new THREE.SpriteMaterial({
    map: toile(128, 128, (x) => {
      const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, "#fff0d6"); g.addColorStop(0.42, "#ffb37a"); g.addColorStop(0.7, "rgba(255, 140, 170, 0.35)"); g.addColorStop(1, "rgba(255, 120, 170, 0)");
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }),
    depthWrite: false,
  }));
  soleil.scale.set(70, 70, 1);
  soleil.position.set(78, 6, -330);
  scene.add(soleil);
  const texNuage = toile(128, 48, (x) => {
    x.fillStyle = "rgba(255, 220, 240, 0.5)";
    x.beginPath(); x.ellipse(60, 30, 56, 14, 0, 0, Math.PI * 2); x.ellipse(76, 20, 34, 13, 0, 0, Math.PI * 2); x.fill();
  });
  const alea = hasard(7);
  const nuages = Array.from({ length: 6 }, (_, k) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNuage, transparent: true, opacity: 0.32, depthWrite: false }));
    const l = 34 + alea() * 30;
    s.scale.set(l, l * 0.36, 1);
    s.userData = { x: -150 + k * 70 + alea() * 30, y: 26 + alea() * 26 };
    scene.add(s);
    return s;
  });
  const matIle = new THREE.MeshBasicMaterial({ color: 0x2b1036 });
  const geoIle = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const iles = Array.from({ length: 7 }, (_, k) => {
    const i = new THREE.Mesh(geoIle, matIle);
    i.scale.set(14 + alea() * 22, 5 + alea() * 9, 6);
    i.userData = { x: -150 + k * 52 + alea() * 20 };
    i.position.set(0, -1.3, -165 - alea() * 20);
    scene.add(i);
    return i;
  });

  // ---------- la mer ----------
  const matMer = new THREE.ShaderMaterial({
    uniforms: {
      uDist: { value: 0 }, uSoleilX: { value: soleil.position.x },
      uPres: { value: new THREE.Color(0x2a0f3e) }, uLoin: { value: new THREE.Color(0x5b2a78) }, uHorizon: { value: new THREE.Color(0xc95a95) }, uEcume: { value: new THREE.Color(0xffbee6) }, uReflet: { value: new THREE.Color(0xffc48f) },
    },
    vertexShader: `varying vec3 vMonde; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vMonde = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uDist; uniform float uSoleilX; uniform vec3 uPres; uniform vec3 uLoin; uniform vec3 uHorizon; uniform vec3 uEcume; uniform vec3 uReflet;
      varying vec3 vMonde;
      float h(float n) { return fract(sin(n * 127.1) * 43758.5453); }
      void main() {
        float z = -vMonde.z;
        float t = clamp((z + 10.0) / 330.0, 0.0, 1.0);
        vec3 c = mix(uPres, uLoin, smoothstep(0.0, 0.3, t));
        c = mix(c, uHorizon, smoothstep(0.3, 1.0, t));
        // des rangées de vagues : des tirets d'écume qui défilent, comme sur un dessin
        float rang = floor(vMonde.z / 1.7);
        float dansRang = abs(fract(vMonde.z / 1.7) - 0.5);
        float trait = 1.0 - smoothstep(0.05, 0.05 + fwidth(vMonde.z / 1.7) * 1.5, dansRang);
        float x = vMonde.x + uDist + h(rang) * 50.0;
        float pas = 7.0 + h(rang + 3.0) * 9.0;
        float longueur = 1.4 + h(rang + 7.0) * 2.4;
        float tiret = step(fract(x / pas), longueur / pas);
        float loin = 1.0 - smoothstep(0.08, 0.32, t);
        // sous le soleil, l'écume prend sa couleur : son reflet
        float reflet = exp(-pow((vMonde.x - uSoleilX * (0.25 + 0.75 * t)) / (3.0 + z * 0.12), 2.0));
        vec3 ecume = mix(uEcume, uReflet, reflet);
        c = mix(c, ecume, trait * tiret * loin * (0.32 + 0.5 * reflet));
        c = mix(c, uReflet, reflet * smoothstep(0.25, 1.0, t) * 0.35);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(900, 360).rotateX(-Math.PI / 2), matMer);
  mer.position.set(40, -1.3, -165);
  scene.add(mer);

  // ---------- le navire : le pont, la coque, le bastingage, les mâts ----------
  const texPont = toile(512, 288, (x, l, h) => {
    const planches = 12;
    const hp = h / planches;
    const tons = ["#7a4029", "#6e3a27", "#744029", "#6a3624"];
    const a = hasard(3);
    for (let k = 0; k < planches; k++) {
      x.fillStyle = tons[k % tons.length];
      x.fillRect(0, k * hp, l, hp);
      // le fil du bois
      x.strokeStyle = "rgba(40, 14, 8, 0.25)"; x.lineWidth = 1;
      for (let f = 0; f < 3; f++) { const y = k * hp + 5 + a() * (hp - 10); x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(l * 0.3, y + 2, l * 0.6, y - 2, l, y); x.stroke(); }
      // les joints des planches, décalés
      x.fillStyle = "#3a1c12";
      const j = (k % 3) * (l / 3) + a() * 40;
      x.fillRect(j % l, k * hp, 3, hp);
      x.fillStyle = "rgba(255, 210, 170, 0.5)";
      x.fillRect((j % l) + 6, k * hp + 6, 3, 3); x.fillRect((j % l) + 6, k * hp + hp - 9, 3, 3);
    }
    x.fillStyle = "#3a1c12";
    for (let k = 0; k <= planches; k++) x.fillRect(0, k * hp - 1, l, 2);
  });
  texPont.wrapS = THREE.RepeatWrapping;
  const LONG = 80;
  texPont.repeat.set(LONG / 4, 1);
  const pont = new THREE.Mesh(new THREE.PlaneGeometry(LONG, 4.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texPont }));
  pont.position.set(LONG / 2 - 22, 0, 0);
  scene.add(pont);
  const texCoque = toile(512, 128, (x, l, h) => {
    x.fillStyle = "#4a2418"; x.fillRect(0, 0, l, h);
    x.fillStyle = "#a35c3b"; x.fillRect(0, 0, l, 12);
    x.fillStyle = "#12050d"; x.fillRect(0, 12, l, 4);
    x.fillStyle = "#3a1a10"; for (let y = 40; y < h; y += 30) x.fillRect(0, y, l, 3);
    // les hublots
    for (const cx of [128, 384]) {
      x.fillStyle = "#e7b25a"; x.beginPath(); x.arc(cx, 62, 19, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#12050d"; x.beginPath(); x.arc(cx, 62, 14, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#ff8fb3"; x.beginPath(); x.arc(cx - 4, 58, 5, 0, Math.PI * 2); x.fill();
    }
  });
  texCoque.wrapS = THREE.RepeatWrapping;
  texCoque.repeat.set(LONG / 6, 1);
  const coque = new THREE.Mesh(new THREE.PlaneGeometry(LONG, 1.4), new THREE.MeshBasicMaterial({ map: texCoque }));
  coque.position.set(LONG / 2 - 22, -0.7, 2.3);
  scene.add(coque);
  // l'écume contre la coque : des tirets blancs qui filent
  const texEcume = toile(512, 64, (x, l, h) => {
    const a = hasard(11);
    for (let k = 0; k < 26; k++) {
      x.fillStyle = `rgba(255, ${200 + Math.floor(a() * 40)}, 235, ${0.55 + a() * 0.4})`;
      const y = 6 + a() * (h - 14);
      x.beginPath(); x.ellipse(a() * l, y, 14 + a() * 30, 2.5 + a() * 3, 0, 0, Math.PI * 2); x.fill();
    }
  });
  texEcume.wrapS = THREE.RepeatWrapping;
  texEcume.repeat.set(LONG / 7, 1);
  const ecume = new THREE.Mesh(new THREE.PlaneGeometry(LONG, 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: texEcume, transparent: true, depthWrite: false }));
  ecume.position.set(LONG / 2 - 22, -1.28, 2.75);
  scene.add(ecume);
  const matBois = encre(0x5a2d1b, 0x2e140c);
  const lisse = new THREE.Mesh(new THREE.BoxGeometry(LONG, 0.1, 0.12), matBois);
  lisse.position.set(LONG / 2 - 22, 0.95, -2.2);
  const lisseBas = lisse.clone();
  lisseBas.position.y = 0.5;
  scene.add(lisse, lisseBas);
  // les poteaux du bastingage : un seul objet répété (une seule commande de dessin)
  const ESPACE_POTEAU = 1.6;
  const NB_POTEAUX = 22;
  const poteaux = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1.0, 0.1).translate(0, 0.5, 0), matBois, NB_POTEAUX);
  poteaux.frustumCulled = false;
  scene.add(poteaux);
  const placeur = new THREE.Object3D();
  // un mât de temps en temps, derrière la piste : il passe vite et donne la vitesse
  const ESPACE_MAT = 34;
  const mats = Array.from({ length: 2 }, () => {
    const g = new THREE.Group();
    const fut = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 16, 14).translate(0, 8, 0), encre(0x8a4b2b, 0x45220f)), 0.04);
    const vergue = avecContour(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5.5, 8).rotateX(Math.PI / 2).translate(0, 6.8, 0), encre(0x8a4b2b, 0x45220f)), 0.03);
    const cordage = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 7.4, 5).rotateX(-0.6).translate(0, 3.4, -1.1), new THREE.MeshBasicMaterial({ color: 0x2b1408 }));
    g.add(fut, vergue, cordage);
    g.position.z = -1.55;
    scene.add(g);
    return g;
  });

  // ---------- Chopper : sa photo en médaillon (une pièce épaisse, bordée de rose) ----------
  const R = CO.R / M;
  const BORD = 3 / M;
  const chopper = new THREE.Group();
  const medaillon = new THREE.Group();
  const texPhoto = new THREE.Texture(photo);
  if (photo.complete && photo.naturalWidth) texPhoto.needsUpdate = true;
  else photo.addEventListener("load", () => { texPhoto.needsUpdate = true; }, { once: true });
  const matPhoto = new THREE.MeshBasicMaterial({ map: texPhoto });
  const piece = new THREE.Mesh(new THREE.CylinderGeometry(R + BORD, R + BORD, 0.13, 48).rotateX(Math.PI / 2), [encre(ROSE, 0xb0215f), encre(0xfff0f7, 0xd9b1c6), encre(0xfff0f7, 0xd9b1c6)]);
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 48), matPhoto);
  face.position.z = 0.07;
  const contourPiece = new THREE.Mesh(new THREE.CylinderGeometry(R + BORD + 0.035, R + BORD + 0.035, 0.1, 48).rotateX(Math.PI / 2), matContour);
  medaillon.add(contourPiece, piece, face);
  chopper.add(medaillon);
  const matPied = encre(0x5a2d1b, 0x2b140b);
  const geoPied = new THREE.SphereGeometry(0.13, 12, 8).scale(1.45, 0.75, 1);
  const pieds = [-1, 1].map((s) => { const p = avecContour(new THREE.Mesh(geoPied, matPied), 0.025); p.position.z = s * 0.16; scene.add(p); return p; });
  scene.add(chopper);
  const ombre = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    map: toile(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, "rgba(20, 5, 12, 0.85)"); g.addColorStop(1, "rgba(20, 5, 12, 0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
    transparent: true, depthWrite: false,
  }));
  ombre.position.set(CO.X / M, 0.012, 0);
  scene.add(ombre);
  // la poussière : de petits nuages qui restent en arrière
  const matPoussiere = new THREE.MeshBasicMaterial({ color: 0xffe1c8, transparent: true, depthWrite: false });
  const geoPoussiere = new THREE.SphereGeometry(1, 8, 6);
  const poussieres = Array.from({ length: 26 }, () => { const p = new THREE.Mesh(geoPoussiere, matPoussiere.clone()); p.visible = false; p.userData = { vie: 0 }; scene.add(p); return p; });
  let prochainePoussiere = 0;
  function souffler(x, y, z, vx, vy, taille) {
    const p = poussieres.find((q) => q.userData.vie <= 0);
    if (!p) return;
    p.userData = { vie: 0.55, max: 0.55, vx, vy, taille };
    p.position.set(x, y, z);
    p.visible = true;
  }

  // ---------- les obstacles : des modèles réutilisés ----------
  const texTonneau = toile(256, 128, (x, l, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, l, h);
    x.fillStyle = "rgba(60, 25, 10, 0.55)"; for (let k = 0; k < l; k += 32) x.fillRect(k, 0, 3, h);
    x.fillStyle = "#4a3426"; x.fillRect(0, h * 0.18, l, 12); x.fillRect(0, h * 0.82 - 12, l, 12);
    x.fillStyle = "rgba(255, 225, 190, 0.35)"; x.fillRect(0, h * 0.18, l, 3); x.fillRect(0, h * 0.82 - 12, l, 3);
  });
  texTonneau.wrapS = THREE.RepeatWrapping;
  const matTonneau = encre(0x9a5530, 0x4f2412, texTonneau);
  function geoTonneau(largeur, hauteur) {
    const pts = [];
    const n = 12;
    pts.push(new THREE.Vector2(0, -hauteur / 2));
    for (let k = 0; k <= n; k++) {
      const v = k / n;
      pts.push(new THREE.Vector2(largeur * (0.4 + 0.1 * Math.sin(Math.PI * v)), -hauteur / 2 + hauteur * v));
    }
    pts.push(new THREE.Vector2(0, hauteur / 2));
    return new THREE.LatheGeometry(pts, 22);
  }
  const texCaisse = toile(128, 192, (x, l, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, l, h);
    x.fillStyle = "rgba(70, 35, 12, 0.35)"; for (let y = 0; y < h; y += 24) x.fillRect(0, y, l, 2);
    x.strokeStyle = "#3b2410"; x.lineWidth = 12; x.strokeRect(6, 6, l - 12, h - 12);
    x.lineWidth = 9; x.beginPath(); x.moveTo(14, 14); x.lineTo(l - 14, h - 14); x.moveTo(l - 14, 14); x.lineTo(14, h - 14); x.stroke();
    x.fillStyle = "#e9c48a"; for (const [cx, cy] of [[12, 12], [l - 12, 12], [12, h - 12], [l - 12, h - 12]]) { x.beginPath(); x.arc(cx, cy, 3, 0, Math.PI * 2); x.fill(); }
  });
  const matCaisse = encre(0xc48a46, 0x6a4320, texCaisse);
  const matMouette = encre(0xfff8fb, 0xc4b0d4);
  const matBec = encre(0xffb347, 0xc06a1c);
  const matAileBout = encre(0x6b6274, 0x3a3240);
  const matBoulet = encre(0x4a4050, 0x140a12);
  const matFumee = new THREE.MeshBasicMaterial({ color: 0xe6d2e6, transparent: true, opacity: 0.25, depthWrite: false });
  const FABRIQUES = {
    tonneau(o) {
      const g = new THREE.Group();
      g.add(avecContour(new THREE.Mesh(geoTonneau(o.w / M, o.h / M), matTonneau)));
      return g;
    },
    double(o) {
      const g = new THREE.Group();
      const l = o.w / 2 / M;
      for (const s of [-1, 1]) {
        const t = avecContour(new THREE.Mesh(geoTonneau(l, o.h / M), matTonneau));
        t.position.x = (s * l) / 2;
        t.rotation.y = s * 0.6;
        g.add(t);
      }
      return g;
    },
    caisse(o) {
      const g = new THREE.Group();
      const c = avecContour(new THREE.Mesh(new THREE.BoxGeometry(o.w / M, o.h / M, (o.w / M) * 0.95), matCaisse), 0.04);
      c.rotation.y = 0.12;
      g.add(c);
      return g;
    },
    mouette(o) {
      const g = new THREE.Group();
      const corps = avecContour(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10).scale(0.26, 0.13, 0.13), matMouette), 0.025);
      const tete = avecContour(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), matMouette), 0.022);
      tete.position.set(-0.22, 0.07, 0);
      const bec = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 8).rotateZ(Math.PI / 2), matBec);
      bec.position.set(-0.36, 0.06, 0);
      const queue = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4).rotateZ(-Math.PI / 2).scale(1, 0.4, 1), matMouette);
      queue.position.set(0.3, 0.02, 0);
      g.add(corps, tete, bec, queue);
      g.userData.ailes = [-1, 1].map((s) => {
        const pivot = new THREE.Group();
        pivot.position.set(0.02, 0.04, s * 0.08);
        const aile = avecContour(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.42).translate(0, 0, s * 0.21), matMouette), 0.02);
        const bout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.14).translate(0.03, 0, s * 0.38), matAileBout);
        pivot.add(aile, bout);
        pivot.userData.s = s;
        g.add(pivot);
        return pivot;
      });
      return g;
    },
    boulet(o) {
      const g = new THREE.Group();
      const r = o.w / 2 / M;
      g.add(avecContour(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), matBoulet), 0.03));
      for (let k = 1; k <= 3; k++) {
        const f = new THREE.Mesh(new THREE.SphereGeometry(r * (1 - k * 0.16), 10, 8), matFumee.clone());
        f.material.opacity = 0.3 - k * 0.075;
        f.position.x = k * 0.44;
        g.add(f);
      }
      return g;
    },
  };
  const reserve = {}; // type → objets libres
  const enPlace = new Map(); // obstacle du moteur → objet 3D
  function prendre(ob) {
    let o = enPlace.get(ob);
    if (o) return o;
    o = reserve[ob.type]?.pop() || FABRIQUES[ob.type](ob);
    o.visible = true;
    if (!o.parent) scene.add(o);
    enPlace.set(ob, o);
    return o;
  }

  // ---------- l'image ----------
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const axeZ = new THREE.Vector3(0, 0, 1);
  let dernierT = null;
  let dernierAtterri = -1;
  const modulo = (a, b) => ((a % b) + b) % b;

  function dessiner(m, { decor = 0, temps = performance.now() / 1000 } = {}) {
    const d = (m ? m.dist : decor) / M; // mètres parcourus
    const t = m ? m.t : temps;
    if (dernierT !== null && t < dernierT) { prochainePoussiere = 0; dernierAtterri = -1; } // une nouvelle course
    const dt = dernierT === null ? 0 : Math.max(0, Math.min(0.05, t - dernierT));
    dernierT = t;

    // la caméra : un peu de côté et au-dessus ; elle suit à peine les sauts, et s'ouvre un peu quand ça va vite
    const vitesse = m ? m.v : 0;
    camera.fov = 34 + Math.min(2.2, Math.max(0, vitesse - 12) * 0.2);
    camera.position.set(CAMERA.x, CAMERA.y + (m ? m.y / M : 0) * 0.12, CAMERA.z);
    camera.lookAt(CAMERA.visee.x, CAMERA.visee.y + (m ? m.y / M : 0) * 0.1, CAMERA.visee.z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    uLumiere.value.copy(lumiereMonde).transformDirection(camera.matrixWorldInverse);

    // le décor qui défile
    matMer.uniforms.uDist.value = d;
    texPont.offset.x = modulo(d / 4, 1);
    texCoque.offset.x = modulo(d / 6, 1);
    texEcume.offset.x = modulo(d / 7 + t * 0.05, 1);
    for (let k = 0; k < NB_POTEAUX; k++) {
      placeur.position.set(modulo(k * ESPACE_POTEAU - d, NB_POTEAUX * ESPACE_POTEAU) - 10, 0, -2.2);
      placeur.updateMatrix();
      poteaux.setMatrixAt(k, placeur.matrix);
    }
    poteaux.instanceMatrix.needsUpdate = true;
    mats.forEach((g, k) => { g.position.x = modulo(k * ESPACE_MAT + 26 - d, ESPACE_MAT * mats.length) - 18; });
    for (const i of iles) i.position.x = modulo(i.userData.x - d, 360) - 150;
    for (const n of nuages) n.position.set(modulo(n.userData.x - d * 0.6, 420) - 190, n.userData.y, -260);

    // Chopper
    const y = m ? m.y / M : 0;
    const auSol = !m || m.sol;
    const course = m ? m.v : 6;
    const pas = auSol ? Math.abs(Math.sin(t * course * 0.9)) * (3 / M) : 0;
    const ecrase = m && m.atterri > 0 && m.t - m.atterri < 0.1 ? 0.86 : 1;
    const X = CO.X / M;
    chopper.position.set(X, y + R + pas - R * (1 - ecrase), 0);
    // le médaillon regarde la caméra, et penche quand il saute
    medaillon.quaternion.copy(camera.quaternion);
    medaillon.quaternion.multiply(q.setFromAxisAngle(axeZ, m && !m.sol ? Math.max(-0.35, Math.min(0.35, -m.vy / 2400)) : Math.sin(t * course * 0.9) * 0.04));
    medaillon.scale.set(ecrase < 1 ? 1.08 : 1, ecrase, 1);
    matPhoto.color.set(m?.choc ? 0xff9aa8 : 0xffffff);
    const foulee = Math.sin(t * course * 1.8);
    pieds[0].position.set(X - 0.06 + (auSol ? foulee * 0.17 : -0.08), auSol ? 0.07 + Math.max(0, foulee) * 0.06 : y + 0.1, 0.16);
    pieds[1].position.set(X - 0.06 - (auSol ? foulee * 0.17 : -0.08), auSol ? 0.07 + Math.max(0, -foulee) * 0.06 : y + 0.1, -0.16);
    const tailleOmbre = R * Math.max(0.45, 1 - y / 6.5);
    ombre.scale.set(tailleOmbre * 1.15, 1, tailleOmbre * 0.6);
    ombre.material.opacity = Math.max(0.3, 0.9 - y / 8);

    // la poussière : quand il court, et un petit nuage quand il retombe
    if (m && !m.choc) {
      if (m.sol && t > prochainePoussiere) { prochainePoussiere = t + 0.07 + Math.random() * 0.08; souffler(X - 0.35, 0.08, (Math.random() - 0.5) * 0.4, -2 - Math.random() * 1.5, 0.6 + Math.random() * 0.6, 0.07 + Math.random() * 0.05); }
      if (m.sol && m.atterri > 0 && m.atterri !== dernierAtterri) for (let k = 0; k < 7; k++) souffler(X + (k - 3) * 0.12, 0.06, (Math.random() - 0.5) * 0.8, (k - 3) * 0.9, 0.9 + Math.random(), 0.08 + Math.random() * 0.06);
      if (m.sol) dernierAtterri = m.atterri;
    }
    for (const p of poussieres) {
      if (p.userData.vie <= 0) { p.visible = false; continue; }
      const u = p.userData;
      u.vie -= dt;
      p.position.x += u.vx * dt;
      p.position.y += u.vy * dt;
      u.vy -= 1.5 * dt;
      const k = u.vie / u.max;
      p.scale.setScalar(u.taille * (1.6 - k * 0.6));
      p.material.opacity = 0.55 * k;
    }

    // les obstacles du moteur
    const vus = new Set();
    for (const ob of m ? m.obstacles : []) {
      const o = prendre(ob);
      vus.add(ob);
      if (ob.type === "boulet" && ob.x > CO.L - 10) { o.visible = false; continue; }
      o.visible = true;
      o.position.set((ob.x + ob.w / 2) / M, (ob.y + ob.h / 2) / M, 0);
      if (ob.type === "mouette") {
        for (const a of o.userData.ailes) a.rotation.x = a.userData.s * Math.sin(ob.phase) * 0.75;
        o.rotation.z = Math.sin(ob.phase * 0.5) * 0.08;
      } else if (ob.type === "boulet") {
        o.children[0].rotation.z += dt * 9;
      }
    }
    for (const [ob, o] of enPlace) {
      if (vus.has(ob)) continue;
      o.visible = false;
      (reserve[ob.type] ||= []).push(o);
      enPlace.delete(ob);
    }

    renderer.render(scene, camera);
  }

  function taille(largeur) {
    renderer.setSize(Math.round(largeur), Math.round((largeur * CO.H) / CO.L), false);
  }

  function detruire() {
    scene.traverse((o) => { o.geometry?.dispose?.(); });
    renderer.dispose();
    renderer.forceContextLoss(); // rend tout de suite la carte graphique
  }

  // un point du jeu (unités du jeu) → sa place à l'écran, en fraction de la largeur et de la hauteur (pour les avertissements)
  function versEcran(x, y) {
    v.set(x / M, y / M, 0).project(camera);
    return [(v.x + 1) / 2, (1 - v.y) / 2];
  }

  // l'appareil tient-il la 3D ? Un rendu logiciel (sans carte graphique) ou des images trop lentes : la course reste en 2D
  function tropLent() {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const nom = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(nom)) return true;
    const largeur = canvas.clientWidth || 640;
    taille(largeur);
    dessiner(null);
    gl.finish();
    const t0 = performance.now();
    for (let k = 0; k < 3; k++) dessiner(null, { temps: k / 60 });
    gl.finish();
    return (performance.now() - t0) / 3 > 22;
  }

  // pour les essais : régler la caméra à la main
  const regler = (o) => { Object.assign(CAMERA, o); if (o.visee) CAMERA.visee = new THREE.Vector3(...o.visee); };
  return { dessiner, taille, detruire, versEcran, tropLent, regler, renderer, camera };
}
